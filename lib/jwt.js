import jwt from 'jsonwebtoken'
import { prisma } from './database.js'

const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d'

/**
 * Generate access token
 */
export function generateAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'smk-auth',
    audience: 'smk-frontend'
  })
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(payload) {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'smk-auth',
    audience: 'smk-frontend'
  })
}

/**
 * Verify access token
 */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'smk-auth',
      audience: 'smk-frontend'
    })
  } catch (error) {
    throw new Error('Invalid or expired access token')
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'smk-auth',
      audience: 'smk-frontend'
    })
  } catch (error) {
    throw new Error('Invalid or expired refresh token')
  }
}

/**
 * Generate token pair (access + refresh)
 */
export async function generateTokenPair(user, ipAddress, userAgent) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    status: user.status
  }

  const accessToken = generateAccessToken(payload)
  const refreshToken = generateRefreshToken({ userId: user.id })

  // Store refresh token in database
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30) // 30 days

  await prisma.session.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt,
      ipAddress,
      userAgent
    }
  })

  return {
    accessToken,
    refreshToken,
    expiresIn: JWT_EXPIRES_IN
  }
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(refreshToken, ipAddress, userAgent) {
  // Verify refresh token
  const decoded = verifyRefreshToken(refreshToken)
  
  // Check if session exists and is valid
  const session = await prisma.session.findFirst({
    where: {
      token: refreshToken,
      userId: decoded.userId,
      expiresAt: {
        gt: new Date()
      }
    },
    include: {
      user: true
    }
  })

  if (!session) {
    throw new Error('Invalid or expired refresh token')
  }

  // Check if user is still active
  if (session.user.status !== 'ACTIVE') {
    throw new Error('User account is not active')
  }

  // Generate new access token
  const payload = {
    userId: session.user.id,
    email: session.user.email,
    role: session.user.role,
    status: session.user.status
  }

  const accessToken = generateAccessToken(payload)

  // Update session with new IP/User Agent if provided
  if (ipAddress || userAgent) {
    await prisma.session.update({
      where: { id: session.id },
      data: {
        ipAddress: ipAddress || session.ipAddress,
        userAgent: userAgent || session.userAgent
      }
    })
  }

  return {
    accessToken,
    refreshToken,
    expiresIn: JWT_EXPIRES_IN,
    user: {
      id: session.user.id,
      email: session.user.email,
      firstName: session.user.firstName,
      lastName: session.user.lastName,
      role: session.user.role,
      status: session.user.status
    }
  }
}

/**
 * Revoke refresh token
 */
export async function revokeRefreshToken(refreshToken) {
  await prisma.session.deleteMany({
    where: {
      token: refreshToken
    }
  })
}

/**
 * Revoke all user sessions
 */
export async function revokeAllUserSessions(userId) {
  await prisma.session.deleteMany({
    where: {
      userId
    }
  })
}
