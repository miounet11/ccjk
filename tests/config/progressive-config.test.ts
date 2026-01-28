import { describe, it, expect, beforeEach } from 'vitest';
import { ProgressiveConfig } from '../../src/config/progressive-config';
import type { SmartDefaults } from '../../src/config/smart-defaults';

describe('progressive-config', () => {
  let defaults: SmartDefaults;

  beforeEach(() => {
    defaults = {
      apiProvider: 'anthropic',
      apiKey: 'sk-test-key',
      mcpServices: ['filesystem', 'git', 'fetch'],
      skills: ['git-commit', 'feat', 'workflow', 'init-project', 'git-rollback'],
      agents: ['typescript-cli-architect', 'ccjk-testing-specialist'],
      codeToolType: 'claude-code',
    };
  });

  describe('constructor', () => {
    it('should initialize with defaults', () => {
      const config = new ProgressiveConfig(defaults);

      expect(config.getApiProvider()).toBe('anthropic');
      expect(config.getApiKey()).toBe('sk-test-key');
      expect(config.getMcpServices()).toEqual(['filesystem', 'git', 'fetch']);
      expect(config.getSkills()).toEqual(['git-commit', 'feat', 'workflow', 'init-project', 'git-rollback']);
      expect(config.getAgents()).toEqual(['typescript-cli-architect', 'ccjk-testing-specialist']);
    });

    it('should initialize with options', () => {
      const config = new ProgressiveConfig(defaults, {
        skipInteractive: true,
        verbose: true,
      });

      expect(config.shouldSkipInteractive()).toBe(true);
      expect(config.isVerbose()).toBe(true);
    });
  });

  describe('needsApiKeyPrompt', () => {
    it('should return false when API key is present', () => {
      const config = new ProgressiveConfig(defaults);

      expect(config.needsApiKeyPrompt()).toBe(false);
    });

    it('should return true when API key is missing', () => {
      const noKeyDefaults = { ...defaults, apiKey: undefined };
      const config = new ProgressiveConfig(noKeyDefaults);

      expect(config.needsApiKeyPrompt()).toBe(true);
    });

    it('should return true when API provider is missing', () => {
      const noProviderDefaults = { ...defaults, apiProvider: undefined };
      const config = new ProgressiveConfig(noProviderDefaults);

      expect(config.needsApiKeyPrompt()).toBe(true);
    });
  });

  describe('getMcpServices', () => {
    it('should return MCP services', () => {
      const config = new ProgressiveConfig(defaults);

      expect(config.getMcpServices()).toEqual(['filesystem', 'git', 'fetch']);
    });
  });

  describe('getSkills', () => {
    it('should return skills', () => {
      const config = new ProgressiveConfig(defaults);

      expect(config.getSkills()).toEqual(['git-commit', 'feat', 'workflow', 'init-project', 'git-rollback']);
    });
  });

  describe('getAgents', () => {
    it('should return agents', () => {
      const config = new ProgressiveConfig(defaults);

      expect(config.getAgents()).toEqual(['typescript-cli-architect', 'ccjk-testing-specialist']);
    });
  });

  describe('getApiProvider', () => {
    it('should return API provider', () => {
      const config = new ProgressiveConfig(defaults);

      expect(config.getApiProvider()).toBe('anthropic');
    });

    it('should return undefined when not set', () => {
      const noProviderDefaults = { ...defaults, apiProvider: undefined };
      const config = new ProgressiveConfig(noProviderDefaults);

      expect(config.getApiProvider()).toBeUndefined();
    });
  });

  describe('getApiKey', () => {
    it('should return API key', () => {
      const config = new ProgressiveConfig(defaults);

      expect(config.getApiKey()).toBe('sk-test-key');
    });

    it('should return undefined when not set', () => {
      const noKeyDefaults = { ...defaults, apiKey: undefined };
      const config = new ProgressiveConfig(noKeyDefaults);

      expect(config.getApiKey()).toBeUndefined();
    });
  });

  describe('getCodeToolType', () => {
    it('should return code tool type', () => {
      const config = new ProgressiveConfig(defaults);

      expect(config.getCodeToolType()).toBe('claude-code');
    });
  });

  describe('setApiProvider', () => {
    it('should set API provider and key', () => {
      const config = new ProgressiveConfig(defaults);

      config.setApiProvider('openai', 'sk-new-key');

      expect(config.getApiProvider()).toBe('openai');
      expect(config.getApiKey()).toBe('sk-new-key');
    });
  });

  describe('isVerbose', () => {
    it('should return false by default', () => {
      const config = new ProgressiveConfig(defaults);

      expect(config.isVerbose()).toBe(false);
    });

    it('should return true when set', () => {
      const config = new ProgressiveConfig(defaults, { verbose: true });

      expect(config.isVerbose()).toBe(true);
    });
  });

  describe('shouldSkipInteractive', () => {
    it('should return false by default', () => {
      const config = new ProgressiveConfig(defaults);

      expect(config.shouldSkipInteractive()).toBe(false);
    });

    it('should return true when set', () => {
      const config = new ProgressiveConfig(defaults, { skipInteractive: true });

      expect(config.shouldSkipInteractive()).toBe(true);
    });
  });

  describe('getDefaults', () => {
    it('should return a copy of defaults', () => {
      const config = new ProgressiveConfig(defaults);

      const returnedDefaults = config.getDefaults();

      expect(returnedDefaults).toEqual(defaults);
      expect(returnedDefaults).not.toBe(defaults); // Should be a copy
    });
  });
});
