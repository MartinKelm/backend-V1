import { verifyAccessToken } from '../lib/jwt.js'
import { prisma } from '../lib/database.js'

/**
 * Authentication middleware
 */
export async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      })
    }

    // Verify token
    const decoded = verifyAccessToken(token)
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      })
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      return res.status(401).json({
        success: false,
        message: 'User account is not active'
      })
    }

    // Add user to request object
    req.user = user
    next()

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired access token'
    })
  }
}

/**
 * Role-based authorization middleware
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      })
    }

    next()
  }
}

/**
 * Admin authorization middleware
 */
export function requireAdmin(req, res, next) {
  return requireRole('ADMIN', 'SUPER_ADMIN')(req, res, next)
}

/**
 * Super admin authorization middleware
 */
export function requireSuperAdmin(req, res, next) {
  return requireRole('SUPER_ADMIN')(req, res, next)
}

/**
 * Optional authentication middleware
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]

    if (token) {
      const decoded = verifyAccessToken(token)
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          emailVerified: true
        }
      })

      if (user && user.status === 'ACTIVE') {
        req.user = user
      }
    }

    next()
  } catch (error) {
    // Continue without authentication
    next()
  }
}
