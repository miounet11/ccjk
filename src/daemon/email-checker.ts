/**
 * Email Checker
 * Checks for new emails via IMAP and parses commands
 */

import type { Email, EmailConfig } from './types/index.js'

export class EmailChecker {
  private imap: any
  private config: EmailConfig
  private connected: boolean = false

  constructor(config: EmailConfig) {
    this.config = {
      imapHost: 'imap.gmail.com',
      imapPort: 993,
      tls: true,
      ...config,
    }

    // Lazy load imap package
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ImapConstructor = require('imap')
      this.imap = new ImapConstructor({
        user: this.config.email,
        password: this.config.password,
        host: this.config.imapHost!,
        port: this.config.imapPort!,
        tls: this.config.tls!,
        tlsOptions: { rejectUnauthorized: false },
      })
    }
    catch (_error) {
      throw new Error('imap package is not installed. Install it with: pnpm add imap @types/imap')
    }

    this.setupEventHandlers()
  }

  /**
   * Setup IMAP event handlers
   */
  private setupEventHandlers(): void {
    this.imap.once('ready', () => {
      this.connected = true
    })

    this.imap.once('error', (err: Error) => {
      console.error('IMAP connection error:', err)
      this.connected = false
    })

    this.imap.once('end', () => {
      this.connected = false
    })
  }

  /**
   * Connect to IMAP server
   */
  private async connect(): Promise<void> {
    if (this.connected) {
      return
    }

    return new Promise((resolve, reject) => {
      this.imap.once('ready', () => {
        this.connected = true
        resolve()
      })

      this.imap.once('error', (err: Error) => {
        reject(err)
      })

      this.imap.connect()
    })
  }

  /**
   * Disconnect from IMAP server
   */
  disconnect(): void {
    if (this.connected) {
      this.imap.end()
      this.connected = false
    }
  }

  /**
   * Fetch new emails with [CCJK] tag in subject
   */
  async fetchNew(): Promise<Email[]> {
    try {
      await this.connect()

      return new Promise((resolve, reject) => {
        this.imap.openBox('INBOX', false, (err: Error | null, _box: any) => {
          if (err) {
            reject(err)
            return
          }

          // Search for unread emails with [CCJK] in subject
          this.imap.search(['UNSEEN', ['SUBJECT', '[CCJK]']], (searchErr: Error | null, results: number[]) => {
            if (searchErr) {
              reject(searchErr)
              return
            }

            if (!results || results.length === 0) {
              resolve([])
              return
            }

            const emails: Email[] = []
            const fetch = this.imap.fetch(results, {
              bodies: '',
              markSeen: true, // Mark as read after fetching
            })

            fetch.on('message', (msg: any, _seqno: number) => {
              msg.on('body', (stream: NodeJS.ReadableStream) => {
                // Lazy load mailparser
                let simpleParserFn: any
                try {
                  // eslint-disable-next-line @typescript-eslint/no-require-imports
                  simpleParserFn = require('mailparser').simpleParser
                }
                catch {
                  console.error('mailparser package is not installed. Install it with: pnpm add mailparser @types/mailparser')
                  return
                }
                simpleParserFn(stream, (parseErr: Error | null, parsed: any) => {
                  if (parseErr) {
                    console.error('Email parse error:', parseErr)
                    return
                  }

                  emails.push({
                    id: parsed.messageId,
                    from: parsed.from?.text || '',
                    subject: parsed.subject || '',
                    body: parsed.text || '',
                    date: parsed.date || new Date(),
                    raw: parsed,
                  })
                })
              })

              msg.once('attributes', (_attrs: any) => {
                // Can access email attributes here if needed
              })
            })

            fetch.once('error', (fetchErr: Error) => {
              reject(fetchErr)
            })

            fetch.once('end', () => {
              resolve(emails)
            })
          })
        })
      })
    }
    catch (error) {
      console.error('Failed to fetch emails:', error)
      throw error
    }
  }

  /**
   * Parse command from email
   */
  parseCommand(email: Email): string {
    // Extract command from email body
    // Remove common email signatures and formatting
    let command = email.body.trim()

    // Remove email signature (lines starting with --)
    const lines = command.split('\n')
    const commandLines = []

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('--') || trimmed.startsWith('___')) {
        break
      }
      if (trimmed) {
        commandLines.push(trimmed)
      }
    }

    command = commandLines.join('\n').trim()

    return command
  }

  /**
   * Extract sender email address
   */
  extractSenderEmail(from: string): string {
    // Extract email from "Name <email@example.com>" format
    const match = from.match(/<(.+?)>/)
    if (match) {
      return match[1].toLowerCase().trim()
    }
    return from.toLowerCase().trim()
  }
}
