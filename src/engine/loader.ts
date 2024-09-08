import {mergeContentPacks} from "content/content_pack_merger"
import {readContentPackFromUrl} from "content/content_pack_reader"
import {Engine, EngineImpl, EngineOptions} from "engine/engine"

export const createEngineFromContentPackUrls = async(packUrls: string[], options: Omit<EngineOptions, "content">): Promise<Engine> => {
	const packs = await Promise.all(packUrls.map(url => readContentPackFromUrl(url)))
	const content = await mergeContentPacks(packs)
	const engine = new EngineImpl({...options, content})
	await engine.init()
	return engine
}