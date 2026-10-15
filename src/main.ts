import './style.css'
import { SonolusServerClient, type ServerItem } from './sonolus/server'
import { SonolusRuntime } from './sonolus/runtime'
import { SkinAtlas } from './sonolus/skin-atlas'
import { SkinLoader, type SkinItem, type Srl } from './sonolus/skin'
import { WebGLSpriteRenderer, type SpriteDraw } from './sonolus/webgl'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('App root not found')

app.innerHTML = `
  <section class="shell">
    <header>
      <div>
        <p class="eyebrow">EXPERIMENTAL</p>
        <h1>Sonolus Web</h1>
        <p class="subtitle">Browser-native Sonolus runtime experiment — Next SEKAI first.</p>
      </div>
      <span class="status">Runtime prototype</span>
    </header>

    <section class="panel server-panel">
      <h2>Sonolus server</h2>
      <div class="server-row">
        <input id="server-url" value="https://coconut.sonolus.com/next-sekai" spellcheck="false" aria-label="Sonolus server URL" />
        <button id="connect">Connect</button>
      </div>
      <p id="server-message">Ready to connect. The browser client uses the standard Sonolus HTTP server API.</p>
      <div class="server-links">
        <button data-type="levels">Levels</button>
        <button data-type="engines">Engines</button>
        <button data-type="skins">Skins</button>
      </div>
      <div id="items" class="items"></div>
    </section>

    <div class="stage-wrap">
      <canvas id="stage" aria-label="Sonolus Web render stage"></canvas>
    </div>

    <section class="panel">
      <h2>Skin atlas preview</h2>
      <p id="skin-message">Connect to a server and choose Skins to load a skin texture and inspect its first sprites.</p>
      <canvas id="skin-stage" aria-label="Loaded Sonolus skin sprite preview"></canvas>
    </section>

    <section class="panel">
      <h2>Runtime bootstrap</h2>
      <p id="message">Browser runtime clock and touch state are active. Next milestone: execute Sonolus engine nodes.</p>
      <div class="checks">
        <span id="graphics">Graphics: checking…</span>
        <span id="audio">Audio: locked until interaction</span>
        <span id="input">Input: ready</span>
      </div>
    </section>
  </section>
`

const canvas = document.querySelector<HTMLCanvasElement>('#stage')!
const ctx = canvas.getContext('2d')!
const skinCanvas = document.querySelector<HTMLCanvasElement>('#skin-stage')!
const skinMessage = document.querySelector<HTMLParagraphElement>('#skin-message')!
const graphics = document.querySelector<HTMLSpanElement>('#graphics')!
const audio = document.querySelector<HTMLSpanElement>('#audio')!
const input = document.querySelector<HTMLSpanElement>('#input')!
const serverMessage = document.querySelector<HTMLParagraphElement>('#server-message')!
const serverUrl = document.querySelector<HTMLInputElement>('#server-url')!
const items = document.querySelector<HTMLDivElement>('#items')!
const clientButton = document.querySelector<HTMLButtonElement>('#connect')!
const runtime = new SonolusRuntime()
let skinRenderer: WebGLSpriteRenderer | undefined
let skinCanvasAspect = 1

try {
  skinRenderer = new WebGLSpriteRenderer(skinCanvas)
} catch (error) {
  skinMessage.textContent = `WebGL skin preview unavailable: ${error instanceof Error ? error.message : String(error)}`
}

function resize(): void {
  const ratio = Math.min(window.devicePixelRatio || 1, 2)
  const rect = canvas.getBoundingClientRect()
  canvas.width = Math.max(1, Math.floor(rect.width * ratio))
  canvas.height = Math.max(1, Math.floor(rect.height * ratio))
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  const skinRect = skinCanvas.getBoundingClientRect()
  skinCanvas.width = Math.max(1, Math.floor(skinRect.width * ratio))
  skinCanvas.height = Math.max(1, Math.floor(skinRect.height * ratio))
  skinCanvasAspect = skinCanvas.width / skinCanvas.height
  graphics.textContent = `Graphics: Canvas 2D${skinRenderer ? ' + WebGL' : ''} ready`
}

