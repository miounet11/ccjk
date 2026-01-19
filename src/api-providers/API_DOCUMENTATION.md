# API Provider System - Technical Documentation

## Architecture Overview

The API Provider System is built with a modular, extensible architecture:

```
src/api-providers/
├── core/                    # Core abstractions
│   ├── provider-interface.ts   # Provider contract
│   ├── provider-registry.ts    # Provider management
│   └── provider-factory.ts     # Provider creation
├── providers/               # Provider implementations
│   ├── 302ai.ts
│   ├── glm.ts
│   ├── minimax.ts
│   ├── kimi.ts
│   ├── anthropic.ts
│   └── custom.ts
├── wizard/                  # User experience layer
│   ├── setup-wizard.ts         # 2-step configuration
│   ├── quick-switch.ts         # Provider switching
│   └── validation.ts           # Validation utilities
└── index.ts                 # Public API
```

## Core Concepts

### 1. Provider Interface

All providers implement the `IProvider` interface:

```typescript
interface IProvider {
  // Get provider configuration
  getConfig(): ProviderConfig;

  // Validate credentials
  validateCredentials(credentials: ProviderCredentials): Promise<ValidationResult>;

  // Test connection
  testConnection(credentials: ProviderCredentials): Promise<ValidationResult>;

  // Get setup instructions
  getSetupInstructions(): string[];

  // Get error help text
  getErrorHelp(error: Error): string;

  // Auto-fill configuration (optional)
  autoFillFromApiKey?(apiKey: string): Partial<ProviderSetup>;
}
```

### 2. Provider Configuration

Each provider defines its configuration:

```typescript
interface ProviderConfig {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  description: string;           // Description
  baseUrl: string;               // API base URL
  defaultModel: string;          // Default model
  availableModels: string[];     // Available models
  requiresApiKey: boolean;       // API key required?
  customFields?: CustomField[];  // Additional fields
  icon?: string;                 // Display icon
}
```

### 3. Provider Registry

Central registry for all providers:

```typescript
class ProviderRegistry {
  // Singleton instance
  static getInstance(): ProviderRegistry;

  // Register a provider
  register(provider: IProvider, metadata?: Partial<ProviderMetadata>): void;

  // Get provider by ID
  getProvider(id: string): IProvider | undefined;

  // Get all providers
  getAllProviders(): IProvider[];

  // Get popular providers
  getPopularProviders(): ProviderMetadata[];

  // Search providers
  searchProviders(query: string): ProviderMetadata[];
}
```

### 4. Setup Wizard

Simplifies configuration to 2 steps:

```typescript
class SetupWizard {
  // Get Step 1: Provider selection
  getStep1(): WizardStep;

  // Get Step 2: Credentials
  getStep2(providerId: string): WizardStep;

  // Set provider (Step 1)
  setProvider(providerId: string): void;

  // Set credentials (Step 2)
  setCredentials(data: Record<string, string>): Promise<void>;

  // Complete setup
  complete(): Promise<ProviderSetup>;

  // Test connection
  testConnection(): Promise<{ success: boolean; message: string; suggestions?: string[] }>;

  // Quick setup (1 call)
  quickSetup(providerId: string, apiKey: string): Promise<ProviderSetup>;

  // Get current state
  getState(): WizardState;

  // Reset wizard
  reset(): void;

  // Get progress (0-100)
  getProgress(): number;
}
```

## Creating a New Provider

### Step 1: Implement IProvider

