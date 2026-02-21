import { CONFIG } from '../config';

/**
 * API client
 */

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: 'Request failed',
      }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Auth
  async authenticateWithGitHub(code: string, publicKey: string) {
    return this.request<{ token: string; user: any }>('/auth/mobile', {
      method: 'POST',
      body: JSON.stringify({ code, publicKey }),
    });
  }

  async verifyToken() {
    return this.request<{ user: any }>('/auth/verify');
  }

  // Sessions
  async getSessions() {
    return this.request<{ sessions: any[] }>('/v1/sessions');
  }

  async getSession(id: string) {
    return this.request<{ session: any }>(`/v1/sessions/${id}`);
  }

  async getSessionMessages(id: string, limit = 100, offset = 0) {
    return this.request<{ messages: any[] }>(
      `/v1/sessions/${id}/messages?limit=${limit}&offset=${offset}`
    );
  }

  // Machines
  async getMachines() {
    return this.request<{ machines: any[] }>('/v1/machines');
  }

  async getMachine(id: string) {
    return this.request<{ machine: any }>(`/v1/machines/${id}`);
  }
}

export const apiClient = new ApiClient(CONFIG.apiUrl);
