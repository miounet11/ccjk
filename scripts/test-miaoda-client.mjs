/**
 * Miaoda Client Integration Test
 * Tests against https://api.claudehome.cn
 */

import { createMiaodaClient } from '../dist/chunks/index5.mjs'

const BASE_URL = 'https://api.claudehome.cn'
const TEST_EMAIL = `test_ccjk_${Date.now()}@mailinator.com`
const TEST_PASS = 'TestPass123'

let pass = 0
let fail = 0

function ok(label, val) {
  console.log(`  ✓ ${label}`, val !== undefined ? JSON.stringify(val).slice(0, 120) : '')
  pass++
}
function err(label, e) {
  console.log(`  ✗ ${label}:`, e?.message || e)
  fail++
}

const client = createMiaodaClient({ baseUrl: BASE_URL })

console.log('\n=== 1. Health ===')
try {
  const r = await client.health()
  ok('health', r)
} catch(e) { err('health', e) }

console.log('\n=== 2. Register ===')
let tokens
try {
  const r = await client.register(TEST_EMAIL, TEST_PASS)
  tokens = r
  ok('register', { email: TEST_EMAIL, hasAccess: !!r?.accessToken, hasRefresh: !!r?.refreshToken })
} catch(e) { err('register', e) }

console.log('\n=== 3. Login ===')
try {
  const r = await client.login(TEST_EMAIL, TEST_PASS)
  tokens = r
  ok('login', { hasAccess: !!r?.accessToken, hasRefresh: !!r?.refreshToken })
} catch(e) { err('login', e) }

console.log('\n=== 4. User Profile ===')
try {
  const r = await client.getProfile()
  ok('getProfile', { email: r?.email, plan: r?.plan })
} catch(e) { err('getProfile', e) }

console.log('\n=== 5. LLM Models ===')
try {
  const r = await client.getModels()
  ok('getModels', Array.isArray(r) ? `${r.length} models` : r)
} catch(e) { err('getModels', e) }

console.log('\n=== 6. Usage ===')
try {
  const r = await client.getCurrentUsage()
  ok('getCurrentUsage', r)
} catch(e) { err('getCurrentUsage', e) }

console.log('\n=== 7. Subscription ===')
try {
  const r = await client.getSubscription()
  ok('getSubscription', r)
} catch(e) { err('getSubscription', e) }

console.log('\n=== 8. API Keys ===')
try {
  const r = await client.listApiKeys()
  ok('listApiKeys', r)
} catch(e) { err('listApiKeys', e) }

console.log('\n=== 9. Token Refresh ===')
try {
  const r = await client.refresh()
  ok('refresh', { hasAccess: !!r?.accessToken })
} catch(e) { err('refresh', e) }

console.log('\n=== 10. LLM Complete ===')
try {
  const r = await client.complete([{ role: 'user', content: 'Say "pong" only.' }], { maxTokens: 10 })
  ok('complete', r)
} catch(e) { err('complete', e) }

console.log(`\n${'='.repeat(40)}`)
console.log(`Results: ${pass} passed, ${fail} failed`)
console.log('='.repeat(40))
