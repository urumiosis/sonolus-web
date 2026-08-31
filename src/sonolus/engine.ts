import type { EnginePlayData } from '@sonolus/core'
import { BlockId, SonolusBlocks } from './blocks'

export type RuntimeFrame = {
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
    life: 1000,
    combo: 0,
  }

  readonly blocks = new SonolusBlocks()
  private nextEntityId = 1

  constructor(readonly playData: EnginePlayData) {
    this.syncRuntimeBlocks()
  }

  reset(): void {
    this.context.frame.time = 0
    this.context.frame.deltaTime = 0
    this.context.entities.length = 0
    this.context.score = 0
    this.context.life = 1000
    this.context.combo = 0
    this.nextEntityId = 1
    this.blocks.reset()
    this.syncRuntimeBlocks()
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
    this.blocks.set(BlockId.EntityDespawn, 0, 0)
    for (const entity of this.context.entities) {
      if (entity.alive && time >= entity.despawnTime) entity.alive = false
    }
    this.syncRuntimeBlocks()
  }

  activeEntities(): EntityState[] {
    const time = this.context.frame.time
    return this.context.entities.filter(
      (entity) => entity.alive && time >= entity.spawnTime && time < entity.despawnTime,
    )
  }

  private syncRuntimeBlocks(): void {
    this.blocks.set(BlockId.RuntimeUpdate, 0, this.context.frame.time)
    this.blocks.set(BlockId.RuntimeUpdate, 1, this.context.frame.deltaTime)
    this.blocks.set(BlockId.RuntimeUpdate, 2, this.context.frame.time)
    this.blocks.set(BlockId.RuntimeUpdate, 3, 0)
    this.blocks.set(BlockId.LevelScore, 0, this.context.score)
    this.blocks.set(BlockId.LevelLife, 0, this.context.life)
  }

  syncEntityBlocks(entity: EntityState): void {
    entity.data.forEach((value, index) => this.blocks.set(BlockId.EntityData, index, value))
    this.blocks.set(BlockId.EntityInfo, 0, entity.id)
    this.blocks.set(BlockId.EntityDespawn, 0, entity.alive ? 0 : 1)
    this.blocks.set(BlockId.EntityInput, 0, entity.touched ? 1 : 0)
    this.blocks.set(BlockId.EntityScore, 0, 0)
    this.blocks.set(BlockId.EntityLife, 0, 0)
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
