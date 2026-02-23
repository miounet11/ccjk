/**
 * DTO Converters Test Suite
 *
 * Tests for strict type conversions and validations
 */

import { describe, expect, it } from 'vitest'
import {
  convertBatchTemplateResponse,
  convertConfig,
  convertParameterDefault,
  convertProjectAnalysisResponse,
  convertRecommendation,
  convertTemplate,
  convertTemplateParameter,
  extractString,
  isRecommendationConfig,
  isTelemetryEventData,
  isTemplateParameterValue,
  validateBatchTemplateRequest,
  validateProjectAnalysisRequest,
  validateUsageReport,
} from '../../src/cloud-client/dto'
import type {
  RawBatchTemplateResponse,
  RawProjectAnalysisResponse,
  RawRecommendation,
  RawTemplate,
} from '../../src/cloud-client/dto'

describe('DTO Converters', () => {
  describe('extractString', () => {
    it('should extract string from string value', () => {
      expect(extractString('Hello', 'fallback')).toBe('Hello')
    })

    it('should extract string from multilingual object', () => {
      expect(extractString({ en: 'Hello', 'zh-CN': '你好' }, 'fallback', 'en')).toBe('Hello')
      expect(extractString({ en: 'Hello', 'zh-CN': '你好' }, 'fallback', 'zh-CN')).toBe('你好')
    })

    it('should fallback to en when preferred language not available', () => {
      expect(extractString({ en: 'Hello' }, 'fallback', 'zh-CN')).toBe('Hello')
    })

    it('should return fallback for undefined', () => {
      expect(extractString(undefined, 'fallback')).toBe('fallback')
    })

    it('should return fallback for empty object', () => {
      expect(extractString({}, 'fallback')).toBe('fallback')
    })
  })

  describe('convertConfig', () => {
    it('should convert MCP server config', () => {
      const config = convertConfig({
        command: 'npx',
        args: ['-y', '@anthropic/mcp-server-filesystem'],
        type: 'stdio',
      })

      expect(config).toEqual({
        command: 'npx',
        args: ['-y', '@anthropic/mcp-server-filesystem'],
        type: 'stdio',
        env: undefined,
        npmPackage: undefined,
        installCommand: undefined,
      })
    })

    it('should convert skill config', () => {
      const config = convertConfig({
        enabled: true,
        priority: 10,
        triggers: ['test', 'debug'],
      })

      expect(config).toEqual({
        enabled: true,
        priority: 10,
        triggers: ['test', 'debug'],
        parameters: undefined,
      })
    })

    it('should convert agent config', () => {
      const config = convertConfig({
        persona: 'helpful assistant',
        capabilities: ['code', 'debug'],
        skills: ['typescript', 'react'],
        temperature: 0.7,
      })

      expect(config).toEqual({
        persona: 'helpful assistant',
        capabilities: ['code', 'debug'],
        skills: ['typescript', 'react'],
        mcpServers: undefined,
        temperature: 0.7,
        maxTokens: undefined,
      })
    })

    it('should return undefined for invalid config', () => {
      expect(convertConfig(null)).toBeUndefined()
      expect(convertConfig('string')).toBeUndefined()
      expect(convertConfig(123)).toBeUndefined()
    })
  })

  describe('convertParameterDefault', () => {
    it('should convert primitive values', () => {
      expect(convertParameterDefault('string')).toBe('string')
      expect(convertParameterDefault(123)).toBe(123)
      expect(convertParameterDefault(true)).toBe(true)
      expect(convertParameterDefault(null)).toBe(null)
    })

    it('should convert string arrays', () => {
      expect(convertParameterDefault(['a', 'b', 'c'])).toEqual(['a', 'b', 'c'])
    })

    it('should convert number arrays', () => {
      expect(convertParameterDefault([1, 2, 3])).toEqual([1, 2, 3])
    })

    it('should convert objects with primitive values', () => {
      expect(convertParameterDefault({ a: 'string', b: 123, c: true })).toEqual({
        a: 'string',
        b: 123,
        c: true,
      })
    })

    it('should return null for mixed arrays', () => {
      expect(convertParameterDefault(['a', 1, true])).toBe(null)
    })

    it('should filter out non-primitive object values', () => {
      expect(convertParameterDefault({ a: 'string', b: { nested: 'object' } })).toEqual({
        a: 'string',
      })
    })
  })

  describe('convertRecommendation', () => {
    it('should convert raw recommendation with string name/description', () => {
      const raw: RawRecommendation = {
        id: 'test-rec',
        name: 'Test Recommendation',
        description: 'Test description',
        category: 'skill',
        relevanceScore: 0.9,
      }

      const converted = convertRecommendation(raw)

      expect(converted).toEqual({
        id: 'test-rec',
        name: { en: 'Test Recommendation' },
        description: { en: 'Test description' },
        category: 'skill',
        relevanceScore: 0.9,
        installCommand: undefined,
        config: undefined,
        tags: undefined,
        dependencies: undefined,
      })
    })

    it('should convert raw recommendation with multilingual name/description', () => {
      const raw: RawRecommendation = {
        id: 'test-rec',
        name: { en: 'Test', 'zh-CN': '测试' },
        description: { en: 'Description', 'zh-CN': '描述' },
        category: 'mcp',
        relevanceScore: 0.95,
        tags: ['test', 'mcp'],
      }

      const converted = convertRecommendation(raw)

      expect(converted.name).toEqual({ en: 'Test', 'zh-CN': '测试' })
      expect(converted.description).toEqual({ en: 'Description', 'zh-CN': '描述' })
    })
  })

  describe('convertTemplate', () => {
    it('should convert raw template', () => {
      const raw: RawTemplate = {
        id: 'test-template',
        type: 'workflow',
        name: 'Test Template',
        description: 'Test description',
        content: '# Test Content',
        version: '1.0.0',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      }

      const converted = convertTemplate(raw)

      expect(converted).toEqual({
        id: 'test-template',
        type: 'workflow',
        name: { en: 'Test Template' },
        description: { en: 'Test description' },
        content: '# Test Content',
        version: '1.0.0',
        author: undefined,
        tags: undefined,
        parameters: undefined,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      })
    })

    it('should convert template with parameters', () => {
      const raw: RawTemplate = {
        id: 'test-template',
        type: 'prompt',
        name: { en: 'Test', 'zh-CN': '测试' },
        description: { en: 'Desc', 'zh-CN': '描述' },
        content: 'Content',
        version: '1.0.0',
        parameters: [
          {
            name: 'param1',
            type: 'string',
            required: true,
            default: 'default value',
          },
        ],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      }

      const converted = convertTemplate(raw)

      expect(converted.parameters).toHaveLength(1)
      expect(converted.parameters![0]).toEqual({
        name: 'param1',
        type: 'string',
        required: true,
        default: 'default value',
        description: undefined,
      })
    })
  })

  describe('convertProjectAnalysisResponse', () => {
    it('should convert raw project analysis response', () => {
      const raw: RawProjectAnalysisResponse = {
        requestId: 'req-123',
        recommendations: [
          {
            id: 'rec-1',
            name: 'Recommendation 1',
            description: 'Description 1',
            category: 'skill',
            relevanceScore: 0.9,
          },
        ],
        projectType: 'typescript',
        frameworks: ['react', 'vite'],
      }

      const converted = convertProjectAnalysisResponse(raw)

      expect(converted.requestId).toBe('req-123')
      expect(converted.recommendations).toHaveLength(1)
      expect(converted.projectType).toBe('typescript')
      expect(converted.frameworks).toEqual(['react', 'vite'])
    })
  })

  describe('convertBatchTemplateResponse', () => {
    it('should convert raw batch template response', () => {
      const raw: RawBatchTemplateResponse = {
        requestId: 'req-456',
        templates: {
          'tpl-1': {
            id: 'tpl-1',
            type: 'workflow',
            name: 'Template 1',
            description: 'Description 1',
            content: 'Content 1',
            version: '1.0.0',
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
          },
        },
        notFound: ['tpl-2', 'tpl-3'],
      }

      const converted = convertBatchTemplateResponse(raw)

      expect(converted.requestId).toBe('req-456')
      expect(Object.keys(converted.templates)).toHaveLength(1)
      expect(converted.notFound).toEqual(['tpl-2', 'tpl-3'])
    })
  })

  describe('Validation Functions', () => {
    describe('validateProjectAnalysisRequest', () => {
      it('should validate valid request', () => {
        const result = validateProjectAnalysisRequest({
          projectRoot: '/test/project',
          dependencies: { react: '^18.0.0' },
        })

        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should reject request without projectRoot', () => {
        const result = validateProjectAnalysisRequest({} as any)

        expect(result.valid).toBe(false)
        expect(result.errors).toContain('projectRoot is required and must be a string')
      })

      it('should reject invalid language', () => {
        const result = validateProjectAnalysisRequest({
          projectRoot: '/test',
          language: 'invalid' as any,
        })

        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.includes('language'))).toBe(true)
      })
    })

    describe('validateBatchTemplateRequest', () => {
      it('should validate valid request', () => {
        const result = validateBatchTemplateRequest({
          ids: ['tpl-1', 'tpl-2'],
        })

        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should reject empty ids array', () => {
        const result = validateBatchTemplateRequest({
          ids: [],
        })

        expect(result.valid).toBe(false)
        expect(result.errors).toContain('ids array cannot be empty')
      })

      it('should reject non-string ids', () => {
        const result = validateBatchTemplateRequest({
          ids: ['tpl-1', 123 as any],
        })

        expect(result.valid).toBe(false)
        expect(result.errors).toContain('all ids must be strings')
      })
    })

    describe('validateUsageReport', () => {
      it('should validate valid report', () => {
        const result = validateUsageReport({
          reportId: 'report-123',
          metricType: 'template_download',
          timestamp: '2026-01-01T00:00:00Z',
          ccjkVersion: '12.0.0',
          nodeVersion: 'v20.0.0',
          platform: 'darwin',
        })

        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should reject invalid metric type', () => {
        const result = validateUsageReport({
          reportId: 'report-123',
          metricType: 'invalid' as any,
          timestamp: '2026-01-01T00:00:00Z',
          ccjkVersion: '12.0.0',
          nodeVersion: 'v20.0.0',
          platform: 'darwin',
        })

        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.includes('metricType'))).toBe(true)
      })
    })
  })

  describe('Type Guards', () => {
    describe('isRecommendationConfig', () => {
      it('should return true for valid config', () => {
        expect(isRecommendationConfig({ command: 'npx' })).toBe(true)
        expect(isRecommendationConfig({ enabled: true })).toBe(true)
        expect(isRecommendationConfig({ persona: 'assistant' })).toBe(true)
      })

      it('should return false for invalid config', () => {
        expect(isRecommendationConfig(null)).toBe(false)
        expect(isRecommendationConfig('string')).toBe(false)
        expect(isRecommendationConfig({})).toBe(false)
      })
    })

    describe('isTelemetryEventData', () => {
      it('should return true for valid telemetry data', () => {
        expect(isTelemetryEventData({ timestamp: Date.now() })).toBe(true)
        expect(isTelemetryEventData({ timestamp: '2026-01-01T00:00:00Z' })).toBe(true)
      })

      it('should return false for invalid telemetry data', () => {
        expect(isTelemetryEventData(null)).toBe(false)
        expect(isTelemetryEventData({})).toBe(false)
        expect(isTelemetryEventData({ data: 'test' })).toBe(false)
      })
    })

    describe('isTemplateParameterValue', () => {
      it('should return true for valid parameter values', () => {
        expect(isTemplateParameterValue(null)).toBe(true)
        expect(isTemplateParameterValue('string')).toBe(true)
        expect(isTemplateParameterValue(123)).toBe(true)
        expect(isTemplateParameterValue(true)).toBe(true)
        expect(isTemplateParameterValue(['a', 'b'])).toBe(true)
        expect(isTemplateParameterValue([1, 2, 3])).toBe(true)
        expect(isTemplateParameterValue({ a: 'string', b: 123 })).toBe(true)
      })

      it('should return false for invalid parameter values', () => {
        expect(isTemplateParameterValue(undefined)).toBe(false)
        expect(isTemplateParameterValue(['a', 1])).toBe(false)
        expect(isTemplateParameterValue({ a: { nested: 'object' } })).toBe(false)
      })
    })
  })
})
