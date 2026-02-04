/**
 * Teleport Remote Session System for CCJK v3.8
 *
 * Provides web <-> CLI session migration with:
 * - /teleport command for session URL attribution
 * - Remote session sync protocol
 * - Web to CLI session transfer
 * - CLI to Web session transfer
 * - Session state serialization
 */

import type { Session } from '../session-manager'
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'pathe'

// ============================================================================
// Types and Interfaces
// ============================================================================

export type TeleportDirection = 'import' | 'export'
export type TeleportSource = 'web' | 'cli' | 'api'
export type TeleportStatus = 'pending' | 'in_progress' | 'completed' | 'failed'

export interface TeleportSession {
  id: string
  sessionId?: string // Original session ID
  name?: string
  source: TeleportSource
  direction: TeleportDirection
  status: TeleportStatus
  createdAt: Date
  completedAt?: Date
  url?: string // Web session URL
  data?: SessionData
  error?: string
  metadata?: Record<string, unknown>
}

export interface SessionData {
  messages?: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: string
  }>
  context?: {
    workingDirectory?: string
    gitBranch?: string
    files?: string[]
  }
  config?: {
    model?: string
    provider?: string
    temperature?: number
  }
  metadata?: {
    tags?: string[]
    color?: string
  }
}

export interface TeleportOptions {
  includeHistory?: boolean
  includeContext?: boolean
  compress?: boolean
  encrypt?: boolean
}

export interface TeleportResult {
  success: boolean
  sessionId?: string
  url?: string
  message: string
  exported?: number // Number of messages exported
  imported?: number // Number of messages imported
}

// ============================================================================
// Teleport Manager
// ============================================================================

export class TeleportManager {
  private storageDir: string
  private pendingTransfers: Map<string, TeleportSession> = new Map()

  constructor(options: {
    storageDir?: string
  } = {}) {
    this.storageDir = options.storageDir || join(homedir(), '.claude', 'teleport')

    // Ensure storage directory exists
    if (!existsSync(this.storageDir)) {
      mkdir(this.storageDir, { recursive: true })
    }

    this.loadPendingTransfers()
  }

  /**
   * Get transfer file path
   */
  private getTransferPath(transferId: string): string {
    return join(this.storageDir, `${transferId}.json`)
  }

  /**
   * Generate transfer ID
   */
  private generateTransferId(): string {
    return `tp-${randomBytes(8).toString('hex')}`
  }

  /**
   * Load pending transfers
   */
  private loadPendingTransfers(): void {
    try {
      const { readdirSync } = require('node:fs')
      const files = readdirSync(this.storageDir)

      for (const file of files) {
        if (!file.endsWith('.json')) {
          continue
        }

        try {
          const transferPath = join(this.storageDir, file)
          const data = JSON.parse(readFileSync(transferPath, 'utf-8'))

          const transfer: TeleportSession = {
            ...data,
            createdAt: new Date(data.createdAt),
            completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
          }

          // Only keep pending or recent transfers
          const isRecent = transfer.completedAt
            ? Date.now() - transfer.completedAt.getTime() < 24 * 60 * 60 * 1000
            : true

          if (isRecent && transfer.status !== 'completed') {
            this.pendingTransfers.set(transfer.id, transfer)
          }
          else if (!isRecent) {
            // Clean up old transfer files
            unlinkSync(transferPath)
          }
        }
        catch {
          // Skip invalid files
        }
      }
    }
    catch {
      // Storage might not exist yet
    }
  }

  /**
   * Save transfer to disk
   */
  private saveTransfer(transfer: TeleportSession): void {
    try {
      const transferPath = this.getTransferPath(transfer.id)
      writeFileSync(transferPath, JSON.stringify({
        ...transfer,
        createdAt: transfer.createdAt.toISOString(),
        completedAt: transfer.completedAt?.toISOString(),
      }, null, 2), 'utf-8')
    }
    catch (error) {
      console.error('Failed to save transfer:', error)
    }
  }

