const express = require('express');
const { getPrisma } = require('../lib/database');
const { hashPassword, comparePassword, validatePassword } = require('../lib/password');
const { generateToken } = require('../lib/jwt');
const { validateRequest, registerSchema, loginSchema } = require('../lib/validation-updated');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { authLimiter, registerLimiter } = require('../middleware/rateLimiter');
const { logAuditEvent, AUDIT_EVENTS } = require('../lib/audit');

const router = express.Router();

// User Registration
router.post('/register', registerLimiter, validateRequest(registerSchema), async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      password, 
      companyName,
      industry,
      website,
      phone,
      address,
      postalCode,
      city
    } = req.body;
    
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
        message: 'Ein Benutzer mit dieser E-Mail-Adresse existiert bereits.'
      });
    }

    // Validate password strength
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Passwort erfüllt nicht die Anforderungen',
        errors: passwordErrors
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user with company information
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        companyName,
        industry,
        website: website || null,
        phone,
        address,
        postalCode,
        city,
        role: 'USER'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        companyName: true,
        industry: true,
        website: true,
        phone: true,
        address: true,
        postalCode: true,
        city: true,
        role: true,
        isActive: true,
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
      companyName: user.companyName
    }, req.ip, req.get('User-Agent'));

    res.status(201).json({
      success: true,
      message: 'Registrierung erfolgreich abgeschlossen',
      data: {
        user,
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Log failed registration attempt
    await logAuditEvent(null, AUDIT_EVENTS.AUTH_FAILED, {
      reason: 'Registration error',
      email: req.body.email,
      error: error.message
    }, req.ip, req.get('User-Agent'));

    res.status(500).json({
      success: false,
      message: 'Ein Fehler ist bei der Registrierung aufgetreten'
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
      where: { email },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        password: true,
        companyName: true,
        industry: true,
        website: true,
        phone: true,
        address: true,
        postalCode: true,
        city: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    if (!user) {
      await logAuditEvent(null, AUDIT_EVENTS.AUTH_FAILED, {
        reason: 'User not found',
        email,
        attempt: 'login'
      }, req.ip, req.get('User-Agent'));

      return res.status(401).json({
        success: false,
        message: 'Ungültige Anmeldedaten'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      await logAuditEvent(user.id, AUDIT_EVENTS.AUTH_FAILED, {
        reason: 'Account deactivated',
        email,
        attempt: 'login'
      }, req.ip, req.get('User-Agent'));

      return res.status(401).json({
        success: false,
        message: 'Ihr Account wurde deaktiviert'
      });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      await logAuditEvent(user.id, AUDIT_EVENTS.AUTH_FAILED, {
        reason: 'Invalid password',
        email,
        attempt: 'login'
      }, req.ip, req.get('User-Agent'));

      return res.status(401).json({
        success: false,
        message: 'Ungültige Anmeldedaten'
      });
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    // Log successful login
    await logAuditEvent(user.id, AUDIT_EVENTS.USER_LOGIN, {
      email: user.email
    }, req.ip, req.get('User-Agent'));

    res.json({
      success: true,
      message: 'Anmeldung erfolgreich',
      data: {
        user: userWithoutPassword,
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    
    // Log failed login attempt
    await logAuditEvent(null, AUDIT_EVENTS.AUTH_FAILED, {
      reason: 'Login error',
      email: req.body.email,
      error: error.message
    }, req.ip, req.get('User-Agent'));

    res.status(500).json({
      success: false,
      message: 'Ein Fehler ist bei der Anmeldung aufgetreten'
    });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const prisma = getPrisma();
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        companyName: true,
        industry: true,
        website: true,
        phone: true,
        address: true,
        postalCode: true,
        city: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Profils'
    });
  }
});

// Logout (client-side token removal, server-side audit log)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Log logout event
    await logAuditEvent(req.user.userId, AUDIT_EVENTS.USER_LOGOUT, {
      email: req.user.email
    }, req.ip, req.get('User-Agent'));

    res.json({
      success: true,
      message: 'Erfolgreich abgemeldet'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abmelden'
    });
  }
});

module.exports = router;
