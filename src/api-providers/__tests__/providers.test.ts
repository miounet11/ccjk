/**
 * Provider Implementation Tests
 */

import { Provider302AI } from '../providers/302ai';
import { ProviderGLM } from '../providers/glm';
import { ProviderMiniMax } from '../providers/minimax';
import { ProviderKimi } from '../providers/kimi';
import { ProviderAnthropic } from '../providers/anthropic';
import { ProviderCustom } from '../providers/custom';

describe('Provider Implementations', () => {
  describe('Provider302AI', () => {
    let provider: Provider302AI;

    beforeEach(() => {
      provider = new Provider302AI();
    });

    it('should have correct configuration', () => {
      const config = provider.getConfig();
      expect(config.id).toBe('302ai');
      expect(config.name).toBe('302.AI');
      expect(config.requiresApiKey).toBe(true);
      expect(config.availableModels.length).toBeGreaterThan(0);
    });

    it('should validate API key format', async () => {
      const result = await provider.validateCredentials({
        apiKey: 'sk-test-key-123456789012345678901234567890',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject empty API key', async () => {
      const result = await provider.validateCredentials({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('API Key is required');
    });

    it('should warn about incorrect prefix', async () => {
      const result = await provider.validateCredentials({
        apiKey: 'invalid-key-123456789012345678901234567890',
      });
      expect(result.warnings?.length).toBeGreaterThan(0);
    });

    it('should reject short API key', async () => {
      const result = await provider.validateCredentials({
        apiKey: 'sk-short',
      });
      expect(result.valid).toBe(false);
    });

    it('should provide setup instructions', () => {
      const instructions = provider.getSetupInstructions();
      expect(instructions.length).toBeGreaterThan(0);
      expect(instructions[0]).toContain('302.ai');
    });

    it('should provide error help', () => {
      const error = new Error('unauthorized');
      const help = provider.getErrorHelp(error);
      expect(help).toContain('API key');
    });
  });

  describe('ProviderGLM', () => {
    let provider: ProviderGLM;

    beforeEach(() => {
      provider = new ProviderGLM();
    });

    it('should have correct configuration', () => {
      const config = provider.getConfig();
      expect(config.id).toBe('glm');
      expect(config.name).toBe('GLM (智谱AI)');
      expect(config.baseUrl).toContain('bigmodel.cn');
    });

    it('should validate API key', async () => {
      const result = await provider.validateCredentials({
        apiKey: 'test-key-12345678901234567890123456789012',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject short API key', async () => {
      const result = await provider.validateCredentials({
        apiKey: 'short-key',
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('ProviderMiniMax', () => {
    let provider: ProviderMiniMax;

    beforeEach(() => {
      provider = new ProviderMiniMax();
    });

    it('should have correct configuration', () => {
      const config = provider.getConfig();
      expect(config.id).toBe('minimax');
      expect(config.name).toBe('MiniMax');
      expect(config.customFields?.length).toBeGreaterThan(0);
    });

    it('should require Group ID', async () => {
      const result = await provider.validateCredentials({
        apiKey: 'test-key-123456789012345678901234567890',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Group ID is required');
    });

    it('should validate with Group ID', async () => {
      const result = await provider.validateCredentials({
        apiKey: 'test-key-123456789012345678901234567890',
        customFields: { groupId: 'test-group-id' },
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('ProviderKimi', () => {
    let provider: ProviderKimi;

    beforeEach(() => {
      provider = new ProviderKimi();
    });

    it('should have correct configuration', () => {
      const config = provider.getConfig();
      expect(config.id).toBe('kimi');
      expect(config.name).toBe('Kimi (Moonshot AI)');
      expect(config.baseUrl).toContain('moonshot.cn');
    });

    it('should validate API key with sk- prefix', async () => {
      const result = await provider.validateCredentials({
        apiKey: 'sk-test-key-123456789012345678901234567890',
      });
      expect(result.valid).toBe(true);
    });

    it('should warn about missing sk- prefix', async () => {
      const result = await provider.validateCredentials({
        apiKey: 'test-key-123456789012345678901234567890',
      });
      expect(result.warnings?.length).toBeGreaterThan(0);
    });
  });

  describe('ProviderAnthropic', () => {
    let provider: ProviderAnthropic;

    beforeEach(() => {
      provider = new ProviderAnthropic();
    });

    it('should have correct configuration', () => {
      const config = provider.getConfig();
      expect(config.id).toBe('anthropic');
      expect(config.name).toBe('Anthropic');
      expect(config.baseUrl).toContain('anthropic.com');
    });

    it('should validate API key with sk-ant- prefix', async () => {
      const result = await provider.validateCredentials({
        apiKey: 'sk-ant-test-key-123456789012345678901234567890123456789012345678901234567890',
      });
      expect(result.valid).toBe(true);
    });

    it('should warn about incorrect prefix', async () => {
      const result = await provider.validateCredentials({
        apiKey: 'sk-test-key-123456789012345678901234567890123456789012345678901234567890',
      });
      expect(result.warnings?.length).toBeGreaterThan(0);
    });
  });

  describe('ProviderCustom', () => {
    let provider: ProviderCustom;

    beforeEach(() => {
      provider = new ProviderCustom();
    });

    it('should have correct configuration', () => {
      const config = provider.getConfig();
      expect(config.id).toBe('custom');
      expect(config.name).toBe('Custom Provider');
      expect(config.customFields?.length).toBeGreaterThan(0);
    });

    it('should require base URL', async () => {
      const result = await provider.validateCredentials({
        apiKey: 'test-key',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('API Base URL is required');
    });

    it('should require model name', async () => {
      const result = await provider.validateCredentials({
        apiKey: 'test-key',
        customFields: { baseUrl: 'https://api.example.com/v1' },
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Model name is required');
    });

    it('should validate URL format', async () => {
      const result = await provider.validateCredentials({
        apiKey: 'test-key',
        customFields: {
          baseUrl: 'invalid-url',
          model: 'gpt-3.5-turbo',
        },
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid URL format');
    });

    it('should validate complete configuration', async () => {
      const result = await provider.validateCredentials({
        apiKey: 'test-key',
        customFields: {
          baseUrl: 'https://api.example.com/v1',
          model: 'gpt-3.5-turbo',
          authType: 'Bearer Token',
        },
      });
      expect(result.valid).toBe(true);
    });

    it('should require custom header name when using custom header auth', async () => {
      const result = await provider.validateCredentials({
        apiKey: 'test-key',
        customFields: {
          baseUrl: 'https://api.example.com/v1',
          model: 'gpt-3.5-turbo',
          authType: 'Custom Header',
        },
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Custom header name is required when using Custom Header auth');
    });
  });
});
