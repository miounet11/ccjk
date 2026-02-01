/**
 * Session Sync - Unlimited Conversation Support
 *
 * Enables persistent sessions for unlimited conversation continuity.
 * Sessions are stored locally and can be synced to cloud.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { EventEmitter } from 'node:events'
import { join } from 'pathe'
