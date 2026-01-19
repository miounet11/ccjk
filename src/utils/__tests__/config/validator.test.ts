/**
 * Config Validator Tests
 */

import { ConfigValidator, createValidator, validators } from '../validator';

describe('ConfigValidator', () => {
  describe('validate', () => {
    it('should validate required fields', () => {
      const validator = new ConfigValidator([
        { field: 'name', required: true },
        { field: 'age', required: false },
      ]);

      const result1 = validator.validate({ name: 'John' });
      expect(result1.valid).toBe(true);
      expect(result1.errors).toHaveLength(0);

      const result2 = validator.validate({ age: 30 });
      expect(result2.valid).toBe(false);
      expect(result2.errors).toHaveLength(1);
      expect(result2.errors[0].field).toBe('name');
    });

    it('should validate field types', () => {
      const validator = new ConfigValidator([
        { field: 'name', type: 'string' },
        { field: 'age', type: 'number' },
        { field: 'active', type: 'boolean' },
      ]);

      const result1 = validator.validate({
        name: 'John',
        age: 30,
        active: true,
      });
      expect(result1.valid).toBe(true);

      const result2 = validator.validate({
        name: 123,
        age: '30',
        active: 'yes',
      });
      expect(result2.valid).toBe(false);
      expect(result2.errors).toHaveLength(3);
    });

    it('should use custom validators', () => {
      const validator = new ConfigValidator([
        {
          field: 'email',
          validator: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
          message: 'Invalid email format',
        },
      ]);

      const result1 = validator.validate({ email: 'test@example.com' });
      expect(result1.valid).toBe(true);

      const result2 = validator.validate({ email: 'invalid-email' });
      expect(result2.valid).toBe(false);
      expect(result2.errors[0].message).toBe('Invalid email format');
    });
  });

  describe('validateOrThrow', () => {
    it('should throw on validation failure', () => {
      const validator = new ConfigValidator([
        { field: 'name', required: true },
      ]);

      expect(() => validator.validateOrThrow({})).toThrow(
        'Configuration validation failed'
      );

      expect(() =>
        validator.validateOrThrow({ name: 'John' })
      ).not.toThrow();
    });
  });

  describe('createValidator', () => {
    it('should create a validator instance', () => {
      const validator = createValidator([{ field: 'test', required: true }]);
      expect(validator).toBeInstanceOf(ConfigValidator);
    });
  });
});

describe('validators', () => {
  describe('notEmpty', () => {
    it('should validate non-empty strings', () => {
      expect(validators.notEmpty('hello')).toBe(true);
      expect(validators.notEmpty('')).toBe(false);
      expect(validators.notEmpty('   ')).toBe(false);
    });
  });

  describe('pattern', () => {
    it('should validate string patterns', () => {
      const validator = validators.pattern(/^\d{3}-\d{4}$/);
      expect(validator('123-4567')).toBe(true);
      expect(validator('invalid')).toBe(false);
    });
  });

  describe('range', () => {
    it('should validate number ranges', () => {
      const validator = validators.range(1, 10);
      expect(validator(5)).toBe(true);
      expect(validator(0)).toBe(false);
      expect(validator(11)).toBe(false);
    });
  });

  describe('length', () => {
    it('should validate string length', () => {
      const validator = validators.length(3, 10);
      expect(validator('hello')).toBe(true);
      expect(validator('hi')).toBe(false);
      expect(validator('verylongstring')).toBe(false);
    });
  });

  describe('oneOf', () => {
    it('should validate allowed values', () => {
      const validator = validators.oneOf(['red', 'green', 'blue']);
      expect(validator('red')).toBe(true);
      expect(validator('yellow')).toBe(false);
    });
  });

  describe('email', () => {
    it('should validate email format', () => {
      expect(validators.email('test@example.com')).toBe(true);
      expect(validators.email('invalid')).toBe(false);
    });
  });

  describe('url', () => {
    it('should validate URL format', () => {
      expect(validators.url('https://example.com')).toBe(true);
      expect(validators.url('invalid')).toBe(false);
    });
  });

  describe('hasKeys', () => {
    it('should validate object has required keys', () => {
      const validator = validators.hasKeys(['name', 'age']);
      expect(validator({ name: 'John', age: 30 })).toBe(true);
      expect(validator({ name: 'John' })).toBe(false);
    });
  });

  describe('notEmptyArray', () => {
    it('should validate non-empty arrays', () => {
      expect(validators.notEmptyArray([1, 2, 3])).toBe(true);
      expect(validators.notEmptyArray([])).toBe(false);
    });
  });
});
