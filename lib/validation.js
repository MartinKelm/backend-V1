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
      'string.empty': 'Vorname ist erforderlich',
      'string.min': 'Vorname muss mindestens 2 Zeichen lang sein',
      'string.max': 'Vorname darf maximal 50 Zeichen lang sein',
      'string.pattern.base': 'Vorname enthält ungültige Zeichen'
    }),

  lastName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-ZäöüÄÖÜß\s-']+$/)
    .required()
    .messages({
      'string.empty': 'Nachname ist erforderlich',
      'string.min': 'Nachname muss mindestens 2 Zeichen lang sein',
      'string.max': 'Nachname darf maximal 50 Zeichen lang sein',
      'string.pattern.base': 'Nachname enthält ungültige Zeichen'
    }),

  email: Joi.string()
    .trim()
    .lowercase()
    .email({ tlds: { allow: false } })
    .max(255)
    .required()
    .messages({
      'string.empty': 'E-Mail ist erforderlich',
      'string.email': 'Bitte geben Sie eine gültige E-Mail-Adresse ein',
      'string.max': 'E-Mail darf maximal 255 Zeichen lang sein'
    }),

  password: Joi.string()
    .min(8)
    .max(128)
    .required()
    .messages({
      'string.empty': 'Passwort ist erforderlich',
      'string.min': 'Passwort muss mindestens 8 Zeichen lang sein',
      'string.max': 'Passwort darf maximal 128 Zeichen lang sein'
    }),

  // Company information - all required except website
  companyName: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Firmenname ist erforderlich',
      'string.min': 'Firmenname muss mindestens 2 Zeichen lang sein',
      'string.max': 'Firmenname darf maximal 100 Zeichen lang sein'
    }),

  industry: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Branche ist erforderlich',
      'string.min': 'Branche muss mindestens 2 Zeichen lang sein',
      'string.max': 'Branche darf maximal 100 Zeichen lang sein'
    }),

  website: Joi.string()
    .trim()
    .uri({ scheme: ['http', 'https'] })
    .max(255)
    .optional()
    .allow('')
    .messages({
      'string.uri': 'Website muss eine gültige URL sein',
      'string.max': 'Website darf maximal 255 Zeichen lang sein'
    }),

  phone: Joi.string()
    .trim()
    .pattern(/^[\+]?[0-9\s\-\(\)]{7,20}$/)
    .required()
    .messages({
      'string.empty': 'Telefon ist erforderlich',
      'string.pattern.base': 'Telefonnummer hat ein ungültiges Format'
    }),

  address: Joi.string()
    .trim()
    .min(5)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Adresse ist erforderlich',
      'string.min': 'Adresse muss mindestens 5 Zeichen lang sein',
      'string.max': 'Adresse darf maximal 200 Zeichen lang sein'
    }),

  postalCode: Joi.string()
    .trim()
    .pattern(/^[0-9]{5}$/)
    .required()
    .messages({
      'string.empty': 'PLZ ist erforderlich',
      'string.pattern.base': 'PLZ muss 5 Ziffern enthalten'
    }),

  city: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Stadt ist erforderlich',
      'string.min': 'Stadt muss mindestens 2 Zeichen lang sein',
      'string.max': 'Stadt darf maximal 100 Zeichen lang sein'
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
      'string.empty': 'E-Mail ist erforderlich',
      'string.email': 'Bitte geben Sie eine gültige E-Mail-Adresse ein'
    }),

  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Passwort ist erforderlich'
    })
});

// User update validation schema
const updateUserSchema = Joi.object({
  firstName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-ZäöüÄÖÜß\s-']+$/)
    .optional()
    .messages({
      'string.min': 'Vorname muss mindestens 2 Zeichen lang sein',
      'string.max': 'Vorname darf maximal 50 Zeichen lang sein',
      'string.pattern.base': 'Vorname enthält ungültige Zeichen'
    }),

  lastName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-ZäöüÄÖÜß\s-']+$/)
    .optional()
    .messages({
      'string.min': 'Nachname muss mindestens 2 Zeichen lang sein',
      'string.max': 'Nachname darf maximal 50 Zeichen lang sein',
      'string.pattern.base': 'Nachname enthält ungültige Zeichen'
    }),

  companyName: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Firmenname muss mindestens 2 Zeichen lang sein',
      'string.max': 'Firmenname darf maximal 100 Zeichen lang sein'
    }),

  industry: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Branche muss mindestens 2 Zeichen lang sein',
      'string.max': 'Branche darf maximal 100 Zeichen lang sein'
    }),

  website: Joi.string()
    .trim()
    .uri({ scheme: ['http', 'https'] })
    .max(255)
    .optional()
    .allow('')
    .messages({
      'string.uri': 'Website muss eine gültige URL sein',
      'string.max': 'Website darf maximal 255 Zeichen lang sein'
    }),

  phone: Joi.string()
    .trim()
    .pattern(/^[\+]?[0-9\s\-\(\)]{7,20}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Telefonnummer hat ein ungültiges Format'
    }),

  address: Joi.string()
    .trim()
    .min(5)
    .max(200)
    .optional()
    .messages({
      'string.min': 'Adresse muss mindestens 5 Zeichen lang sein',
      'string.max': 'Adresse darf maximal 200 Zeichen lang sein'
    }),

  postalCode: Joi.string()
    .trim()
    .pattern(/^[0-9]{5}$/)
    .optional()
    .messages({
      'string.pattern.base': 'PLZ muss 5 Ziffern enthalten'
    }),

  city: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Stadt muss mindestens 2 Zeichen lang sein',
      'string.max': 'Stadt darf maximal 100 Zeichen lang sein'
    }),

  role: Joi.string()
    .valid('USER', 'ADMIN', 'SUPER_ADMIN')
    .optional(),

  isActive: Joi.boolean()
    .optional()
});

// Middleware to validate request body
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: true 
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

    next();
  };
};

module.exports = {
  registerSchema,
  loginSchema,
  updateUserSchema,
  validateRequest
};
