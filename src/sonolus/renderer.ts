import type { DrawCommand } from './presentation'

export type Sprite = { x: number; y: number; width: number; height: number; rotation?: number; alpha?: number }

/** Canvas presentation renderer. Coordinates follow Sonolus' centered screen convention. */
export class SonolusRenderer {
  constructor(readonly canvas: HTMLCanvasElement) {}

  get context(): CanvasRenderingContext2D {
    const context = this.canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D is unavailable')
    return context
  }

  clear(): void {
    const context = this.context
    context.clearRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight)
  }

  drawSprite(sprite: Sprite): void {
    const context = this.context
    context.save()
    context.globalAlpha = sprite.alpha ?? 1
    context.translate(sprite.x, sprite.y)
    context.rotate(sprite.rotation ?? 0)
    context.fillRect(-sprite.width / 2, -sprite.height / 2, sprite.width, sprite.height)
    context.restore()
  }

  /** Render a Sonolus Draw command as a textured-quad placeholder until skin atlases are wired. */
  drawCommand(command: DrawCommand): void {
    const context = this.context
    const width = this.canvas.clientWidth
    const height = this.canvas.clientHeight
    const aspect = width / Math.max(1, height)
    const toScreen = (x: number, y: number): [number, number] => [width / 2 + x * height / 2, height / 2 - y * height / 2]
    const points: [number, number][] = [
      toScreen(command.quad[0], command.quad[1]), toScreen(command.quad[2], command.quad[3]),
      toScreen(command.quad[4], command.quad[5]), toScreen(command.quad[6], command.quad[7]),
    ]
    context.save()
    context.globalAlpha = Math.max(0, Math.min(1, command.alpha))
    // Distinct deterministic tint makes runtime Draw calls visible before real skin textures are loaded.
    const hue = Math.abs(Math.floor(command.sprite * 47)) % 360
    context.fillStyle = `hsl(${hue} 70% 60%)`
    context.beginPath()
    context.moveTo(points[0][0], points[0][1])
    for (let i = 1; i < points.length; i++) context.lineTo(points[i][0], points[i][1])
    context.closePath()
    context.fill()
    context.restore()
    void aspect
  }

  render(commands: DrawCommand[]): void {
    this.clear()
    for (const command of commands) this.drawCommand(command)
  }
}
