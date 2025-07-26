import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// load .env
dotenv.config()

// __dirname shim for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// SECURITY: HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
)

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

// RATE LIMITING
app.use(
  '/api/',
  rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS),
    message: { error: 'Too many requests from this IP, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  })
)

// BODY PARSING
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// COMPRESSION
app.use(compression())

// LOGGING
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
} else {
  app.use(morgan('combined'))
}

// STATIC UPLOADS
app.use('/uploads', express.static(path.join(__dirname, process.env.UPLOAD_PATH || 'uploads')))

// HEALTH CHECK
app.get('/health', (req, res) =>
  res.status(200).json({
    status: 'OK',
    message: 'CampusLink API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  })
)

// ROUTES (all relative to ./routes/)
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import announcementRoutes from './routes/announcements.js'
import complaintRoutes from './routes/complaints.js'
import lostFoundRoutes from './routes/lostFound.js'
import timetableRoutes from './routes/timetables.js'
import eduExchangeRoutes from './routes/eduExchange.js'
import studyConnectRoutes from './routes/studyConnect.js'
import eventRoutes from './routes/events.js'
import feedbackRoutes from './routes/feedback.js'
import reportRoutes from './routes/reports.js'
import sessionRoutes from './routes/sessions.js'
import growTogetherRoutes from './routes/growTogether.js'

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/announcements', announcementRoutes)
app.use('/api/complaints', complaintRoutes)
app.use('/api/lost-found', lostFoundRoutes)
app.use('/api/timetables', timetableRoutes)
app.use('/api/edu-exchange', eduExchangeRoutes)
app.use('/api/study-connect', studyConnectRoutes)
app.use('/api/events', eventRoutes)
app.use('/api/feedback', feedbackRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/sessions', sessionRoutes)
app.use('/api/grow-together', growTogetherRoutes)

// 404 & ERROR HANDLERS
import { notFound } from './middleware/notFound.js'
import { errorHandler } from './middleware/errorHandler.js'
app.use(notFound)
app.use(errorHandler)

// DATABASE CONNECTION
const connectDB = async () => {
  try {
    const uri =
      process.env.NODE_ENV === 'production'
        ? process.env.MONGODB_URI_PROD
        : process.env.MONGODB_URI
    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    console.log(`MongoDB Connected: ${conn.connection.host}`)
  } catch (err) {
    console.error('Database connection error:', err.message)
    process.exit(1)
  }
}

// START SERVER
const PORT = process.env.PORT || 5000
const startServer = async () => {
  await connectDB()
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`)
    console.log(`📊 Environment: ${process.env.NODE_ENV}`)
    console.log(`🔗 API URL: http://localhost:${PORT}/api`)
    console.log(`💚 Health Check: http://localhost:${PORT}/health`)
  })
}
startServer()

// GRACEFUL SHUTDOWN
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  process.exit(0)
})
process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  process.exit(0)
})

export default app
