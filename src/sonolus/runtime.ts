export type RuntimeUpdate = {
  time: number
  deltaTime: number
  skip: number
}

export type Touch = {
  id: number
  x: number
  y: number
  dx: number
  dy: number
  touched: boolean
}

/** Browser-side foundation for the Sonolus Runtime Environment block. */
export class SonolusRuntime {
  readonly startedAt = performance.now()
  private previousTime = this.startedAt
  private touches = new Map<number, Touch>()

  update(now = performance.now()): RuntimeUpdate {
    const time = (now - this.startedAt) / 1000
    const deltaTime = Math.max(0, (now - this.previousTime) / 1000)
    this.previousTime = now
    return { time, deltaTime, skip: 0 }
  }

  setTouch(id: number, x: number, y: number, touched: boolean): void {
    const previous = this.touches.get(id)
    this.touches.set(id, {
      id,
      x,
      y,
      dx: previous ? x - previous.x : 0,
      dy: previous ? y - previous.y : 0,
      touched,
    })
  }

  removeTouch(id: number): void {
    this.touches.delete(id)
  }

  get touchArray(): Touch[] {
    return [...this.touches.values()]
  }
}
