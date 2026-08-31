export type Quad = [number, number, number, number, number, number, number, number]

export type DrawCommand = {
  sprite: number
  quad: Quad
  z: number
  alpha: number
}

/** Presentation command buffer produced by Sonolus Draw calls. */
export class SonolusPresentation {
  readonly draws: DrawCommand[] = []

  clear(): void {
    this.draws.length = 0
  }

  draw(sprite: number, quad: Quad, z = 0, alpha = 1): void {
    this.draws.push({ sprite, quad, z, alpha })
  }

  sortedDraws(): DrawCommand[] {
    return [...this.draws].sort((a, b) => a.z - b.z)
  }
}
