import {checkValueHasNoWrongMark} from "common/marker/marker"
import {setClassName} from "common/set_class_name"
import {ModuleRunner} from "content/module_runner"
import {ContentPack} from "e8"
import {EntityClass, collectEntitiesDuringDefining, defineEntity} from "entities/define_entity"
// import semverSatisfies from "semver/functions/satisfies"
// TODO: only import semverSatisfies, as in the line above
// right now this import is somehow broken
import * as Semver from "semver"

export const runCodeOfContentPacks = async(packs: ContentPack[]): Promise<Map<string, EntityClass>[]> => {
	checkDependenciesSatisfied(packs)
	packs = orderPacksByDependencyGraph(packs)

	const runner = new ModuleRunner()
	const result: Map<string, EntityClass>[] = []
	for(const pack of packs){
		result.push(await runContentPackJs(runner, pack))
	}
	return result
}

const orderPacksByDependencyGraph = (packs: ContentPack[]): ContentPack[] => {
	const packsByName = new Map(packs.map(pack => [pack.description.identifier, pack]))
	const knownPackDepths = new Map<ContentPack, number>()
	const currentPacksSet = new Set<ContentPack>()
	const currentPacksQueue: ContentPack[] = []

	const calcMaxDepthOfPacks = (packNames: string[]): number => {
		let maxDepth = 0
		for(const packName of packNames){
			const pack = packsByName.get(packName)
			if(!pack){
				continue
			}
			maxDepth = Math.max(maxDepth, calcDepthForPack(pack))
		}
		return maxDepth
	}

	const onPackEnter = (pack: ContentPack) => {
		if(currentPacksSet.has(pack)){
			let packsInCircle = [pack]
			for(let i = currentPacksQueue.length - 1; i >= 0; i--){
				const packInCircle = currentPacksQueue[i]!
				packsInCircle.push(packInCircle)
				if(packInCircle === pack){
					break
				}
			}
			packsInCircle = packsInCircle.reverse()

			let message = packsInCircle.map(pack => pack.description.identifier).join(" -> ")
			message = `There is a circle in content pack dependencies:\n\t${message}\nThere is no correct run order for this situation. Change dependencies of any content pack in this circle to resolve this.`
			throw new Error(message)
		}

		currentPacksSet.add(pack)
		currentPacksQueue.push(pack)
	}

	const onPackExit = (pack: ContentPack) => {
		currentPacksSet.delete(pack)
		currentPacksQueue.pop()
	}

	const calcDepthForPack = (pack: ContentPack): number => {
		const knownDepth = knownPackDepths.get(pack)
		if(knownDepth !== undefined){
			return knownDepth
		}

		onPackEnter(pack)

		const allDepNames = [
			...Object.keys(pack.description.dependencies),
			...Object.keys(pack.description.optionalDependencies)
		]
		const result = calcMaxDepthOfPacks(allDepNames) + 1

		onPackExit(pack)

		return result
	}

	for(const pack of packs){
		calcDepthForPack(pack)
	}

	return packs.sort((a, b) => {
		const depthA = knownPackDepths.get(a)!
		const depthB = knownPackDepths.get(b)!
		return (depthA - depthB) || a.description.identifier > b.description.identifier ? 1 : -1
	})
}

const checkDependenciesSatisfied = (packs: ContentPack[]) => {
	const allKnownPackages = new Map(packs.map(pack => [pack.description.identifier, pack.description.version]))
	const unsatisfiedDependencies: {name: string, from: {name: string, expectedVersion: string}}[] = []
	for(const pack of packs){
		for(const [depName, depVersionExpr] of Object.entries(pack.description.dependencies ?? {})){
			const existingVersion = allKnownPackages.get(depName)
			if(!existingVersion || !Semver.satisfies(existingVersion, depVersionExpr)){
				unsatisfiedDependencies.push({name: depName, from: {name: pack.description.identifier, expectedVersion: depVersionExpr}})
			}
		}
	}

	if(unsatisfiedDependencies.length > 0){
		const errorStr = unsatisfiedDependencies.map(dep => `${dep.from.name} needs ${dep.name} of version ${dep.from.expectedVersion}, but we have ${allKnownPackages.get(dep.name) ?? "none"}`).join(";\n\t")
		throw new Error(`Some content pack are relying on unavailable content packs:\n\t${errorStr}.`)
	}
}

const runContentPackJs = async(runner: ModuleRunner, pack: ContentPack): Promise<Map<string, EntityClass>> => {
	const code = pack.js
	if(!code){
		return new Map()
	}

	const [exprt, definedEntities] = await runTheCode(runner, code, pack)
	const result = processCodeExports(exprt, pack)
	checkUnkownEntities([...result.values()], definedEntities, pack)
	return result
}

const runTheCode = async(runner: ModuleRunner, code: string, pack: ContentPack): Promise<[object, EntityClass[]]> => {
	const jsModuleName = `e8:${pack.description.identifier}`
	const [exprt, definedEntities] = await collectEntitiesDuringDefining(async() => {
		await runner.runModule(jsModuleName, code)
	})

	if(typeof(exprt) !== "object" || !exprt){
		throw new Error(`Exports of a module must be an object; content pack ${pack.description.identifier} violates that rule - it's ${typeof(exprt)}.`)
	}
	return [exprt, definedEntities]
}

const processCodeExports = (exprt: object, pack: ContentPack): Map<string, EntityClass> => {
	const result: Map<string, EntityClass> = new Map()
	for(const [key, value] of Object.entries(exprt)){
		checkValueHasNoWrongMark("exported value", key, value)
		if(typeof(value) === "function" && value.prototype instanceof defineEntity){
			const entityName = `${pack.description.identifier}:${key}`
			setClassName(value, entityName)
			result.set(entityName, value as EntityClass)
		}
	}
	return result
}

const checkUnkownEntities = (knownEntities: EntityClass[], definedEntities: EntityClass[], pack: ContentPack) => {
	const exportedEntities = new Set(knownEntities)
	let unknownEntitiesCount = 0
	for(const definedEntity of definedEntities){
		if(!exportedEntities.has(definedEntity)){
			unknownEntitiesCount++
		}
	}
	if(unknownEntitiesCount > 0){
		throw new Error(`Content pack ${pack.description.identifier} defines ${unknownEntitiesCount} entities that it does not export. Every defined entity must be exported.`)
	}
}