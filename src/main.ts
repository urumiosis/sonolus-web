import './style.css'
import { SonolusServerClient, type ServerItem } from './sonolus/server'
import { SonolusRuntime } from './sonolus/runtime'

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
      </div>
      <div id="items" class="items"></div>
    </section>

    <div class="stage-wrap">
      <canvas id="stage" aria-label="Sonolus Web render stage"></canvas>
    </div>

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
const graphics = document.querySelector<HTMLSpanElement>('#graphics')!
const audio = document.querySelector<HTMLSpanElement>('#audio')!
const input = document.querySelector<HTMLSpanElement>('#input')!
const serverMessage = document.querySelector<HTMLParagraphElement>('#server-message')!
const serverUrl = document.querySelector<HTMLInputElement>('#server-url')!
const items = document.querySelector<HTMLDivElement>('#items')!
const clientButton = document.querySelector<HTMLButtonElement>('#connect')!
const runtime = new SonolusRuntime()

function resize(): void {
  const ratio = Math.min(window.devicePixelRatio || 1, 2)
  const rect = canvas.getBoundingClientRect()
  canvas.width = Math.max(1, Math.floor(rect.width * ratio))
  canvas.height = Math.max(1, Math.floor(rect.height * ratio))
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  graphics.textContent = 'Graphics: Canvas 2D ready'
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
  return item.name
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
    const type = button.dataset.type as 'levels' | 'engines'
    try {
      const client = new SonolusServerClient(serverUrl.value)
      const list = await client.list(type)
      items.replaceChildren(...list.items.slice(0, 20).map((item) => {
        const element = document.createElement('button')
        element.className = 'item'
        element.textContent = itemLabel(item)
        element.title = item.name
        return element
      }))
      serverMessage.textContent = `${type}: ${list.items.length} items on this page`
    } catch (error) {
      serverMessage.textContent = `Request failed: ${error instanceof Error ? error.message : String(error)}`
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
