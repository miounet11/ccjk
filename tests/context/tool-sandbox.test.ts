import { describe, it, expect } from 'vitest';
import { ToolSandbox } from '../../src/context/tool-sandbox';

describe('ToolSandbox', () => {
  const sandbox = new ToolSandbox();

  describe('JSON compression', () => {
    it('compresses large JSON arrays', () => {
      const largeArray = JSON.stringify(Array(100).fill({ id: 1, name: 'test', data: 'x'.repeat(100) }));
      const result = sandbox.process({
        toolName: 'Read',
        raw: largeArray,
        size: largeArray.length
      });

      expect(result.type).toBe('json');
      expect(result.compressionRatio).toBeGreaterThan(0.8);
      expect(result.summary).toContain('Array of 100 items');
    });

    it('preserves small JSON objects', () => {
      const smallJson = JSON.stringify({ id: 1, name: 'test' });
      const result = sandbox.process({
        toolName: 'Read',
        raw: smallJson,
        size: smallJson.length
      });

      expect(result.type).toBe('json');
      expect(JSON.parse(result.summary)).toEqual({ id: 1, name: 'test' });
    });
  });

  describe('Code compression', () => {
    it('extracts function signatures', () => {
      const code = `
import { foo } from 'bar';

export function myFunction(a: number, b: string): void {
  // Implementation
  console.log(a, b);
  return;
}

export class MyClass {
  constructor() {}
  method() {}
}
      `.trim();

      const result = sandbox.process({
        toolName: 'Read',
        raw: code,
        size: code.length
      });

      expect(result.type).toBe('code');
      expect(result.summary).toContain('import');
      expect(result.summary).toContain('myFunction');
      expect(result.summary).toContain('MyClass');
    });
  });

  describe('Log compression', () => {
    it('extracts errors and warnings', () => {
      const logs = `
[2024-01-01 10:00:00] INFO Starting application
[2024-01-01 10:00:01] INFO Loading config
[2024-01-01 10:00:02] ERROR Failed to connect to database
[2024-01-01 10:00:03] WARN Retrying connection
[2024-01-01 10:00:04] ERROR Connection timeout
[2024-01-01 10:00:05] INFO Shutting down
      `.trim();

      const result = sandbox.process({
        toolName: 'Bash',
        raw: logs,
        size: logs.length
      });

      expect(result.type).toBe('log');
      expect(result.summary).toContain('ERROR');
      expect(result.summary).toContain('WARN');
      expect(result.summary).toContain('Errors: 2');
      expect(result.summary).toContain('Warnings: 1');
    });
  });

  describe('Text compression', () => {
    it('keeps first and last sentences', () => {
      const text = 'First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence. Sixth sentence.';
      const result = sandbox.process({
        toolName: 'Read',
        raw: text,
        size: text.length
      });

      expect(result.summary).toContain('First sentence');
      expect(result.summary).toContain('Sixth sentence');
    });
  });

  describe('Compression ratio', () => {
    it('achieves 90%+ compression on large tool results', () => {
      const largeResult = 'x'.repeat(50000);
      const result = sandbox.process({
        toolName: 'Read',
        raw: largeResult,
        size: largeResult.length
      });

      expect(result.compressionRatio).toBeGreaterThan(0.9);
      expect(result.summary.length).toBeLessThan(2500);
    });
  });
});
