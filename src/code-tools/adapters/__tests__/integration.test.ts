/**
 * Integration tests for all tool adapters
 */

import { createTool, getRegistry } from '../../index';
import { ClaudeCodeTool } from '../claude-code';
import { CodexTool } from '../codex';
import { AiderTool } from '../aider';
import { ContinueTool } from '../continue';
import { ClineTool } from '../cline';
import { CursorTool } from '../cursor';

describe('Tool Adapters Integration', () => {
  describe('Auto-registration', () => {
    it('should auto-register all tools', () => {
      const registry = getRegistry();
      const toolNames = registry.getToolNames();

      expect(toolNames).toContain('claude-code');
      expect(toolNames).toContain('codex');
      expect(toolNames).toContain('aider');
      expect(toolNames).toContain('continue');
      expect(toolNames).toContain('cline');
      expect(toolNames).toContain('cursor');
    });
  });

  describe('Tool creation via factory', () => {
    const toolNames = ['claude-code', 'codex', 'aider', 'continue', 'cline', 'cursor'];

    toolNames.forEach(toolName => {
      it(`should create ${toolName} tool`, () => {
        const tool = createTool(toolName);
        expect(tool).toBeDefined();
        expect(tool.getMetadata().name).toBe(toolName);
      });
    });
  });

  describe('Tool metadata', () => {
    it('should have correct metadata for Claude Code', () => {
      const tool = new ClaudeCodeTool();
      const metadata = tool.getMetadata();

      expect(metadata.name).toBe('claude-code');
      expect(metadata.displayName).toBe('Claude Code');
      expect(metadata.capabilities.supportsChat).toBe(true);
      expect(metadata.capabilities.supportsFileEdit).toBe(true);
      expect(metadata.capabilities.supportsCodeGen).toBe(true);
    });

    it('should have correct metadata for Codex', () => {
      const tool = new CodexTool();
      const metadata = tool.getMetadata();

      expect(metadata.name).toBe('codex');
      expect(metadata.displayName).toBe('OpenAI Codex');
      expect(metadata.capabilities.supportsCodeGen).toBe(true);
    });

    it('should have correct metadata for Aider', () => {
      const tool = new AiderTool();
      const metadata = tool.getMetadata();

      expect(metadata.name).toBe('aider');
      expect(metadata.displayName).toBe('Aider');
      expect(metadata.capabilities.supportsChat).toBe(true);
      expect(metadata.capabilities.supportsFileEdit).toBe(true);
    });

    it('should have correct metadata for Continue', () => {
      const tool = new ContinueTool();
      const metadata = tool.getMetadata();

      expect(metadata.name).toBe('continue');
      expect(metadata.displayName).toBe('Continue');
      expect(metadata.capabilities.supportsChat).toBe(true);
      expect(metadata.capabilities.supportsCodeGen).toBe(true);
    });

    it('should have correct metadata for Cline', () => {
      const tool = new ClineTool();
      const metadata = tool.getMetadata();

      expect(metadata.name).toBe('cline');
      expect(metadata.displayName).toBe('Cline');
      expect(metadata.capabilities.supportsChat).toBe(true);
      expect(metadata.capabilities.supportsFileEdit).toBe(true);
    });

    it('should have correct metadata for Cursor', () => {
      const tool = new CursorTool();
      const metadata = tool.getMetadata();

      expect(metadata.name).toBe('cursor');
      expect(metadata.displayName).toBe('Cursor');
      expect(metadata.capabilities.supportsChat).toBe(true);
      expect(metadata.capabilities.supportsFileEdit).toBe(true);
    });
  });

  describe('Common interface compliance', () => {
    const tools = [
      new ClaudeCodeTool(),
      new CodexTool(),
      new AiderTool(),
      new ContinueTool(),
      new ClineTool(),
      new CursorTool(),
    ];

    tools.forEach(tool => {
      const name = tool.getMetadata().name;

      it(`${name} should implement getMetadata`, () => {
        expect(typeof tool.getMetadata).toBe('function');
        const metadata = tool.getMetadata();
        expect(metadata.name).toBeDefined();
        expect(metadata.displayName).toBeDefined();
        expect(metadata.capabilities).toBeDefined();
      });

      it(`${name} should implement isInstalled`, () => {
        expect(typeof tool.isInstalled).toBe('function');
      });

      it(`${name} should implement install`, () => {
        expect(typeof tool.install).toBe('function');
      });

      it(`${name} should implement getConfig`, () => {
        expect(typeof tool.getConfig).toBe('function');
      });

      it(`${name} should implement updateConfig`, () => {
        expect(typeof tool.updateConfig).toBe('function');
      });

      it(`${name} should implement configure`, () => {
        expect(typeof tool.configure).toBe('function');
      });

      it(`${name} should implement execute`, () => {
        expect(typeof tool.execute).toBe('function');
      });
    });
  });

  describe('Configuration management', () => {
    it('should manage configuration for each tool', async () => {
      const tool = createTool('claude-code');

      await tool.updateConfig({
        apiKey: 'test-key',
        model: 'claude-opus-4',
      });

      const config = await tool.getConfig();
      expect(config.apiKey).toBe('test-key');
      expect(config.model).toBe('claude-opus-4');
    });
  });
});