function draw(now: number): void {
  const update = runtime.update(now)
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#11131a'
  ctx.fillRect(0, 0, w, h)

  const laneWidth = Math.min(w * 0.72, 560)
  const left = (w - laneWidth) / 2
  const laneCount = 5
  const lane = laneWidth / laneCount

  for (let i = 0; i <= laneCount; i++) {
    ctx.strokeStyle = 'rgba(255,255,255,0.10)'
    ctx.beginPath()
    ctx.moveTo(left + i * lane, 0)
    ctx.lineTo(left + i * lane, h)
    ctx.stroke()
  }

  const pulse = (Math.sin(update.time * Math.PI * 2.5) + 1) / 2
  ctx.strokeStyle = `rgba(255,255,255,${0.25 + pulse * 0.15})`
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(left, h * 0.78)
  ctx.lineTo(left + laneWidth, h * 0.78)
  ctx.stroke()

  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.font = '14px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`Sonolus runtime ${update.time.toFixed(2)}s`, w / 2, h / 2)
  requestAnimationFrame(draw)
}

function itemLabel(item: ServerItem): string {
  if (typeof item.title === 'string') return item.title
  if (item.title && typeof item.title === 'object' && 'en' in item.title) {
    const localized = (item.title as { en?: unknown }).en
    if (typeof localized === 'string') return localized
  }
  return item.name
}

function resolveResource(baseUrl: string, srl: Srl): string {
  if (srl.url) {
    try {
      return new URL(srl.url, `${baseUrl.replace(/\/+$/, '')}/`).toString()
    } catch {
      throw new Error(`Invalid resource URL: ${srl.url}`)
    }
  }
  if (srl.hash) return new URL(`sonolus/repository/${encodeURIComponent(srl.hash)}`, `${baseUrl.replace(/\/+$/, '')}/`).toString()
  throw new Error('Resource has neither a URL nor a hash')
}

function drawSkinSprites(atlas: SkinAtlas, textureWidth: number, textureHeight: number): number {
  if (!skinRenderer) throw new Error('WebGL skin renderer is unavailable')
  const sprites = atlas.data.sprites.slice(0, 12)
  const draws: SpriteDraw[] = sprites.map((sprite, index) => {
    const column = index % 4
    const row = Math.floor(index / 4)
    const centerX = -0.75 + column * 0.5
    const centerY = 0.62 - row * 0.62
    const height = 0.34
    const width = Math.min(0.42, height * (sprite.w / Math.max(1, sprite.h)) / skinCanvasAspect)
    const left = centerX - width / 2
    const right = centerX + width / 2
    const bottom = centerY - height / 2
    const top = centerY + height / 2
    return {
      quad: [left, bottom, left, top, right, top, right, bottom],
      z: index,
      alpha: 1,
      sprite: atlas.rect(sprite.name),
    }
  })
  skinRenderer.clear()
  skinRenderer.draw(draws, textureWidth, textureHeight)
  return sprites.length
}

async function previewSkin(client: SonolusServerClient, item: ServerItem): Promise<void> {
  if (!skinRenderer) throw new Error('This browser does not provide WebGL')
  skinMessage.textContent = `Loading skin: ${itemLabel(item)}…`
  const raw = await client.item('skins', item.name)
  if (!raw || typeof raw !== 'object') throw new Error('Skin metadata response was not an object')
  const value = raw as Partial<SkinItem>
  if (!value.data || !value.texture) throw new Error('Skin metadata is missing data or texture resources')
  const skinItem = {
    ...value,
    name: item.name,
    data: value.data,
    texture: value.texture,
  } as SkinItem
  const loader = new SkinLoader((srl) => resolveResource(client.baseUrl, srl))
  const loaded = await loader.load(skinItem)
  const atlas = new SkinAtlas(loaded.data)
  skinRenderer.upload(loaded.texture, loaded.data.interpolation)
  const count = drawSkinSprites(atlas, loaded.data.width, loaded.data.height)
  skinMessage.textContent = `Loaded ${itemLabel(item)} — ${loaded.data.width}×${loaded.data.height} atlas, ${loaded.data.sprites.length} sprites; showing ${count}.`
}

