import {AtlasPart, Content, InputBindDefinition, ModelDefinition, ParticleDefinition} from "content/content"
import {ContentPack} from "content/content_pack"
import {omit} from "common/omit"
import {contentPacksToAtlasses} from "content/atlas"

/** This operation resolves paths in content packs, combining them into one single piece of content */
export const mergeContentPacks = (packs: ContentPack[]): Content => {
	const [atlasses, textureToAtlasPartMap] = contentPacksToAtlasses(packs)
	const getCollisionGroupIndex = makeIndexResolver("collision group", packs.map(pack => pack.collisionGroups))

	return {
		inworldUnitPixelSize: getScale(packs),
		collisionGroupMasks: getCollisionGroupMasks(packs, getCollisionGroupIndex),
		layers: mergeMaps(packs.map(pack => pack.layers)),
		inputBinds: getInputBinds(packs),
		particles: getParticles(packs, textureToAtlasPartMap),
		models: getModels(packs, textureToAtlasPartMap, getCollisionGroupIndex),
		atlasses
	}
}

const mergeMaps = <K, V>(maps: Map<K, V>[]): Map<K, V> => maps.length === 1
	? maps[0]!
	: new Map(maps.map(x => [...x.entries()]).flat())

const makeResolver = <T>(name: string, maps: Map<string, T>[]): (key: string) => T => {
	const map = mergeMaps(maps)
	return key => {
		const value = map.get(key)
		if(value === undefined){
			throw new Error(`Something is referring to ${name} ${key}, but it is not defined anywhere.`)
		}
		return value
	}
}

const makeIndexResolver = <T>(name: string, maps: Map<string, T>[]): (key: string) => number => {
	// this could be more optimal, but whatever
	const allValuesMap = mergeMaps(maps)
	const allValues = [...allValuesMap.keys()]
	const indexMap = new Map(allValues.map((groupPath, index) => [groupPath, index]))
	return makeResolver(name, [indexMap])
}

const getInputBinds = (packs: ContentPack[]): Map<string, InputBindDefinition> => {
	const getInputGroupIndex = makeIndexResolver("input group", packs.map(pack => pack.inputGroups))
	const result: [string, InputBindDefinition][] = []
	for(const pack of packs){
		for(const [path, inputBind] of pack.inputBinds){
			const groupIndex = !inputBind.groupPath ? null : getInputGroupIndex(inputBind.groupPath)
			result.push([path, {...omit(inputBind, "groupPath"), groupIndex}])
		}
	}
	return new Map(result)
}

const getParticles = (packs: ContentPack[], textures: Map<string, AtlasPart>): Map<string, ParticleDefinition> => {
	const getLayerIndex = makeIndexResolver("layer", packs.map(pack => pack.layers))
	const getAtlasPart = makeResolver("texture", [textures])
	return new Map(packs.map(pack => [...pack.particles.entries()])
		.flat()
		.map(([path, rawParticle]) => [
			path,
			{
				...omit(rawParticle, "graphics"),
				graphics: {
					layerIndex: getLayerIndex(rawParticle.graphics.layerPath),
					...getAtlasPart(rawParticle.graphics.texturePath)
				}
			}
		]))
}

const getModels = (packs: ContentPack[], textures: Map<string, AtlasPart>, getCollisionGroupIndex: (path: string) => number): Map<string, ModelDefinition> => {
	const getLayerIndex = makeIndexResolver("layer", packs.map(pack => pack.layers))
	const getAtlasPart = makeResolver("texture", [textures])
	return new Map(packs.map(pack => [...pack.models.entries()])
		.flat()
		.map(([path, rawModel]) => [
			path,
			{
				...omit(rawModel, "graphics", "physics"),
				graphics: !rawModel.graphics ? null : {
					layerIndex: getLayerIndex(rawModel.graphics.layerPath),
					...getAtlasPart(rawModel.graphics.texturePath)
				},
				physics: !rawModel.physics ? null : {
					...omit(rawModel.physics, "collisionGroupPath"),
					collisionGroup: getCollisionGroupIndex(rawModel.physics.collisionGroupPath)
				}
			}
		]))
}

const getCollisionGroupMasks = (packs: ContentPack[], getCollisionGroupIndex: (path: string) => number): number[] => {
	const collisionGroupsMap = mergeMaps(packs.map(pack => pack.collisionGroups))
	const masks = new Array<number>().fill(0)
	for(const [aPath, aGroup] of collisionGroupsMap){
		const a = getCollisionGroupIndex(aPath)
		for(const bPath of aGroup.collidesWithGroupPaths){
			const b = getCollisionGroupIndex(bPath)
			masks[a] |= 1 << b
			masks[b] |= 1 << a
		}
	}
	return masks
}

const getScale = (packs: ContentPack[]): number => {
	const packsWithScale = packs.filter(pack => typeof(pack.description.scale) === "number")
	const scales = new Set(packsWithScale.map(pack => pack.description.scale))
	if(scales.size > 1){
		throw new Error("Several packs are trying to define scale, and there's several values of it. This must be resolved, engine expects exactly one value of scale. Packs that define scale are: " + packsWithScale.map(x => x.description.identifier).join(", "))
	}
	const scale = [...scales][0]
	if(scale === undefined){
		throw new Error("No content pack defines scale.")
	}
	return scale
}