```typescript
import {
  IProvider,
  ProviderConfig,
  ProviderCredentials,
  ValidationResult,
} from '../core/provider-interface';

export class ProviderExample implements IProvider {
  private config: ProviderConfig = {
    id: 'example',
    name: 'Example Provider',
    description: 'Example AI service',
    baseUrl: 'https://api.example.com/v1',
    defaultModel: 'example-model',
    availableModels: ['example-model', 'example-model-pro'],
    requiresApiKey: true,
    icon: '🔮',
  };

  getConfig(): ProviderConfig {
    return this.config;
  }

  async validateCredentials(credentials: ProviderCredentials): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!credentials.apiKey) {
      errors.push('API Key is required');
      suggestions.push('Get your API key from https://example.com');
      return { valid: false, errors, suggestions };
    }

    if (credentials.apiKey.length < 20) {
      errors.push('API key appears to be too short');
      return { valid: false, errors, suggestions };
    }

    return { valid: true, warnings, suggestions };
  }

  async testConnection(credentials: ProviderCredentials): Promise<ValidationResult> {
    const validation = await this.validateCredentials(credentials);
    if (!validation.valid) {
      return validation;
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/test`, {
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
        },
      });

      if (!response.ok) {
        return {
          valid: false,
          errors: [`Connection failed: ${response.status}`],
          suggestions: ['Check your API key', 'Verify your account is active'],
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        errors: [`Network error: ${(error as Error).message}`],
        suggestions: ['Check your internet connection'],
      };
    }
  }

  getSetupInstructions(): string[] {
    return [
      '1. Visit https://example.com and sign up',
      '2. Navigate to API Keys section',
      '3. Create a new API key',
      '4. Copy and paste the key below',
    ];
  }

  getErrorHelp(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('unauthorized')) {
      return 'Invalid API key. Please check your credentials.';
    }

    if (message.includes('rate limit')) {
      return 'Rate limit exceeded. Please wait before trying again.';
    }

    return 'An error occurred. Please check your configuration.';
  }

  autoFillFromApiKey(apiKey: string): Partial<ProviderSetup> {
    return {
      model: this.config.defaultModel,
    };
  }
}
```

### Step 2: Register Provider

```typescript
import { providerRegistry } from './core/provider-registry';
import { ProviderExample } from './providers/example';

// Register the provider
providerRegistry.register(new ProviderExample(), {
  popular: true,
  setupTime: '1 minute',
  difficulty: 'easy',
});
```

### Step 3: Use Provider

```typescript
import { createWizard } from './api-providers';

const wizard = createWizard();
const setup = await wizard.quickSetup('example', 'your-api-key');
```

## Validation System

### Built-in Validators

```typescript
import { ValidationHelper } from './wizard/validation';

// Validate API key format
const result = ValidationHelper.validateApiKeyFormat(
  apiKey,
  'sk-' // Expected prefix (optional)
);

// Validate URL
const urlResult = ValidationHelper.validateUrl(url);

// Validate required field
const fieldResult = ValidationHelper.validateRequired(value, 'Field Name');

// Get friendly error message
const friendly = ValidationHelper.getFriendlyError(error);
```

### Custom Validation

```typescript
async validateCredentials(credentials: ProviderCredentials): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Add your validation logic
  if (!credentials.apiKey) {
    errors.push('API Key is required');
    suggestions.push('Get your API key from...');
  }

  // Check format
  if (credentials.apiKey && !credentials.apiKey.startsWith('expected-prefix')) {
    warnings.push('API key should start with "expected-prefix"');
  }

  // Return result
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}
```

## Error Handling

### Error Categories

The system recognizes these error types:

1. **Network Errors**: Connection issues
2. **Authentication Errors**: Invalid credentials (401)
3. **Permission Errors**: Access denied (403)
4. **Rate Limit Errors**: Too many requests (429)
5. **Quota Errors**: Insufficient credits
6. **Model Errors**: Model not available
7. **Timeout Errors**: Request timeout

### Error Help Implementation

```typescript
getErrorHelp(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes('unauthorized') || message.includes('401')) {
    return 'Invalid API key. Please verify your credentials.';
  }

  if (message.includes('forbidden') || message.includes('403')) {
    return 'Access denied. Check your account permissions.';
  }

  if (message.includes('rate limit') || message.includes('429')) {
    return 'Rate limit exceeded. Please wait before trying again.';
  }

  if (message.includes('quota') || message.includes('balance')) {
    return 'Insufficient credits. Please recharge your account.';
  }

  if (message.includes('network') || message.includes('fetch')) {
    return 'Network error. Check your internet connection.';
  }

  return 'An error occurred. Please check your configuration.';
}
```

## Testing

### Unit Tests

```typescript
import { Provider302AI } from '../providers/302ai';

