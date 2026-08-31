import type { EngineDataNode } from '@sonolus/core'

/**
 * Small, deterministic evaluator for the pure value/function subset of the
 * Sonolus node graph. It is deliberately side-effect free for now: rendering,
 * entity operations, audio, and input are supplied by the runtime later.
 *
 * This gives the browser client a real execution primitive instead of treating
 * EnginePlayData.nodes as opaque JSON.
 */
export type NodeEnvironment = {
  values?: Map<number, number>
  random?: () => number
}

const unaryMath: Record<string, (a: number) => number> = {
  Abs: Math.abs,
  Ceil: Math.ceil,
  Floor: Math.floor,
  Round: Math.round,
  Trunc: Math.trunc,
  Sin: Math.sin,
  Cos: Math.cos,
  Tan: Math.tan,
  Sinh: Math.sinh,
  Cosh: Math.cosh,
  Tanh: Math.tanh,
  Arccos: Math.acos,
  Arcsin: Math.asin,
  Arctan: Math.atan,
  Radian: (x) => x * Math.PI / 180,
  Degree: (x) => x * 180 / Math.PI,
  Negate: (x) => -x,
  Sign: Math.sign,
  Frac: (x) => x - Math.floor(x),
}

const binaryMath: Record<string, (a: number, b: number) => number> = {
  Add: (a, b) => a + b,
  Subtract: (a, b) => a - b,
  Multiply: (a, b) => a * b,
  Divide: (a, b) => b === 0 ? 0 : a / b,
  Mod: (a, b) => b === 0 ? 0 : a % b,
  Rem: (a, b) => b === 0 ? 0 : a % b,
  Power: Math.pow,
  Min: Math.min,
  Max: Math.max,
  Arctan2: Math.atan2,
  Lerp: (a, b) => a + (b - a),
  Unlerp: (a, b) => b === 0 ? 0 : a / b,
}

function bool(value: boolean): number {
  return value ? 1 : 0
}

/** Evaluate a single node recursively. Node indexes are zero-based. */
export function evaluateNode(nodes: EngineDataNode[], index: number, env: NodeEnvironment = {}, stack = new Set<number>()): number {
  if (index < 0 || index >= nodes.length) throw new RangeError(`Node index ${index} is out of range`)
  if (stack.has(index)) throw new Error(`Cyclic node graph at ${index}`)

  const cached = env.values?.get(index)
  if (cached !== undefined) return cached

  const node = nodes[index]
  if ('value' in node) return node.value

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
    case 'Remap': result = args[2] + (args[3] - args[2]) * ((args[0] - args[1]) || 0); break
    case 'RemapClamped': result = Math.min(Math.max(args[2] + (args[3] - args[2]) * ((args[0] - args[1]) || 0), args[2]), args[3]); break
    case 'Random': result = (env.random ?? Math.random)(); break
    case 'RandomInteger': result = Math.floor((env.random ?? Math.random)() * (args[0] ?? 1)); break
    case 'If': result = args[0] !== 0 ? (args[1] ?? 0) : (args[2] ?? 0); break
    default: {
      const unary = unaryMath[node.func]
      if (unary) {
        result = unary(args[0] ?? 0)
        break
      }
      const binary = binaryMath[node.func]
      if (binary) {
        result = binary(args[0] ?? 0, args[1] ?? 0)
        break
      }
      throw new Error(`Unsupported pure Sonolus function: ${node.func}`)
    }
  }

  env.values?.set(index, result)
  return result
}

export function evaluateNodes(nodes: EngineDataNode[], indexes: number[], env: NodeEnvironment = {}): number[] {
  return indexes.map((index) => evaluateNode(nodes, index, env))
}
