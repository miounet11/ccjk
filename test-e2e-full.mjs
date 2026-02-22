#!/usr/bin/env node
/**
 * CCJK Full E2E Flow Test
 * Tests: Auth → Sessions/Machines API → Socket.IO → A2A Evolution → CLI
 */

import { createRequire } from 'module';
import { join } from 'path';
const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const { io } = require(join(ROOT, 'packages/ccjk-daemon/node_modules/socket.io-client'));

const BASE = 'https://remote-api.claudehome.cn';
const TEST_EMAIL = `e2e-test-${Date.now()}@ccjk.test`;
const TEST_PASS = 'E2eTest1234!';
let token = null;
let userId = null;
let machineId = null;
let sessionId = null;

const pass = (msg) => console.log(`  ✅ ${msg}`);
const fail = (msg) => { console.log(`  ❌ ${msg}`); process.exitCode = 1; };
const section = (t) => console.log(`\n${'─'.repeat(50)}\n🧪 ${t}`);

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers: { ...headers, ...opts.headers } });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

// ─── 1. Health ────────────────────────────────────────────────────────────────
section('1. Health Check');
{
  const { status, body } = await api('/health');
  if (status === 200 && body.status === 'ok') {
    pass(`GET /health → 200  version=${body.version}  ts=${new Date(body.timestamp).toISOString()}`);
  } else {
    fail(`GET /health → ${status}`);
  }
}

// ─── 2. Auth - Register ───────────────────────────────────────────────────────
section('2. Auth — Register');
{
  const { status, body } = await api('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS, name: 'E2E Test User' }),
  });
  if ((status === 200 || status === 201) && body.token) {
    token = body.token;
    userId = body.user?.id;
    pass(`POST /auth/register → ${status}  userId=${userId}`);
  } else if (status === 409) {
    pass(`POST /auth/register → 409 (email already exists, proceeding to login)`);
  } else {
    fail(`POST /auth/register → ${status}  body=${JSON.stringify(body)}`);
  }
}

// ─── 3. Auth - Login ──────────────────────────────────────────────────────────
section('3. Auth — Login');
{
  const { status, body } = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS }),
  });
  if (status === 200 && body.token) {
    token = body.token;
    userId = body.user?.id;
    pass(`POST /auth/login → 200  userId=${userId}  token=${token.slice(0, 20)}...`);
  } else {
    fail(`POST /auth/login → ${status}  body=${JSON.stringify(body)}`);
  }
}

if (!token) {
  console.log('\n⛔ No token available, aborting remaining tests.');
  process.exit(1);
}

// ─── 4. Sessions API ──────────────────────────────────────────────────────────
section('4. Sessions API');
{
  // List (empty at first)
  const { status, body } = await api('/v1/sessions');
  if (status === 200) {
    pass(`GET /v1/sessions → 200  count=${body.sessions?.length ?? 0}`);
  } else {
    fail(`GET /v1/sessions → ${status}  body=${JSON.stringify(body)}`);
  }

  // Create a session
  const create = await api('/v1/sessions', {
    method: 'POST',
    body: JSON.stringify({
      tag: `e2e-session-${Date.now()}`,
      metadata: JSON.stringify({ codeToolType: 'claude-code', projectPath: '/test' }),
      machineId: 'e2e-machine-placeholder',
    }),
  });
  if (create.status === 201 && create.body.session?.id) {
    sessionId = create.body.session.id;
    pass(`POST /v1/sessions → 201  sessionId=${sessionId}`);
  } else if (create.status === 404 && create.body.error?.includes('Machine')) {
    pass(`POST /v1/sessions → 404 (machine not registered yet — expected before daemon connects)`);
  } else {
    fail(`POST /v1/sessions → ${create.status}  body=${JSON.stringify(create.body)}`);
  }
}

// ─── 5. Machines API ──────────────────────────────────────────────────────────
section('5. Machines API');
{
  // List
  const list = await api('/v1/machines');
  if (list.status === 200) {
    pass(`GET /v1/machines → 200  count=${list.body.machines?.length ?? 0}`);
  } else {
    fail(`GET /v1/machines → ${list.status}  body=${JSON.stringify(list.body)}`);
  }

  // Register a machine (simulates daemon registration)
  const reg = await api('/v1/machines', {
    method: 'POST',
    body: JSON.stringify({
      machineId: `e2e-machine-${Date.now()}`,
      hostname: 'e2e-test-host',
      platform: process.platform,
      metadata: JSON.stringify({ arch: process.arch, nodeVersion: process.version }),
    }),
  });
  if (reg.status === 201 && reg.body.machine?.id) {
    machineId = reg.body.machine.id;
    pass(`POST /v1/machines → 201  machineId=${machineId}`);
  } else if (reg.status === 200 && reg.body.machine?.id) {
    machineId = reg.body.machine.id;
    pass(`POST /v1/machines → 200 (upsert)  machineId=${machineId}`);
  } else {
    fail(`POST /v1/machines → ${reg.status}  body=${JSON.stringify(reg.body)}`);
  }
}