describe('Provider302AI', () => {
  let provider: Provider302AI;

  beforeEach(() => {
    provider = new Provider302AI();
  });

  it('should validate correct API key', async () => {
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
});
```

### Integration Tests

```typescript
import { createWizard } from '../wizard/setup-wizard';
import { providerRegistry } from '../core/provider-registry';

describe('Setup Wizard Integration', () => {
  beforeEach(() => {
    providerRegistry.clear();
    providerRegistry.register(new Provider302AI());
  });

  it('should complete full setup flow', async () => {
    const wizard = createWizard();

    // Step 1
    wizard.setProvider('302ai');

    // Step 2
    await wizard.setCredentials({
      apiKey: 'sk-test-key-123456789012345678901234567890',
    });

    // Complete
    const setup = await wizard.complete();
    expect(setup.provider.id).toBe('302ai');
  });
});
```

## Performance Considerations

### Lazy Loading

Providers are registered on module import but not instantiated until needed:

```typescript
// Providers are registered but not loaded
import { createWizard } from './api-providers';

// Provider is loaded only when selected
wizard.setProvider('302ai');
```

### Caching

Provider configurations are cached in the registry:

```typescript
// First call: loads provider
const provider1 = providerRegistry.getProvider('302ai');

// Second call: returns cached instance
const provider2 = providerRegistry.getProvider('302ai');

// Same instance
expect(provider1).toBe(provider2);
```

### Validation Optimization

Validation is performed in stages:

1. **Format validation**: Fast, synchronous checks
2. **Connection test**: Slower, async network call

```typescript
// Fast validation
const validation = await provider.validateCredentials(credentials);

// Only test connection if validation passes
if (validation.valid) {
  const test = await provider.testConnection(credentials);
}
```

## Security

### API Key Storage

Never store API keys in code:

```typescript
// ❌ Bad
const apiKey = 'sk-my-secret-key';

// ✅ Good
const apiKey = process.env.API_KEY;
```

### Export/Import

Control credential export:

```typescript
// Export without credentials (safe for sharing)
const config = switcher.export(false);

// Export with credentials (for backup only)
const backup = switcher.export(true);
```

### Validation

Always validate user input:

```typescript
// Validate before using
const validation = await provider.validateCredentials(credentials);
if (!validation.valid) {
  throw new Error(validation.errors.join(', '));
}
```

## Extensibility

### Custom Fields

Add provider-specific fields:

```typescript
customFields: [
  {
    key: 'groupId',
    label: 'Group ID',
    type: 'text',
    required: true,
    placeholder: 'Your Group ID',
    helpText: 'Find this in your console',
  },
  {
    key: 'region',
    label: 'Region',
    type: 'select',
    required: false,
    options: ['us-east-1', 'eu-west-1', 'ap-southeast-1'],
    defaultValue: 'us-east-1',
  },
]
```

### Auto-fill Logic

Implement smart auto-fill:

```typescript
autoFillFromApiKey(apiKey: string): Partial<ProviderSetup> {
  // Extract region from API key
  const region = apiKey.split('-')[1];

  // Select model based on region
  const model = region === 'us' ? 'gpt-4' : 'gpt-3.5-turbo';

  return {
    model,
    credentials: {
      customFields: { region },
    },
  };
}
```

## Best Practices

### 1. Provider Implementation

- Keep validation logic simple and fast
- Provide helpful error messages
- Include setup instructions
- Test connection thoroughly

### 2. Error Handling

- Catch all error types
- Provide actionable suggestions
- Use friendly language
- Include links to documentation

### 3. Testing

- Test all validation paths
- Mock network calls
- Test error scenarios
- Verify auto-fill logic

### 4. Documentation

- Document all custom fields
- Provide usage examples
- Explain error messages
- Include troubleshooting guide

## Changelog

### Version 1.0.0 (Current)

- Initial release
- 6 providers: 302.AI, GLM, MiniMax, Kimi, Anthropic, Custom
- 2-step setup wizard
- Quick switch functionality
- Real-time validation
- Comprehensive error handling
- Full test coverage

## Future Enhancements

### Planned Features

1. **Provider Templates**: Pre-configured templates for common use cases
2. **Batch Configuration**: Configure multiple providers at once
3. **Health Monitoring**: Monitor provider availability
4. **Usage Analytics**: Track provider usage and costs
5. **Auto-switching**: Automatically switch on errors
6. **Provider Recommendations**: Suggest providers based on usage

### API Stability

The current API is stable and will be maintained. Breaking changes will be:
- Announced in advance
- Documented in migration guides
- Supported with deprecation warnings

## Support

For issues or questions:
1. Check the User Guide
2. Review error messages and suggestions
3. Check provider documentation
4. Contact provider support
