import { Hono } from 'hono'

const health = new Hono()

health.get('/', (c) => {
  return c.json({
    success: true,
    service: 'CCJK Cloud API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  })
})

health.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

export default health
