import './style.css'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('App root not found')

app.innerHTML = `
  <section class="shell">
    <header>
      <div>
        <p class="eyebrow">EXPERIMENTAL</p>
        <h1>Sonolus Web</h1>
        <p class="subtitle">A browser-native runtime experiment for Sonolus content.</p>
      </div>
      <span class="status">Prototype</span>
    </header>

    <div class="stage-wrap">
      <canvas id="stage" aria-label="Sonolus Web render stage"></canvas>
    </div>

    <section class="panel">
      <h2>Runtime bootstrap</h2>
      <p id="message">Canvas, timing, input, and browser audio layers are ready. Next: Sonolus resource loading and engine execution.</p>
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

function resize(): void {
  const ratio = Math.min(window.devicePixelRatio || 1, 2)
  const rect = canvas.getBoundingClientRect()
  canvas.width = Math.max(1, Math.floor(rect.width * ratio))
  canvas.height = Math.max(1, Math.floor(rect.height * ratio))
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  graphics.textContent = `Graphics: ${ctx ? 'Canvas 2D ready' : 'unavailable'}`
}

function draw(now: number): void {
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

  const pulse = (Math.sin(now / 400) + 1) / 2
  ctx.strokeStyle = `rgba(255,255,255,${0.25 + pulse * 0.15})`
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(left, h * 0.78)
  ctx.lineTo(left + laneWidth, h * 0.78)
  ctx.stroke()

  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.font = '14px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Sonolus Web runtime stage', w / 2, h / 2)

  requestAnimationFrame(draw)
}

window.addEventListener('resize', resize)
canvas.addEventListener('pointerdown', async () => {
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

resize()
requestAnimationFrame(draw)
