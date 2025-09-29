const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

const validatePassword = (password) => {
  const errors = [];

  if (!password) {
    errors.push({ field: 'password', message: 'Password is required' });
    return errors;
  }

  if (password.length < 8) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters long' });
  }

  if (password.length > 128) {
    errors.push({ field: 'password', message: 'Password must be less than 128 characters long' });
  }

  if (!/[a-z]/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain at least one lowercase letter' });
  }

  if (!/[A-Z]/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain at least one uppercase letter' });
  }

  if (!/\d/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain at least one number' });
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain at least one special character' });
  }

  // Check for common weak passwords
  const commonPasswords = [
    'password', 'password123', '123456', '123456789', 'qwerty',
    'abc123', 'password1', 'admin', 'letmein', 'welcome'
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push({ field: 'password', message: 'Password is too common. Please choose a stronger password' });
  }

  return errors;
};

const hashPassword = async (password) => {
  try {
    const validationErrors = validatePassword(password);
    if (validationErrors.length > 0) {
      throw new Error('Password validation failed');
    }

    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    console.error('❌ Password hashing failed:', error);
    throw new Error('Failed to process password');
  }
};

const comparePassword = async (plainPassword, hashedPassword) => {
  try {
    if (!plainPassword || !hashedPassword) {
      throw new Error('Password and hash are required for comparison');
    }

    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
    return isMatch;
  } catch (error) {
    console.error('❌ Password comparison failed:', error);
    throw new Error('Failed to verify password');
  }
};

module.exports = {
  validatePassword,
  hashPassword,
  comparePassword
};
