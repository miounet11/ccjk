/**
 * Configuration Manager V3 - Schema Validator
 *
 * JSON Schema based validation for configuration
 */

import type {
  ConfigSchema,
  ConfigV3,
  SchemaField,
  SchemaFieldType,
  ValidationError,
  ValidationErrorCode,
  ValidationResult,
  ValidationWarning,
} from './types'

// ============================================================================
// Schema Definitions
// ============================================================================

/**
 * API Key pattern - supports various formats
 */
const API_KEY_PATTERN = /^(sk-|ant-|key-)?[\w-]{20,}$/

/**
 * URL pattern for validation
 */
const URL_PATTERN = /^https?:\/\/[\w-]+(\.[\w-]+)*(:\d+)?(\/.*)?$/

/**
 * Configuration V3 Schema
 */
export const CONFIG_SCHEMA: ConfigSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  properties: {
    $version: {
      type: 'string',
      required: true,
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: 'Configuration version',
    },
    $environment: {
      type: 'string',
      required: true,
      enum: ['dev', 'prod', 'test'],
      description: 'Current environment',
    },
    $lastUpdated: {
      type: 'string',
      required: true,
      format: 'date-time',
      description: 'Last update timestamp',
    },
    general: {
      type: 'object',
      required: true,
      properties: {
        preferredLang: {
          type: 'string',
          required: true,
          enum: ['zh-CN', 'en'],
        },
        templateLang: {
          type: 'string',
          enum: ['zh-CN', 'en'],
        },
        aiOutputLang: {
          type: 'string',
        },
        currentTool: {
          type: 'string',
          required: true,
          enum: ['claude-code', 'codex', 'aider', 'continue', 'cline', 'cursor'],
        },
        theme: {
          type: 'string',
          enum: ['light', 'dark', 'auto'],
        },
      },
    },
    tools: {
      type: 'object',
      required: true,
      properties: {
        claudeCode: {
          type: 'object',
          required: true,
          properties: {
            enabled: { type: 'boolean', required: true },
            installType: { type: 'string', enum: ['global', 'local'] },
            outputStyles: { type: 'array', items: { type: 'string' } },
            defaultOutputStyle: { type: 'string' },
            currentProfile: { type: 'string' },
            profiles: { type: 'object', additionalProperties: true },
            version: { type: 'string' },
          },
        },
        codex: {
          type: 'object',
          required: true,
          properties: {
            enabled: { type: 'boolean', required: true },
            systemPromptStyle: { type: 'string' },
            model: { type: 'string' },
            version: { type: 'string' },
          },
        },
      },
      additionalProperties: true,
    },
    api: {
      type: 'object',
      properties: {
        anthropic: {
          type: 'object',
          properties: {
            baseUrl: { type: 'string', format: 'url' },
            apiKey: { type: 'string', format: 'api-key' },
            timeout: { type: 'number', minimum: 1000, maximum: 300000 },
            retries: { type: 'number', minimum: 0, maximum: 10 },
          },
        },
        openai: {
          type: 'object',
          properties: {
            baseUrl: { type: 'string', format: 'url' },
            apiKey: { type: 'string', format: 'api-key' },
            timeout: { type: 'number', minimum: 1000, maximum: 300000 },
            retries: { type: 'number', minimum: 0, maximum: 10 },
          },
        },
        custom: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              baseUrl: { type: 'string', format: 'url', required: true },
              apiKey: { type: 'string', format: 'api-key' },
              timeout: { type: 'number' },
              retries: { type: 'number' },
            },
          },
        },
      },
    },
    features: {
      type: 'object',
      properties: {
        hotReload: { type: 'boolean', default: true },
        autoMigration: { type: 'boolean', default: true },
        telemetry: { type: 'boolean', default: false },
        experimentalFeatures: {
          type: 'array',
          items: { type: 'string' },
          default: [],
        },
      },
    },
  },
  required: ['$version', '$environment', '$lastUpdated', 'general', 'tools'],
}

