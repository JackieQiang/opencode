import { ref } from 'vue'

interface OpencodeClientOptions {
  baseUrl: string
  directory: string
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: Record<string, any>
  params?: Record<string, any>
}

class OpencodeClient {
  private baseUrl: string
  private directory: string

  constructor(options: OpencodeClientOptions) {
    this.baseUrl = options.baseUrl
    this.directory = options.directory
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`)
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value))
        }
      })
    }
    url.searchParams.append('directory', this.directory)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    const res = await uni.request<T>({
      url: url.toString(),
      method: options.method || 'GET',
      data: options.body,
      header: headers,
    })

    if (res.statusCode >= 400) {
      throw new Error(`Request failed with status ${res.statusCode}`)
    }

    return res.data as T
  }

  async getFile(path: string) {
    return this.request<{ data: { path: string; content: string } }>('/api/file/read', {
      params: { path },
    })
  }

  async findFiles(query: string, dirs: 'true' | 'false' = 'false') {
    return this.request<{ data?: string[] }>('/api/find/files', {
      params: { query, dirs },
    })
  }

  async createSession() {
    return this.request<{ data?: { id: string; title?: string } }>('/api/session/create', {
      method: 'POST',
    })
  }

  async getSession(sessionId: string) {
    return this.request<{ data?: any }>(`/api/session/${sessionId}`)
  }

  async listSessions() {
    return this.request<{ data?: any[] }>('/api/session/list')
  }

  async sendPrompt(sessionId: string, prompt: string, agent: string, model: string) {
    return this.request<{ data?: any }>(`/api/session/${sessionId}/prompt`, {
      method: 'POST',
      body: { prompt, agent, model },
    })
  }

  async createPty(title: string) {
    return this.request<{ data?: any }>('/api/pty/create', {
      method: 'POST',
      body: { title },
    })
  }

  async updatePty(ptyId: string, size?: { rows: number; cols: number }, title?: string) {
    return this.request<{ data?: any }>(`/api/pty/${ptyId}`, {
      method: 'PUT',
      body: { size, title },
    })
  }

  async closePty(ptyId: string) {
    return this.request(`/api/pty/${ptyId}`, {
      method: 'DELETE',
    })
  }

  async getConfig() {
    return this.request<{ data?: any }>('/api/config')
  }

  async getModels() {
    return this.request<{ data?: any[] }>('/api/models')
  }

  async getAgents() {
    return this.request<{ data?: any[] }>('/api/agents')
  }

  async getProviders() {
    return this.request<{ data?: any[] }>('/api/providers')
  }
}

const client = ref<OpencodeClient | null>(null)

export function initClient(options: OpencodeClientOptions) {
  client.value = new OpencodeClient(options)
}

export function getClient(): OpencodeClient {
  if (!client.value) {
    throw new Error('Client not initialized')
  }
  return client.value
}

export function useClient() {
  return {
    client,
    initClient,
    getClient,
  }
}

export type { OpencodeClientOptions, RequestOptions }
