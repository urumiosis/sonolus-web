import type { EnginePlayData } from '@sonolus/core'
import { ResourceLoader, type SonolusResource } from './resources'
import { SonolusServerClient } from './server'
import { SonolusPlayRuntime, type EntityState } from './engine'

export type LevelEntityData = {
  name: string
  value?: number
  ref?: string
}

export type LevelData = {
  bgmOffset: number
  entities: Array<{
    name?: string
    archetype: string
    data: LevelEntityData[]
  }>
}

export type LoadedPlay = {
  level: LevelData
  playData: EnginePlayData
  runtime: SonolusPlayRuntime
  entities: EntityState[]
}

type Srl = SonolusResource & { url: string }

type LevelItem = {
  engine: { name: string; playData: Srl }
  data: Srl
}

/** Loads the two JSON resources needed to begin a Sonolus play session. */
export async function loadPlay(server: SonolusServerClient, levelName: string): Promise<LoadedPlay> {
  const item = await server.item('levels', levelName) as LevelItem
  if (!item?.data?.url) throw new Error('Level item does not contain a data SRL')
  if (!item?.engine?.playData?.url) throw new Error('Level item does not contain engine playData SRL')

  const loader = new ResourceLoader(server.baseUrl)
  const [level, playData] = await Promise.all([
    loader.json<LevelData>(item.data),
    loader.json<EnginePlayData>(item.engine.playData),
  ])

  const runtime = new SonolusPlayRuntime(playData)
  const entities = level.entities.map((source) => {
    const data = source.data.map((entry) => entry.value ?? 0)
    return runtime.spawn(source.archetype, data)
  })

  return { level, playData, runtime, entities }
}
