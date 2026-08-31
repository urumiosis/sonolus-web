import type { SkinData, SkinDataSprite } from './skin'
import type { SpriteRect } from './webgl'

/** Resolves engine sprite IDs/names into actual rectangles in a Sonolus skin texture. */
export class SkinAtlas {
  private readonly byName = new Map<string, SkinDataSprite>()

  constructor(readonly data: SkinData) {
    for (const sprite of data.sprites) this.byName.set(sprite.name, sprite)
  }

  get(name: string): SkinDataSprite | undefined {
    return this.byName.get(name)
  }

  rect(name: string): SpriteRect {
    const sprite = this.byName.get(name)
    if (!sprite) throw new Error(`Skin sprite not found: ${name}`)
    return { x: sprite.x, y: sprite.y, w: sprite.w, h: sprite.h }
  }

  has(name: string): boolean {
    return this.byName.has(name)
  }
}
