import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { generalLimiter } from './middleware/rateLimiter.js'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}))

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      process.env.PRODUCTION_FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:5173',
      'https://vorschau.socialmediakampagnen.com'
    ].filter(Boolean)

    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      console.log('CORS blocked origin:', origin)
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}

app.use(cors(corsOptions))

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Rate limiting
app.use(generalLimiter)

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`)
  next()
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'SMK Authentication API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
})

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'SMK Authentication API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
})

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  })
})

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error)

  // CORS error
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation'
    })
  }

  // JSON parsing error
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body'
    })
  }

  // Default error response
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 SMK Authentication API running on port ${PORT}`)
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL}, ${process.env.PRODUCTION_FRONTEND_URL}`)
  console.log(`💾 Database: Connected to Neon PostgreSQL`)
  console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? 'Configured' : 'Missing!'}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  process.exit(0)
})
