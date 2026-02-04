/**
 * Persistent Mailbox System
 *
 * Provides crash-safe message persistence for inter-agent communication.
 * Inspired by Gastown's mailbox system where agents check their inbox on startup.
 *
 * @module brain/messaging/persistent-mailbox
 */

import type { GitBackedStateManager } from '../persistence/git-backed-state'
import { EventEmitter } from 'node:events'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { nanoid } from 'nanoid'
import { join } from 'pathe'
import { getGlobalStateManager } from '../persistence/git-backed-state'

/**
 * Message structure
 */
export interface Message {
  /** Unique message ID */
  id: string

  /** Sender agent ID */
  from: string

  /** Recipient agent ID */
  to: string

  /** Message subject */
  subject: string

  /** Message body (any serializable data) */
  body: any

  /** Message priority */
  priority: 'low' | 'normal' | 'high' | 'critical'

  /** Creation timestamp */
  timestamp: number

  /** Whether message has been read */
  read: boolean

  /** Whether message has been archived */
  archived: boolean

  /** Optional correlation ID for request-response */
  correlationId?: string

  /** Optional reply-to agent ID */
  replyTo?: string

  /** Optional expiration timestamp */
  expiresAt?: number

  /** Optional metadata */
  metadata?: Record<string, any>
}

/**
 * Mailbox structure
 */
export interface Mailbox {
  /** Agent ID */
  agentId: string

  /** Inbox messages */
  inbox: Message[]

  /** Outbox messages */
  outbox: Message[]

  /** Archived messages */
  archive: Message[]

  /** Last updated timestamp */
  updatedAt: number
}

/**
 * Mailbox events
 */
export interface MailboxEvents {
  'message:sent': (message: Message) => void
  'message:received': (message: Message) => void
  'message:read': (messageId: string, agentId: string) => void
  'message:archived': (messageId: string, agentId: string) => void
  'message:expired': (messageId: string) => void
  'mailbox:created': (agentId: string) => void
  'error': (error: Error) => void
}

/**
 * Send message options
 */
export interface SendMessageOptions {
  /** Message priority */
  priority?: Message['priority']

  /** Correlation ID for request-response */
  correlationId?: string

  /** Reply-to agent ID */
  replyTo?: string

  /** Expiration time in milliseconds from now */
  expiresIn?: number

  /** Additional metadata */
  metadata?: Record<string, any>
}

/**
 * Persistent Mailbox Manager
 *
 * Manages persistent mailboxes for all agents, providing:
 * - Crash-safe message storage
 * - Async communication between agents
 * - Message history and archiving
 * - Automatic retry for unread messages
 */
export class PersistentMailboxManager extends EventEmitter {
  private readonly stateManager: GitBackedStateManager
  private readonly mailboxes: Map<string, Mailbox> = new Map()
  private readonly expirationCheckInterval: NodeJS.Timeout | null = null
  private initialized = false

  constructor(stateManager?: GitBackedStateManager) {
    super()
    this.stateManager = stateManager ?? getGlobalStateManager()

    // Start expiration check
    this.expirationCheckInterval = setInterval(() => {
      this.checkExpiredMessages()
    }, 60000) // Check every minute
  }

  /**
   * Initialize mailbox manager
   */
  async initialize(): Promise<void> {
    if (this.initialized)
      return

    await this.stateManager.initialize()

    // Load existing mailboxes
    for (const agentId of this.stateManager.getAgentIds()) {
      await this.loadMailbox(agentId)
    }

    this.initialized = true
  }

  /**
   * Create mailbox for agent
   */
  async createMailbox(agentId: string): Promise<Mailbox> {
    await this.ensureInitialized()

    // Check if mailbox already exists
    if (this.mailboxes.has(agentId)) {
      return this.mailboxes.get(agentId)!
    }

    const mailbox: Mailbox = {
      agentId,
      inbox: [],
      outbox: [],
      archive: [],
      updatedAt: Date.now(),
    }

    this.mailboxes.set(agentId, mailbox)
    await this.persistMailbox(agentId)

    this.emit('mailbox:created', agentId)
    return mailbox
  }

  /**
   * Get mailbox for agent
   */
  async getMailbox(agentId: string): Promise<Mailbox> {
    await this.ensureInitialized()

    if (!this.mailboxes.has(agentId)) {
      return this.createMailbox(agentId)
    }

    return this.mailboxes.get(agentId)!
  }

  /**
   * Send message to agent
   */
  async send(
    from: string,
    to: string,
    subject: string,
    body: any,
    options: SendMessageOptions = {},
  ): Promise<Message> {
    await this.ensureInitialized()

    const message: Message = {
      id: nanoid(),
      from,
      to,
      subject,
      body,
      priority: options.priority ?? 'normal',
      timestamp: Date.now(),
      read: false,
      archived: false,
      correlationId: options.correlationId,
      replyTo: options.replyTo,
      expiresAt: options.expiresIn ? Date.now() + options.expiresIn : undefined,
      metadata: options.metadata,
    }

    // Add to sender's outbox
    const senderMailbox = await this.getMailbox(from)
    senderMailbox.outbox.push(message)
    senderMailbox.updatedAt = Date.now()
    await this.persistMailbox(from)

    // Add to recipient's inbox
    const recipientMailbox = await this.getMailbox(to)
    recipientMailbox.inbox.push(message)
    recipientMailbox.updatedAt = Date.now()
    await this.persistMailbox(to)

    this.emit('message:sent', message)
    this.emit('message:received', message)

    return message
  }

