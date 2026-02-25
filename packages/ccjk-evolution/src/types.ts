/**
 * CCJK Evolution Layer Types
 * Aligned with api.claudehome.cn /a2a/* endpoints
 */

export type GeneType = 'pattern' | 'fix' | 'optimization' | 'workaround';

/**
 * Gene — flat schema matching server response from GET /a2a/fetch
 */
export interface Gene {
  geneId: string;
  problemSignature: string;
  solutionStrategy: string;
  solutionCode: string;
  solutionSteps: string[];
  tags: string[];
  version: string;
  gdi: number;
  successRate: number;
  usageCount: number;
  passRate: number;
  revoked: boolean;
  createdAt: string;
}

export interface TestCase {
  input: any;
  expected: any;
  actual?: any;
  passed?: boolean;
}

export interface Agent {
  name: string;
  version: string;
}

// A2A Protocol Messages (for reference, client uses typed methods)

export type A2AMessage =
  | HelloMessage
  | PublishMessage
  | FetchMessage
  | ReportMessage
  | DecisionMessage
  | RevokeMessage;

export interface HelloMessage {
  agent: Agent;
  capabilities?: string[];
}

export interface PublishMessage {
  problemSignature: string;
  solutionStrategy: string;
  solutionCode?: string;
  solutionSteps: string[];
  tags?: string[];
  version?: string;
}

export interface FetchMessage {
  minGDI?: number;
  limit?: number;
  signature?: string;
  geneId?: string;
}

export interface ReportMessage {
  geneId: string;
  outcome: 'success' | 'failure';
  context?: string;
}

export interface DecisionMessage {
  geneId: string;
  action: 'approve' | 'reject';
}

export interface RevokeMessage {
  geneId: string;
  reason?: string;
}

// API Responses

export interface HelloResponse {
  agentId: string;
  token: string;
}

export interface PublishResponse {
  success: boolean;
  geneId: string;
}

export interface FetchResponse {
  success: boolean;
  genes: Gene[];
}

export interface ReportResponse {
  success: boolean;
  newGDI?: number;
}

export interface DecisionResponse {
  success: boolean;
  action: string;
  geneId: string;
  updatedPassRate: number;
  updatedGDI: number;
}
