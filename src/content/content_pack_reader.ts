import {ContentPack, ContentPackCollisionGroup, ContentPackDescription, ContentPackInputBind, ContentPackInputGroup, ContentPackLayer, ContentPackModel, ContentPackParticle, ContentPackTexture} from "content/content_pack"
import * as Unzipit from "unzipit"

// TODO: support png at least
export const supportedTextureExtensions = [".svg"] as const

export const contentPackFileExtensions = {
	model: ".e8.model.json",
	layer: ".e8.layer.json",
	collisionGroup: ".e8.collisionGroup.json",
	inputBind: ".e8.inputBind.json",
	inputGroup: ".e8.inputGroup.json",
	particle: ".e8.particle.json"
}

const allKnownExtensions = [...Object.values(contentPackFileExtensions), ...supportedTextureExtensions]

export const contentPackFixedPaths = {
	types: "types.d.ts",
	entrypoint: "index.js",
	description: "contentPack.json"
}

const allFixedPaths = new Set(Object.values(contentPackFixedPaths))

export const makeFullyQualifiedPath = (contentPackId: string, path: string) => {
	// normally, paths are supposed to look like "a/b/c", not "./a/b/c" or "/a/b/c", that's why this check exists
	// but it also will catch cases like .git accidently added to archive
	if(path.startsWith(".") || path.startsWith("/")){
		throw new Error("Path must not start with dot or slash, but this one does: " + path)
	}

	path = path.toLowerCase()
	for(const ext of allKnownExtensions){
		if(path.endsWith(ext)){
			path = path.substring(path.length - ext.length)
			break
		}
	}

	return `${contentPackId}:${path}`
}

const safeSetMap = <K, V>(itemName: string, map: Map<K, V>, k: K, v: V) => {
	if(map.has(k)){
		throw new Error(`Duplicate ${itemName} for key ${k}.`)
	}
	map.set(k, v)
}


export const readContentPackFromUrl = async(url: string): Promise<ContentPack> => {
	const collisionGroups = new Map<string, ContentPackCollisionGroup>()
	const layers = new Map<string, ContentPackLayer>()
	const textures = new Map<string, ContentPackTexture>()
	const models = new Map<string, ContentPackModel>()
	const inputBinds = new Map<string, ContentPackInputBind>()
	const inputGroups = new Map<string, ContentPackInputGroup>()
	const particles = new Map<string, ContentPackParticle>()

	const {entries: archiveFiles} = await Unzipit.unzip(url)
	// TODO: read all this fixed stuff in the same Promise.all as the rest
	const descriptionEntry = archiveFiles[contentPackFixedPaths.description]
	if(!descriptionEntry){
		throw new Error(`Zip file at ${url} is not a valid content pack: no description file at ${contentPackFixedPaths.description}`)
	}
	const description: ContentPackDescription = await descriptionEntry.json()

	let js: string | undefined = undefined
	const jsEntry = archiveFiles[contentPackFixedPaths.entrypoint]
	if(jsEntry){
		js = await jsEntry.text()
	}

	let types: string | undefined = undefined
	const typesEntry = archiveFiles[contentPackFixedPaths.types]
	if(!description.isStandalone && jsEntry){
		if(!typesEntry){
			throw new Error(`Zip file at ${url} is not a valid content pack: non-standalone content pack must provide type definitions in ${contentPackFixedPaths.description}`)
		}
		types = await typesEntry.text()
	} else {
		if(typesEntry){
			const reason = description.isStandalone ? "is standalone content pack" : "doesn't have entrypoint code"
			throw new Error(`Zip file at ${url} ${reason}, but provides type definitions.`)
		}
	}

	// TODO: use workers here...? will it actually be faster? need proper beefy content pack to test this
	await Promise.all(Object.entries(archiveFiles).map(async([path, entry]) => {
		if(allFixedPaths.has(path)){
			return
		}

		const lowercasePath = path.toLowerCase()
		const fqPath = makeFullyQualifiedPath(description.identifier, path)
		if(lowercasePath.endsWith(contentPackFileExtensions.model)){
			safeSetMap("model", models, fqPath, await entry.json())
			return
		}

		if(lowercasePath.endsWith(contentPackFileExtensions.layer)){
			safeSetMap("layer", layers, fqPath, await entry.json())
			return
		}

		if(lowercasePath.endsWith(contentPackFileExtensions.particle)){
			safeSetMap("particle", particles, fqPath, await entry.json())
			return
		}

		if(lowercasePath.endsWith(contentPackFileExtensions.inputGroup)){
			safeSetMap("input group", inputGroups, fqPath, await entry.json())
			return
		}

		if(lowercasePath.endsWith(contentPackFileExtensions.inputBind)){
			safeSetMap("input bind", inputBinds, fqPath, await entry.json())
			return
		}

		if(lowercasePath.endsWith(contentPackFileExtensions.collisionGroup)){
			safeSetMap("collision group", collisionGroups, fqPath, await entry.json())
			return
		}

		for(const ext of supportedTextureExtensions){
			if(lowercasePath.endsWith(ext)){
				safeSetMap("texture", textures, fqPath, {extension: ext, content: await entry.arrayBuffer()})
				return
			}
		}

		throw new Error(`Content pack at ${url} contains file of unknown type at ${path}`)
	}))

	return {
		description,
		js,
		types,
		models,
		collisionGroups,
		inputBinds,
		inputGroups,
		layers,
		textures,
		particles
	}
}