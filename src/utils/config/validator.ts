/**
 * Configuration Validator
 * Provides utilities for validating configuration objects
 */

export interface ValidationRule<T = any> {
  field: keyof T;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  validator?: (value: any) => boolean;
  message?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Configuration Validator class
 */
export class ConfigValidator<T = any> {
  constructor(private rules: ValidationRule<T>[]) {}

  /**
   * Validate a configuration object
   */
  validate(config: Partial<T>): ValidationResult {
    const errors: ValidationError[] = [];

    for (const rule of this.rules) {
      const value = config[rule.field];

      // Check required fields
      if (rule.required && (value === undefined || value === null)) {
        errors.push({
          field: String(rule.field),
          message: rule.message || `Field '${String(rule.field)}' is required`,
        });
        continue;
      }

      // Skip validation if field is not present and not required
      if (value === undefined || value === null) {
        continue;
      }

      // Check type
      if (rule.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== rule.type) {
          errors.push({
            field: String(rule.field),
            message:
              rule.message ||
              `Field '${String(rule.field)}' must be of type ${rule.type}`,
          });
          continue;
        }
      }

      // Custom validator
      if (rule.validator && !rule.validator(value)) {
        errors.push({
          field: String(rule.field),
          message:
            rule.message || `Field '${String(rule.field)}' validation failed`,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate and throw on error
   */
  validateOrThrow(config: Partial<T>): void {
    const result = this.validate(config);
    if (!result.valid) {
      const errorMessages = result.errors
        .map(e => `${e.field}: ${e.message}`)
        .join(', ');
      throw new Error(`Configuration validation failed: ${errorMessages}`);
    }
  }
}

/**
 * Create a configuration validator
 */
export function createValidator<T = any>(
  rules: ValidationRule<T>[]
): ConfigValidator<T> {
  return new ConfigValidator<T>(rules);
}

/**
 * Common validation functions
 */
export const validators = {
  /**
   * Validate string is not empty
   */
  notEmpty: (value: string): boolean => {
    return typeof value === 'string' && value.trim().length > 0;
  },

  /**
   * Validate string matches pattern
   */
  pattern: (regex: RegExp) => (value: string): boolean => {
    return typeof value === 'string' && regex.test(value);
  },

  /**
   * Validate number is in range
   */
  range: (min: number, max: number) => (value: number): boolean => {
    return typeof value === 'number' && value >= min && value <= max;
  },

  /**
   * Validate string length
   */
  length: (min: number, max?: number) => (value: string): boolean => {
    if (typeof value !== 'string') return false;
    if (max !== undefined) {
      return value.length >= min && value.length <= max;
    }
    return value.length >= min;
  },

  /**
   * Validate value is one of allowed values
   */
  oneOf: <T>(allowed: T[]) => (value: T): boolean => {
    return allowed.includes(value);
  },

  /**
   * Validate email format
   */
  email: (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return typeof value === 'string' && emailRegex.test(value);
  },

  /**
   * Validate URL format
   */
  url: (value: string): boolean => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate object has required keys
   */
  hasKeys: (keys: string[]) => (value: any): boolean => {
    if (typeof value !== 'object' || value === null) return false;
    return keys.every(key => key in value);
  },

  /**
   * Validate array is not empty
   */
  notEmptyArray: (value: any[]): boolean => {
    return Array.isArray(value) && value.length > 0;
  },
};
