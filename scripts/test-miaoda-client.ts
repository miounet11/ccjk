/**
 * Live integration test for MiaodaClient
 * Tests against https://api.claudehome.cn
 * Only tests routes confirmed to be live on the server.
 */
import { MiaodaClient } from '../src/cloud-client/miaoda-client'

const BASE = 'https://api.claudehome.cn'
const EMAIL = `test_ccjk_${Date.now()}@mailinator.com`
const PASS = 'TestPass123!'

function ok(label: string, cond: boolean, detail?: unknown) {
  const icon = cond ? '✓' : '✗'
  console.log(`${icon} ${label}`, detail !== undefined ? JSON.stringify(detail) : '')
  if (!cond) process.exitCode = 1
}

async function main() {
  const client = new MiaodaClient({ baseURL: BASE })

  // --- Health ---
  console.log('\n=== Health ===')
  const health = await client.health()
  ok('health ok', health.ok, health.data)

  // --- Register ---
  console.log('\n=== Register ===')
  const reg = await client.register(EMAIL, PASS)
  ok('register ok', reg.ok, reg.data)
  ok('register: user email', reg.data?.user?.email === EMAIL)
  ok('register: token set', !!client.getAccessToken())
  console.log('  token:', client.getAccessToken()?.slice(0, 40) + '...')

  // --- Login (fresh client, no token) ---
  console.log('\n=== Login ===')
  const client2 = new MiaodaClient({ baseURL: BASE })
  const login = await client2.login(EMAIL, PASS)
  ok('login ok', login.ok, login.data)
  ok('login: token set', !!client2.getAccessToken())

  // --- Login with wrong password ---
  console.log('\n=== Login (wrong password) ===')
  const bad = await client2.login(EMAIL, 'wrongpassword')
  ok('wrong password returns error', !bad.ok, bad.error)

  console.log('\n=== Done ===')
}

main().catch(console.error)