// ============================================================================
// Schema Validator Class
// ============================================================================

/**
 * Schema Validator for configuration validation
 */
export class SchemaValidator {
  private schema: ConfigSchema
  private errors: ValidationError[] = []
  private warnings: ValidationWarning[] = []

  constructor(schema: ConfigSchema = CONFIG_SCHEMA) {
    this.schema = schema
  }

  /**
   * Validate configuration against schema
   */
  validate(config: unknown): ValidationResult {
    this.errors = []
    this.warnings = []

    if (!config || typeof config !== 'object') {
      this.addError('', 'Configuration must be an object', 'INVALID_TYPE')
      return this.getResult()
    }

    this.validateObject(config as Record<string, unknown>, this.schema, '')

    return this.getResult()
  }

  /**
   * Validate a single field value
   */
  validateField(path: string, value: unknown): ValidationResult {
    this.errors = []
    this.warnings = []

    const field = this.getFieldSchema(path)
    if (!field) {
      this.addWarning(path, `Unknown configuration path: ${path}`)
      return this.getResult()
    }

    this.validateValue(value, field, path)
    return this.getResult()
  }

  /**
   * Get field schema by path
   */
  private getFieldSchema(path: string): SchemaField | null {
    const parts = path.split('.')
    let current: SchemaField | Record<string, SchemaField> = this.schema.properties

    for (const part of parts) {
      if (typeof current !== 'object' || !current) {
        return null
      }

      if ('properties' in current && current.properties) {
        current = (current.properties as Record<string, SchemaField>)[part] as SchemaField
      }
      else if (part in current) {
        current = (current as Record<string, SchemaField>)[part]
      }
      else {
        return null
      }
    }

    return current as SchemaField
  }

  /**
   * Validate object against schema
   */
  private validateObject(
    obj: Record<string, unknown>,
    schema: ConfigSchema | SchemaField,
    path: string,
  ): void {
    const properties = 'properties' in schema ? schema.properties : {}
    const required = 'required' in schema
      ? (Array.isArray(schema.required) ? schema.required : [])
      : []

    // Check required fields
    for (const field of required) {
      const fieldPath = path ? `${path}.${field}` : field
      if (!(field in obj) || obj[field] === undefined) {
        this.addError(fieldPath, `Required field is missing`, 'REQUIRED_FIELD')
      }
    }

    // Validate each property
    for (const [key, value] of Object.entries(obj)) {
      const fieldPath = path ? `${path}.${key}` : key
      const fieldSchema = properties?.[key]

      if (!fieldSchema) {
        if (schema.additionalProperties === false) {
          this.addWarning(fieldPath, `Unknown property: ${key}`)
        }
        continue
      }

      this.validateValue(value, fieldSchema, fieldPath)
    }

    // Check for required nested fields
    if (properties) {
      for (const [key, fieldSchema] of Object.entries(properties)) {
        if (fieldSchema.required && !(key in obj)) {
          const fieldPath = path ? `${path}.${key}` : key
          this.addError(fieldPath, `Required field is missing`, 'REQUIRED_FIELD')
        }
      }
    }
  }

