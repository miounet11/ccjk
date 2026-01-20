/**
 * Deep Linking System
 * Enables seamless integration from supplier documentation and websites
 */

import type { DeepLinkConfig } from '../types'
import { OneClickSetup } from './one-click-setup'

export interface DeepLinkHandler {
  protocol: string
  handler: (url: string) => Promise<void>
}

export class DeepLinking {
  private oneClickSetup: OneClickSetup
  private handlers: Map<string, DeepLinkHandler>

  constructor() {
    this.oneClickSetup = new OneClickSetup()
    this.handlers = new Map()
    this.registerDefaultHandlers()
  }

  /**
   * Register default protocol handlers
   */
  private registerDefaultHandlers(): void {
    // Setup handler
    this.registerHandler({
      protocol: 'ccjk://setup',
      handler: async (url: string) => {
        const result = await this.oneClickSetup.setupFromUrl(url)
        if (result.success) {
          console.log('✅ Setup completed successfully!')
          console.log(`⏱️  Setup time: ${result.setupTime}ms`)
        }
        else {
          console.error('❌ Setup failed:', result.error)
        }
      },
    })

    // Switch provider handler
    this.registerHandler({
      protocol: 'ccjk://switch',
      handler: async (url: string) => {
        const config = this.parseDeepLink(url)
        if (config) {
          console.log(`🔄 Switching to ${config.params.provider}...`)
          const result = await this.oneClickSetup.executeSetup(config.params)
          if (result.success) {
            console.log('✅ Provider switched successfully!')
          }
        }
      },
    })

    // Configure handler
    this.registerHandler({
      protocol: 'ccjk://configure',
      handler: async (url: string) => {
        const config = this.parseDeepLink(url)
        if (config) {
          console.log(`⚙️  Configuring ${config.params.provider}...`)
          // Open configuration UI
        }
      },
    })
  }

  /**
   * Register a custom protocol handler
   */
  registerHandler(handler: DeepLinkHandler): void {
    this.handlers.set(handler.protocol, handler)
  }

  /**
   * Parse deep link URL
   */
  parseDeepLink(url: string): DeepLinkConfig | null {
    try {
      const urlObj = new URL(url.replace('ccjk://', 'https://ccjk.dev/'))
      const action = urlObj.pathname.replace('/', '') as 'setup' | 'switch' | 'configure'
      const params = urlObj.searchParams

      const config: DeepLinkConfig = {
        protocol: url.startsWith('ccjk://') ? 'ccjk' : 'https',
        action,
        params: {
          provider: params.get('provider') || '',
          apiKey: params.get('key') || params.get('apiKey') || undefined,
          model: params.get('model') || undefined,
          referralSource: params.get('ref') || undefined,
          referralCode: params.get('refCode') || undefined,
          autoComplete: params.get('auto') === 'true',
        },
        returnUrl: params.get('returnUrl') || undefined,
        successCallback: params.get('onSuccess') || undefined,
        errorCallback: params.get('onError') || undefined,
      }

      return config
    }
    catch (error) {
      console.error('Failed to parse deep link:', error)
      return null
    }
  }

  /**
   * Generate deep link for supplier documentation
   */
  generateDeepLink(config: DeepLinkConfig): string {
    const base = config.protocol === 'ccjk'
      ? `ccjk://${config.action}`
      : `https://ccjk.dev/${config.action}`

    const params = new URLSearchParams()

    params.set('provider', config.params.provider)
    if (config.params.apiKey)
      params.set('key', config.params.apiKey)
    if (config.params.model)
      params.set('model', config.params.model)
    if (config.params.referralSource)
      params.set('ref', config.params.referralSource)
    if (config.params.referralCode)
      params.set('refCode', config.params.referralCode)
    if (config.params.autoComplete)
      params.set('auto', 'true')
    if (config.returnUrl)
      params.set('returnUrl', config.returnUrl)
    if (config.successCallback)
      params.set('onSuccess', config.successCallback)
    if (config.errorCallback)
      params.set('onError', config.errorCallback)

    return `${base}?${params.toString()}`
  }

  /**
   * Handle deep link
   */
  async handleDeepLink(url: string): Promise<void> {
    const protocol = url.split('?')[0]
    const handler = this.handlers.get(protocol)

    if (handler) {
      await handler.handler(url)
    }
    else {
      console.warn(`No handler registered for protocol: ${protocol}`)
    }
  }

  /**
   * Generate documentation snippet for suppliers
   */
  generateDocSnippet(providerId: string, options?: {
    includeApiKey?: boolean
    customMessage?: string
    style?: 'button' | 'link' | 'banner'
  }): string {
    const config: DeepLinkConfig = {
      protocol: 'https',
      action: 'setup',
      params: {
        provider: providerId,
        referralSource: `${providerId}-docs`,
        autoComplete: !options?.includeApiKey,
      },
    }

    const url = this.generateDeepLink(config)
    const message = options?.customMessage || `Setup CCJK with ${providerId}`

    switch (options?.style) {
      case 'banner':
        return this.generateBannerSnippet(url, message, providerId)
      case 'link':
        return this.generateLinkSnippet(url, message)
      case 'button':
      default:
        return this.generateButtonSnippet(url, message)
    }
  }

  /**
   * Generate button snippet
   */
  private generateButtonSnippet(url: string, message: string): string {
    return `
<!-- CCJK Setup Button -->
<a href="${url}" class="ccjk-setup-button" style="
  display: inline-block;
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.2s;
">
  ${message} →
</a>
    `.trim()
  }

  /**
   * Generate link snippet
   */
  private generateLinkSnippet(url: string, message: string): string {
    return `
<!-- CCJK Setup Link -->
<a href="${url}" style="color: #667eea; text-decoration: underline;">
  ${message}
</a>
    `.trim()
  }

