import { prisma } from './database.js'

/**
 * Log user action for audit trail
 */
export async function logAuditEvent(userId, action, resource, details, req) {
  try {
    const ipAddress = req?.ip || req?.connection?.remoteAddress || 'unknown'
    const userAgent = req?.get('User-Agent') || 'unknown'

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        details: details ? JSON.parse(JSON.stringify(details)) : null,
        ipAddress,
        userAgent
      }
    })
  } catch (error) {
    console.error('Failed to log audit event:', error)
    // Don't throw error to avoid breaking the main flow
  }
}

/**
 * Audit actions constants
 */
export const AUDIT_ACTIONS = {
  // Authentication
  USER_REGISTER: 'USER_REGISTER',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_LOGIN_FAILED: 'USER_LOGIN_FAILED',
  TOKEN_REFRESH: 'TOKEN_REFRESH',
  
  // Profile management
  PROFILE_UPDATE: 'PROFILE_UPDATE',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  EMAIL_CHANGE: 'EMAIL_CHANGE',
  
  // Account management
  ACCOUNT_ACTIVATE: 'ACCOUNT_ACTIVATE',
  ACCOUNT_SUSPEND: 'ACCOUNT_SUSPEND',
  ACCOUNT_DELETE: 'ACCOUNT_DELETE',
  
  // Admin actions
  ROLE_CHANGE: 'ROLE_CHANGE',
  USER_IMPERSONATE: 'USER_IMPERSONATE',
  
  // Security
  PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_COMPLETE: 'PASSWORD_RESET_COMPLETE',
  EMAIL_VERIFICATION_SENT: 'EMAIL_VERIFICATION_SENT',
  EMAIL_VERIFIED: 'EMAIL_VERIFIED',
  
  // Sessions
  SESSION_CREATE: 'SESSION_CREATE',
  SESSION_REVOKE: 'SESSION_REVOKE',
  ALL_SESSIONS_REVOKE: 'ALL_SESSIONS_REVOKE'
}

/**
 * Resource types constants
 */
export const AUDIT_RESOURCES = {
  USER: 'USER',
  SESSION: 'SESSION',
  PROFILE: 'PROFILE',
  PASSWORD: 'PASSWORD',
  EMAIL: 'EMAIL',
  ROLE: 'ROLE'
}
