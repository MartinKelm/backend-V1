const { getPrisma } = require('./database');

const logAuditEvent = async (userId, action, details = {}, ipAddress = null, userAgent = null) => {
  try {
    const prisma = getPrisma();
    
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        details: details || {},
        ipAddress,
        userAgent
      }
    });

    console.log(`📝 Audit log: ${action} by user ${userId || 'anonymous'}`);
  } catch (error) {
    console.error('❌ Failed to log audit event:', error);
    // Don't throw error to avoid breaking the main flow
  }
};

const getAuditLogs = async (filters = {}) => {
  try {
    const prisma = getPrisma();
    
    const where = {};
    
    if (filters.userId) {
      where.userId = filters.userId;
    }
    
    if (filters.action) {
      where.action = filters.action;
    }
    
    if (filters.startDate && filters.endDate) {
      where.createdAt = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate)
      };
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: filters.limit || 100
    });

    return logs;
  } catch (error) {
    console.error('❌ Failed to retrieve audit logs:', error);
    throw new Error('Failed to retrieve audit logs');
  }
};

// Audit event types
const AUDIT_EVENTS = {
  USER_REGISTERED: 'USER_REGISTERED',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_UPDATED: 'USER_UPDATED',
  USER_DEACTIVATED: 'USER_DEACTIVATED',
  USER_ACTIVATED: 'USER_ACTIVATED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED: 'PASSWORD_RESET_COMPLETED',
  ADMIN_CREATED: 'ADMIN_CREATED',
  ROLE_CHANGED: 'ROLE_CHANGED',
  AUTH_FAILED: 'AUTH_FAILED',
  ACCESS_DENIED: 'ACCESS_DENIED',
  DATA_EXPORT: 'DATA_EXPORT',
  SYSTEM_ERROR: 'SYSTEM_ERROR'
};

module.exports = {
  logAuditEvent,
  getAuditLogs,
  AUDIT_EVENTS
};
