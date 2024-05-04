// that's for Parcel. apparently he's not smart enough to detect them automatically. (why?)
/// <reference types="./common/modules" />

import {ResourcePack} from "resource_pack/resource_pack"
import * as Matter from "libs/matterjs/matter"

export interface EngineOptions {
	readonly resourcePack: ResourcePack
	/** Canvas will be created inside this element */
	readonly container: HTMLElement
	/** Amount of ticks per second this engine will aim for.
	 * This is not FPS, as ticks are not strictly connected to frames. */
	readonly tickRate: number
	/** If enabled, engine will stop after first error thrown in the game loop.
	 * Mostly meant for development, no reason to enable this in release.
	 * Also, engine expects that main loop will never throw;
	 * i.e. throw in the main loop = inconsistent state, game broken */
	readonly stopOnFirstFail?: boolean
	/** Number of seconds. If time between previous and current frame is bigger than this - current frame is skipped. Has a default value.
	 * This could help detect and mitigate overloads */
	readonly frameSkipCutoff?: number
	readonly physics?: Matter.IEngineDefinition
	/** How much times, per seconds, debug stats should be dumped into console */
	readonly debugStatsDumpRate?: number
}

export interface BindSetMapBase {
	readonly [bindSetIndex: number]: number
}

export interface Engine<EntityIndex = number, BindSetMap extends BindSetMapBase = BindSetMapBase, ParticleIndex = number> {
	readonly camera: Camera<EntityIndex, Entity<EntityIndex>>
	/** Amount of time passed while engine was running, in seconds. */
	readonly timePassed: number
	/** Having index of a bind set, get an object to control actions on that bind set */
	getInputBindSet<const BindSetIndex extends keyof BindSetMap & number>(index: BindSetIndex): InputBindSet<BindSetMap[BindSetIndex]>
	getLastKnownCursorEvent(): CursorMoveInputEvent
	/** Event "ingame tick is about to be processed" */
	readonly onTick: Event<[deltaTime: number]>
	/** Start the engine.
	 * The ticks will start ticking, frames start drawing etc. */
	start(): void
	/** Stop the engine.
	 * You can resume engine later from the point you stopped it on */
	stop(): void
	emitParticles(particleDefIndex: ParticleIndex, position: XY, direction: number): void
}
export type IndexTypeOfEngine<E> = E extends Engine<infer I> ? I : never

/** A class that can create engines.
 * Contains various functions that help with setup of the engine */
export interface EngineLoader<E extends Engine> {
	/** Create a new instance of the engine. */
	createEngine(options: EngineOptions): Promise<E>
	/** Load resource pack from URL or byte array */
	getResourcePack(urlOrData: string | Uint8Array): Promise<ResourcePack>
	/** Register some class as entity class
	 * If you don't need to add any logic to entity - you may omit class, empty class will be created for you */
	registerEntity<I extends IndexTypeOfEngine<E>, T extends Entity<I>>(entity: I, cls?: EntityClassBase<I, T>): EntityClass<I, T>
}

/** A set of user input bindings. Can be toggled all at once.
 * Works as a helper for user input handling */
export interface InputBindSet<Binds extends number> {
	readonly isActive: boolean
	setBindHandlers(actionHandlers: {[bindIndex in Binds]: InputBindActions<Binds>}): void
	setTickCursorHandler(handler: ((event: CursorMoveInputEvent) => void) | null): void
	// other cursor pan settings are in the camera
	setCursorPan(isEnabled: boolean): void
	activate(): void
	deactivate(): void
}

export interface CursorMoveInputEvent {
	/** Coords of mouse cursor in inworld units */
	readonly inworldCoords: XY
}

export interface XY {
	readonly x: number
	readonly y: number
}

export type InputBindActions<Binds extends number> = InputBindActionsObj<Binds> | InputBindActionFn<Binds>
export type InputBindActionFn<Binds extends number> = ((deltaTime: number, meta: {binds: Set<Binds>, count: number}) => void)
export interface InputBindActionsObj<Binds extends number> {
	onDown?: InputBindActionFn<Binds>
	onHold?: InputBindActionFn<Binds>
	onUp?: InputBindActionFn<Binds>
}

/** Some object in world. */
export interface Entity<Index = number> {
	readonly x: number
	readonly y: number
	readonly rotation: number
	readonly index: Index

	/** Add the entity into the world. */
	add(): void
	/** Remove the entity from the world. */
	remove(): void
	/** Move the entity to specified inworld coords, and rotate accordingly.
	 * Keep in mind that most of the time you should rely on physics engine to determine positions of entites, otherwise it may bug in funny ways */
	move(coords: XY, rotation: number): void
	// TODO: rewrite it for angle maybe?
	applyForce(xForce: number, yForce: number, xOffset?: number, yOffset?: number): void
	/** Called when this entity collides with another entity.
	 * This event will be called two times for each collision on different entities */
	handleCollision(otherEntity: Entity<unknown>): void
}

export interface EntityClassBase<I = number, E extends Entity<I> = Entity<I>> {
	/** Create the entity (and do nothing else) */
	new(): E
}

export interface EntityClass<I = number, E extends Entity<I> = Entity<I>> extends EntityClassBase<I, E> {
	/** Create the entity in world at the specified location.
	 *
	 * Equivalent of .create() + .move() + .add() */
	spawn(coords: XY, rotation: number): E
	readonly engine: Engine<I>
	readonly index: number
}

export interface Event<A extends unknown[]>{
	sub(handler: (...args: A) => void): void
	unsub(handler: (...args: A) => void): void
	fire(...args: A): void
}

export interface Camera<EntityIndex, E extends Entity<EntityIndex>> {
	readonly x: number
	readonly y: number
	/** Number of pixels single ingame unit occupies on screen */
	readonly zoom: number
	/** How much zoom changes. Logarithmic value, base 2. */
	readonly zoomStepSize: number
	readonly followTarget: E | null
	readonly cursorPanMultiplier: number
	/** in seconds */
	readonly zoomAnimationDuration: number
	/** in seconds */
	readonly panAnimationDuration: number
	readonly offsetPanAnimationDuration: number
	readonly maxZoom: number
	readonly minZoom: number
	moveTo(xy: XY): void
	zoomTo(zoom: number): void
	stepZoom(steps: number): void
	skipAnimations(): void
	setZoomStepSize(value: number): void
	setZoomBounds(min: number, max: number): void
	setZoomAnimationDuration(durationSeconds: number): void
	setPanAnimationDuration(durationSeconds: number): void
	setCursorPanAnimationDuration(durationSeconds: number): void
	setFollowTarget(target: E | null): void
	screenCoordsToInworldCoords(xy: XY): XY
	/** How much ingame units should camera be shifted by when cursor is shifted by one unit from the center of screen
	 * Default is zero */
	setCursorPanMultiplier(multiplier: number): void
}