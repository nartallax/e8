import {AtlasPart, Content, InputBindDefinition, ModelDefinition, ParticleDefinition} from "content/content"
import {ContentPack, ContentPackModelPhysics} from "content/content_pack"
import {omit} from "common/omit"
import {contentPacksToAtlasses} from "content/atlas"
import {runCodeOfContentPacks} from "content/content_pack_code_runner"

/** This operation resolves paths in content packs, combining them into one single piece of content
Also runs JS code of the packs */
export const mergeContentPacks = async(packs: ContentPack[]): Promise<Content> => {
	const scale = getScale(packs)

	const [atlasses, textureToAtlasPartMap] = contentPacksToAtlasses(packs)
	const getCollisionGroupIndex = makeIndexResolver("collision group", packs.map(pack => pack.collisionGroups))

	const allLayersMap = mergeMaps(packs.map(pack => pack.layers))
	const namedOrderedLayers = [...allLayersMap.entries()].sort(([,a], [,b]) => a.drawPriority - b.drawPriority)

	const entities = mergeMaps(await runCodeOfContentPacks(packs))

	return {
		inworldUnitPixelSize: scale,
		layers: allLayersMap,
		orderedLayers: namedOrderedLayers,
		inputBinds: getInputBinds(packs),
		particles: getParticles(packs, textureToAtlasPartMap),
		models: getModels(packs, textureToAtlasPartMap, getCollisionGroupIndex, scale),
		atlasses,
		entities
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

const makeOrderedIndexResolver = (name: string, names: string[], maxIndex: number = Number.MAX_SAFE_INTEGER): (key: string) => number => {
	if(names.length > maxIndex){
		throw new Error(`Cannot have more than ${maxIndex} of ${name}, but have ${names.length}.`)
	}
	const indexMap = new Map(names.map((name, index) => [name, index]))
	return makeResolver(name, [indexMap])
}

const makeIndexResolver = <T>(name: string, maps: Map<string, T>[], maxIndex: number = Number.MAX_SAFE_INTEGER): (key: string) => number => {
	// this could be more optimal, but whatever
	const allValuesMap = mergeMaps(maps)
	const allValues = [...allValuesMap.keys()]
	return makeOrderedIndexResolver(name, allValues, maxIndex)
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
				graphics: !rawParticle.graphics ? null : {
					layerIndex: getLayerIndex(rawParticle.graphics.layerPath),
					...getAtlasPart(rawParticle.graphics.texturePath)
				}
			}
		]))
}

const getModels = (packs: ContentPack[], textures: Map<string, AtlasPart>, getCollisionGroupIndex: (path: string) => number, scale: number): Map<string, ModelDefinition> => {
	const collisionMasks = getCollisionGroupMasks(packs, getCollisionGroupIndex)
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
					...omit(rawModel.physics, "collisionGroupPath", "shapes"),
					collisionGroup: getCollisionGroupIndex(rawModel.physics.collisionGroupPath),
					collisionGroupMask: collisionMasks[getCollisionGroupIndex(rawModel.physics.collisionGroupPath)]!,
					...getShapesWithBounds(rawModel.physics, scale)
				}
			}
		]))
}

const getShapesWithBounds = (phys: ContentPackModelPhysics, scale: number) => {
	const shapes = phys.shapes
	if(shapes.length === 0){
		return {
			shapes: null,
			shapesLowerBounds: {x: 0, y: 0}
		}
	}

	const vectors = shapes.map(shape =>
		shape.map(({x, y}) =>
			({x: x * scale, y: y * scale})
		)
	)

	const minX = shapes.flat().reduce((acc, xy) => Math.min(acc, xy.x), Number.MAX_SAFE_INTEGER)
	const minY = shapes.flat().reduce((acc, xy) => Math.min(acc, xy.y), Number.MAX_SAFE_INTEGER)
	return {
		shapes: vectors,
		shapesLowerBounds: {x: minX * scale, y: minY * scale}
	}
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