  /**
   * Validate a single value against field schema
   */
  private validateValue(value: unknown, schema: SchemaField, path: string): void {
    // Handle null values
    if (value === null) {
      if (Array.isArray(schema.type) && schema.type.includes('null')) {
        return
      }
      if (schema.type !== 'null') {
        this.addError(path, `Value cannot be null`, 'INVALID_TYPE', value)
        return
      }
    }

    // Skip undefined optional fields
    if (value === undefined) {
      return
    }

    // Type validation
    const actualType = this.getType(value)
    const expectedTypes = Array.isArray(schema.type) ? schema.type : [schema.type]

    if (!expectedTypes.includes(actualType as SchemaFieldType)) {
      this.addError(
        path,
        `Expected ${expectedTypes.join(' | ')}, got ${actualType}`,
        'INVALID_TYPE',
        value,
        expectedTypes.join(' | '),
      )
      return
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      this.addError(
        path,
        `Value must be one of: ${schema.enum.join(', ')}`,
        'INVALID_ENUM',
        value,
        schema.enum.join(', '),
      )
      return
    }

    // Format validation
    if (schema.format) {
      this.validateFormat(value, schema.format, path)
    }

    // Pattern validation
    if (schema.pattern && typeof value === 'string') {
      const regex = new RegExp(schema.pattern)
      if (!regex.test(value)) {
        this.addError(
          path,
          `Value does not match pattern: ${schema.pattern}`,
          'PATTERN_MISMATCH',
          value,
          schema.pattern,
        )
      }
    }

    // String length validation
    if (typeof value === 'string') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        this.addError(
          path,
          `String length must be at least ${schema.minLength}`,
          'MIN_LENGTH',
          value,
        )
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        this.addError(
          path,
          `String length must be at most ${schema.maxLength}`,
          'MAX_LENGTH',
          value,
        )
      }
    }

    // Number range validation
    if (typeof value === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        this.addError(
          path,
          `Value must be at least ${schema.minimum}`,
          'MIN_LENGTH',
          value,
        )
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        this.addError(
          path,
          `Value must be at most ${schema.maximum}`,
          'MAX_LENGTH',
          value,
        )
      }
    }

    // Array validation
    if (Array.isArray(value) && schema.items) {
      value.forEach((item, index) => {
        this.validateValue(item, schema.items!, `${path}[${index}]`)
      })
    }

    // Nested object validation
    if (actualType === 'object' && schema.properties) {
      this.validateObject(value as Record<string, unknown>, schema, path)
    }
  }

  /**
   * Validate format-specific values
   */
  private validateFormat(value: unknown, format: string, path: string): void {
    if (typeof value !== 'string') {
      return
    }

    switch (format) {
      case 'url':
      case 'uri':
        if (!URL_PATTERN.test(value)) {
          this.addError(path, `Invalid URL format`, 'INVALID_URL', value)
        }
        break

      case 'api-key':
        if (!API_KEY_PATTERN.test(value)) {
          this.addError(path, `Invalid API key format`, 'INVALID_API_KEY', value)
        }
        break

      case 'date-time':
        if (Number.isNaN(Date.parse(value))) {
          this.addError(path, `Invalid date-time format`, 'INVALID_FORMAT', value)
        }
        break

      case 'email':
        if (!/^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(value)) {
          this.addError(path, `Invalid email format`, 'INVALID_FORMAT', value)
        }
        break
    }
  }

  /**
   * Get JavaScript type of value
   */
  private getType(value: unknown): string {
    if (value === null)
      return 'null'
    if (Array.isArray(value))
      return 'array'
    return typeof value
  }

  /**
   * Add validation error
   */
  private addError(
    path: string,
    message: string,
    code: ValidationErrorCode,
    value?: unknown,
    expected?: string,
  ): void {
    this.errors.push({ path, message, code, value, expected })
  }

  /**
   * Add validation warning
   */
  private addWarning(path: string, message: string, suggestion?: string): void {
    this.warnings.push({ path, message, suggestion })
  }

  /**
   * Get validation result
   */
  private getResult(): ValidationResult {
    return {
      valid: this.errors.length === 0,
      errors: [...this.errors],
      warnings: [...this.warnings],
    }
  }
}

/**
 * Create a new schema validator instance
 */
export function createValidator(schema?: ConfigSchema): SchemaValidator {
  return new SchemaValidator(schema)
}

/**
 * Validate configuration with default schema
 */
export function validateConfig(config: unknown): ValidationResult {
  const validator = new SchemaValidator()
  return validator.validate(config)
}

/**
 * Quick validation check - returns boolean
 */
export function isValidConfig(config: unknown): config is ConfigV3 {
  const result = validateConfig(config)
  return result.valid
}
