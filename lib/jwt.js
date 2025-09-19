const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const generateToken = (payload) => {
  try {
    return jwt.sign(payload, JWT_SECRET, { 
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'smk-auth',
      audience: 'smk-frontend'
    });
  } catch (error) {
    console.error('❌ Token generation failed:', error);
    throw new Error('Failed to generate authentication token');
  }
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'smk-auth',
      audience: 'smk-frontend'
    });
  } catch (error) {
    console.error('❌ Token verification failed:', error);
    
    if (error.name === 'TokenExpiredError') {
      throw new Error('Authentication token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid authentication token');
    } else if (error.name === 'NotBeforeError') {
      throw new Error('Authentication token not active yet');
    }
    
    throw new Error('Token verification failed');
  }
};

const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) {
    throw new Error('Authorization header is required');
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Authorization header must start with "Bearer "');
  }

  const token = authHeader.substring(7);
  if (!token) {
    throw new Error('Authentication token is required');
  }

  return token;
};

module.exports = {
  generateToken,
  verifyToken,
  extractTokenFromHeader
};
