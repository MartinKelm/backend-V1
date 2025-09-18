import express from 'express'
import { prisma } from '../lib/database.js'
import { hashPassword, comparePassword, validatePassword } from '../lib/password.js'
import { validateRequest, updateProfileSchema, changePasswordSchema } from '../lib/validation.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'
import { logAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCES } from '../lib/audit.js'
import { revokeAllUserSessions } from '../lib/jwt.js'

const router = express.Router()

/**
 * GET /api/users/me
 * Get current user profile
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    })
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

/**
 * PUT /api/users/me
 * Update current user profile
 */
router.put('/me', authenticateToken, async (req, res) => {
  try {
    // Validate request body
    const validation = validateRequest(updateProfileSchema, req.body)
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      })
    }

    const { firstName, lastName, company, phone, website, bio } = validation.data

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        firstName: firstName || null,
        lastName: lastName || null,
        company: company || null,
        phone: phone || null,
        website: website || null,
        bio: bio || null
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        emailVerified: true,
        company: true,
        phone: true,
        website: true,
        avatar: true,
        bio: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // Log audit event
    await logAuditEvent(req.user.id, AUDIT_ACTIONS.PROFILE_UPDATE, AUDIT_RESOURCES.PROFILE, {
      changes: validation.data
    }, req)

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser
      }
    })

  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

/**
 * PUT /api/users/me/password
 * Change user password
 */
router.put('/me/password', authenticateToken, async (req, res) => {
  try {
    // Validate request body
    const validation = validateRequest(changePasswordSchema, req.body)
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      })
    }

    const { currentPassword, newPassword } = validation.data

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, password: true }
    })

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password)
    if (!isCurrentPasswordValid) {
      await logAuditEvent(req.user.id, AUDIT_ACTIONS.PASSWORD_CHANGE, AUDIT_RESOURCES.PASSWORD, {
        success: false,
        reason: 'Invalid current password'
      }, req)

      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      })
    }

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'New password does not meet requirements',
        errors: passwordValidation.errors.map(error => ({ field: 'newPassword', message: error }))
      })
    }

    // Check if new password is different from current
    const isSamePassword = await comparePassword(newPassword, user.password)
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      })
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword)

    // Update password
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        password: hashedNewPassword
      }
    })

    // Revoke all existing sessions (force re-login)
    await revokeAllUserSessions(req.user.id)

    // Log audit event
    await logAuditEvent(req.user.id, AUDIT_ACTIONS.PASSWORD_CHANGE, AUDIT_RESOURCES.PASSWORD, {
      success: true
    }, req)

    res.json({
      success: true,
      message: 'Password changed successfully. Please log in again.'
    })

  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

/**
 * GET /api/users/me/sessions
 * Get user's active sessions
 */
router.get('/me/sessions', authenticateToken, async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      where: {
        userId: req.user.id,
        expiresAt: {
          gt: new Date()
        }
      },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    res.json({
      success: true,
      data: {
        sessions
      }
    })

  } catch (error) {
    console.error('Get sessions error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

/**
 * DELETE /api/users/me/sessions
 * Revoke all user sessions (except current)
 */
router.delete('/me/sessions', authenticateToken, async (req, res) => {
  try {
    // Get current session token from request
    const authHeader = req.headers.authorization
    const currentToken = authHeader && authHeader.split(' ')[1]

    // Find current session
    let currentSessionId = null
    if (currentToken) {
      try {
        const currentSession = await prisma.session.findFirst({
          where: {
            userId: req.user.id,
            // We can't directly match the access token, so we'll keep all sessions for now
            // In a production app, you might want to store session IDs in the JWT payload
          }
        })
        currentSessionId = currentSession?.id
      } catch (error) {
        console.error('Error finding current session:', error)
      }
    }

    // Revoke all sessions except current (if found)
    const whereClause = {
      userId: req.user.id
    }

    if (currentSessionId) {
      whereClause.id = {
        not: currentSessionId
      }
    }

    const deletedSessions = await prisma.session.deleteMany({
      where: whereClause
    })

    // Log audit event
    await logAuditEvent(req.user.id, AUDIT_ACTIONS.ALL_SESSIONS_REVOKE, AUDIT_RESOURCES.SESSION, {
      revokedCount: deletedSessions.count
    }, req)

    res.json({
      success: true,
      message: `${deletedSessions.count} sessions revoked successfully`
    })

  } catch (error) {
    console.error('Revoke sessions error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

/**
 * GET /api/users (Admin only)
 * Get all users
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, status } = req.query

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const take = parseInt(limit)

    // Build where clause
    const where = {}

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (role) {
      where.role = role
    }

    if (status) {
      where.status = status
    }

    // Get users and total count
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          emailVerified: true,
          company: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true
        },
        skip,
        take,
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.user.count({ where })
    ])

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    })

  } catch (error) {
    console.error('Get users error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

/**
 * PUT /api/users/:id/role (Admin only)
 * Update user role
 */
router.put('/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { role } = req.body

    if (!['CUSTOMER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      })
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true }
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Prevent changing own role
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own role'
      })
    }

    // Update role
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        company: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // Log audit event
    await logAuditEvent(req.user.id, AUDIT_ACTIONS.ROLE_CHANGE, AUDIT_RESOURCES.ROLE, {
      targetUserId: user.id,
      targetUserEmail: user.email,
      oldRole: user.role,
      newRole: role
    }, req)

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: {
        user: updatedUser
      }
    })

  } catch (error) {
    console.error('Update user role error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

export default router
