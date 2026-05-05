import type { HealthCheck, HealthResult } from '../types';
/**
 * Default Model Health Check
 */
import { existsSync, readFileSync } from 'node:fs';
import process from 'node:process';
import { SETTINGS_FILE } from '../../constants';

function collectModelDetails(settings: any): string[] {
  const env = settings?.env || {};
  const details: string[] = [];

  const primaryModel = settings?.model && settings.model !== 'default'
    ? settings.model
    : env.ANTHROPIC_MODEL;
  const haikuModel = env.ANTHROPIC_DEFAULT_HAIKU_MODEL || env.ANTHROPIC_SMALL_FAST_MODEL;
  const sonnetModel = env.ANTHROPIC_DEFAULT_SONNET_MODEL;
  const opusModel = env.ANTHROPIC_DEFAULT_OPUS_MODEL;

  if (primaryModel) {
    details.push(`  primary: ${primaryModel}`);
  }
  if (haikuModel) {
    details.push(`  haiku: ${haikuModel}`);
  }
  if (sonnetModel) {
    details.push(`  sonnet: ${sonnetModel}`);
  }
  if (opusModel) {
    details.push(`  opus: ${opusModel}`);
  }

  return details;
}

export const modelCheck: HealthCheck = {
  name: 'Default Model',
  weight: 5,
  async check(): Promise<HealthResult> {
    try {
      if (!existsSync(SETTINGS_FILE)) {
        return {
          name: this.name,
          status: 'fail',
          score: 0,
          weight: this.weight,
          message: 'No settings file',
          command: 'ccjk init',
        };
      }

      const settings = JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8'));
      const hasModel = settings.model
        || settings.env?.ANTHROPIC_MODEL
        || settings.env?.ANTHROPIC_DEFAULT_HAIKU_MODEL
        || settings.env?.ANTHROPIC_SMALL_FAST_MODEL
        || settings.env?.ANTHROPIC_DEFAULT_SONNET_MODEL
        || settings.env?.ANTHROPIC_DEFAULT_OPUS_MODEL;
      const hasCredential = settings.authToken
        || settings.apiKey
        || settings.env?.ANTHROPIC_AUTH_TOKEN
        || settings.env?.ANTHROPIC_API_KEY
        || process.env.ANTHROPIC_AUTH_TOKEN
        || process.env.ANTHROPIC_API_KEY;
      const details = collectModelDetails(settings);

      if (!hasCredential) {
        return {
          name: this.name,
          status: 'warn',
          score: 40,
          weight: this.weight,
          message: 'No API key configured (using default)',
          fix: 'Configure API for direct access',
          command: 'ccjk menu',
          details: details.length > 0 ? details : ['  Using Claude Code default API'],
        };
      }

      return {
        name: this.name,
        status: 'pass',
        score: hasModel ? 100 : 70,
        weight: this.weight,
        message: hasModel ? `Model configured` : 'API configured (default model)',
        details,
      };
    }
    catch {
      return { name: this.name, status: 'fail', score: 0, weight: this.weight, message: 'Failed to read model config' };
    }
  },
};
