import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

// vi.mock factory is hoisted — cannot reference local variables.
// Use a fixed temp path instead.
const TEMP_BASE = join(tmpdir(), 'ccjk-health-checks-fixed')

vi.mock('../../src/constants', () => {
  const { join } = require('node:path')
  const { tmpdir } = require('node:os')
  const base = join(tmpdir(), 'ccjk-health-checks-fixed')
  return {
    SETTINGS_FILE: join(base, 'settings.json'),
    CLAUDE_AGENTS_DIR: join(base, 'agents'),
    CCJK_SKILLS_DIR: join(base, 'skills'),
  }
})

import { mcpCheck } from '../../src/health/checks/mcp-check'
import { permissionsCheck } from '../../src/health/checks/permissions-check'
import { modelCheck } from '../../src/health/checks/model-check'
import { skillsCheck } from '../../src/health/checks/skills-check'
import { agentsCheck } from '../../src/health/checks/agents-check'

const mockSettingsFile = join(TEMP_BASE, 'settings.json')
const mockAgentsDir = join(TEMP_BASE, 'agents')
const mockSkillsDir = join(TEMP_BASE, 'skills')

beforeAll(() => {
  mkdirSync(TEMP_BASE, { recursive: true })
})

afterAll(() => {
  rmSync(TEMP_BASE, { recursive: true, force: true })
})

afterEach(() => {
  if (existsSync(mockSettingsFile)) rmSync(mockSettingsFile)
  if (existsSync(mockAgentsDir)) rmSync(mockAgentsDir, { recursive: true })
  if (existsSync(mockSkillsDir)) rmSync(mockSkillsDir, { recursive: true })
})

// ============================================================================
// MCP Check
// ============================================================================
describe('mcpCheck', () => {
  it('fails when no settings file exists', async () => {
    const r = await mcpCheck.check()
    expect(r.status).toBe('fail')
    expect(r.score).toBe(0)
  })

  it('fails when no MCP servers configured', async () => {
    writeFileSync(mockSettingsFile, JSON.stringify({ mcpServers: {} }))
    const r = await mcpCheck.check()
    expect(r.status).toBe('fail')
    expect(r.score).toBe(0)
  })

  it('warns when few servers and no essentials', async () => {
    writeFileSync(mockSettingsFile, JSON.stringify({
      mcpServers: { 'some-tool': { command: 'node' } },
    }))
    const r = await mcpCheck.check()
    expect(r.score).toBe(20)
    expect(r.status).toBe('warn')
  })

  it('passes with essential service context7', async () => {
    writeFileSync(mockSettingsFile, JSON.stringify({
      mcpServers: {
        context7: { command: 'npx' },
        'another-tool': { command: 'node' },
        'third-tool': { command: 'node' },
      },
    }))
    const r = await mcpCheck.check()
    // 3*20 + 1*20 = 80
    expect(r.score).toBe(80)
    expect(r.status).toBe('pass')
  })

  it('caps score at 100', async () => {
    const servers: Record<string, any> = {}
    for (let i = 0; i < 10; i++) servers[`srv-${i}`] = { command: 'node' }
    servers.context7 = { command: 'npx' }
    writeFileSync(mockSettingsFile, JSON.stringify({ mcpServers: servers }))
    const r = await mcpCheck.check()
    expect(r.score).toBe(100)
  })

  it('has weight 8', () => {
    expect(mcpCheck.weight).toBe(8)
  })
})

// ============================================================================
// Permissions Check
// ============================================================================
describe('permissionsCheck', () => {
  it('warns when no settings file', async () => {
    const r = await permissionsCheck.check()
    expect(r.status).toBe('warn')
    expect(r.score).toBe(30)
  })

  it('warns when no permissions configured', async () => {
    writeFileSync(mockSettingsFile, JSON.stringify({ permissions: { allow: [] } }))
    const r = await permissionsCheck.check()
    expect(r.status).toBe('warn')
    expect(r.score).toBe(40)
  })

  it('warns when invalid permissions found', async () => {
    writeFileSync(mockSettingsFile, JSON.stringify({
      permissions: { allow: ['Read(*)', 'AllowEdit', 'AllowWrite'] },
    }))
    const r = await permissionsCheck.check()
    expect(r.status).toBe('warn')
    expect(r.score).toBe(50)
    expect(r.message).toContain('2 invalid')
  })

  it('passes with all valid permissions', async () => {
    writeFileSync(mockSettingsFile, JSON.stringify({
      permissions: { allow: ['Read(*)', 'Write(*)', 'Edit(*)', 'Bash(git *)'] },
    }))
    const r = await permissionsCheck.check()
    expect(r.status).toBe('pass')
    // 60 + 4*2 = 68
    expect(r.score).toBe(68)
  })

  it('detects mcp__ wildcard as invalid', async () => {
    writeFileSync(mockSettingsFile, JSON.stringify({
      permissions: { allow: ['Read(*)', 'mcp__.*'] },
    }))
    const r = await permissionsCheck.check()
    expect(r.status).toBe('warn')
    expect(r.score).toBe(50)
  })

  it('has weight 3', () => {
    expect(permissionsCheck.weight).toBe(3)
  })
})

