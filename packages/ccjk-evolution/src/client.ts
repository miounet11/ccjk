import type {
    DecisionResponse,
    FetchResponse,
    Gene,
    HelloResponse,
    PublishResponse,
    ReportResponse
} from './types';

/**
 * A2A Protocol Client
 * Agent-to-Agent communication for CCJK Evolution Layer
 *
 * Aligned with api.claudehome.cn /a2a/* endpoints
 */

export class A2AClient {
  private baseUrl: string;
  private token: string | null = null;
  private agentId: string | null = null;

  constructor(baseUrl?: string) {
    const resolved = baseUrl || process.env.CCJK_SERVER_URL;
    if (!resolved) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('CCJK_SERVER_URL is required in production');
      }
      this.baseUrl = 'http://localhost:3005';
      return;
    }

    if (process.env.NODE_ENV === 'production' && !resolved.startsWith('https://')) {
      throw new Error('CCJK_SERVER_URL must use https:// in production');
    }

    this.baseUrl = resolved;
  }

  /**
   * Register agent — POST /a2a/hello
   * Server expects: { agent: { name, version }, capabilities }
   */
  async hello(name: string, version: string, capabilities: string[] = []): Promise<HelloResponse> {
    const response = await this.request<HelloResponse>('/a2a/hello', {
      method: 'POST',
      body: { agent: { name, version }, capabilities },
    });

    this.token = response.token;
    this.agentId = response.agentId;

    return response;
  }

  /**
   * Publish a gene — POST /a2a/publish
   * Server expects flat fields: problemSignature, solutionStrategy, solutionCode, solutionSteps, tags, version
   */
  async publish(gene: {
    problemSignature: string;
    solutionStrategy: string;
    solutionCode?: string;
    solutionSteps: string[];
    tags?: string[];
    version?: string;
  }): Promise<PublishResponse> {
    this.ensureAuthenticated();

    return this.request<PublishResponse>('/a2a/publish', {
      method: 'POST',
      body: {
        problemSignature: gene.problemSignature,
        solutionStrategy: gene.solutionStrategy,
        solutionCode: gene.solutionCode || '',
        solutionSteps: gene.solutionSteps,
        tags: gene.tags || [],
        version: gene.version || '1.0.0',
      },
      auth: true,
    });
  }

  /**
   * Fetch genes — GET /a2a/fetch?minGDI=&limit=&signature=
   * Server returns: { success, genes: [...] }
   */
  async fetch(options: { minGDI?: number; limit?: number; signature?: string; geneId?: string } = {}): Promise<Gene[]> {
    this.ensureAuthenticated();

    const params = new URLSearchParams();
    if (options.minGDI !== undefined) params.set('minGDI', String(options.minGDI));
    if (options.limit !== undefined) params.set('limit', String(options.limit));
    if (options.signature) params.set('signature', options.signature);
    if (options.geneId) params.set('geneId', options.geneId);

    const qs = params.toString();
    const response = await this.request<FetchResponse>(`/a2a/fetch${qs ? '?' + qs : ''}`, {
      method: 'GET',
      auth: true,
    });

    return response.genes;
  }

  /**
   * Report usage result — POST /a2a/report
   * Server expects: { geneId, outcome, context? }
   */
  async report(geneId: string, outcome: 'success' | 'failure', context?: string): Promise<ReportResponse> {
    this.ensureAuthenticated();

    return this.request<ReportResponse>('/a2a/report', {
      method: 'POST',
      body: { geneId, outcome, ...(context ? { context } : {}) },
      auth: true,
    });
  }

  /**
   * Record decision — POST /a2a/decision
   * Server expects: { geneId, action: 'approve' | 'reject' }
   */
  async decision(geneId: string, action: 'approve' | 'reject'): Promise<DecisionResponse> {
    this.ensureAuthenticated();

    return this.request<DecisionResponse>('/a2a/decision', {
      method: 'POST',
      body: { geneId, action },
      auth: true,
    });
  }

  /**
   * Revoke a gene — POST /a2a/revoke
   * Server expects: { geneId, reason? }
   */
  async revoke(geneId: string, reason?: string): Promise<void> {
    this.ensureAuthenticated();

    await this.request<{ success: boolean }>('/a2a/revoke', {
      method: 'POST',
      body: { geneId, ...(reason ? { reason } : {}) },
      auth: true,
    });
  }

  /**
   * Get stats — GET /a2a/stats
   */
  async stats(): Promise<{ totalGenesInPool: number; myContributions: number; reportsSubmitted: number; successRate: number }> {
    this.ensureAuthenticated();

    const resp = await this.request<{ success: boolean; stats: any }>('/a2a/stats', {
      method: 'GET',
      auth: true,
    });

    return resp.stats;
  }

  getAgentId(): string | null {
    return this.agentId;
  }

  isAuthenticated(): boolean {
    return this.token !== null;
  }

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
      throw new Error(error.error || error.message || `Request failed: ${response.statusText}`);
    }

    return response.json();
  }

  private ensureAuthenticated(): void {
    if (!this.token) {
      throw new Error('Not authenticated. Call hello() first.');
    }
  }
}
