/**
 * API Providers Module
 * Zero-Config Experience - Simplify API configuration from 5 minutes to 1 minute
 */

// Core exports
export * from './core/provider-interface';
export * from './core/provider-registry';
export * from './core/provider-factory';

// Provider implementations
export { Provider302AI } from './providers/302ai';
export { ProviderGLM } from './providers/glm';
export { ProviderMiniMax } from './providers/minimax';
export { ProviderKimi } from './providers/kimi';
export { ProviderAnthropic } from './providers/anthropic';
export { ProviderCustom } from './providers/custom';

// Wizard exports
export * from './wizard/setup-wizard';
export * from './wizard/quick-switch';
export * from './wizard/validation';

// Registry instance
import { providerRegistry } from './core/provider-registry';
import { Provider302AI } from './providers/302ai';
import { ProviderGLM } from './providers/glm';
import { ProviderMiniMax } from './providers/minimax';
import { ProviderKimi } from './providers/kimi';
import { ProviderAnthropic } from './providers/anthropic';
import { ProviderCustom } from './providers/custom';

/**
 * Initialize all providers
 */
export function initializeProviders(): void {
  // Register popular providers
  providerRegistry.register(new Provider302AI(), {
    popular: true,
    setupTime: '30 seconds',
    difficulty: 'easy',
  });

  providerRegistry.register(new ProviderGLM(), {
    popular: true,
    setupTime: '1 minute',
    difficulty: 'easy',
  });

  providerRegistry.register(new ProviderKimi(), {
    popular: true,
    setupTime: '1 minute',
    difficulty: 'easy',
  });

  // Register other providers
  providerRegistry.register(new ProviderMiniMax(), {
    popular: false,
    setupTime: '2 minutes',
    difficulty: 'medium',
  });

  providerRegistry.register(new ProviderAnthropic(), {
    popular: false,
    setupTime: '1 minute',
    difficulty: 'easy',
  });

  providerRegistry.register(new ProviderCustom(), {
    popular: false,
    setupTime: '3 minutes',
    difficulty: 'hard',
  });
}

// Auto-initialize on import
initializeProviders();

/**
 * Quick Setup Function
 * The simplest way to configure a provider
 *
 * @example
 * ```typescript
 * // Just 2 steps!
 * const setup = await quickSetup('302ai', 'sk-your-api-key');
 * // Done! Ready to use
 * ```
 */
export { createWizard } from './wizard/setup-wizard';
export { createQuickSwitch } from './wizard/quick-switch';

/**
 * Usage Examples:
 *
 * 1. Quick Setup (Recommended):
 * ```typescript
 * import { createWizard } from './api-providers';
 *
 * const wizard = createWizard();
 * const setup = await wizard.quickSetup('302ai', 'your-api-key');
 * ```
 *
 * 2. Step-by-Step Wizard:
 * ```typescript
 * import { createWizard } from './api-providers';
 *
 * const wizard = createWizard();
 *
 * // Step 1: Choose provider
 * const step1 = wizard.getStep1();
 * wizard.setProvider('302ai');
 *
 * // Step 2: Enter credentials
 * const step2 = wizard.getStep2('302ai');
 * await wizard.setCredentials({ apiKey: 'your-key' });
 *
 * // Complete
 * const setup = await wizard.complete();
 * ```
 *
 * 3. Quick Switch Between Providers:
 * ```typescript
 * import { createQuickSwitch } from './api-providers';
 *
 * const switcher = createQuickSwitch();
 * switcher.saveProvider(setup1);
 * switcher.saveProvider(setup2);
 *
 * // Switch instantly
 * const currentSetup = switcher.switchTo('302ai');
 * ```
 */
