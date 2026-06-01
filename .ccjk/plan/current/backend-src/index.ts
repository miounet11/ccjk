/**
 * CCJK Provider Registry API
 *
 * Cloudflare Workers + Hono + D1 实现
 *
 * 部署步骤:
 * 1. npm create cloudflare@latest ccjk-provider-api
 * 2. npm install hono
 * 3. 复制此文件到 src/index.ts
 * 4. 配置 wrangler.toml
 * 5. npx wrangler d1 create ccjk-providers
 * 6. npx wrangler d1 execute ccjk-providers --file=./schema.sql
 * 7. npx wrangler deploy
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'

// ============================================================================
// Types
// ============================================================================

interface Env {
  DB: D1Database
}

interface ProviderRow {
  id: number
  shortcode: string
  name: string
  api_url: string
  description: string | null
  models: string | null
  category: string
  status: string
  verified: number
  created_at: string
  created_by: string | null
  updated_at: string
  usage_count: number
}

interface CreateProviderRequest {
  shortcode: string
  name: string
  apiUrl: string
  description?: string
  models?: string[]
}

// ============================================================================
// Constants
// ============================================================================

const RESERVED_SHORTCODES = new Set([
  // CLI 命令
  'help', 'menu', 'init', 'setup', 'config', 'update', 'doctor',
  'mcp', 'skills', 'agents', 'hooks', 'api', 'cloud', 'system',
  'version', 'test', 'debug', 'serve', 'daemon', 'commit',
  // 系统保留
  'admin', 'root', 'official', 'ccjk', 'claude', 'anthropic',
  'openai', 'google', 'microsoft', 'meta', 'aws', 'azure',
  // 通用保留
  'null', 'undefined', 'true', 'false', 'new', 'delete'
])

// ============================================================================
// Validation Functions
// ============================================================================

function isValidShortcode(shortcode: string): { valid: boolean; error?: string } {
  if (!shortcode) {
    return { valid: false, error: 'Shortcode is required' }
  }

  const normalized = shortcode.toLowerCase().trim()

  if (normalized.length < 2) {
    return { valid: false, error: 'Shortcode must be at least 2 characters' }
  }

  if (normalized.length > 20) {
    return { valid: false, error: 'Shortcode must be at most 20 characters' }
  }

  // 格式验证: 小写字母、数字、连字符，不能以连字符开头或结尾
  const pattern = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]{1,2}$/
  if (!pattern.test(normalized)) {
    return {
      valid: false,
      error: 'Shortcode must contain only lowercase letters, numbers, and hyphens, cannot start/end with hyphen'
    }
  }

  // 禁止纯数字（避免与端口混淆）
  if (/^\d+$/.test(normalized)) {
    return { valid: false, error: 'Shortcode cannot be purely numeric' }
  }

  // 保留词检查
  if (RESERVED_SHORTCODES.has(normalized)) {
    return { valid: false, error: `Shortcode '${normalized}' is reserved` }
  }

  return { valid: true }
}

function isValidApiUrl(url: string): { valid: boolean; error?: string } {
  if (!url) {
    return { valid: false, error: 'API URL is required' }
  }

  try {
    const parsed = new URL(url)

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'API URL must use HTTP or HTTPS protocol' }
    }

    // 生产环境禁止 localhost
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return { valid: false, error: 'API URL cannot be localhost' }
    }

    return { valid: true }
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }
}

function sanitizeText(text: string, maxLength: number = 200): string {
  return text
    .replace(/[<>]/g, '') // 移除 HTML 标签字符
    .trim()
    .slice(0, maxLength)
}

// ============================================================================
// Response Helpers
// ============================================================================

function successResponse<T>(data: T, status: number = 200) {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString()
  }
}

function errorResponse(code: string, message: string) {
  return {
    success: false,
    error: { code, message },
    timestamp: new Date().toISOString()
  }
}

function rowToProvider(row: ProviderRow) {
  return {
    shortcode: row.shortcode,
    name: row.name,
    apiUrl: row.api_url,
    description: row.description,
    models: row.models ? JSON.parse(row.models) : [],
    category: row.category,
    status: row.status,
    verified: !!row.verified,
    createdAt: row.created_at,
  }
}

// ============================================================================
// App Setup
// ============================================================================

const app = new Hono<{ Bindings: Env }>()

// CORS
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  maxAge: 86400,
}))

// Health check
app.get('/', (c) => {
  return c.json({
    service: 'CCJK Provider Registry',
    version: '1.0.0',
    status: 'healthy'
  })
})

app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

// ============================================================================
// API Routes
// ============================================================================

/**
 * GET /v1/providers/:shortcode
 * 查询单个供应商
 */
app.get('/v1/providers/:shortcode', async (c) => {
  const shortcode = c.req.param('shortcode').toLowerCase().trim()

  try {
    const result = await c.env.DB.prepare(`
      SELECT * FROM providers
      WHERE shortcode = ? AND status != 'deprecated'
    `).bind(shortcode).first<ProviderRow>()

    if (!result) {
      return c.json(errorResponse('PROVIDER_NOT_FOUND', `Provider '${shortcode}' not found`), 404)
    }

    // 可选: 更新使用计数
    c.executionCtx.waitUntil(
      c.env.DB.prepare(`
        UPDATE providers SET usage_count = usage_count + 1 WHERE shortcode = ?
      `).bind(shortcode).run()
    )

    return c.json(successResponse(rowToProvider(result)))
  } catch (error) {
    console.error('Database error:', error)
    return c.json(errorResponse('INTERNAL_ERROR', 'Internal server error'), 500)
  }
})

