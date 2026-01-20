// CCJK Cloud API - Entry Point

import { serve } from '@hono/node-server'
import { app } from './app'
import { env } from './env'

console.log(`
╔═══════════════════════════════════════════════════════════════
  🚀 CCJK Cloud API
  ║ Version: 1.0.0
  ║ Port: ${env.PORT}
  ║ Environment: ${env.NODE_ENV}
  ║ Database: ${env.DATABASE_URL ? 'Connected' : 'Not configured'}
  ╚═══════════════════════════════════════════════════════════════
`)

serve({
  fetch: app.fetch,
  port: Number(env.PORT),
})
