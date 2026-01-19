/**
 * String Utilities Tests
 */

import {
  capitalize,
  camelCase,
  pascalCase,
  snakeCase,
  kebabCase,
  constantCase,
  truncate,
  pad,
  slugify,
  template,
  uuid,
  isBlank,
  ensureSuffix,
  ensurePrefix,
  removePrefix,
  removeSuffix,
} from '../formatters';

describe('String Utilities', () => {
  describe('case conversion', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('HELLO')).toBe('HELLO');
      expect(capitalize('')).toBe('');
    });

    it('should convert to camelCase', () => {
      expect(camelCase('hello world')).toBe('helloWorld');
      expect(camelCase('Hello World')).toBe('helloWorld');
      expect(camelCase('hello-world')).toBe('helloWorld');
      expect(camelCase('hello_world')).toBe('helloWorld');
    });

    it('should convert to PascalCase', () => {
      expect(pascalCase('hello world')).toBe('HelloWorld');
      expect(pascalCase('hello-world')).toBe('HelloWorld');
      expect(pascalCase('hello_world')).toBe('HelloWorld');
    });

    it('should convert to snake_case', () => {
      expect(snakeCase('helloWorld')).toBe('hello_world');
      expect(snakeCase('HelloWorld')).toBe('hello_world');
      expect(snakeCase('hello-world')).toBe('hello_world');
      expect(snakeCase('hello world')).toBe('hello_world');
    });

    it('should convert to kebab-case', () => {
      expect(kebabCase('helloWorld')).toBe('hello-world');
      expect(kebabCase('HelloWorld')).toBe('hello-world');
      expect(kebabCase('hello_world')).toBe('hello-world');
      expect(kebabCase('hello world')).toBe('hello-world');
    });

    it('should convert to CONSTANT_CASE', () => {
      expect(constantCase('helloWorld')).toBe('HELLO_WORLD');
      expect(constantCase('hello-world')).toBe('HELLO_WORLD');
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      expect(truncate('hello world', 8)).toBe('hello...');
      expect(truncate('hello', 10)).toBe('hello');
      expect(truncate('hello world', 8, '…')).toBe('hello w…');
    });
  });

  describe('pad', () => {
    it('should pad strings', () => {
      expect(pad('hello', 10, ' ', 'right')).toBe('hello     ');
      expect(pad('hello', 10, ' ', 'left')).toBe('     hello');
      expect(pad('hello', 10, ' ', 'both')).toBe('  hello   ');
      expect(pad('hello', 10, '0', 'left')).toBe('00000hello');
    });
  });

  describe('slugify', () => {
    it('should create URL-friendly slugs', () => {
      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('Hello  World!')).toBe('hello-world');
      expect(slugify('  Hello World  ')).toBe('hello-world');
      expect(slugify('Hello_World')).toBe('hello-world');
    });
  });

  describe('template', () => {
    it('should replace template variables', () => {
      expect(template('Hello {name}!', { name: 'World' })).toBe('Hello World!');
      expect(template('{greeting} {name}!', { greeting: 'Hi', name: 'John' })).toBe(
        'Hi John!'
      );
      expect(template('Hello {missing}!', {})).toBe('Hello {missing}!');
    });
  });

  describe('uuid', () => {
    it('should generate valid UUID v4', () => {
      const id = uuid();
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should generate unique UUIDs', () => {
      const id1 = uuid();
      const id2 = uuid();
      expect(id1).not.toBe(id2);
    });
  });

  describe('isBlank', () => {
    it('should check if string is blank', () => {
      expect(isBlank('')).toBe(true);
      expect(isBlank('   ')).toBe(true);
      expect(isBlank('hello')).toBe(false);
      expect(isBlank(' hello ')).toBe(false);
    });
  });

  describe('prefix and suffix', () => {
    it('should ensure suffix', () => {
      expect(ensureSuffix('hello', '!')).toBe('hello!');
      expect(ensureSuffix('hello!', '!')).toBe('hello!');
    });

    it('should ensure prefix', () => {
      expect(ensurePrefix('world', 'hello ')).toBe('hello world');
      expect(ensurePrefix('hello world', 'hello ')).toBe('hello world');
    });

    it('should remove prefix', () => {
      expect(removePrefix('hello world', 'hello ')).toBe('world');
      expect(removePrefix('world', 'hello ')).toBe('world');
    });

    it('should remove suffix', () => {
      expect(removeSuffix('hello world', ' world')).toBe('hello');
      expect(removeSuffix('hello', ' world')).toBe('hello');
    });
  });
});
