import type { EngineDataNode, EnginePlayDataArchetype } from '@sonolus/core'
import { evaluateNode, type NodeEnvironment } from './node-evaluator'
import type { EngineContext, EntityState, SonolusPlayRuntime } from './engine'

export type CallbackName =
  | 'preprocess'
  | 'spawnOrder'
  | 'shouldSpawn'
  | 'initialize'
  | 'updateSequential'
  | 'touch'
  | 'updateParallel'
  | 'terminate'

export type CallbackResult = {
  value: number
  env: NodeEnvironment
}

/** Executes a Sonolus callback against browser-hosted runtime blocks. */
export class CallbackExecutor {
  constructor(private readonly nodes: EngineDataNode[]) {}

  execute(
    archetype: EnginePlayDataArchetype,
    callback: CallbackName,
    context: EngineContext,
    entity?: EntityState,
    runtime?: SonolusPlayRuntime,
  ): CallbackResult | undefined {
    const descriptor = archetype[callback]
    if (!descriptor) return undefined

    if (entity && runtime) runtime.syncEntityBlocks(entity)

    const env: NodeEnvironment = {
      values: new Map<number, number>(),
      random: Math.random,
      blocks: runtime?.blocks,
      runtime,
      entity,
    }

    if (runtime) {
      runtime.blocks.set(1001, 0, context.frame.time)
      runtime.blocks.set(1001, 1, context.frame.deltaTime)
      runtime.blocks.set(1001, 2, context.frame.time)
    }

    const value = evaluateNode(this.nodes, descriptor.index, env)
    return { value, env }
  }
}