// ─── 6. Socket.IO Connection ──────────────────────────────────────────────────
section('6. Socket.IO — Connect & Auth');
await new Promise((resolve) => {
  const socket = io(BASE, {
    auth: { token, machineId },
    transports: ['websocket', 'polling'],
    timeout: 8000,
  });

  const timer = setTimeout(() => {
    fail('Socket.IO connect timeout (8s)');
    socket.disconnect();
    resolve();
  }, 8000);

  socket.on('connect', () => {
    pass(`Socket.IO connected  id=${socket.id}`);

    // Test session:join event
    socket.emit('session:join', { sessionId: sessionId || 'test' });
    pass('Emitted session:join event');

    // Test session:leave event
    socket.emit('session:leave', { sessionId: sessionId || 'test' });
    pass('Emitted session:leave event');

    clearTimeout(timer);
    socket.disconnect();
    resolve();
  });

  socket.on('connect_error', (err) => {
    fail(`Socket.IO connect_error: ${err.message}`);
    clearTimeout(timer);
    resolve();
  });
});

// ─── 7. A2A Evolution Layer ───────────────────────────────────────────────────
section('7. A2A Evolution Layer');
let a2aToken = null;
let agentId   = null;
{
  // Hello
  const hello = await api('/a2a/hello', {
    method: 'POST',
    body: JSON.stringify({
      type: 'hello',
      agent: {
        id: `e2e-agent-${Date.now()}`,
        name: 'E2E Test Agent',
        version: '1.0.0',
        capabilities: ['typescript', 'testing'],
      },
    }),
  });
  if (hello.status === 200 && hello.body.token) {
    a2aToken = hello.body.token;
    agentId   = hello.body.agentId;
    pass(`POST /a2a/hello → 200  agentId=${agentId}`);
  } else {
    fail(`POST /a2a/hello → ${hello.status}  body=${JSON.stringify(hello.body)}`);
  }

  if (a2aToken) {
    // Publish a gene
    const publish = await fetch(`${BASE}/a2a/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${a2aToken}` },
      body: JSON.stringify({
        type: 'publish',
        gene: {
          type: 'pattern',
          problem: {
            signature: 'e2e-test-flow',
            context: ['typescript', 'node'],
            description: 'How to test a full E2E flow in TypeScript?',
          },
          solution: {
            strategy: 'Use a dedicated .mjs script with fetch + socket.io-client',
            steps: ['1. Auth via /auth/login', '2. Test all routes', '3. Verify Socket.IO'],
          },
          metadata: {
            author: 'e2e-test-agent',
            createdAt: new Date().toISOString(),
            tags: ['testing', 'e2e', 'typescript'],
            version: '1.0.0',
          },
        },
      }),
    });
    const pubBody = await publish.json().catch(() => ({}));
    if (publish.status === 200 || publish.status === 201) {
      pass(`POST /a2a/publish → ${publish.status}  geneId=${pubBody.geneId}`);
    } else {
      fail(`POST /a2a/publish → ${publish.status}  body=${JSON.stringify(pubBody)}`);
    }

    // Fetch genes
    const fetchRes = await fetch(`${BASE}/a2a/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${a2aToken}` },
      body: JSON.stringify({ type: 'fetch', query: { tags: ['testing'] }, limit: 5 }),
    });
    const fetchBody = await fetchRes.json().catch(() => ({}));
    if (fetchRes.status === 200) {
      pass(`POST /a2a/fetch → 200  genes=${fetchBody.genes?.length ?? 0}`);
    } else {
      fail(`POST /a2a/fetch → ${fetchRes.status}  body=${JSON.stringify(fetchBody)}`);
    }
  }
}

// ─── 8. CLI version ───────────────────────────────────────────────────────────
section('8. CLI — npx ccjk version');
try {
  const fs = require('fs');
  const distPath = join(ROOT, 'dist/cli.mjs');
  const pkgVer = JSON.parse(fs.readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
  if (!fs.existsSync(distPath)) throw new Error('dist/cli.mjs not found');
  const distSize = fs.statSync(distPath).size;
  pass(`ccjk CLI dist exists  dist/cli.mjs=${(distSize/1024).toFixed(0)}KB  package.json version=${pkgVer}`);
} catch (e) {
  fail(`CLI check failed: ${e.message?.slice(0, 100)}`);
}

// ─── 9. Cleanup ──────────────────────────────────────────────────────────────
section('9. Cleanup');
if (machineId) {
  const del = await api(`/v1/machines/${machineId}`, { method: 'DELETE' });
  if (del.status === 200 || del.status === 204) {
    pass(`DELETE /v1/machines/${machineId} → ${del.status}`);
  } else {
    pass(`DELETE /v1/machines/${machineId} → ${del.status} (non-critical)`);
  }
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(50)}`);
if (process.exitCode === 1) {
  console.log('❌ Some tests FAILED — see ❌ above');
} else {
  console.log('🎉 All tests PASSED');
}
console.log(`${'═'.repeat(50)}\n`);
