/** Browser-side floating-point Sonolus blocks. Blocks are the communication
 * mechanism between the engine node program and the host runtime. */
export const BlockId = {
  RuntimeUpdate: 1001,
  RuntimeTouchArray: 1002,
  LevelData: 2001,
  LevelOption: 2002,
  LevelBucket: 2003,
  LevelScore: 2004,
  LevelLife: 2005,
  EngineRom: 3000,
  EntityMemory: 4000,
  EntityData: 4001,
  EntitySharedMemory: 4002,
  EntityInfo: 4003,
  EntityDespawn: 4004,
  EntityInput: 4005,
  EntityScore: 4006,
  EntityLife: 4007,
  TemporaryMemory: 9000,
} as const

export class FloatBlock {
  private readonly values = new Float64Array(4096)

  get(index: number): number {
    return this.values[index | 0] ?? 0
  }

  set(index: number, value: number): number {
    this.values[index | 0] = value
    return value
  }

  add(index: number, value: number): number {
    return this.set(index, this.get(index) + value)
  }
}

export class SonolusBlocks {
  readonly blocks = new Map<number, FloatBlock>()

  getBlock(id: number): FloatBlock {
    let block = this.blocks.get(id)
    if (!block) {
      block = new FloatBlock()
      this.blocks.set(id, block)
    }
    return block
  }

  get(id: number, index: number): number {
    return this.getBlock(id).get(index)
  }

  set(id: number, index: number, value: number): number {
    return this.getBlock(id).set(index, value)
  }

  reset(): void {
    for (const block of this.blocks.values()) block.values.fill(0)
  }
}