  /**
   * Export session for teleport
   */
  async exportSession(
    session: Session,
    options: TeleportOptions = {},
  ): Promise<TeleportResult> {
    const transferId = this.generateTransferId()

    const transfer: TeleportSession = {
      id: transferId,
      sessionId: session.id,
      name: session.name,
      source: 'cli',
      direction: 'export',
      status: 'pending',
      createdAt: new Date(),
      url: undefined,
    }

    this.pendingTransfers.set(transferId, transfer)
    this.saveTransfer(transfer)

    // Prepare session data
    const sessionData: SessionData = {
      messages: options.includeHistory !== false
        ? session.history.map(entry => ({
            role: entry.role,
            content: entry.content,
            timestamp: entry.timestamp.toISOString(),
          }))
        : [],
      context: options.includeContext !== false
        ? {
            workingDirectory: process.cwd(),
            gitBranch: undefined,
            files: [],
          }
        : undefined,
      config: {
        model: session.model,
        provider: session.provider,
      },
      metadata: session.metadata,
    }

    transfer.data = sessionData
    transfer.status = 'in_progress'

    // Generate shareable URL (in real implementation, this would upload to a server)
    const url = this.generateShareUrl(transferId)
    transfer.url = url
    transfer.status = 'completed'
    transfer.completedAt = new Date()

    this.saveTransfer(transfer)

    return {
      success: true,
      sessionId: session.id,
      url,
      message: `Session exported. Share URL: ${url}`,
      exported: sessionData.messages?.length || 0,
    }
  }

