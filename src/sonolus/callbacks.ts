import type { EngineDataNode, EnginePlayDataArchetype } from '@sonolus/core'
import { evaluateNode, type NodeEnvironment } from './node-evaluator'
import type { EngineContext, EntityState } from './engine'

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

/**
 * Executes callbacks whose reachable nodes are currently pure math/control
 * nodes. Runtime block functions are intentionally rejected by the evaluator
 * until their browser-backed bindings are implemented.
 */
export class CallbackExecutor {
  constructor(private readonly nodes: EngineDataNode[]) {}

  execute(
    archetype: EnginePlayDataArchetype,
    callback: CallbackName,
    _context: EngineContext,
    _entity?: EntityState,
  ): CallbackResult | undefined {
    const descriptor = archetype[callback]
    if (!descriptor) return undefined

    const env: NodeEnvironment = {
      values: new Map<number, number>(),
      random: Math.random,
    }

    const value = evaluateNode(this.nodes, descriptor.index, env)
    return { value, env }
  }
}
