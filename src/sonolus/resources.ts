export type SonolusResource = {
  hash?: string
  url?: string
  type?: string
  [key: string]: unknown
}

/**
 * Resolves Sonolus resource references returned by a custom server.
 * Servers commonly expose a hash and a resource URL; keeping this generic
 * lets the runtime work with both absolute URLs and server-relative paths.
 */
export class ResourceLoader {
  constructor(readonly baseUrl: string) {}

  private resolve(url: string): string {
    return new URL(url, `${this.baseUrl.replace(/\/+$/, '')}/`).toString()
  }

  async json<T>(url: string): Promise<T> {
    const response = await fetch(this.resolve(url), {
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}: ${url}`)
    }
    return response.json() as Promise<T>
  }

  async bytes(url: string): Promise<ArrayBuffer> {
    const response = await fetch(this.resolve(url))
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}: ${url}`)
    }
    return response.arrayBuffer()
  }

  async image(url: string): Promise<HTMLImageElement> {
    const blob = new Blob([await this.bytes(url)])
    const objectUrl = URL.createObjectURL(blob)
    try {
      const image = new Image()
      image.src = objectUrl
      await image.decode()
      return image
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  }
}
