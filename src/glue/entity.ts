import {EngineImpl} from "glue/engine"
import {EntityGraphicsFieldType} from "graphics/graphics_engine"
import {EntityPhysFieldType} from "physics/physics_engine"
import {EntityClassBase, XY, Engine, Entity, EntityClass} from "types"

const entityStaticMethods = {
	spawn<I, E extends Entity<I>>(this: EntityClass<I, E>, coords: XY, rotation: number): E {
		const entity = new this()
		entity.move(coords, rotation)
		entity.add()
		return entity
	}
}

export const addStaticMethodsToEntityClass = <I, E extends Entity<I>>(cls: EntityClassBase<I, E>, index: number): EntityClass<I, E> => {
	const result = cls as any
	for(const methodName in entityStaticMethods){
		result[methodName] = (entityStaticMethods as any)[methodName]
	}
	result.index = index
	// when this function is called engine is not created yet
	// but we still should create field, hoping that will help with optimization
	// wonder if I can make it throw nicely in case of non-initialized engine instead of "that's null, oof"
	result.engine = null
	return result
}

export const addEngineToEntityClass = <I, E extends Entity<I>>(cls: EntityClass<I, E>, engine: EngineImpl): void => {
	(cls as unknown as InternalEntityClass).engine = engine
}

interface InternalEntityClass extends EntityClass {
	engine: EngineImpl
	index: number
}

export class EntityImpl implements Entity<number> {
	x = 0
	y = 0
	rotation = 0

	// those two fields are how we track which entities' data needs to be uploaded into GPU memory
	// the values are arbitrary; each time any value related to graphics is changed - currentGraphicVersion should be incremented
	// the upload happens once a frame at most, and that's when lastUploadedGraphicVersion is updated
	// this allows us to only upload data of visible entities, not every single one of them
	lastUploadedGraphicVersion = 0
	currentGraphicVersion = 0

	// fields controlled by other parts of the engine
	phys: EntityPhysFieldType = null
	graphics: EntityGraphicsFieldType = null

	get engine(): Engine {
		return (this.constructor as EntityClass).engine
	}

	get index(): number {
		return (this.constructor as EntityClass).index
	}

	private get engineImpl(): EngineImpl {
		return (this.constructor as InternalEntityClass).engine
	}

	add(): void {
		this.engineImpl.physics.addEntity(this)
		this.engineImpl.graphics.addEntity(this)
	}

	remove(): void {
		this.engineImpl.physics.removeEntity(this)
		this.engineImpl.graphics.removeEntity(this)
	}

	move(coords: XY, rotation: number): void {
		this.engineImpl.physics.moveEntity(this, coords, rotation)
	}

	applyForce(xForce: number, yForce: number, xOffset = 0, yOffset = 0): void {
		this.engineImpl.physics.applyForceToEntity(this, xForce, yForce, xOffset, yOffset)
	}

	handleCollision(otherEntity: Entity<unknown>): void {
		// nothing by default
		void otherEntity
	}
}