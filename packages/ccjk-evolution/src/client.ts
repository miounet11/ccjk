import type {
  Gene,
  HelloMessage,
  PublishMessage,
  FetchMessage,
  ReportMessage,
  DecisionMessage,
  HelloResponse,
  PublishResponse,
  FetchResponse,
  ReportResponse,
  DecisionResponse,
} from './types';

/**
 * A2A Protocol Client
 * Agent-to-Agent communication for CCJK Evolution Layer
 *
 * Uses native fetch for Node.js 18+ compatibility
 */

export class A2AClient {
  private baseUrl: string;
  private token: string | null = null;
  private agentId: string | null = null;

  constructor(baseUrl: string = 'http://localhost:3005') {
    this.baseUrl = baseUrl;
  }

  /**
   * Register agent (hello)
   */
  async hello(agent: HelloMessage['agent']): Promise<HelloResponse> {
    const response = await this.request<HelloResponse>('/a2a/hello', {
      method: 'POST',
      body: { type: 'hello', agent },
    });

    this.token = response.token;
    this.agentId = response.agentId;

    return response;
  }

  /**
   * Publish a gene
   */
  async publish(gene: PublishMessage['gene'], proof?: PublishMessage['proof']): Promise<PublishResponse> {
    this.ensureAuthenticated();

    return this.request<PublishResponse>('/a2a/publish', {
      method: 'POST',
      body: { type: 'publish', gene, proof },
      auth: true,
    });
  }

  /**
   * Fetch genes
   */
  async fetch(query: FetchMessage['query'], limit?: number): Promise<Gene[]> {
    this.ensureAuthenticated();

    const response = await this.request<FetchResponse>('/a2a/fetch', {
      method: 'POST',
      body: { type: 'fetch', query, limit },
      auth: true,
    });

    return response.genes;
  }

  /**
   * Report usage result
   */
  async report(geneId: string, result: ReportMessage['result']): Promise<ReportResponse> {
    this.ensureAuthenticated();

    return this.request<ReportResponse>('/a2a/report', {
      method: 'POST',
      body: { type: 'report', geneId, result },
      auth: true,
    });
  }

  /**
   * Request decision
   */
  async decision(problem: string, options: Gene[], context: any): Promise<DecisionResponse> {
    this.ensureAuthenticated();

    return this.request<DecisionResponse>('/a2a/decision', {
      method: 'POST',
      body: { type: 'decision', problem, options, context },
      auth: true,
    });
  }

  /**
   * Revoke a gene
   */
  async revoke(geneId: string, reason: string): Promise<void> {
    this.ensureAuthenticated();

    await this.request<void>(`/a2a/genes/${geneId}`, {
      method: 'DELETE',
      body: { reason },
      auth: true,
    });
  }

  /**
   * Get agent ID
   */
  getAgentId(): string | null {
    return this.agentId;
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.token !== null;
  }

  /**
   * Internal request wrapper
   */
  private async request<T = any>(
    path: string,
    options: {
      method: string;
      body?: any;
      auth?: boolean;
    }
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (options.auth && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await globalThis.fetch(url, {
      method: options.method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `Request failed: ${response.statusText}`);
    }

    return response.json();
  }

  private ensureAuthenticated(): void {
    if (!this.token) {
      throw new Error('Not authenticated. Call hello() first.');
    }
  }
}
