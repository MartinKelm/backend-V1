import Joi from 'joi'

/**
 * User registration validation schema
 */
export const registerSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .max(255)
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
      'string.max': 'Email must be less than 255 characters'
    }),

  password: Joi.string()
    .min(8)
    .max(128)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password must be less than 128 characters long',
      'any.required': 'Password is required'
    }),

  firstName: Joi.string()
    .max(50)
    .optional()
    .allow('')
    .messages({
      'string.max': 'First name must be less than 50 characters'
    }),

  lastName: Joi.string()
    .max(50)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Last name must be less than 50 characters'
    }),

  company: Joi.string()
    .max(100)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Company name must be less than 100 characters'
    }),

  phone: Joi.string()
    .pattern(/^[\+]?[1-9][\d]{0,15}$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),

  website: Joi.string()
    .uri()
    .optional()
    .allow('')
    .messages({
      'string.uri': 'Please provide a valid website URL'
    })
})

/**
 * User login validation schema
 */
export const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),

  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
})

/**
 * Profile update validation schema
 */
export const updateProfileSchema = Joi.object({
  firstName: Joi.string()
    .max(50)
    .optional()
    .allow('')
    .messages({
      'string.max': 'First name must be less than 50 characters'
    }),

  lastName: Joi.string()
    .max(50)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Last name must be less than 50 characters'
    }),

  company: Joi.string()
    .max(100)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Company name must be less than 100 characters'
    }),

  phone: Joi.string()
    .pattern(/^[\+]?[1-9][\d]{0,15}$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),

  website: Joi.string()
    .uri()
    .optional()
    .allow('')
    .messages({
      'string.uri': 'Please provide a valid website URL'
    }),

  bio: Joi.string()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Bio must be less than 500 characters'
    })
})

/**
 * Password change validation schema
 */
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    }),

  newPassword: Joi.string()
    .min(8)
    .max(128)
    .required()
    .messages({
      'string.min': 'New password must be at least 8 characters long',
      'string.max': 'New password must be less than 128 characters long',
      'any.required': 'New password is required'
    })
})

/**
 * Refresh token validation schema
 */
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token is required'
    })
})

/**
 * Validate request body against schema
 */
export function validateRequest(schema, data) {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  })

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }))

    return {
      isValid: false,
      errors,
      data: null
    }
  }

  return {
    isValid: true,
    errors: [],
    data: value
  }
}
