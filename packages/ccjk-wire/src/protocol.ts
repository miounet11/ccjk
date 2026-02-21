import { createId, isCuid } from '@paralleldrive/cuid2';
import { z } from 'zod';
import { sessionEventSchema, type SessionEvent } from './events';

/**
 * CCJK Remote Control Protocol
 *
 * Based on Happy's session protocol but extended for CCJK features:
 * - Brain System integration
 * - Health scoring
 * - MCP marketplace
 * - Multi code-tool support
 */

// Role types
export const sessionRoleSchema = z.enum(['user', 'agent', 'system']);
export type SessionRole = z.infer<typeof sessionRoleSchema>;

// Message envelope
export const sessionEnvelopeSchema = z.object({
  id: z.string().refine((value) => isCuid(value), {
    message: 'id must be a cuid2 value',
  }),
  time: z.number(),
  role: sessionRoleSchema,
  sessionId: z.string(),
  turnId: z.string().optional(),
  subagent: z.string().optional(),
  ev: sessionEventSchema,
  encrypted: z.boolean().default(false),
});
export type SessionEnvelope = z.infer<typeof sessionEnvelopeSchema>;

// Encrypted message content
export const encryptedMessageContentSchema = z.object({
  c: z.string(), // encrypted content (base64)
  t: z.literal('encrypted'),
  v: z.number().default(1), // encryption version
});
export type EncryptedMessageContent = z.infer<typeof encryptedMessageContentSchema>;

// Session message (stored in database)
export const sessionMessageSchema = z.object({
  id: z.string(),
  seq: z.number(),
  localId: z.string().optional(),
  content: z.union([sessionEnvelopeSchema, encryptedMessageContentSchema]),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type SessionMessage = z.infer<typeof sessionMessageSchema>;

// Session metadata
export const sessionMetadataSchema = z.object({
  codeToolType: z.enum(['claude-code', 'codex', 'aider', 'continue', 'cline', 'cursor']),
  projectPath: z.string(),
  projectName: z.string().optional(),
  branchName: z.string().optional(),
  lastHealthScore: z.number().optional(),
  tags: z.array(z.string()).optional(),
});
export type SessionMetadata = z.infer<typeof sessionMetadataSchema>;

// Agent state
export const agentStateSchema = z.object({
  status: z.enum(['idle', 'active', 'paused', 'error']),
  currentTask: z.string().optional(),
  pendingPermissions: z.array(z.string()).optional(),
  lastActivity: z.number().optional(),
});
export type AgentState = z.infer<typeof agentStateSchema>;

// Machine metadata
export const machineMetadataSchema = z.object({
  machineId: z.string(),
  hostname: z.string(),
  platform: z.string(),
  ccjkVersion: z.string(),
  homeDir: z.string(),
  activeSessions: z.array(z.string()).optional(),
});
export type MachineMetadata = z.infer<typeof machineMetadataSchema>;

// Daemon state
export const daemonStateSchema = z.object({
  running: z.boolean(),
  pid: z.number().optional(),
  startedAt: z.number().optional(),
  sessions: z.array(z.string()).optional(),
});
export type DaemonState = z.infer<typeof daemonStateSchema>;

// Helper function to create envelope
export function createEnvelope(
  role: SessionRole,
  sessionId: string,
  ev: SessionEvent,
  opts: {
    id?: string;
    time?: number;
    turnId?: string;
    subagent?: string;
    encrypted?: boolean;
  } = {}
): SessionEnvelope {
  return sessionEnvelopeSchema.parse({
    id: opts.id ?? createId(),
    time: opts.time ?? Date.now(),
    role,
    sessionId,
    turnId: opts.turnId,
    subagent: opts.subagent,
    ev,
    encrypted: opts.encrypted ?? false,
  });
}

// Helper function to create encrypted content
export function createEncryptedContent(encryptedData: string): EncryptedMessageContent {
  return {
    c: encryptedData,
    t: 'encrypted',
    v: 1,
  };
}
