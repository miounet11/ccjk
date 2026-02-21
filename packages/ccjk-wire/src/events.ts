import { z } from 'zod';

/**
 * Session event types for CCJK remote control
 */

// Text output event
export const sessionTextEventSchema = z.object({
  t: z.literal('text'),
  text: z.string(),
  thinking: z.boolean().optional(),
});
export type SessionTextEvent = z.infer<typeof sessionTextEventSchema>;

// Tool call start event
export const sessionToolCallStartEventSchema = z.object({
  t: z.literal('tool-call-start'),
  callId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  args: z.record(z.string(), z.unknown()),
});
export type SessionToolCallStartEvent = z.infer<typeof sessionToolCallStartEventSchema>;

// Tool call end event
export const sessionToolCallEndEventSchema = z.object({
  t: z.literal('tool-call-end'),
  callId: z.string(),
  result: z.unknown().optional(),
  error: z.string().optional(),
});
export type SessionToolCallEndEvent = z.infer<typeof sessionToolCallEndEventSchema>;

// Permission request event
export const sessionPermissionRequestEventSchema = z.object({
  t: z.literal('permission-request'),
  requestId: z.string(),
  tool: z.string(),
  pattern: z.string(),
  description: z.string().optional(),
});
export type SessionPermissionRequestEvent = z.infer<typeof sessionPermissionRequestEventSchema>;

// Permission response event
export const sessionPermissionResponseEventSchema = z.object({
  t: z.literal('permission-response'),
  requestId: z.string(),
  approved: z.boolean(),
});
export type SessionPermissionResponseEvent = z.infer<typeof sessionPermissionResponseEventSchema>;

// Status update event
export const sessionStatusEventSchema = z.object({
  t: z.literal('status'),
  state: z.enum(['idle', 'thinking', 'executing', 'waiting-permission', 'error']),
  message: z.string().optional(),
});
export type SessionStatusEvent = z.infer<typeof sessionStatusEventSchema>;

// Turn start event
export const sessionTurnStartEventSchema = z.object({
  t: z.literal('turn-start'),
  turnId: z.string(),
});
export type SessionTurnStartEvent = z.infer<typeof sessionTurnStartEventSchema>;

// Turn end event
export const sessionTurnEndEventSchema = z.object({
  t: z.literal('turn-end'),
  turnId: z.string(),
  status: z.enum(['completed', 'failed', 'cancelled']),
});
export type SessionTurnEndEvent = z.infer<typeof sessionTurnEndEventSchema>;

// Session start event
export const sessionStartEventSchema = z.object({
  t: z.literal('session-start'),
  sessionId: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type SessionStartEvent = z.infer<typeof sessionStartEventSchema>;

// Session stop event
export const sessionStopEventSchema = z.object({
  t: z.literal('session-stop'),
  sessionId: z.string(),
  reason: z.string().optional(),
});
export type SessionStopEvent = z.infer<typeof sessionStopEventSchema>;

// Health score update event (CCJK specific)
export const sessionHealthScoreEventSchema = z.object({
  t: z.literal('health-score'),
  score: z.number().min(0).max(100),
  issues: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
});
export type SessionHealthScoreEvent = z.infer<typeof sessionHealthScoreEventSchema>;

// Brain agent event (CCJK specific)
export const sessionBrainAgentEventSchema = z.object({
  t: z.literal('brain-agent'),
  agentId: z.string(),
  agentType: z.string(),
  action: z.enum(['start', 'complete', 'error']),
  message: z.string().optional(),
});
export type SessionBrainAgentEvent = z.infer<typeof sessionBrainAgentEventSchema>;

// MCP service event (CCJK specific)
export const sessionMcpServiceEventSchema = z.object({
  t: z.literal('mcp-service'),
  serviceId: z.string(),
  serviceName: z.string(),
  action: z.enum(['install', 'uninstall', 'enable', 'disable', 'error']),
  message: z.string().optional(),
});
export type SessionMcpServiceEvent = z.infer<typeof sessionMcpServiceEventSchema>;

// Union of all event types
export const sessionEventSchema = z.discriminatedUnion('t', [
  sessionTextEventSchema,
  sessionToolCallStartEventSchema,
  sessionToolCallEndEventSchema,
  sessionPermissionRequestEventSchema,
  sessionPermissionResponseEventSchema,
  sessionStatusEventSchema,
  sessionTurnStartEventSchema,
  sessionTurnEndEventSchema,
  sessionStartEventSchema,
  sessionStopEventSchema,
  sessionHealthScoreEventSchema,
  sessionBrainAgentEventSchema,
  sessionMcpServiceEventSchema,
]);
export type SessionEvent = z.infer<typeof sessionEventSchema>;
