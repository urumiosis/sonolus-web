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
 * Executes the pure portion of a Sonolus callback. Side-effecting runtime
 * functions are deliberately exposed through RuntimeFunctionBridge so the
 * evaluator never silently invents Sonolus semantics.
 */
export class CallbackExecutor {
  constructor(private readonly nodes: EngineDataNode[]) {}

  execute(
    archetype: EnginePlayDataArchetype,
    callback: CallbackName,
    context: EngineContext,
    entity?: EntityState,
  ): CallbackResult | undefined {
    const descriptor = archetype[callback]
    if (!descriptor) return undefined

    const values = new Map<number, number>()
    const env: NodeEnvironment = {
      values,
      random: Math.random,
    }

    // These are the scalar runtime values that can be consumed by the pure
    // node evaluator. Full block/function bindings are added incrementally.
    // Keeping them in a map makes the callback VM deterministic and testable.
    if (entity) {
      values.set(-1, entity.id)
      values.set(-2, entity.data.length)
    }
    values.set(-3, context.frame.time)
    values.set(-4, context.frame.deltaTime)
    values.set(-5, context.frame.navigationDirection)
    values.set(-6, context.score)
    values.set(-7, context.life)
    values.set(-8, context.combo)

    const value = evaluateNode(this.nodes, descriptor.index, env)
    return { value, env }
  }
}
