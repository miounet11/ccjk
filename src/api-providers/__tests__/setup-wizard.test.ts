/**
 * Setup Wizard Tests
 */

import { SetupWizard, createWizard } from '../wizard/setup-wizard';
import { providerRegistry } from '../core/provider-registry';
import { Provider302AI } from '../providers/302ai';
import { ProviderGLM } from '../providers/glm';

describe('SetupWizard', () => {
  beforeEach(() => {
    providerRegistry.clear();
    providerRegistry.register(new Provider302AI(), { popular: true });
    providerRegistry.register(new ProviderGLM(), { popular: true });
  });

  describe('createWizard', () => {
    it('should create a new wizard instance', () => {
      const wizard = createWizard();
      expect(wizard).toBeInstanceOf(SetupWizard);
    });
  });

  describe('getStep1', () => {
    it('should return provider selection step', () => {
      const wizard = createWizard();
      const step1 = wizard.getStep1();

      expect(step1.step).toBe(1);
      expect(step1.title).toBe('Choose Your AI Provider');
      expect(step1.fields).toHaveLength(1);
      expect(step1.fields[0].name).toBe('provider');
      expect(step1.fields[0].type).toBe('select');
    });

    it('should include all registered providers', () => {
      const wizard = createWizard();
      const step1 = wizard.getStep1();

      const providerField = step1.fields[0];
      const providerIds = providerField.options?.map(opt => opt.value).filter(v => v !== '---');

      expect(providerIds).toContain('302ai');
      expect(providerIds).toContain('glm');
    });
  });

  describe('setProvider', () => {
    it('should set provider and advance to step 2', () => {
      const wizard = createWizard();
      wizard.setProvider('302ai');

      const state = wizard.getState();
      expect(state.providerId).toBe('302ai');
      expect(state.currentStep).toBe(2);
    });

    it('should add error for invalid provider', () => {
      const wizard = createWizard();
      wizard.setProvider('invalid');

      const state = wizard.getState();
      expect(state.errors.length).toBeGreaterThan(0);
    });
  });

  describe('getStep2', () => {
    it('should return credentials step', () => {
      const wizard = createWizard();
      wizard.setProvider('302ai');
      const step2 = wizard.getStep2('302ai');

      expect(step2.step).toBe(2);
      expect(step2.title).toBe('Enter Your API Key');
      expect(step2.fields.length).toBeGreaterThan(0);
    });

    it('should include API key field', () => {
      const wizard = createWizard();
      wizard.setProvider('302ai');
      const step2 = wizard.getStep2('302ai');

      const apiKeyField = step2.fields.find(f => f.name === 'apiKey');
      expect(apiKeyField).toBeDefined();
      expect(apiKeyField?.type).toBe('password');
      expect(apiKeyField?.required).toBe(true);
    });

    it('should include model selection', () => {
      const wizard = createWizard();
      wizard.setProvider('302ai');
      const step2 = wizard.getStep2('302ai');

      const modelField = step2.fields.find(f => f.name === 'model');
      expect(modelField).toBeDefined();
      expect(modelField?.type).toBe('select');
    });

    it('should throw error for invalid provider', () => {
      const wizard = createWizard();
      expect(() => wizard.getStep2('invalid')).toThrow();
    });
  });

  describe('setCredentials', () => {
    it('should set credentials', async () => {
      const wizard = createWizard();
      wizard.setProvider('302ai');
      await wizard.setCredentials({ apiKey: 'sk-test-key-123456789012345678901234567890' });

      const state = wizard.getState();
      expect(state.credentials.apiKey).toBe('sk-test-key-123456789012345678901234567890');
    });

    it('should validate credentials', async () => {
      const wizard = createWizard();
      wizard.setProvider('302ai');
      await wizard.setCredentials({ apiKey: 'short' });

      const state = wizard.getState();
      expect(state.errors.length).toBeGreaterThan(0);
    });

    it('should add error if provider not selected', async () => {
      const wizard = createWizard();
      await wizard.setCredentials({ apiKey: 'test-key' });

      const state = wizard.getState();
      expect(state.errors.length).toBeGreaterThan(0);
    });
  });

  describe('getProgress', () => {
    it('should return 50% at step 1', () => {
      const wizard = createWizard();
      expect(wizard.getProgress()).toBe(50);
    });

    it('should return 100% at step 2', () => {
      const wizard = createWizard();
      wizard.setProvider('302ai');
      expect(wizard.getProgress()).toBe(100);
    });
  });

  describe('reset', () => {
    it('should reset wizard state', () => {
      const wizard = createWizard();
      wizard.setProvider('302ai');
      wizard.reset();

      const state = wizard.getState();
      expect(state.currentStep).toBe(1);
      expect(state.providerId).toBeUndefined();
      expect(state.credentials).toEqual({});
    });
  });

  describe('quickSetup', () => {
    it('should complete setup in one call', async () => {
      const wizard = createWizard();
      const setup = await wizard.quickSetup('302ai', 'sk-test-key-123456789012345678901234567890');

      expect(setup.provider.id).toBe('302ai');
      expect(setup.credentials.apiKey).toBe('sk-test-key-123456789012345678901234567890');
    });

    it('should throw error for invalid credentials', async () => {
      const wizard = createWizard();
      await expect(wizard.quickSetup('302ai', 'short')).rejects.toThrow();
    });
  });
});
