const { verifyToken, extractTokenFromHeader } = require('../lib/jwt');
const { getPrisma } = require('../lib/database');
const { logAuditEvent } = require('../lib/audit');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No authentication token provided.'
      });
    }

    const token = extractTokenFromHeader(authHeader);
    const decoded = verifyToken(token);

    // Get user from database to ensure they still exist and are active
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        company: true,
        role: true,
        isActive: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User not found.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Account is deactivated.'
      });
    }

    // Add user info to request object
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    console.error('❌ Authentication middleware error:', error);
    
    // Log failed authentication attempt
    await logAuditEvent(null, 'AUTH_FAILED', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    }, req.ip, req.get('User-Agent'));

    return res.status(401).json({
      success: false,
      message: error.message || 'Access denied. Invalid authentication token.'
    });
  }
};

const requireRole = (requiredRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.'
        });
      }

      const userRole = req.user.role;
      const allowedRoles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.'
        });
      }

      next();
    } catch (error) {
      console.error('❌ Role authorization error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization check failed.'
      });
    }
  };
};

const requireAdmin = requireRole(['ADMIN', 'SUPER_ADMIN']);
const requireSuperAdmin = requireRole(['SUPER_ADMIN']);

// Optional authentication - doesn't fail if no token provided
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      req.user = null;
      return next();
    }

    const token = extractTokenFromHeader(authHeader);
    const decoded = verifyToken(token);

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        company: true,
        role: true,
        isActive: true
      }
    });

    if (user && user.isActive) {
      req.user = user;
      req.token = token;
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail on token errors
    req.user = null;
    next();
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireSuperAdmin,
  optionalAuth
};
