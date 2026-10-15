import type { EngineDataNode } from '@sonolus/core'
import { evaluateNode, evaluateNodes } from '../node-evaluator'

const nodes: EngineDataNode[] = [
  { value: 2 },
  { value: 3 },
  { func: 'Add', args: [0, 1] },
  { func: 'Multiply', args: [2, 1] },
  { func: 'Greater', args: [3, 2] },
]

function expect(actual: number, expected: number): void {
  if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}`)
}

expect(evaluateNode(nodes, 2), 5)
expect(evaluateNode(nodes, 3), 15)
expect(evaluateNode(nodes, 4), 1)
const values = evaluateNodes(nodes, [0, 2, 3])
if (values.join(',') !== '2,5,15') throw new Error(`Unexpected values: ${values.join(',')}`)

console.log('node evaluator smoke test passed')
