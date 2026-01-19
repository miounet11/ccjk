/**
 * Example: Interactive Wizard
 * Step-by-step configuration with validation
 */

import { createWizard } from '../../src/api-providers';

async function interactiveWizardExample() {
  console.log('=== Interactive Wizard Example ===\n');

  const wizard = createWizard();

  // Step 1: Choose provider
  console.log('Step 1: Choose Provider');
  const step1 = wizard.getStep1();
  console.log(`Title: ${step1.title}`);
  console.log(`Description: ${step1.description}`);
  console.log(`Available providers: ${step1.fields[0].options?.length}\n`);

  wizard.setProvider('302ai');
  console.log(`Progress: ${wizard.getProgress()}%\n`);

  // Step 2: Enter credentials
  console.log('Step 2: Enter Credentials');
  const step2 = wizard.getStep2('302ai');
  console.log(`Title: ${step2.title}`);
  console.log(`Description: ${step2.description}`);
  console.log(`Required fields: ${step2.fields.map(f => f.name).join(', ')}\n`);

  await wizard.setCredentials({
    apiKey: 'sk-test-key-123456789012345678901234567890',
    model: 'claude-3-5-sonnet-20241022',
  });

  // Check state
  const state = wizard.getState();
  if (state.errors.length > 0) {
    console.log('❌ Errors:', state.errors);
    return;
  }

  if (state.warnings.length > 0) {
    console.log('⚠️  Warnings:', state.warnings);
  }

  console.log(`Progress: ${wizard.getProgress()}%\n`);

  // Test connection (optional)
  console.log('Testing connection...');
  const test = await wizard.testConnection();
  if (!test.success) {
    console.log('❌ Connection failed:', test.message);
    if (test.suggestions) {
      console.log('💡 Suggestions:');
      test.suggestions.forEach(s => console.log(`  • ${s}`));
    }
    return;
  }
  console.log('✅ Connection successful!\n');

  // Complete setup
  const setup = await wizard.complete();
  console.log('✅ Setup complete!');
  console.log(`Provider: ${setup.provider.name}`);
  console.log(`Model: ${setup.model}`);
}

// Run example
interactiveWizardExample().catch(console.error);
