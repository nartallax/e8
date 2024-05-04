import {EntityImpl} from "glue/entity"
import * as Matter from "libs/matterjs/matter"
import {ResourcePack} from "resource_pack/resource_pack"
import {XY} from "types"

// just need some identifier to add as plugin key
const mjsPluginName = Symbol("nartallax-plugin-id")

// type of .phys field on Entity. just to keep everything in one place
export type EntityPhysFieldType = Matter.Body | null

// matterjs doesn't work too good with small numbers
// if average body size is around 1, weird effects start to happen
// bodies getting stuck into each other etc
// so in engine everything is this times bigger
const engineCoordsMult = 100

export class PhysicsEngine {
	private readonly mjs: Matter.Engine
	// this is crude and inefficient optimization, but I feel that I need to do it
	// also, if we ever will have a lot of non-moving objects -
	// we'll need to add optimization layer over matterjs
	// it can be done with rtree, see shuttle project
	private readonly movingEntities = new Set<EntityImpl>()
	private readonly addToMovingEntitiesEventHandler = (e: Matter.IEvent<Matter.Body>) =>
		this.movingEntities.add(getBodyEntity(e.source))
	private readonly removeFromMovingEntitiesEventHandler = (e: Matter.IEvent<Matter.Body>) =>
		this.movingEntities.delete(getBodyEntity(e.source))
	tickCount = 0
	private readonly collisionGroupMasks: readonly number[]
	private readonly modelShapes: readonly (Matter.Vector[][] | null)[]
	private readonly shapeLowerBounds: readonly XY[]

	constructor(private readonly rp: ResourcePack, opts: Matter.IEngineDefinition) {
		this.mjs = Matter.Engine.create({
			...opts,
			enableSleeping: true // we are using sleeping; everything will break if it is disabled
		})
		Matter.Events.on(this.mjs, "collisionActive", this.processCollisionEvent.bind(this))

		const masks = this.collisionGroupMasks = new Array<number>().fill(0)
		for(const [a, b] of rp.collisionGroupPairs){
			masks[a] |= 1 << b
			masks[b] |= 1 << a
		}

		const modelVertices = this.modelShapes = new Array<Matter.Vector[][] | null>(rp.models.length)
		const shapeLowerBounds = this.shapeLowerBounds = new Array<XY>(rp.models.length)
		let i = -1
		for(const model of rp.models){
			++i
			const shapes = model.physics.shapes
			if(shapes.length === 0){
				modelVertices[i] = null
				shapeLowerBounds[i] = {x: 0, y: 0}
				continue
			}

			const vectors = shapes.map(shape =>
				shape.map(([x, y]) =>
					({x: x * engineCoordsMult, y: y * engineCoordsMult})
				)
			)
			modelVertices[i] = vectors

			const minX = shapes.flat().reduce((acc, xy) => Math.min(acc, xy[0]), Number.MAX_SAFE_INTEGER)
			const minY = shapes.flat().reduce((acc, xy) => Math.min(acc, xy[1]), Number.MAX_SAFE_INTEGER)
			shapeLowerBounds[i] = {x: minX * engineCoordsMult, y: minY * engineCoordsMult}
		}
	}

	private processCollisionEvent(e: Matter.IEventCollision<Matter.Engine>): void {
		for(const pair of e.pairs){
			const a: EntityImpl = getBodyEntity(pair.bodyA)
			const b: EntityImpl = getBodyEntity(pair.bodyB)
			a.handleCollision(b)
			b.handleCollision(a)
		}
	}