// ============================================================================
// Model Check
// ============================================================================
describe('modelCheck', () => {
  it('fails when no settings file', async () => {
    const r = await modelCheck.check()
    expect(r.status).toBe('fail')
    expect(r.score).toBe(0)
  })

  it('warns when no API key', async () => {
    writeFileSync(mockSettingsFile, JSON.stringify({ env: {} }))
    const saved = process.env.ANTHROPIC_API_KEY
    delete process.env.ANTHROPIC_API_KEY
    try {
      const r = await modelCheck.check()
      expect(r.status).toBe('warn')
      expect(r.score).toBe(40)
    }
    finally {
      if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved
    }
  })

  it('passes with API key and model', async () => {
    writeFileSync(mockSettingsFile, JSON.stringify({
      model: 'sonnet',
      env: { ANTHROPIC_API_KEY: 'sk-test' },
    }))
    const r = await modelCheck.check()
    expect(r.status).toBe('pass')
    expect(r.score).toBe(100)
  })

  it('passes with API key but no model at score 70', async () => {
    writeFileSync(mockSettingsFile, JSON.stringify({
      env: { ANTHROPIC_API_KEY: 'sk-test' },
    }))
    const r = await modelCheck.check()
    expect(r.status).toBe('pass')
    expect(r.score).toBe(70)
  })

  it('has weight 5', () => {
    expect(modelCheck.weight).toBe(5)
  })
})

// ============================================================================
// Skills Check
// ============================================================================
describe('skillsCheck', () => {
  it('warns when no skills directory', async () => {
    const r = await skillsCheck.check()
    expect(r.status).toBe('warn')
    expect(r.score).toBe(20)
  })

  it('warns when skills directory is empty', async () => {
    mkdirSync(mockSkillsDir, { recursive: true })
    const r = await skillsCheck.check()
    expect(r.status).toBe('warn')
    expect(r.score).toBe(20)
  })

  it('scores based on skill count', async () => {
    mkdirSync(mockSkillsDir, { recursive: true })
    writeFileSync(join(mockSkillsDir, 'commit.md'), '# commit')
    writeFileSync(join(mockSkillsDir, 'review.md'), '# review')
    writeFileSync(join(mockSkillsDir, 'test.md'), '# test')
    const r = await skillsCheck.check()
    // 30 + 3*10 = 60
    expect(r.score).toBe(60)
    expect(r.status).toBe('pass')
  })

  it('caps score at 100', async () => {
    mkdirSync(mockSkillsDir, { recursive: true })
    for (let i = 0; i < 10; i++) {
      writeFileSync(join(mockSkillsDir, `skill-${i}.md`), `# skill ${i}`)
    }
    const r = await skillsCheck.check()
    expect(r.score).toBe(100)
  })

  it('ignores non-md files', async () => {
    mkdirSync(mockSkillsDir, { recursive: true })
    writeFileSync(join(mockSkillsDir, 'readme.txt'), 'not a skill')
    writeFileSync(join(mockSkillsDir, 'skill.md'), '# skill')
    const r = await skillsCheck.check()
    // 30 + 1*10 = 40
    expect(r.score).toBe(40)
  })

  it('has weight 6', () => {
    expect(skillsCheck.weight).toBe(6)
  })
})

// ============================================================================
// Agents Check
// ============================================================================
describe('agentsCheck', () => {
  it('warns when no agents directory', async () => {
    const r = await agentsCheck.check()
    expect(r.status).toBe('warn')
    expect(r.score).toBe(30)
  })

  it('warns when agents directory is empty', async () => {
    mkdirSync(mockAgentsDir, { recursive: true })
    const r = await agentsCheck.check()
    expect(r.status).toBe('warn')
    expect(r.score).toBe(30)
  })

  it('scores based on agent count', async () => {
    mkdirSync(mockAgentsDir, { recursive: true })
    writeFileSync(join(mockAgentsDir, 'coder.md'), '# coder')
    writeFileSync(join(mockAgentsDir, 'reviewer.md'), '# reviewer')
    const r = await agentsCheck.check()
    // 40 + 2*15 = 70
    expect(r.score).toBe(70)
    expect(r.status).toBe('pass')
  })

  it('caps score at 100', async () => {
    mkdirSync(mockAgentsDir, { recursive: true })
    for (let i = 0; i < 10; i++) {
      writeFileSync(join(mockAgentsDir, `agent-${i}.md`), `# agent ${i}`)
    }
    const r = await agentsCheck.check()
    expect(r.score).toBe(100)
  })

  it('has weight 4', () => {
    expect(agentsCheck.weight).toBe(4)
  })
})
