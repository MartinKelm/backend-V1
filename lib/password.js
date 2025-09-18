import bcrypt from 'bcryptjs'

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12

/**
 * Hash password
 */
export async function hashPassword(password) {
  return await bcrypt.hash(password, BCRYPT_ROUNDS)
}

/**
 * Compare password with hash
 */
export async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash)
}

/**
 * Validate password strength
 */
export function validatePassword(password) {
  const errors = []

  if (!password) {
    errors.push('Password is required')
    return { isValid: false, errors }
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  if (password.length > 128) {
    errors.push('Password must be less than 128 characters long')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  // Check for common weak passwords
  const commonPasswords = [
    'password', 'password123', '123456', '123456789', 'qwerty',
    'abc123', 'password1', 'admin', 'letmein', 'welcome'
  ]

  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common, please choose a stronger password')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}