	addEntity(entity: EntityImpl): void {
		if(entity.phys){
			throw new Error("Assertion failed, entity has body")
		}

		const shapes = this.modelShapes[entity.index]!
		if(shapes === null){
			entity.phys = null
			return
		}
		const bodyDef = this.rp.models[entity.index]!.physics

		const body = Matter.Bodies.fromVertices(entity.x * engineCoordsMult, entity.y * engineCoordsMult, shapes, {
			isStatic: bodyDef.isStatic,
			collisionFilter: {
				group: 0,
				category: 1 << bodyDef.collisionGroup,
				mask: this.collisionGroupMasks[bodyDef.collisionGroup]
			},
			angle: entity.rotation,
			isSleeping: true
		}, false)

		if(shapes.length > 1){
			// we do all this because after creation matter.js sets object's center to "average" (?) of its components
			// (so, if there's only one component - it won't happen)
			// but we assume that its center is in geometrical center of the texture (and not in coords we passed as body's coords)
			// so, we change body's center to be in geometrical center
			// (and then we are moving the body back where it belongs)
			// I probably could go in different direction about that and just shift visuals...?
			// if there will be some weird physics bugs - I should try that
			const lowerBounds = this.shapeLowerBounds[entity.index]!
			const diffX = body.bounds.min.x - lowerBounds.x
			const diffY = body.bounds.min.y - lowerBounds.y
			Matter.Body.setCentre(body, Matter.Vector.create(diffX, diffY))
			Matter.Body.setPosition(body, Matter.Vector.create(entity.x * engineCoordsMult, entity.y * engineCoordsMult))
		}

		body.plugin[mjsPluginName] = entity
		entity.phys = body
		Matter.Composite.add(this.mjs.world, body)
		Matter.Events.on(body, "sleepStart", this.removeFromMovingEntitiesEventHandler)
		Matter.Events.on(body, "sleepEnd", this.addToMovingEntitiesEventHandler)
	}

	removeEntity(entity: EntityImpl): void {
		const body = entity.phys
		if(!body){
			// no assertion here. entity can have no body if there's no shape
			return
		}
		entity.phys = null


		this.movingEntities.delete(entity)
		Matter.Composite.remove(this.mjs.world, body)
	}

	tick(deltaTime: number): void {
		Matter.Engine.update(this.mjs, deltaTime * 1000)

		for(const entity of this.movingEntities){
			const body = entity.phys as Matter.Body
			const pos = body.position
			entity.x = pos.x / engineCoordsMult
			entity.y = pos.y / engineCoordsMult
			entity.rotation = body.angle
			entity.currentGraphicVersion++
		}

		this.tickCount++
	}

	moveEntity(entity: EntityImpl, coords: XY, rotation: number): void {
		entity.x = coords.x
		entity.y = coords.y
		entity.rotation = rotation

		if(entity.phys){
			Matter.Body.setPosition(entity.phys, Matter.Vector.create(coords.x * engineCoordsMult, coords.y * engineCoordsMult))
			Matter.Body.setAngle(entity.phys, rotation)
		}

		entity.currentGraphicVersion++
	}

	applyForceToEntity(entity: EntityImpl, xForce: number, yForce: number, entityOffsetX: number, entityOffsetY: number): void {
		const body = entity.phys
		if(!body){
			return
		}

		let offsetX = 0
		let offsetY = 0

		if(entityOffsetX !== 0 || entityOffsetY !== 0){
			// TODO: this can be optimized by precalculating those points
			// maybe add this option to asset manager...?
			const dist = Math.sqrt(entityOffsetX ** 2 + entityOffsetY ** 2)
			const angle = body.angle + Math.atan2(entityOffsetY, entityOffsetX)
			offsetX = Math.cos(angle) * dist * engineCoordsMult
			offsetY = Math.sin(angle) * dist * engineCoordsMult
		}

		Matter.Body.applyForce(body,
			Matter.Vector.create(body.position.x + offsetX, body.position.y + offsetY),
			Matter.Vector.create(xForce, yForce)
		)
	}
}

function getBodyEntity(body: Matter.Body): EntityImpl {
	while(true){
		const entity: EntityImpl = body.plugin[mjsPluginName]
		if(entity){
			return entity
		}
		if(!body.parent){
			throw new Error("A body is supposed to have an entity attached; can't find it.")
		}
		body = body.parent
	}
}