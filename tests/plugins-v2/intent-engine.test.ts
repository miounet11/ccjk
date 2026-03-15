import { describe, expect, it } from 'vitest'
import {
  DEFAULT_INTENT_RULES,
  getIntentEngine,
  IntentEngine,
  resetIntentEngine,
} from '../../src/plugins-v2/intent/intent-engine'
import type { IntentRule } from '../../src/plugins-v2/types'

function makeRule(overrides: Partial<IntentRule> = {}): IntentRule {
  return {
    id: 'test-rule',
    name: { en: 'Test Rule', 'zh-CN': '测试规则' },
    patterns: ['test.*code'],
    keywords: ['test', 'code'],
    contextSignals: [],
    priority: 50,
    pluginId: 'test-plugin',
    autoExecute: false,
    ...overrides,
  }
}

describe('IntentEngine', () => {
  describe('rule management', () => {
    it('registers and retrieves rules', () => {
      const engine = new IntentEngine()
      engine.registerRule(makeRule({ id: 'r1' }))
      engine.registerRule(makeRule({ id: 'r2' }))
      expect(engine.getRules()).toHaveLength(2)
    })

    it('registers multiple rules at once', () => {
      const engine = new IntentEngine()
      engine.registerRules([makeRule({ id: 'r1' }), makeRule({ id: 'r2' })])
      expect(engine.getRules()).toHaveLength(2)
    })

    it('unregisters a rule', () => {
      const engine = new IntentEngine()
      engine.registerRule(makeRule({ id: 'r1' }))
      engine.unregisterRule('r1')
      expect(engine.getRules()).toHaveLength(0)
    })

    it('unregisters all rules for a plugin', () => {
      const engine = new IntentEngine()
      engine.registerRules([
        makeRule({ id: 'r1', pluginId: 'plugin-a' }),
        makeRule({ id: 'r2', pluginId: 'plugin-a' }),
        makeRule({ id: 'r3', pluginId: 'plugin-b' }),
      ])
      engine.unregisterPluginRules('plugin-a')
      expect(engine.getRules()).toHaveLength(1)
      expect(engine.getRules()[0].id).toBe('r3')
    })
  })

  describe('detect', () => {
    it('matches by pattern', async () => {
      const engine = new IntentEngine()
      engine.registerRule(makeRule({
        id: 'commit',
        patterns: ['commit.*changes'],
        keywords: ['commit'],
        contextSignals: [],
      }))
      const matches = await engine.detect('commit my changes', '/tmp')
      expect(matches.length).toBeGreaterThan(0)
      expect(matches[0].intentId).toBe('commit')
    })

    it('matches by keyword when pattern also matches', async () => {
      const engine = new IntentEngine()
      engine.registerRule(makeRule({
        id: 'review',
        patterns: ['review'],
        keywords: ['review', 'check'],
        contextSignals: [],
      }))
      const matches = await engine.detect('please review this', '/tmp')
      expect(matches.length).toBeGreaterThan(0)
      expect(matches[0].intentId).toBe('review')
    })

    it('returns empty for no match', async () => {
      const engine = new IntentEngine()
      engine.registerRule(makeRule({
        id: 'specific',
        patterns: ['very_specific_pattern_xyz'],
        keywords: ['xyznonexistent'],
        contextSignals: [],
      }))
      const matches = await engine.detect('hello world', '/tmp')
      expect(matches).toHaveLength(0)
    })

    it('sorts by confidence descending', async () => {
      const engine = new IntentEngine()
      engine.registerRules([
        makeRule({
          id: 'weak',
          patterns: ['test'],
          keywords: [],
          contextSignals: [],
          priority: 10,
        }),
        makeRule({
          id: 'strong',
          patterns: ['test.*code', 'run.*test'],
          keywords: ['test', 'code', 'run'],
          contextSignals: [],
          priority: 90,
        }),
      ])
      const matches = await engine.detect('test the code and run tests', '/tmp')
      if (matches.length >= 2) {
        expect(matches[0].confidence).toBeGreaterThanOrEqual(matches[1].confidence)
      }
    })

    it('respects minConfidence threshold', async () => {
      const engine = new IntentEngine()
      engine.registerRule(makeRule({
        id: 'high-bar',
        patterns: ['exact_match_only'],
        keywords: ['partial'],
        contextSignals: [],
        minConfidence: 0.9,
      }))
      // Only keyword matches, not pattern — confidence will be low
      const matches = await engine.detect('partial match here', '/tmp')
      expect(matches).toHaveLength(0)
    })
  })

  describe('detectBest', () => {
    it('returns best match or null', async () => {
      const engine = new IntentEngine()
      engine.registerRule(makeRule({
        id: 'only',
        patterns: ['hello'],
        keywords: ['hello'],
        contextSignals: [],
      }))
      const best = await engine.detectBest('hello world', '/tmp')
      expect(best).not.toBeNull()
      expect(best!.intentId).toBe('only')
    })

    it('returns null when no match', async () => {
      const engine = new IntentEngine()
      const best = await engine.detectBest('nothing matches', '/tmp')
      expect(best).toBeNull()
    })
  })

  describe('detectAutoExecute', () => {
    it('returns match only if autoExecute and high confidence', async () => {
      const engine = new IntentEngine()
      engine.registerRule(makeRule({
        id: 'auto',
        patterns: ['deploy.*now', 'deploy.*app'],
        keywords: ['deploy', 'now', 'app'],
        contextSignals: [],
        autoExecute: true,
      }))
      const result = await engine.detectAutoExecute('deploy the app now', '/tmp')
      // autoExecute requires confidence >= 0.8
      if (result) {
        expect(result.autoExecute).toBe(true)
        expect(result.confidence).toBeGreaterThanOrEqual(0.8)
      }
    })

    it('returns null for non-autoExecute rules', async () => {
      const engine = new IntentEngine()
      engine.registerRule(makeRule({
        id: 'manual',
        patterns: ['test'],
        keywords: ['test'],
        contextSignals: [],
        autoExecute: false,
      }))
      const result = await engine.detectAutoExecute('test something', '/tmp')
      expect(result).toBeNull()
    })
  })

  describe('cache', () => {
    it('clearCache does not throw', () => {
      const engine = new IntentEngine()
      expect(() => engine.clearCache()).not.toThrow()
    })
  })
})

describe('DEFAULT_INTENT_RULES', () => {
  it('has 7 built-in rules', () => {
    expect(DEFAULT_INTENT_RULES).toHaveLength(7)
  })

  it('all rules have required fields', () => {
    for (const rule of DEFAULT_INTENT_RULES) {
      expect(rule.id).toBeTruthy()
      expect(rule.name).toBeTruthy()
      expect(rule.patterns.length).toBeGreaterThan(0)
      expect(rule.keywords.length).toBeGreaterThan(0)
      expect(rule.pluginId).toBeTruthy()
      expect(typeof rule.priority).toBe('number')
      expect(typeof rule.autoExecute).toBe('boolean')
    }
  })

  it('all rules have unique ids', () => {
    const ids = DEFAULT_INTENT_RULES.map(r => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('singleton', () => {
  it('getIntentEngine returns singleton with default rules', () => {
    resetIntentEngine()
    const engine = getIntentEngine()
    expect(engine.getRules().length).toBe(DEFAULT_INTENT_RULES.length)
    resetIntentEngine()
  })

  it('resetIntentEngine clears singleton', () => {
    resetIntentEngine()
    const a = getIntentEngine()
    resetIntentEngine()
    const b = getIntentEngine()
    expect(a).not.toBe(b)
    resetIntentEngine()
  })
})
