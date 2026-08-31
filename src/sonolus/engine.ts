import type { EnginePlayData } from '@sonolus/core'

/** Minimal browser-side representation of the Sonolus play runtime.
 *
 * This intentionally mirrors the engine-spec lifecycle instead of inventing
 * a separate game format. The next layer will bind callback indices to the
 * compiled engine program and resource tables.
 */
export interface RuntimeFrame {
  time: number
  deltaTime: number
  navigationDirection: -1 | 1
}

export interface EntityState {
  archetype: string
  id: number
  data: number[]
  spawnTime: number
  despawnTime: number
  alive: boolean
  touched: boolean
}

export interface EngineContext {
  frame: RuntimeFrame
  entities: EntityState[]
  score: number
  life: number
  combo: number
}

export class SonolusPlayRuntime {
  readonly context: EngineContext = {
    frame: { time: 0, deltaTime: 0, navigationDirection: 1 },
    entities: [],
    score: 0,
    life: 100,
    combo: 0,
  }

  private nextEntityId = 1

  constructor(readonly playData: EnginePlayData) {}

  reset(): void {
    this.context.frame.time = 0
    this.context.frame.deltaTime = 0
    this.context.entities.length = 0
    this.context.score = 0
    this.context.life = 100
    this.context.combo = 0
    this.nextEntityId = 1
  }

  spawn(archetype: string, data: number[], spawnTime = 0, despawnTime = Infinity): EntityState {
    const entity: EntityState = {
      archetype,
      id: this.nextEntityId++,
      data: [...data],
      spawnTime,
      despawnTime,
      alive: true,
      touched: false,
    }
    this.context.entities.push(entity)
    return entity
  }

  setTime(time: number): void {
    const previous = this.context.frame.time
    this.context.frame.time = time
    this.context.frame.deltaTime = Math.max(0, time - previous)

    for (const entity of this.context.entities) {
      if (entity.alive && time >= entity.despawnTime) entity.alive = false
    }
  }

  activeEntities(): EntityState[] {
    const time = this.context.frame.time
    return this.context.entities.filter(
      (entity) => entity.alive && time >= entity.spawnTime && time < entity.despawnTime,
    )
  }
}

export function validatePlayData(value: unknown): value is EnginePlayData {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  return (
    !!data.skin && typeof data.skin === 'object' &&
    !!data.effect && typeof data.effect === 'object' &&
    !!data.particle && typeof data.particle === 'object' &&
    Array.isArray(data.buckets) &&
    Array.isArray(data.archetypes) &&
    Array.isArray(data.nodes)
  )
}
