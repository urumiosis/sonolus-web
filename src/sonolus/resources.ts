export type SonolusResource = {
  hash?: string | null
  url?: string | null
  type?: string
  [key: string]: unknown
}

/** Browser implementation of Sonolus Resource Locator (SRL) loading. */
export class ResourceLoader {
  private readonly cache = new Map<string, ArrayBuffer>()

  constructor(readonly baseUrl: string) {}

  private resolve(url: string): string {
    // SRL relative URLs are relative to the server address, not the domain root.
    return new URL(url, `${this.baseUrl.replace(/\/+$/, '')}/`).toString()
  }

  async bytes(resource: string | SonolusResource): Promise<ArrayBuffer> {
    const url = typeof resource === 'string' ? resource : resource.url
    if (!url) throw new Error('Sonolus resource has no URL')

    const hash = typeof resource === 'string' ? undefined : resource.hash ?? undefined
    if (hash) {
      const cached = this.cache.get(hash)
      if (cached) return cached.slice(0)
    }

    const response = await fetch(this.resolve(url), {
      headers: { Accept: '*/*' },
      cache: 'force-cache',
    })
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}: ${url}`)
    }

    const bytes = await response.arrayBuffer()
    if (hash) this.cache.set(hash, bytes.slice(0))
    return bytes
  }

  async json<T>(resource: string | SonolusResource): Promise<T> {
    const bytes = await this.bytes(resource)
    return JSON.parse(await decodeGzipJson(bytes)) as T
  }

  async image(resource: string | SonolusResource): Promise<HTMLImageElement> {
    const blob = new Blob([await this.bytes(resource)])
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

  async clearCache(): Promise<void> {
    this.cache.clear()
  }
}

/**
 * Sonolus JSON resources are gzip-compressed. Browsers that expose
 * DecompressionStream can decode them without WASM or native code.
 */
async function decodeGzipJson(bytes: ArrayBuffer): Promise<string> {
  const view = new Uint8Array(bytes)
  const isGzip = view.length >= 2 && view[0] === 0x1f && view[1] === 0x8b
  if (!isGzip) return new TextDecoder().decode(view)

  if ('DecompressionStream' in globalThis) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
    return new TextDecoder().decode(await new Response(stream).arrayBuffer())
  }

  throw new Error('This browser does not provide DecompressionStream(gzip)')
}
