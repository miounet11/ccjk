/**
 * Tests for ToolRegistry
 */

import { ToolRegistry } from '../tool-registry';
import { ICodeTool } from '../interfaces';
import { ToolMetadata } from '../types';

// Mock tool for testing
class MockToolA implements ICodeTool {
  getMetadata(): ToolMetadata {
    return {
      name: 'mock-a',
      displayName: 'Mock A',
      description: 'Mock tool A',
      version: '1.0.0',
      capabilities: {
        supportsChat: false,
        supportsFileEdit: false,
        supportsCodeGen: false,
        supportsReview: false,
        supportsTesting: false,
        supportsDebugging: false,
      },
    };
  }

  async isInstalled() {
    return { installed: true };
  }

  async install() {
    return { success: true };
  }

  async uninstall() {
    return { success: true };
  }

  async getConfig() {
    return { name: 'mock-a' };
  }

  async updateConfig() {}

  async configure() {}

  async validateConfig() {
    return true;
  }

  async execute() {
    return { success: true };
  }

  async getVersion() {
    return '1.0.0';
  }

  async reset() {}
}

class MockToolB implements ICodeTool {
  getMetadata(): ToolMetadata {
    return {
      name: 'mock-b',
      displayName: 'Mock B',
      description: 'Mock tool B',
      version: '1.0.0',
      capabilities: {
        supportsChat: false,
        supportsFileEdit: false,
        supportsCodeGen: false,
        supportsReview: false,
        supportsTesting: false,
        supportsDebugging: false,
      },
    };
  }

  async isInstalled() {
    return { installed: true };
  }

  async install() {
    return { success: true };
  }

  async uninstall() {
    return { success: true };
  }

  async getConfig() {
    return { name: 'mock-b' };
  }

  async updateConfig() {}

  async configure() {}

  async validateConfig() {
    return true;
  }

  async execute() {
    return { success: true };
  }

  async getVersion() {
    return '1.0.0';
  }

  async reset() {}
}

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = ToolRegistry.getInstance();
    registry.clear();
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = ToolRegistry.getInstance();
      const instance2 = ToolRegistry.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('tool registration', () => {
    it('should register tool class', () => {
      registry.registerToolClass('mock-a', MockToolA);
      expect(registry.hasTool('mock-a')).toBe(true);
    });

    it('should register tool instance', () => {
      const tool = new MockToolA();
      registry.registerTool(tool);
      const retrieved = registry.getTool('mock-a');
      expect(retrieved).toBe(tool);
    });

    it('should handle case-insensitive names', () => {
      registry.registerToolClass('mock-a', MockToolA);
      expect(registry.hasTool('MOCK-A')).toBe(true);
      expect(registry.hasTool('Mock-A')).toBe(true);
    });
  });

  describe('tool retrieval', () => {
    beforeEach(() => {
      registry.registerToolClass('mock-a', MockToolA);
      registry.registerToolClass('mock-b', MockToolB);
    });

    it('should get tool by name', () => {
      const tool = registry.getTool('mock-a');
      expect(tool).toBeDefined();
      expect(tool?.getMetadata().name).toBe('mock-a');
    });

    it('should return undefined for non-existent tool', () => {
      const tool = registry.getTool('non-existent');
      expect(tool).toBeUndefined();
    });

    it('should get all tool names', () => {
      const names = registry.getToolNames();
      expect(names).toContain('mock-a');
      expect(names).toContain('mock-b');
      expect(names.length).toBe(2);
    });

    it('should create instance on first access', () => {
      const tool1 = registry.getTool('mock-a');
      const tool2 = registry.getTool('mock-a');
      expect(tool1).toBe(tool2); // Same instance
    });
  });

  describe('tool unregistration', () => {
    it('should unregister tool', () => {
      registry.registerToolClass('mock-a', MockToolA);
      expect(registry.hasTool('mock-a')).toBe(true);

      registry.unregisterTool('mock-a');
      expect(registry.hasTool('mock-a')).toBe(false);
    });

    it('should clear all tools', () => {
      registry.registerToolClass('mock-a', MockToolA);
      registry.registerToolClass('mock-b', MockToolB);

      registry.clear();
      expect(registry.getToolNames().length).toBe(0);
    });
  });

  describe('metadata retrieval', () => {
    it('should get all metadata', async () => {
      registry.registerToolClass('mock-a', MockToolA);
      registry.registerToolClass('mock-b', MockToolB);

      const metadata = await registry.getAllMetadata();
      expect(metadata.length).toBe(2);
      expect(metadata.some(m => m.name === 'mock-a')).toBe(true);
      expect(metadata.some(m => m.name === 'mock-b')).toBe(true);
    });
  });
});
