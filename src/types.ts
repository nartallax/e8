// that's for Parcel. apparently he's not smart enough to detect them automatically. (why?)
/// <reference types="./common/modules" />

import * as Matter from "libs/matterjs/matter"
import {Entity} from "entities/entity"
import {Content, ParticleDefinition} from "content/content"

export interface EngineOptions {
	readonly content: Content
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

export interface Engine {
	readonly camera: Camera
	/** Amount of time passed while engine was running, in seconds. */
	readonly timePassed: number
	setBindHandlers(actionHandlers: Record<string, InputBindActions>): void
	setTickCursorHandler(handler: ((event: CursorMoveInputEvent) => void) | null): void
	getLastKnownCursorEvent(): CursorMoveInputEvent
	/** Event "ingame tick is about to be processed" */
	readonly onTick: Event<[deltaTime: number]>
	/** Start the engine.
	 * The ticks will start ticking, frames start drawing etc. */
	start(): void
	/** Stop the engine.
	 * You can resume engine later from the point you stopped it on */
	stop(): void
	emitParticles(particleDef: ParticleDefinition, position: XY, direction: number): void
}

export interface CursorMoveInputEvent {
	/** Coords of mouse cursor in inworld units */
	readonly inworldCoords: XY
}

export interface XY {
	readonly x: number
	readonly y: number
}

export type InputBindActions = InputBindActionsObj | InputBindActionFn
export type InputBindActionFn = ((deltaTime: number, meta: {binds: Set<string>, count: number}) => void)
export interface InputBindActionsObj {
	onDown?: InputBindActionFn
	onHold?: InputBindActionFn
	onUp?: InputBindActionFn
}

export interface Event<A extends unknown[]>{
	sub(handler: (...args: A) => void): void
	unsub(handler: (...args: A) => void): void
	fire(...args: A): void
}

export interface Camera {
	readonly x: number
	readonly y: number
	/** Number of pixels single ingame unit occupies on screen */
	readonly zoom: number
	/** How much zoom changes. Logarithmic value, base 2. */
	readonly zoomStepSize: number
	readonly followTarget: Entity | null
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
	setFollowTarget(target: Entity | null): void
	screenCoordsToInworldCoords(xy: XY): XY
	/** How much ingame units should camera be shifted by when cursor is shifted by one unit from the center of screen
	 * Default is zero */
	setCursorPanMultiplier(multiplier: number): void
}