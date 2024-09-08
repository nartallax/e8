import {markValue} from "common/marker/marker"
import {Entity, EntityImpl} from "entities/entity"
import {Cls, Mixin, MixinArray, MixinArrayMixingResult} from "mixins/mixin"

export type EntityClass<T extends Entity = Entity> = Cls<T> & {
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

export function makeEntityBase<T extends object[]>(...mixins: MixinArray<T>): Cls<MixinArrayMixingResult<T> & Entity> {
	return Mixin.mix(EntityImpl, mixins)
}

export function defineEntity<T extends EntityImpl>(cls: Cls<T>): EntityClass<T> {
	const result = cls as EntityClass<T>

	if(!(cls.prototype instanceof EntityImpl)){
		throw new Error("Value passed to defineEntity() does not extend base entity class. Extend class returned by makeEntityBase function.")
	}

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