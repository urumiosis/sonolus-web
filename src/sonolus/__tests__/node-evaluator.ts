import { strict as assert } from 'node:assert'
import { evaluateNode, evaluateNodes } from '../node-evaluator'

const nodes = [
  { value: 2 },
  { value: 3 },
  { func: 'Add', args: [0, 1] },
  { func: 'Multiply', args: [2, 1] },
  { func: 'Greater', args: [3, 2] },
] as const

assert.equal(evaluateNode(nodes, 2), 5)
assert.equal(evaluateNode(nodes, 3), 15)
assert.equal(evaluateNode(nodes, 4), 1)
assert.deepEqual(evaluateNodes(nodes, [0, 2, 3]), [2, 5, 15])

console.log('node evaluator smoke test passed')
