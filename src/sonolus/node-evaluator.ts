import type { EngineDataNode } from '@sonolus/core'
import { SonolusBlocks } from './blocks'
import type { EntityState, SonolusPlayRuntime } from './engine'

/** Host bindings exposed to the Sonolus node program. */
export type NodeEnvironment = {
  values?: Map<number, number>
  random?: () => number
  blocks?: SonolusBlocks
  runtime?: SonolusPlayRuntime
  entity?: EntityState
}

const unaryMath: Record<string, (a: number) => number> = {
  Abs: Math.abs, Ceil: Math.ceil, Floor: Math.floor, Round: Math.round, Trunc: Math.trunc,
  Sin: Math.sin, Cos: Math.cos, Tan: Math.tan, Sinh: Math.sinh, Cosh: Math.cosh, Tanh: Math.tanh,
  Arccos: Math.acos, Arcsin: Math.asin, Arctan: Math.atan, Radian: (x) => x * Math.PI / 180,
  Degree: (x) => x * 180 / Math.PI, Negate: (x) => -x, Sign: Math.sign, Frac: (x) => x - Math.floor(x), Log: Math.log,
}

const binaryMath: Record<string, (a: number, b: number) => number> = {
  Add: (a, b) => a + b, Subtract: (a, b) => a - b, Multiply: (a, b) => a * b,
  Divide: (a, b) => b === 0 ? 0 : a / b, Mod: (a, b) => b === 0 ? 0 : a % b,
  Rem: (a, b) => b === 0 ? 0 : a % b, Power: Math.pow, Min: Math.min, Max: Math.max, Arctan2: Math.atan2,
}

function bool(value: boolean): number { return value ? 1 : 0 }

/** Evaluate one node of Sonolus' flattened AST. */
export function evaluateNode(nodes: EngineDataNode[], index: number, env: NodeEnvironment = {}, stack = new Set<number>()): number {
  if (index < 0 || index >= nodes.length) throw new RangeError(`Node index ${index} is out of range`)
  const cached = env.values?.get(index)
  if (cached !== undefined) return cached
  const node = nodes[index]
  if ('value' in node) return node.value
  if (stack.has(index)) throw new Error(`Cyclic node graph at ${index}`)

  stack.add(index)
  const args = node.args.map((arg) => evaluateNode(nodes, arg, env, stack))
  stack.delete(index)
  let result: number

  switch (node.func) {
    case 'Not': result = bool(!args[0]); break
    case 'And': result = bool(args[0] !== 0 && args[1] !== 0); break
    case 'Or': result = bool(args[0] !== 0 || args[1] !== 0); break
    case 'Equal': result = bool(args[0] === args[1]); break
    case 'NotEqual': result = bool(args[0] !== args[1]); break
    case 'Greater': result = bool(args[0] > args[1]); break
    case 'GreaterOr': result = bool(args[0] >= args[1]); break
    case 'Less': result = bool(args[0] < args[1]); break
    case 'LessOr': result = bool(args[0] <= args[1]); break
    case 'Clamp': result = Math.min(Math.max(args[0], args[1]), args[2]); break
    case 'Lerp': result = args[0] + (args[1] - args[0]) * args[2]; break
    case 'LerpClamped': result = args[0] + (args[1] - args[0]) * Math.min(Math.max(args[2], 0), 1); break
    case 'Unlerp': result = args[1] === args[0] ? 0 : (args[2] - args[0]) / (args[1] - args[0]); break
    case 'UnlerpClamped': { const t = args[1] === args[0] ? 0 : (args[2] - args[0]) / (args[1] - args[0]); result = Math.min(Math.max(t, 0), 1); break }
    case 'Remap': { const t = args[1] === args[0] ? 0 : (args[2] - args[0]) / (args[1] - args[0]); result = args[3] + (args[4] - args[3]) * t; break }
    case 'RemapClamped': { const t = args[1] === args[0] ? 0 : (args[2] - args[0]) / (args[1] - args[0]); result = args[3] + (args[4] - args[3]) * Math.min(Math.max(t, 0), 1); break }
    case 'Random': result = (env.random ?? Math.random)(); break
    case 'RandomInteger': result = Math.floor((env.random ?? Math.random)() * Math.max(1, args[0] ?? 1)); break
    case 'If': result = args[0] !== 0 ? (args[1] ?? 0) : (args[2] ?? 0); break
    case 'Get': result = env.blocks?.get(args[0] ?? 0, args[1] ?? 0) ?? 0; break
    case 'Set': result = env.blocks?.set(args[0] ?? 0, args[1] ?? 0, args[2] ?? 0) ?? (args[2] ?? 0); break
    case 'SetAdd': { const v = (env.blocks?.get(args[0] ?? 0, args[1] ?? 0) ?? 0) + (args[2] ?? 0); result = env.blocks?.set(args[0] ?? 0, args[1] ?? 0, v) ?? v; break }
    case 'SetSubtract': { const v = (env.blocks?.get(args[0] ?? 0, args[1] ?? 0) ?? 0) - (args[2] ?? 0); result = env.blocks?.set(args[0] ?? 0, args[1] ?? 0, v) ?? v; break }
    case 'SetMultiply': { const v = (env.blocks?.get(args[0] ?? 0, args[1] ?? 0) ?? 0) * (args[2] ?? 0); result = env.blocks?.set(args[0] ?? 0, args[1] ?? 0, v) ?? v; break }
    case 'SetDivide': { const d = args[2] ?? 0; const v = d === 0 ? 0 : (env.blocks?.get(args[0] ?? 0, args[1] ?? 0) ?? 0) / d; result = env.blocks?.set(args[0] ?? 0, args[1] ?? 0, v) ?? v; break }
    case 'Spawn': env.runtime?.spawn(String(args[0] ?? 0), args.slice(1)); result = 0; break
    case 'Draw': {
      // Sonolus Draw takes a sprite id, four quad corners, z and alpha.
      if (args.length >= 10) env.runtime?.presentation.draw(args[0], [args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8]], args[9], args[10] ?? 1)
      result = 0
      break
    }
    case 'HasSkinSprite': result = 1; break
    case 'DestroyParticleEffect': case 'MoveParticleEffect': case 'Play': case 'PlayLooped': case 'PlayLoopedScheduled':
    case 'PlayScheduled': case 'StopLooped': case 'StopLoopedScheduled': case 'SpawnParticleEffect': case 'DebugLog': result = 0; break
    default: {
      const unary = unaryMath[node.func]
      if (unary) { result = unary(args[0] ?? 0); break }
      const binary = binaryMath[node.func]
      if (binary) { result = binary(args[0] ?? 0, args[1] ?? 0); break }
      throw new Error(`Unsupported Sonolus function: ${node.func}`)
    }
  }
  env.values?.set(index, result)
  return result
}

export function evaluateNodes(nodes: EngineDataNode[], indexes: number[], env: NodeEnvironment = {}): number[] {
  return indexes.map((index) => evaluateNode(nodes, index, env))
}