  /**
   * Generate banner snippet
   */
  private generateBannerSnippet(url: string, message: string, providerId: string): string {
    return `
<!-- CCJK Setup Banner -->
<div style="
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  border-radius: 12px;
  margin: 20px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
">
  <div>
    <h3 style="margin: 0 0 8px 0; font-size: 20px;">
      🚀 Quick Start with CCJK
    </h3>
    <p style="margin: 0; opacity: 0.9; font-size: 14px;">
      Configure ${providerId} in under 30 seconds
    </p>
  </div>
  <a href="${url}" style="
    padding: 12px 24px;
    background: white;
    color: #667eea;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    white-space: nowrap;
  ">
    ${message} →
  </a>
</div>
    `.trim()
  }

  /**
   * Generate integration guide for suppliers
   */
  generateIntegrationGuide(providerId: string): string {
    const setupUrl = this.generateDeepLink({
      protocol: 'https',
      action: 'setup',
      params: {
        provider: providerId,
        referralSource: `${providerId}-integration`,
      },
    })

    return `
# CCJK Integration Guide for ${providerId}

## Quick Integration

Add this button to your documentation or website to let users set up CCJK instantly:

\`\`\`html
${this.generateDocSnippet(providerId, { style: 'button' })}
\`\`\`

## Deep Link Options

### Basic Setup Link
\`\`\`
${setupUrl}
\`\`\`

### With Pre-filled API Key
\`\`\`
${setupUrl}&key=USER_API_KEY
\`\`\`

### With Custom Model
\`\`\`
${setupUrl}&model=claude-3-5-sonnet-20241022
\`\`\`

### Auto-complete Setup
\`\`\`
${setupUrl}&auto=true
\`\`\`

## Integration Styles

### 1. Button (Recommended)
${this.generateDocSnippet(providerId, { style: 'button' })}

### 2. Text Link
${this.generateDocSnippet(providerId, { style: 'link' })}

### 3. Banner
${this.generateDocSnippet(providerId, { style: 'banner' })}

## Tracking Referrals

Add a referral code to track conversions:
\`\`\`
${setupUrl}&refCode=YOUR_CAMPAIGN_CODE
\`\`\`

## Custom Protocol (Desktop Apps)

For desktop applications, use the custom protocol:
\`\`\`
ccjk://setup?provider=${providerId}&ref=${providerId}-app
\`\`\`

## Benefits

- ✅ One-click setup for users
- ✅ Automatic validation
- ✅ Referral tracking
- ✅ Better user experience
- ✅ Higher conversion rates

## Support

For integration support, visit: https://ccjk.dev/docs/integration
    `.trim()
  }

  /**
   * Generate QR code URL for mobile setup
   */
  generateQRCodeUrl(config: DeepLinkConfig): string {
    const deepLink = this.generateDeepLink(config)
    // Use a QR code generation service
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(deepLink)}`
  }

  /**
   * Generate mobile-friendly setup page
   */
  generateMobileSetupPage(providerId: string): string {
    const config: DeepLinkConfig = {
      protocol: 'https',
      action: 'setup',
      params: {
        provider: providerId,
        referralSource: `${providerId}-mobile`,
      },
    }

    const qrUrl = this.generateQRCodeUrl(config)
    const setupUrl = this.generateDeepLink(config)

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Setup CCJK - ${providerId}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 32px;
      max-width: 400px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    h1 {
      margin: 0 0 16px 0;
      font-size: 28px;
      color: #1a202c;
    }
    p {
      margin: 0 0 24px 0;
      color: #718096;
      font-size: 16px;
    }
    .qr-code {
      margin: 24px 0;
      padding: 16px;
      background: #f7fafc;
      border-radius: 12px;
    }
    .qr-code img {
      max-width: 100%;
      height: auto;
    }
    .button {
      display: block;
      width: 100%;
      padding: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 18px;
      margin-bottom: 16px;
    }
    .features {
      text-align: left;
      margin: 24px 0;
    }
    .feature {
      display: flex;
      align-items: center;
      margin-bottom: 12px;
      color: #4a5568;
    }
    .feature-icon {
      width: 24px;
      height: 24px;
      background: #48bb78;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Setup CCJK</h1>
    <p>Configure ${providerId} in under 30 seconds</p>

    <div class="features">
      <div class="feature">
        <div class="feature-icon">✓</div>
        <span>One-click configuration</span>
      </div>
      <div class="feature">
        <div class="feature-icon">✓</div>
        <span>Automatic validation</span>
      </div>
      <div class="feature">
        <div class="feature-icon">✓</div>
        <span>Ready to use immediately</span>
      </div>
    </div>

    <a href="${setupUrl}" class="button">
      Setup Now →
    </a>

    <div class="qr-code">
      <p style="margin-bottom: 12px; font-size: 14px; color: #718096;">
        Or scan this QR code
      </p>
      <img src="${qrUrl}" alt="Setup QR Code">
    </div>

    <p style="font-size: 12px; color: #a0aec0; margin-top: 24px;">
      Powered by CCJK
    </p>
  </div>
</body>
</html>
    `.trim()
  }
}

/**
 * Create a deep linking instance
 */
export function createDeepLinking(): DeepLinking {
  return new DeepLinking()
}

/**
 * Quick helper to generate setup link
 */
export function generateSetupLink(providerId: string, referralSource?: string): string {
  const deepLinking = createDeepLinking()
  return deepLinking.generateDeepLink({
    protocol: 'https',
    action: 'setup',
    params: {
      provider: providerId,
      referralSource: referralSource || `${providerId}-quick`,
    },
  })
}