  /**
   * Reply to a message
   */
  async reply(
    originalMessage: Message,
    from: string,
    body: any,
    options: Omit<SendMessageOptions, 'correlationId'> = {},
  ): Promise<Message> {
    return this.send(
      from,
      originalMessage.replyTo ?? originalMessage.from,
      `Re: ${originalMessage.subject}`,
      body,
      {
        ...options,
        correlationId: originalMessage.id,
      },
    )
  }

  /**
   * Broadcast message to multiple agents
   */
  async broadcast(
    from: string,
    toAgents: string[],
    subject: string,
    body: any,
    options: SendMessageOptions = {},
  ): Promise<Message[]> {
    const messages: Message[] = []

    for (const to of toAgents) {
      const message = await this.send(from, to, subject, body, options)
      messages.push(message)
    }

    return messages
  }

  /**
   * Check inbox for unread messages
   */
  async checkInbox(agentId: string): Promise<Message[]> {
    await this.ensureInitialized()

    const mailbox = await this.getMailbox(agentId)
    return mailbox.inbox.filter(m => !m.read && !m.archived)
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(agentId: string): Promise<number> {
    const unread = await this.checkInbox(agentId)
    return unread.length
  }

  /**
   * Get messages by priority
   */
  async getByPriority(agentId: string, priority: Message['priority']): Promise<Message[]> {
    await this.ensureInitialized()

    const mailbox = await this.getMailbox(agentId)
    return mailbox.inbox.filter(m => m.priority === priority && !m.archived)
  }

  /**
   * Get messages by correlation ID
   */
  async getByCorrelationId(agentId: string, correlationId: string): Promise<Message[]> {
    await this.ensureInitialized()

    const mailbox = await this.getMailbox(agentId)
    return [
      ...mailbox.inbox.filter(m => m.correlationId === correlationId),
      ...mailbox.outbox.filter(m => m.correlationId === correlationId),
    ]
  }

  /**
   * Mark message as read
   */
  async markAsRead(agentId: string, messageId: string): Promise<void> {
    await this.ensureInitialized()

    const mailbox = await this.getMailbox(agentId)
    const message = mailbox.inbox.find(m => m.id === messageId)

    if (message && !message.read) {
      message.read = true
      mailbox.updatedAt = Date.now()
      await this.persistMailbox(agentId)

      this.emit('message:read', messageId, agentId)
    }
  }

  /**
   * Mark all messages as read
   */
  async markAllAsRead(agentId: string): Promise<number> {
    await this.ensureInitialized()

    const mailbox = await this.getMailbox(agentId)
    let count = 0

    for (const message of mailbox.inbox) {
      if (!message.read) {
        message.read = true
        count++
        this.emit('message:read', message.id, agentId)
      }
    }

    if (count > 0) {
      mailbox.updatedAt = Date.now()
      await this.persistMailbox(agentId)
    }

    return count
  }

  /**
   * Archive message
   */
  async archive(agentId: string, messageId: string): Promise<void> {
    await this.ensureInitialized()

    const mailbox = await this.getMailbox(agentId)

    // Check inbox
    const inboxIndex = mailbox.inbox.findIndex(m => m.id === messageId)
    if (inboxIndex !== -1) {
      const [message] = mailbox.inbox.splice(inboxIndex, 1)
      message.archived = true
      mailbox.archive.push(message)
      mailbox.updatedAt = Date.now()
      await this.persistMailbox(agentId)

      this.emit('message:archived', messageId, agentId)
      return
    }

    // Check outbox
    const outboxIndex = mailbox.outbox.findIndex(m => m.id === messageId)
    if (outboxIndex !== -1) {
      const [message] = mailbox.outbox.splice(outboxIndex, 1)
      message.archived = true
      mailbox.archive.push(message)
      mailbox.updatedAt = Date.now()
      await this.persistMailbox(agentId)

      this.emit('message:archived', messageId, agentId)
    }
  }

  /**
   * Delete message permanently
   */
  async delete(agentId: string, messageId: string): Promise<boolean> {
    await this.ensureInitialized()

    const mailbox = await this.getMailbox(agentId)
    let deleted = false

    // Check all arrays
    for (const arr of [mailbox.inbox, mailbox.outbox, mailbox.archive]) {
      const index = arr.findIndex(m => m.id === messageId)
      if (index !== -1) {
        arr.splice(index, 1)
        deleted = true
        break
      }
    }

    if (deleted) {
      mailbox.updatedAt = Date.now()
      await this.persistMailbox(agentId)
    }

    return deleted
  }

  /**
   * Search messages
   */
  async search(
    agentId: string,
    query: {
      subject?: string
      from?: string
      to?: string
      read?: boolean
      priority?: Message['priority']
      after?: number
      before?: number
    },
  ): Promise<Message[]> {
    await this.ensureInitialized()

    const mailbox = await this.getMailbox(agentId)
    const allMessages = [...mailbox.inbox, ...mailbox.outbox, ...mailbox.archive]

    return allMessages.filter((m) => {
      if (query.subject && !m.subject.toLowerCase().includes(query.subject.toLowerCase())) {
        return false
      }
      if (query.from && m.from !== query.from) {
        return false
      }
      if (query.to && m.to !== query.to) {
        return false
      }
      if (query.read !== undefined && m.read !== query.read) {
        return false
      }
      if (query.priority && m.priority !== query.priority) {
        return false
      }
      if (query.after && m.timestamp < query.after) {
        return false
      }
      if (query.before && m.timestamp > query.before) {
        return false
      }
      return true
    })
  }

  /**
   * Get mailbox statistics
   */
  async getStats(agentId: string): Promise<{
    inboxCount: number
    outboxCount: number
    archiveCount: number
    unreadCount: number
    oldestUnread: number | null
  }> {
    await this.ensureInitialized()

    const mailbox = await this.getMailbox(agentId)
    const unread = mailbox.inbox.filter(m => !m.read)

    return {
      inboxCount: mailbox.inbox.length,
      outboxCount: mailbox.outbox.length,
      archiveCount: mailbox.archive.length,
      unreadCount: unread.length,
      oldestUnread: unread.length > 0
        ? Math.min(...unread.map(m => m.timestamp))
        : null,
    }
  }

  /**
   * Cleanup old archived messages
   */
  async cleanupArchive(agentId: string, olderThanMs: number): Promise<number> {
    await this.ensureInitialized()

    const mailbox = await this.getMailbox(agentId)
    const cutoff = Date.now() - olderThanMs
    const originalLength = mailbox.archive.length

    mailbox.archive = mailbox.archive.filter(m => m.timestamp > cutoff)

    const removed = originalLength - mailbox.archive.length
    if (removed > 0) {
      mailbox.updatedAt = Date.now()
      await this.persistMailbox(agentId)
    }

    return removed
  }

  /**
   * Destroy mailbox manager
   */
  destroy(): void {
    if (this.expirationCheckInterval) {
      clearInterval(this.expirationCheckInterval)
    }
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }
  }