async function connect(): Promise<void> {
  clientButton.disabled = true
  serverMessage.textContent = 'Connecting…'
  items.replaceChildren()

  try {
    const client = new SonolusServerClient(serverUrl.value)
    const info = await client.info()
    serverMessage.textContent = `Connected: ${info.title}`

    const levelList = await client.list('levels')
    for (const item of levelList.items.slice(0, 12)) {
      const button = document.createElement('button')
      button.className = 'item'
      button.textContent = itemLabel(item)
      button.title = item.name
      button.addEventListener('click', async () => {
        serverMessage.textContent = `Loading level metadata: ${item.name}`
        try {
          await client.item('levels', item.name)
          serverMessage.textContent = `Loaded level metadata: ${itemLabel(item)}`
        } catch (error) {
          serverMessage.textContent = `Level request failed: ${error instanceof Error ? error.message : String(error)}`
        }
      })
      items.append(button)
    }
  } catch (error) {
    serverMessage.textContent = `Connection failed: ${error instanceof Error ? error.message : String(error)}`
  } finally {
    clientButton.disabled = false
  }
}

clientButton.addEventListener('click', () => void connect())
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-type]')) {
  button.addEventListener('click', async () => {
    const type = button.dataset.type as 'levels' | 'engines' | 'skins'
    button.disabled = true
    try {
      const client = new SonolusServerClient(serverUrl.value)
      const list = await client.list(type)
      items.replaceChildren(...list.items.slice(0, 20).map((item) => {
        const element = document.createElement('button')
        element.className = 'item'
        element.textContent = itemLabel(item)
        element.title = item.name
        element.addEventListener('click', async () => {
          if (type !== 'skins') {
            serverMessage.textContent = `Selected ${type.slice(0, -1)}: ${itemLabel(item)}`
            return
          }
          try {
            await previewSkin(client, item)
            serverMessage.textContent = `Skin preview ready: ${itemLabel(item)}`
          } catch (error) {
            skinMessage.textContent = `Skin preview failed: ${error instanceof Error ? error.message : String(error)}`
            serverMessage.textContent = `Could not preview skin: ${item.name}`
          }
        })
        return element
      }))
      serverMessage.textContent = `${type}: ${list.items.length} items on this page. Select an item to inspect it.`
    } catch (error) {
      serverMessage.textContent = `Request failed: ${error instanceof Error ? error.message : String(error)}`
    } finally {
      button.disabled = false
    }
  })
}

window.addEventListener('resize', resize)
canvas.addEventListener('pointerdown', async (event) => {
  runtime.setTouch(event.pointerId, event.offsetX, event.offsetY, true)
  input.textContent = `Input: ${runtime.touchArray.length} active touch${runtime.touchArray.length === 1 ? '' : 'es'}`
  audio.textContent = 'Audio: interaction received'
  try {
    const context = new AudioContext()
    await context.resume()
    audio.textContent = `Audio: ${context.state}`
    await context.close()
  } catch {
    audio.textContent = 'Audio: unavailable'
  }
})
canvas.addEventListener('pointerup', (event) => {
  runtime.removeTouch(event.pointerId)
  input.textContent = `Input: ${runtime.touchArray.length} active touch${runtime.touchArray.length === 1 ? '' : 'es'}`
})
canvas.addEventListener('pointercancel', (event) => runtime.removeTouch(event.pointerId))

resize()
requestAnimationFrame(draw)
