// CCJK Cloud API - Main Application

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import authRoutes from './routes/daemon'
import healthRoutes from './routes/health'

export const app = new Hono()

// Middleware
app.use('*', cors())
app.use('*', logger())

// Routes
app.route('/', healthRoutes)
app.route('/v1/daemon', authRoutes)

// Error handling
app.onError((err, c) => {
  console.error('Error:', err)
  return c.json({
    success: false,
    error: err.message || 'Internal server error',
  }, 500)
})

// Not found
app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Not found',
  }, 404)
})