  private async loadMailbox(agentId: string): Promise<void> {
    const agentPath = this.stateManager.getAgentPath(agentId)
    if (!agentPath)
      return

    const mailboxFile = join(agentPath, 'mailbox.json')
    if (!existsSync(mailboxFile))
      return

    try {
      const data = JSON.parse(readFileSync(mailboxFile, 'utf-8'))
      this.mailboxes.set(agentId, {
        agentId,
        inbox: data.inbox ?? [],
        outbox: data.outbox ?? [],
        archive: data.archive ?? [],
        updatedAt: data.updatedAt ?? Date.now(),
      })
    }
    catch {
      // Invalid mailbox file, will be recreated
    }
  }

  private async persistMailbox(agentId: string): Promise<void> {
    const mailbox = this.mailboxes.get(agentId)
    if (!mailbox)
      return

    // Ensure agent worktree exists
    await this.stateManager.createAgentWorktree(agentId)

    const agentPath = this.stateManager.getAgentPath(agentId)
    if (!agentPath)
      return

    const mailboxFile = join(agentPath, 'mailbox.json')
    writeFileSync(mailboxFile, JSON.stringify(mailbox, null, 2))
  }

  private async checkExpiredMessages(): Promise<void> {
    const now = Date.now()

    const entries = Array.from(this.mailboxes.entries())
    for (const [agentId, mailbox] of entries) {
      let changed = false

      for (const message of mailbox.inbox) {
        if (message.expiresAt && message.expiresAt < now && !message.archived) {
          message.archived = true
          mailbox.archive.push(message)
          changed = true
          this.emit('message:expired', message.id)
        }
      }

      // Remove expired from inbox
      mailbox.inbox = mailbox.inbox.filter(m => !m.archived)

      if (changed) {
        mailbox.updatedAt = now
        await this.persistMailbox(agentId)
      }
    }
  }
}

// ========================================================================
// Singleton Instance
// ========================================================================

let globalMailboxManager: PersistentMailboxManager | null = null

/**
 * Get global mailbox manager instance
 */
export function getGlobalMailboxManager(): PersistentMailboxManager {
  if (!globalMailboxManager) {
    globalMailboxManager = new PersistentMailboxManager()
  }
  return globalMailboxManager
}

/**
 * Reset global mailbox manager (for testing)
 */
export function resetGlobalMailboxManager(): void {
  if (globalMailboxManager) {
    globalMailboxManager.destroy()
  }
  globalMailboxManager = null
}
