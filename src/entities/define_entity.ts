import {markValue} from "common/marker/marker"
import {Entity} from "entities/entity"

type EntityClassBase<T extends Entity = Entity> = {
	new(): T
}

export type EntityClass<T extends Entity = Entity> = EntityClassBase<T> & {
	spawn(): T
	spawnAt(x: number, y: number, rotation?: number): T
}

let entityCollectionArray: EntityClass[] | null = null
export const collectEntitiesDuringDefining = async <T>(runner: () => Promise<T>): Promise<[T, EntityClass[]]> => {
	if(entityCollectionArray){
		throw new Error("Another entity collection is already going on!")
	}
	const arr = entityCollectionArray = [] as EntityClass[]
	try {
		const result = await runner()
		return [result, arr]
	} finally {
		entityCollectionArray = null
	}
}

export function defineEntity<T extends Entity>(cls: EntityClassBase<T>): EntityClass<T> {
	const result = cls as EntityClass<T>

	result.spawn = function() {
		const entity = new this()
		entity.add()
		return entity
	}

	result.spawnAt = function(x, y, rotation) {
		const entity = new this()
		entity.add()
		entity.move({x, y}, rotation ?? 0)
		return entity
	}

	markValue(result)

	if(entityCollectionArray){
		entityCollectionArray.push(result)
	}

	return result
}