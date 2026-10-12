import { describe, expect, it } from 'vitest'
import { parseGrokConfig, renderGrokConfig } from '../../../../src/utils/grok-config'

describe('grok-config parseGrokConfig', () => {
  it('should parse empty content', () => {
    const result = parseGrokConfig('')
    expect(result.models).toEqual([])
    expect(result.defaultModel).toBeUndefined()
  })

  it('should return empty models for invalid TOML', () => {
    const result = parseGrokConfig('not = [valid')
    expect(result.models).toEqual([])
  })

  it('should parse [models].default', () => {
    const content = [
      '[models]',
      'default = "grok-build"',
    ].join('\n')
    const result = parseGrokConfig(content)
    expect(result.defaultModel).toBe('grok-build')
  })

  it('should parse [model.<id>] sections', () => {
    const content = [
      '[models]',
      'default = "custom"',
      '',
      '[model.custom]',
      'model = "grok-4.1"',
      'base_url = "https://api.example.com/v1"',
      'api_key = "sk-test123"',
      'name = "Custom API"',
      'api_backend = "chat_completions"',
    ].join('\n')
    const result = parseGrokConfig(content)
    expect(result.models).toHaveLength(1)
    expect(result.models[0].id).toBe('custom')
    expect(result.models[0].model).toBe('grok-4.1')
    expect(result.models[0].baseUrl).toBe('https://api.example.com/v1')
    expect(result.models[0].apiKey).toBe('sk-test123')
    expect(result.models[0].name).toBe('Custom API')
    expect(result.models[0].apiBackend).toBe('chat_completions')
  })

  it('should parse multiple model entries', () => {
    const content = [
      '[model.xai]',
      'model = "grok-4.1"',
      '',
      '[model.custom]',
      'model = "grok-3"',
      'base_url = "https://custom.api/v1"',
    ].join('\n')
    const result = parseGrokConfig(content)
    expect(result.models).toHaveLength(2)
    expect(result.models.map(m => m.id)).toEqual(['xai', 'custom'])
  })
})

describe('grok-config renderGrokConfig', () => {
  it('should render [models].default', () => {
    const output = renderGrokConfig({
      defaultModel: 'grok-build',
      models: [],
    })
    expect(output).toContain('[models]')
    expect(output).toContain('default = "grok-build"')
  })

  it('should render model sections', () => {
    const output = renderGrokConfig({
      models: [{
        id: 'custom',
        model: 'grok-4.1',
        baseUrl: 'https://api.example.com/v1',
        apiKey: 'key123',
        name: 'Custom API',
        apiBackend: 'chat_completions',
      }],
    })
    expect(output).toContain('[model.custom]')
    expect(output).toContain('model = "grok-4.1"')
    expect(output).toContain('base_url = "https://api.example.com/v1"')
    expect(output).toContain('api_key = "key123"')
    expect(output).toContain('name = "Custom API"')
    expect(output).toContain('api_backend = "chat_completions"')
  })

  it('should round-trip parse -> render -> parse', () => {
    const original = {
      defaultModel: 'custom',
      models: [
        { id: 'xai', model: 'grok-4.1', name: 'xAI Official' },
        { id: 'custom', model: 'grok-3', baseUrl: 'https://custom/v1', apiKey: 'k2' },
      ],
    }
    const rendered = renderGrokConfig(original)
    const parsed = parseGrokConfig(rendered)
    expect(parsed.defaultModel).toBe(original.defaultModel)
    expect(parsed.models).toHaveLength(2)
    expect(parsed.models[0].id).toBe('xai')
    expect(parsed.models[0].model).toBe('grok-4.1')
    expect(parsed.models[1].baseUrl).toBe('https://custom/v1')
  })
})