/**
 * POST /v1/providers
 * 创建新供应商
 */
app.post('/v1/providers', async (c) => {
  let body: CreateProviderRequest

  try {
    body = await c.req.json()
  } catch {
    return c.json(errorResponse('INVALID_REQUEST', 'Invalid JSON body'), 400)
  }

  const { shortcode, name, apiUrl, description, models } = body

  // 验证 shortcode
  const shortcodeValidation = isValidShortcode(shortcode)
  if (!shortcodeValidation.valid) {
    return c.json(errorResponse('INVALID_SHORTCODE', shortcodeValidation.error!), 400)
  }

  // 验证 name
  if (!name || name.trim().length === 0) {
    return c.json(errorResponse('INVALID_REQUEST', 'Name is required'), 400)
  }
  if (name.length > 50) {
    return c.json(errorResponse('INVALID_REQUEST', 'Name must be at most 50 characters'), 400)
  }

  // 验证 apiUrl
  const urlValidation = isValidApiUrl(apiUrl)
  if (!urlValidation.valid) {
    return c.json(errorResponse('INVALID_API_URL', urlValidation.error!), 400)
  }

  // 验证 models
  if (models && (!Array.isArray(models) || models.length > 20)) {
    return c.json(errorResponse('INVALID_REQUEST', 'Models must be an array with at most 20 items'), 400)
  }

  const normalizedShortcode = shortcode.toLowerCase().trim()
  const sanitizedName = sanitizeText(name, 50)
  const sanitizedDescription = description ? sanitizeText(description, 200) : null
  const modelsJson = models ? JSON.stringify(models) : null

  try {
    // 检查是否已存在
    const existing = await c.env.DB.prepare(`
      SELECT shortcode FROM providers WHERE shortcode = ?
    `).bind(normalizedShortcode).first()

    if (existing) {
      return c.json(errorResponse('SHORTCODE_EXISTS', `Shortcode '${normalizedShortcode}' already exists`), 409)
    }

    // 获取客户端 IP 的 hash 作为 created_by
    const clientIP = c.req.header('CF-Connecting-IP') || 'unknown'
    const createdBy = await hashIP(clientIP)

    // 插入数据
    await c.env.DB.prepare(`
      INSERT INTO providers (shortcode, name, api_url, description, models, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      normalizedShortcode,
      sanitizedName,
      apiUrl.trim(),
      sanitizedDescription,
      modelsJson,
      createdBy
    ).run()

    // 查询插入的数据
    const inserted = await c.env.DB.prepare(`
      SELECT * FROM providers WHERE shortcode = ?
    `).bind(normalizedShortcode).first<ProviderRow>()

    return c.json(successResponse(rowToProvider(inserted!)), 201)
  } catch (error) {
    console.error('Database error:', error)
    return c.json(errorResponse('INTERNAL_ERROR', 'Internal server error'), 500)
  }
})

/**
 * GET /v1/providers
 * 获取供应商列表
 */
app.get('/v1/providers', async (c) => {
  const category = c.req.query('category')
  const verified = c.req.query('verified')
  const status = c.req.query('status') || 'active'
  const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '50'), 1), 100)
  const offset = Math.max(parseInt(c.req.query('offset') || '0'), 0)
  const sort = c.req.query('sort') || 'created_at'
  const order = c.req.query('order') === 'asc' ? 'ASC' : 'DESC'

  // 验证排序字段
  const allowedSortFields = ['created_at', 'name', 'usage_count', 'shortcode']
  const sortField = allowedSortFields.includes(sort) ? sort : 'created_at'

  try {
    // 构建查询条件
    const conditions: string[] = ['status = ?']
    const params: (string | number)[] = [status]

    if (category) {
      conditions.push('category = ?')
      params.push(category)
    }

    if (verified !== undefined) {
      conditions.push('verified = ?')
      params.push(verified === 'true' ? 1 : 0)
    }

    const whereClause = conditions.join(' AND ')

    // 查询总数
    const countResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as total FROM providers WHERE ${whereClause}
    `).bind(...params).first<{ total: number }>()

    const total = countResult?.total || 0

    // 查询数据
    const results = await c.env.DB.prepare(`
      SELECT * FROM providers
      WHERE ${whereClause}
      ORDER BY ${sortField} ${order}
      LIMIT ? OFFSET ?
    `).bind(...params, limit, offset).all<ProviderRow>()

    const providers = results.results?.map(row => ({
      shortcode: row.shortcode,
      name: row.name,
      apiUrl: row.api_url,
      description: row.description,
      category: row.category,
      verified: !!row.verified,
    })) || []

    return c.json(successResponse({
      providers,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + providers.length < total
      }
    }))
  } catch (error) {
    console.error('Database error:', error)
    return c.json(errorResponse('INTERNAL_ERROR', 'Internal server error'), 500)
  }
})

// ============================================================================
// Utility Functions
// ============================================================================

async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(ip + 'ccjk-salt-2026')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ============================================================================
// 404 Handler
// ============================================================================

app.notFound((c) => {
  return c.json(errorResponse('NOT_FOUND', 'Endpoint not found'), 404)
})

// ============================================================================
// Error Handler
// ============================================================================

app.onError((err, c) => {
  console.error('Unhandled error:', err)
  return c.json(errorResponse('INTERNAL_ERROR', 'Internal server error'), 500)
})

// ============================================================================
// Export
// ============================================================================

export default app
