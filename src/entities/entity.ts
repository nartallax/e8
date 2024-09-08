import {ModelDefinition} from "content/content"
import {engine} from "engine/engine"
import {EntityGraphicsFieldType} from "graphics/graphics_engine"
import {EntityPhysFieldType} from "physics/physics_engine"
import {XY} from "common_types"

export type Entity = {
	readonly x: number
	readonly y: number
	readonly rotation: number
	readonly model: ModelDefinition | null
	add(): void
	remove(): void
	move(coords: XY, rotation: number): void
	// TODO: vectors here
	applyForce(xForce: number, yForce: number, xOffset?: number, yOffset?: number): void
	handleCollision(otherEntity: Entity): void
}

/** This is base entity class. Any entity defined by content pack must extend this class */
export class EntityImpl implements Entity {
	x = 0
	y = 0
	rotation = 0
	readonly model: ModelDefinition | null

	constructor() {
		this.model = this.getModel()
	}

	// those two fields are how we track which entities' data needs to be uploaded into GPU memory
	// the values are arbitrary; each time any value related to graphics is changed - currentGraphicVersion should be incremented
	// the upload happens once a frame at most, and that's when lastUploadedGraphicVersion is updated
	// this allows us to only upload data of visible entities, not every single one of them
	lastUploadedGraphicVersion = 0
	currentGraphicVersion = 0

	// fields controlled by other parts of the engine
	phys: EntityPhysFieldType = null
	graphics: EntityGraphicsFieldType = null

	/** This is only called on creation once */
	getModel(): ModelDefinition | null {
		// nothing by default
		return null
	}

	add(): void {
		engine.physics.addEntity(this)
		engine.graphics.addEntity(this)
	}

	remove(): void {
		engine.physics.removeEntity(this)
		engine.graphics.removeEntity(this)
	}

	move(coords: XY, rotation: number): void {
		engine.physics.moveEntity(this, coords, rotation)
	}

	applyForce(xForce: number, yForce: number, xOffset = 0, yOffset = 0): void {
		engine.physics.applyForceToEntity(this, xForce, yForce, xOffset, yOffset)
	}

	handleCollision(otherEntity: EntityImpl): void {
		// nothing by default
		void otherEntity
	}
}