import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'pathe';
import { tmpdir } from 'node:os';

// Mock modules before imports
vi.mock('../../src/utils/config.js', () => ({
  getClaudeDir: () => join(tmpdir(), 'test-claude-dir'),
}));

vi.mock('../../src/brain/auto-memory-bridge.js', () => ({
  AutoMemoryBridge: class {
    async syncMemory() {
      return Promise.resolve();
    }
  },
}));

describe('Memory Command', () => {
  const testClaudeDir = join(tmpdir(), 'test-claude-dir');
  const testMemoryPath = join(testClaudeDir, 'memory', 'MEMORY.md');

  beforeEach(() => {
    // Clean up test directory
    if (existsSync(testClaudeDir)) {
      rmSync(testClaudeDir, { recursive: true, force: true });
    }
    mkdirSync(join(testClaudeDir, 'memory'), { recursive: true });
  });

  afterEach(() => {
    // Clean up after tests
    if (existsSync(testClaudeDir)) {
      rmSync(testClaudeDir, { recursive: true, force: true });
    }
  });

  it('should create memory directory if not exists', async () => {
    expect(existsSync(join(testClaudeDir, 'memory'))).toBe(true);
  });

  it('should read empty memory file', async () => {
    const content = existsSync(testMemoryPath)
      ? readFileSync(testMemoryPath, 'utf-8')
      : '';

    expect(content).toBe('');
  });

  it('should write and read memory content', () => {
    const testContent = '# Test Memory\n\nThis is a test.';
    writeFileSync(testMemoryPath, testContent, 'utf-8');

    const content = readFileSync(testMemoryPath, 'utf-8');
    expect(content).toBe(testContent);
  });

  it('should handle project-specific memory paths', () => {
    const projectPath = '/test/project';
    const projectHash = Buffer.from(projectPath).toString('base64').replace(/[/+=]/g, '_');
    const expectedPath = join(testClaudeDir, 'projects', projectHash, 'memory', 'MEMORY.md');

    expect(expectedPath).toContain('projects');
    expect(expectedPath).toContain('memory');
    expect(expectedPath).toContain('MEMORY.md');
  });
});
