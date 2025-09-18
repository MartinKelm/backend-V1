import express from 'express'
import { prisma } from '../lib/database.js'
import { hashPassword, comparePassword, validatePassword } from '../lib/password.js'
import { generateTokenPair, refreshAccessToken, revokeRefreshToken } from '../lib/jwt.js'
import { validateRequest, registerSchema, loginSchema, refreshTokenSchema } from '../lib/validation.js'
import { authLimiter, registrationLimiter } from '../middleware/rateLimiter.js'
import { logAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCES } from '../lib/audit.js'

const router = express.Router()

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', registrationLimiter, async (req, res) => {
  try {
    // Validate request body
    const validation = validateRequest(registerSchema, req.body)
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      })
    }

    const { email, password, firstName, lastName, company, phone, website } = validation.data

    // Validate password strength
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet requirements',
        errors: passwordValidation.errors.map(error => ({ field: 'password', message: error }))
      })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      await logAuditEvent(null, AUDIT_ACTIONS.USER_REGISTER, AUDIT_RESOURCES.USER, {
        email: email.toLowerCase(),
        success: false,
        reason: 'Email already exists'
      }, req)

      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      })
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        company: company || null,
        phone: phone || null,
        website: website || null,
        role: 'CUSTOMER',
        status: 'ACTIVE' // For now, activate immediately. Later add email verification
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        company: true,
        phone: true,
        website: true,
        createdAt: true
      }
    })

    // Generate tokens
    const tokens = await generateTokenPair(user, req.ip, req.get('User-Agent'))

    // Log audit event
    await logAuditEvent(user.id, AUDIT_ACTIONS.USER_REGISTER, AUDIT_RESOURCES.USER, {
      email: user.email,
      role: user.role,
      success: true
    }, req)

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        tokens
      }
    })

  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    // Validate request body
    const validation = validateRequest(loginSchema, req.body)
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      })
    }

    const { email, password } = validation.data

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!user) {
      await logAuditEvent(null, AUDIT_ACTIONS.USER_LOGIN_FAILED, AUDIT_RESOURCES.USER, {
        email: email.toLowerCase(),
        reason: 'User not found'
      }, req)

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await logAuditEvent(user.id, AUDIT_ACTIONS.USER_LOGIN_FAILED, AUDIT_RESOURCES.USER, {
        email: user.email,
        reason: 'Account locked'
      }, req)

      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to too many failed login attempts'
      })
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.password)

    if (!isPasswordValid) {
      // Increment login attempts
      const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5
      const lockTime = parseInt(process.env.LOCK_TIME) || 30 * 60 * 1000 // 30 minutes

      const newAttempts = user.loginAttempts + 1
      const updateData = {
        loginAttempts: newAttempts
      }

      // Lock account if max attempts reached
      if (newAttempts >= maxAttempts) {
        updateData.lockedUntil = new Date(Date.now() + lockTime)
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData
      })

      await logAuditEvent(user.id, AUDIT_ACTIONS.USER_LOGIN_FAILED, AUDIT_RESOURCES.USER, {
        email: user.email,
        attempts: newAttempts,
        locked: newAttempts >= maxAttempts
      }, req)

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      await logAuditEvent(user.id, AUDIT_ACTIONS.USER_LOGIN_FAILED, AUDIT_RESOURCES.USER, {
        email: user.email,
        reason: 'Account not active',
        status: user.status
      }, req)

      return res.status(401).json({
        success: false,
        message: 'Account is not active'
      })
    }

    // Reset login attempts and update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date()
      }
    })

    // Generate tokens
    const tokens = await generateTokenPair(user, req.ip, req.get('User-Agent'))

    // Log successful login
    await logAuditEvent(user.id, AUDIT_ACTIONS.USER_LOGIN, AUDIT_RESOURCES.USER, {
      email: user.email,
      success: true
    }, req)

    // Return user data (without password)
    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      company: user.company,
      phone: user.phone,
      website: user.website,
      avatar: user.avatar,
      bio: user.bio,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userData,
        tokens
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req, res) => {
  try {
    // Validate request body
    const validation = validateRequest(refreshTokenSchema, req.body)
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      })
    }

    const { refreshToken } = validation.data

    // Refresh token
    const result = await refreshAccessToken(refreshToken, req.ip, req.get('User-Agent'))

    // Log audit event
    await logAuditEvent(result.user.id, AUDIT_ACTIONS.TOKEN_REFRESH, AUDIT_RESOURCES.SESSION, {
      success: true
    }, req)

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: result
    })

  } catch (error) {
    console.error('Token refresh error:', error)
    
    await logAuditEvent(null, AUDIT_ACTIONS.TOKEN_REFRESH, AUDIT_RESOURCES.SESSION, {
      success: false,
      error: error.message
    }, req)

    res.status(401).json({
      success: false,
      message: error.message || 'Failed to refresh token'
    })
  }
})

/**
 * POST /api/auth/logout
 * Logout user (revoke refresh token)
 */
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body

    if (refreshToken) {
      await revokeRefreshToken(refreshToken)
      
      // Try to get user ID for audit log
      try {
        const session = await prisma.session.findFirst({
          where: { token: refreshToken },
          include: { user: true }
        })
        
        if (session) {
          await logAuditEvent(session.userId, AUDIT_ACTIONS.USER_LOGOUT, AUDIT_RESOURCES.SESSION, {
            success: true
          }, req)
        }
      } catch (auditError) {
        console.error('Audit log error:', auditError)
      }
    }

    res.json({
      success: true,
      message: 'Logout successful'
    })

  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

export default router
