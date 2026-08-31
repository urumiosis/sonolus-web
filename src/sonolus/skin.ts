export type Srl = {
  hash?: string | null
  url?: string | null
}

export type SkinDataExpression = Partial<Record<`x${1 | 2 | 3 | 4}` | `y${1 | 2 | 3 | 4}`, number>>

export type SkinDataSprite = {
  name: string
  x: number
  y: number
  w: number
  h: number
  transform: Record<`x${1 | 2 | 3 | 4}` | `y${1 | 2 | 3 | 4}`, SkinDataExpression>
}

export type SkinData = {
  width: number
  height: number
  interpolation: boolean
  sprites: SkinDataSprite[]
}

export type SkinItem = {
  name: string
  version: number
  title: string
  subtitle: string
  author: string
  thumbnail: Srl
  data: Srl
  texture: Srl
}

export type LoadedSprite = SkinDataSprite & {
  texture: HTMLImageElement
}

export class SkinLoader {
  constructor(private readonly resolve: (srl: Srl) => string) {}

  async load(item: SkinItem): Promise<{ data: SkinData; texture: HTMLImageElement }> {
    if (!item.data.url && !item.data.hash) throw new Error(`Skin ${item.name} has no data resource`)
    if (!item.texture.url && !item.texture.hash) throw new Error(`Skin ${item.name} has no texture resource`)

    const [dataResponse, textureResponse] = await Promise.all([
      fetch(this.resolve(item.data)),
      fetch(this.resolve(item.texture)),
    ])
    if (!dataResponse.ok) throw new Error(`Skin data: ${dataResponse.status}`)
    if (!textureResponse.ok) throw new Error(`Skin texture: ${textureResponse.status}`)

    const data = await parseJsonResource< SkinData >(await dataResponse.arrayBuffer())
    const blob = await textureResponse.blob()
    const texture = await loadImage(blob)
    return { data, texture }
  }
}

async function loadImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob)
  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = url
    await image.decode()
    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function parseJsonResource<T>(buffer: ArrayBuffer): Promise<T> {
  const bytes = new Uint8Array(buffer)
  // Sonolus JSON resources are gzip-compressed. DecompressionStream is supported by
  // current Chromium, making this work without a WASM dependency.
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))
    const text = await new Response(stream).text()
    return JSON.parse(text) as T
  }
  return JSON.parse(new TextDecoder().decode(bytes)) as T
}
