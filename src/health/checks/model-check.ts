/**
 * Default Model Health Check
 */
import { existsSync, readFileSync } from 'node:fs'
import process from 'node:process'
import { SETTINGS_FILE } from '../../constants'
import type { HealthCheck, HealthResult } from '../types'

export const modelCheck: HealthCheck = {
  name: 'Default Model',
  weight: 5,
  async check(): Promise<HealthResult> {
    try {
      if (!existsSync(SETTINGS_FILE)) {
        return {
          name: this.name, status: 'fail', score: 0, weight: this.weight,
          message: 'No settings file', command: 'ccjk init',
        }
      }

      const settings = JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8'))
      const hasModel = settings.model || settings.defaultModel || settings.preferredModel
      const hasApiKey = settings.apiKey || settings.env?.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY

      if (!hasApiKey) {
        return {
          name: this.name, status: 'warn', score: 40, weight: this.weight,
          message: 'No API key configured (using default)',
          fix: 'Configure API for direct access', command: 'ccjk menu',
          details: ['  Using Claude Code default API'],
        }
      }

      return {
        name: this.name, status: 'pass',
        score: hasModel ? 100 : 70,
        weight: this.weight,
        message: hasModel ? `Model: ${hasModel}` : 'API configured (default model)',
      }
    }
    catch {
      return { name: this.name, status: 'fail', score: 0, weight: this.weight, message: 'Failed to read model config' }
    }
  },
}
