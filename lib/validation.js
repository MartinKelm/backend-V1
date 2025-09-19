const Joi = require('joi');

// User registration validation schema
const registerSchema = Joi.object({
  firstName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-ZäöüÄÖÜß\s-']+$/)
    .required()
    .messages({
      'string.empty': 'First name is required',
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name must be less than 50 characters long',
      'string.pattern.base': 'First name contains invalid characters'
    }),

  lastName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-ZäöüÄÖÜß\s-']+$/)
    .required()
    .messages({
      'string.empty': 'Last name is required',
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name must be less than 50 characters long',
      'string.pattern.base': 'Last name contains invalid characters'
    }),

  email: Joi.string()
    .trim()
    .lowercase()
    .email({ tlds: { allow: false } })
    .max(255)
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
      'string.max': 'Email must be less than 255 characters long'
    }),

  password: Joi.string()
    .min(8)
    .max(128)
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password must be less than 128 characters long'
    }),

  company: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .optional()
    .allow('')
    .messages({
      'string.min': 'Company name must be at least 2 characters long',
      'string.max': 'Company name must be less than 100 characters long'
    })
});

// User login validation schema
const loginSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address'
    }),

  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password is required'
    })
});

// Admin creation validation schema
const adminSchema = Joi.object({
  firstName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-ZäöüÄÖÜß\s-']+$/)
    .required(),

  lastName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-ZäöüÄÖÜß\s-']+$/)
    .required(),

  email: Joi.string()
    .trim()
    .lowercase()
    .email({ tlds: { allow: false } })
    .required(),

  password: Joi.string()
    .min(8)
    .max(128)
    .required(),

  role: Joi.string()
    .valid('ADMIN', 'SUPER_ADMIN')
    .default('ADMIN')
});

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

// Email validation helper
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Sanitize user input
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
};

module.exports = {
  registerSchema,
  loginSchema,
  adminSchema,
  validateRequest,
  isValidEmail,
  sanitizeInput
};
