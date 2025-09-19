const express = require('express');
const { getPrisma } = require('../lib/database');
const { hashPassword, comparePassword, validatePassword } = require('../lib/password');
const { generateToken } = require('../lib/jwt');
const { validateRequest, registerSchema, loginSchema } = require('../lib/validation');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { authLimiter, registerLimiter } = require('../middleware/rateLimiter');
const { logAuditEvent, AUDIT_EVENTS } = require('../lib/audit');

const router = express.Router();

// User Registration
router.post('/register', registerLimiter, validateRequest(registerSchema), async (req, res) => {
  try {
    const { firstName, lastName, email, password, company } = req.body;
    const prisma = getPrisma();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      await logAuditEvent(null, AUDIT_EVENTS.AUTH_FAILED, {
        reason: 'Email already exists',
        email,
        attempt: 'registration'
      }, req.ip, req.get('User-Agent'));

      return res.status(400).json({
        success: false,
        message: 'A user with this email address already exists.'
      });
    }

    // Validate password strength
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet requirements',
        errors: passwordErrors
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        company: company || null,
        role: 'USER' // Default role for registration
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        company: true,
        role: true,
        createdAt: true
      }
    });

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Log successful registration
    await logAuditEvent(user.id, AUDIT_EVENTS.USER_REGISTERED, {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      company: user.company
    }, req.ip, req.get('User-Agent'));

    console.log(`✅ New user registered: ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        token
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);

    await logAuditEvent(null, AUDIT_EVENTS.SYSTEM_ERROR, {
      error: error.message,
      endpoint: '/auth/register'
    }, req.ip, req.get('User-Agent'));

    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again later.'
    });
  }
});

// User Login
router.post('/login', authLimiter, validateRequest(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const prisma = getPrisma();

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      await logAuditEvent(null, AUDIT_EVENTS.AUTH_FAILED, {
        reason: 'User not found',
        email,
        attempt: 'login'
      }, req.ip, req.get('User-Agent'));

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    if (!user.isActive) {
      await logAuditEvent(user.id, AUDIT_EVENTS.AUTH_FAILED, {
        reason: 'Account deactivated',
        email,
        attempt: 'login'
      }, req.ip, req.get('User-Agent'));

      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      await logAuditEvent(user.id, AUDIT_EVENTS.AUTH_FAILED, {
        reason: 'Invalid password',
        email,
        attempt: 'login'
      }, req.ip, req.get('User-Agent'));

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Log successful login
    await logAuditEvent(user.id, AUDIT_EVENTS.USER_LOGIN, {
      email: user.email
    }, req.ip, req.get('User-Agent'));

    console.log(`✅ User logged in: ${user.email}`);

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        token
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);

    await logAuditEvent(null, AUDIT_EVENTS.SYSTEM_ERROR, {
      error: error.message,
      endpoint: '/auth/login'
    }, req.ip, req.get('User-Agent'));

    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again later.'
    });
  }
});

// Get Current User Profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const prisma = getPrisma();
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        company: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile.'
    });
  }
});

// Update User Profile
router.put('/me', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, company } = req.body;
    const prisma = getPrisma();

    // Validate input
    if (firstName && (firstName.length < 2 || firstName.length > 50)) {
      return res.status(400).json({
        success: false,
        message: 'First name must be between 2 and 50 characters.'
      });
    }

    if (lastName && (lastName.length < 2 || lastName.length > 50)) {
      return res.status(400).json({
        success: false,
        message: 'Last name must be between 2 and 50 characters.'
      });
    }

    if (company && company.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Company name must be less than 100 characters.'
      });
    }

    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName.trim();
    if (lastName !== undefined) updateData.lastName = lastName.trim();
    if (company !== undefined) updateData.company = company.trim() || null;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        company: true,
        role: true,
        updatedAt: true
      }
    });

    await logAuditEvent(req.user.id, AUDIT_EVENTS.USER_UPDATED, {
      updatedFields: Object.keys(updateData),
      ...updateData
    }, req.ip, req.get('User-Agent'));

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile.'
    });
  }
});

// Logout (optional - mainly for audit logging)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    await logAuditEvent(req.user.id, AUDIT_EVENTS.USER_LOGOUT, {
      email: req.user.email
    }, req.ip, req.get('User-Agent'));

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed.'
    });
  }
});

module.exports = router;
