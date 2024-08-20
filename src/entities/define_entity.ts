import {markValue} from "common/marker/marker"
import {Entity} from "entities/entity"

type EntityClassBase<T extends Entity> = {
	new(): T
}

export type EntityClass<T extends Entity> = EntityClassBase<T> & {
	spawn(): T
	spawnAt(x: number, y: number, rotation?: number): T
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

	return result
}