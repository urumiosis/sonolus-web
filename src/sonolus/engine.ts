import type { EnginePlayData, EnginePlayDataArchetype } from '@sonolus/core'
import { BlockId, SonolusBlocks } from './blocks'
import { CallbackExecutor, type CallbackName } from './callbacks'

export type RuntimeFrame = { time: number; deltaTime: number; scaledTime: number; touchCount: number; navigationDirection: -1 | 1 }
export interface EntityState { archetype: string; id: number; data: number[]; spawnTime: number; despawnTime: number; alive: boolean; spawned: boolean; initialized: boolean; touched: boolean; spawnOrder: number }
export interface EngineContext { frame: RuntimeFrame; entities: EntityState[]; score: number; life: number; combo: number }

/** Browser host for the Sonolus play-mode lifecycle. */
export class SonolusPlayRuntime {
  readonly context: EngineContext = { frame: { time: 0, deltaTime: 0, scaledTime: 0, touchCount: 0, navigationDirection: 1 }, entities: [], score: 0, life: 1000, combo: 0 }
  readonly blocks = new SonolusBlocks()
  private readonly callbacks: CallbackExecutor
  private readonly archetypes = new Map<string, EnginePlayDataArchetype>()
  private nextEntityId = 1
  private prepared = false

  constructor(readonly playData: EnginePlayData) {
    this.callbacks = new CallbackExecutor(playData.nodes)
    for (const archetype of playData.archetypes) this.archetypes.set(archetype.name, archetype)
    this.syncRuntimeBlocks()
  }

  reset(): void {
    this.context.frame = { time: 0, deltaTime: 0, scaledTime: 0, touchCount: 0, navigationDirection: 1 }
    this.context.entities.length = 0
    this.context.score = 0; this.context.life = 1000; this.context.combo = 0
    this.nextEntityId = 1; this.prepared = false
    this.blocks.reset(); this.syncRuntimeBlocks()
  }

  spawn(archetype: string, data: number[], spawnTime = 0, despawnTime = Infinity): EntityState {
    const entity: EntityState = { archetype, id: this.nextEntityId++, data: [...data], spawnTime, despawnTime, alive: true, spawned: false, initialized: false, touched: false, spawnOrder: 0 }
    this.context.entities.push(entity); return entity
  }

  prepare(): void {
    if (this.prepared) return
    this.prepared = true
    for (const archetype of this.playData.archetypes) this.executeGlobal(archetype, 'preprocess')
    for (const entity of this.context.entities) {
      const archetype = this.archetypes.get(entity.archetype)
      if (archetype?.spawnOrder) entity.spawnOrder = this.execute(archetype, 'spawnOrder', entity)
    }
    this.context.entities.sort((a, b) => a.spawnOrder - b.spawnOrder || a.id - b.id)
  }

  /** One update cycle: spawn → initialize → sequential → input → parallel → despawn. */
  update(time: number, touches = 0): void {
    this.prepare(); this.setTime(time)
    this.context.frame.touchCount = Math.max(0, touches)
    this.blocks.set(BlockId.RuntimeUpdate, 3, this.context.frame.touchCount)

    for (const entity of this.context.entities) {
      if (!entity.alive || entity.spawned || time < entity.spawnTime) continue
      const archetype = this.archetypes.get(entity.archetype)
      if (archetype?.shouldSpawn && this.execute(archetype, 'shouldSpawn', entity) === 0) continue
      entity.spawned = true
    }
    for (const entity of this.activeEntities(true)) {
      if (entity.initialized) continue
      const archetype = this.archetypes.get(entity.archetype)
      if (archetype) this.execute(archetype, 'initialize', entity)
      entity.initialized = true
    }
    for (const entity of this.activeEntities()) {
      const archetype = this.archetypes.get(entity.archetype)
      if (archetype?.updateSequential) this.execute(archetype, 'updateSequential', entity)
    }
    if (touches > 0) for (const entity of this.activeEntities()) {
      const archetype = this.archetypes.get(entity.archetype)
      if (archetype?.hasInput && archetype.touch) this.execute(archetype, 'touch', entity)
    }
    for (const entity of this.activeEntities()) {
      const archetype = this.archetypes.get(entity.archetype)
      if (archetype?.updateParallel) this.execute(archetype, 'updateParallel', entity)
    }
    for (const entity of this.context.entities) {
      if (!entity.spawned || !entity.alive || time < entity.despawnTime) continue
      const archetype = this.archetypes.get(entity.archetype)
      if (archetype?.terminate) this.execute(archetype, 'terminate', entity)
      entity.alive = false
    }
  }

  setTime(time: number): void {
    const previous = this.context.frame.time
    this.context.frame.time = time
    this.context.frame.deltaTime = Math.max(0, time - previous)
    this.context.frame.scaledTime = time
    this.syncRuntimeBlocks()
  }

  activeEntities(includeUninitialized = false): EntityState[] {
    const time = this.context.frame.time
    return this.context.entities.filter(e => e.alive && e.spawned && (includeUninitialized || e.initialized) && time >= e.spawnTime && time < e.despawnTime)
  }

  execute(archetype: EnginePlayDataArchetype, callback: CallbackName, entity: EntityState): number {
    return this.callbacks.execute(archetype, callback, this.context, entity, this)?.value ?? 0
  }
  private executeGlobal(archetype: EnginePlayDataArchetype, callback: CallbackName): number {
    return this.callbacks.execute(archetype, callback, this.context, undefined, this)?.value ?? 0
  }
  private syncRuntimeBlocks(): void {
    this.blocks.set(BlockId.RuntimeUpdate, 0, this.context.frame.time)
    this.blocks.set(BlockId.RuntimeUpdate, 1, this.context.frame.deltaTime)
    this.blocks.set(BlockId.RuntimeUpdate, 2, this.context.frame.scaledTime)
    this.blocks.set(BlockId.RuntimeUpdate, 3, this.context.frame.touchCount)
    this.blocks.set(BlockId.LevelScore, 0, this.context.score)
    this.blocks.set(BlockId.LevelLife, 0, this.context.life)
  }
  syncEntityBlocks(entity: EntityState): void {
    entity.data.forEach((value, index) => this.blocks.set(BlockId.EntityData, index, value))
    this.blocks.set(BlockId.EntityInfo, 0, entity.id)
    this.blocks.set(BlockId.EntityDespawn, 0, entity.alive ? 0 : 1)
    this.blocks.set(BlockId.EntityInput, 0, entity.touched ? 1 : 0)
    this.blocks.set(BlockId.EntityScore, 0, 0); this.blocks.set(BlockId.EntityLife, 0, 0)
  }
}

export function validatePlayData(value: unknown): value is EnginePlayData {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  return !!data.skin && typeof data.skin === 'object' && !!data.effect && typeof data.effect === 'object' && !!data.particle && typeof data.particle === 'object' && Array.isArray(data.buckets) && Array.isArray(data.archetypes) && Array.isArray(data.nodes)
}