  /**
   * Import session from URL
   */
  async importSession(
    url: string,
    options: TeleportOptions = {},
  ): Promise<TeleportResult> {
    try {
      // Extract transfer ID from URL
      const transferId = this.extractTransferId(url)

      if (!transferId) {
        return {
          success: false,
          message: 'Invalid teleport URL',
        }
      }

      // In real implementation, download from server
      // For now, check if it's a local transfer
      const transferPath = this.getTransferPath(transferId)

      if (!existsSync(transferPath)) {
        return {
          success: false,
          message: 'Session not found. It may have expired.',
        }
      }

      const data = JSON.parse(readFileSync(transferPath, 'utf-8'))
      const transfer: TeleportSession = {
        ...data,
        createdAt: new Date(data.createdAt),
        completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
      }

      if (transfer.direction !== 'export') {
        return {
          success: false,
          message: 'Invalid transfer: not an exported session',
        }
      }

      // Import into session manager
      const { getSessionManager } = await import('../session-manager')
      const sessionManager = getSessionManager()

      const newSession = await sessionManager.createSession(
        transfer.name,
        transfer.data?.config?.provider,
        undefined,
        {
          model: transfer.data?.config?.model,
          metadata: transfer.data?.metadata,
        },
      )

      // Import history
      if (transfer.data?.messages) {
        for (const msg of transfer.data.messages) {
          await sessionManager.addHistoryEntry(
            newSession.id,
            msg.role,
            msg.content,
          )
        }
      }

      return {
        success: true,
        sessionId: newSession.id,
        message: `Session imported successfully as: ${newSession.id}`,
        imported: transfer.data?.messages?.length || 0,
      }
    }
    catch (error) {
      return {
        success: false,
        message: `Failed to import session: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * Generate shareable URL
   */
  private generateShareUrl(transferId: string): string {
    // In real implementation, this would be an actual server URL
    // For now, use a custom protocol that Claude Code can recognize
    return `claude://teleport/${transferId}`
  }

  /**
   * Extract transfer ID from URL
   */
  private extractTransferId(url: string): string | null {
    // Support various URL formats
    const patterns = [
      /claude:\/\/teleport\/([a-zA-Z0-9-]+)/,
      /https:\/\/claude\.ai\/teleport\/([a-zA-Z0-9-]+)/,
      /https:\/\/claude\.anthropic\.com\/teleport\/([a-zA-Z0-9-]+)/,
      /\/teleport\/([a-zA-Z0-9-]+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        return match[1]
      }
    }

    // Try raw transfer ID
    if (/^[a-z0-9-]+$/i.test(url)) {
      return url
    }

    return null
  }

  /**
   * List pending transfers
   */
  listTransfers(): TeleportSession[] {
    return Array.from(this.pendingTransfers.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )
  }

  /**
   * Get transfer by ID
   */
  getTransfer(transferId: string): TeleportSession | undefined {
    return this.pendingTransfers.get(transferId)
  }

  /**
   * Cancel transfer
   */
  cancelTransfer(transferId: string): boolean {
    const transfer = this.pendingTransfers.get(transferId)

    if (!transfer) {
      return false
    }

    transfer.status = 'failed'
    transfer.error = 'Cancelled by user'
    transfer.completedAt = new Date()

    this.saveTransfer(transfer)
    return true
  }

  /**
   * Clean up old transfers
   */
  cleanup(olderThanMs: number = 7 * 24 * 60 * 60 * 1000): number {
    const now = Date.now()
    let cleaned = 0

    for (const [transferId, transfer] of Array.from(this.pendingTransfers.entries())) {
      const completedAt = transfer.completedAt || transfer.createdAt
      const age = now - completedAt.getTime()

      if (age > olderThanMs) {
        this.pendingTransfers.delete(transferId)

        // Clean up transfer file
        try {
          const transferPath = this.getTransferPath(transferId)
          if (existsSync(transferPath)) {
            unlinkSync(transferPath)
          }
        }
        catch {
          // Ignore cleanup errors
        }

        cleaned++
      }
    }

    return cleaned
  }

  /**
   * Generate QR code for URL (for mobile-to-CLI transfer)
   */
  generateQRCode(url: string): string | null {
    try {
      // In real implementation, use a QR code library
      // For now, return a placeholder
      return `[QR Code for: ${url}]`
    }
    catch {
      return null
    }
  }

  /**
   * Validate session data
   */
  validateSessionData(data: unknown): { valid: boolean, errors: string[] } {
    const errors: string[] = []

    if (typeof data !== 'object' || data === null) {
      return { valid: false, errors: ['Session data must be an object'] }
    }

    const sessionData = data as Record<string, unknown>

    // Validate messages
    if (sessionData.messages) {
      if (!Array.isArray(sessionData.messages)) {
        errors.push('Messages must be an array')
      }
      else {
        for (let i = 0; i < sessionData.messages.length; i++) {
          const msg = sessionData.messages[i]
          if (typeof msg !== 'object' || msg === null) {
            errors.push(`Message ${i} must be an object`)
          }
          else {
            if (!['user', 'assistant', 'system'].includes((msg as any).role)) {
              errors.push(`Message ${i} has invalid role`)
            }
            if (typeof (msg as any).content !== 'string') {
              errors.push(`Message ${i} content must be a string`)
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let teleportManagerInstance: TeleportManager | null = null

/**
 * Get singleton TeleportManager instance
 */
export function getTeleportManager(options?: {
  storageDir?: string
}): TeleportManager {
  if (!teleportManagerInstance) {
    teleportManagerInstance = new TeleportManager(options)
  }
  return teleportManagerInstance
}

/**
 * Reset singleton instance
 */
export function resetTeleportManager(): void {
  teleportManagerInstance = null
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Export session to teleport URL
 */
export async function exportSessionTeleport(
  session: Session,
  options?: TeleportOptions,
): Promise<TeleportResult> {
  const manager = getTeleportManager()
  return manager.exportSession(session, options)
}

/**
 * Import session from teleport URL
 */
export async function importSessionTeleport(
  url: string,
  options?: TeleportOptions,
): Promise<TeleportResult> {
  const manager = getTeleportManager()
  return manager.importSession(url, options)
}

/**
 * Generate teleport URL for sharing
 */
export function generateTeleportUrl(transferId: string): string {
  return `claude://teleport/${transferId}`
}

/**
 * Parse teleport URL to extract transfer ID
 */
export function parseTeleportUrl(url: string): string | null {
  const manager = getTeleportManager()
  // Access private method through type assertion
  return (manager as any).extractTransferId(url)
}

/**
 * List all teleport transfers
 */
export function listTeleportTransfers(): TeleportSession[] {
  const manager = getTeleportManager()
  return manager.listTransfers()
}
