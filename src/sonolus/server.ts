export type ServerInfo = {
  title: string
  description?: unknown
  buttons?: unknown[]
  configuration?: unknown
}

export type ServerItemList<T = unknown> = {
  title?: unknown
  pageCount: number
  cursor?: string
  items: T[]
  searches?: unknown[]
  quickSearchValues?: string
}

export type ServerItem = {
  name: string
  title?: unknown
  subtitle?: unknown
  author?: unknown
  tags?: unknown[]
  description?: unknown
  [key: string]: unknown
}

function normalizeBase(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

export class SonolusServerClient {
  readonly baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = normalizeBase(baseUrl)
  }

  private async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText} — ${path}`)
    }
    return response.json() as Promise<T>
  }

  info(): Promise<ServerInfo> {
    return this.get('/sonolus/info')
  }

  list(type: 'levels' | 'engines' | 'skins' | 'backgrounds' | 'effects' | 'particles' | 'replays', page = 0): Promise<ServerItemList<ServerItem>> {
    return this.get(`/sonolus/${type}/list?page=${page}`)
  }

  item(type: string, name: string): Promise<unknown> {
    return this.get(`/sonolus/${type}/${encodeURIComponent(name)}`)
  }
}
