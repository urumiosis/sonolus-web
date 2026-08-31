export type Sprite = {
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  alpha?: number
}

/** Minimal Canvas renderer used while the full Sonolus graphics API is ported. */
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
}
