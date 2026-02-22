/**
 * CCJK Evolution Layer Types
 * Inspired by EvoMap's GEP (Genomic Evolution Protocol)
 */

export type GeneType = 'pattern' | 'fix' | 'optimization' | 'workaround';

export interface Gene {
  id: string;
  sha256: string;
  type: GeneType;
  problem: {
    signature: string;
    context: string[];
    description?: string;
  };
  solution: {
    strategy: string;
    code?: string;
    steps: string[];
  };
  metadata: {
    author: string;
    createdAt: string;
    updatedAt?: string;
    tags: string[];
    version?: string;
  };
  quality: {
    gdi: number;
    successRate: number;
    usageCount: number;
    avgTime: number;
  };
  verification?: {
    testCases: TestCase[];
    passRate: number;
  };
}

export interface TestCase {
  input: any;
  expected: any;
  actual?: any;
  passed?: boolean;
}

export interface Capsule {
  id: string;
  genes: string[];
  auditTrail: AuditEntry[];
  verification: {
    testCases: TestCase[];
    passRate: number;
  };
  metadata: {
    createdAt: string;
    description?: string;
  };
}

export interface AuditEntry {
  timestamp: string;
  action: string;
  result: 'success' | 'failure';
  context: any;
}

export interface Agent {
  id: string;
  name: string;
  version: string;
  capabilities: string[];
}

// A2A Protocol Messages

export type A2AMessage =
  | HelloMessage
  | PublishMessage
  | FetchMessage
  | ReportMessage
  | DecisionMessage
  | RevokeMessage;

export interface HelloMessage {
  type: 'hello';
  agent: Agent;
}

export interface PublishMessage {
  type: 'publish';
  gene: Omit<Gene, 'id' | 'sha256' | 'quality'>;
  proof?: {
    testResults: any[];
    auditTrail: any[];
  };
}

export interface FetchMessage {
  type: 'fetch';
  query: {
    signature?: string;
    context?: string[];
    tags?: string[];
    minGDI?: number;
    type?: GeneType;
  };
  limit?: number;
}

export interface ReportMessage {
  type: 'report';
  geneId: string;
  result: {
    success: boolean;
    time: number;
    context: any;
  };
}

export interface DecisionMessage {
  type: 'decision';
  problem: string;
  options: Gene[];
  context: any;
}

export interface RevokeMessage {
  type: 'revoke';
  geneId: string;
  reason: string;
}

// API Responses

export interface HelloResponse {
  agentId: string;
  token: string;
}

export interface PublishResponse {
  geneId: string;
  sha256: string;
  gdi: number;
}

export interface FetchResponse {
  genes: Gene[];
  total: number;
}

export interface ReportResponse {
  success: boolean;
  updatedGDI?: number;
}

export interface DecisionResponse {
  recommendedGeneId: string;
  confidence: number;
  reasoning: string;
}
