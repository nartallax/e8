import {Content, ParticleDefinition} from "content/content"
import {Event, EventImpl} from "common/event"
import {Perf} from "common/perfometer"
import {Camera, CameraImpl} from "graphics/camera"
import {GraphicEngine} from "graphics/graphics_engine"
import {PhysicsEngine} from "physics/physics_engine"
import {XY} from "common_types"
import {UserInputController} from "user_input/user_input_controller"
import {InputBindActions} from "user_input/keys/user_key_input_controller"
import {CursorMoveInputEvent} from "user_input/cursor/user_cursor_input_controller"
import * as Matter from "libs/matterjs/matter"

const defaultFrameSkipTime = 0.25

// TODO: think of ways to do this better
// it's not wrong to have multiple engine instances in runtime for whatever reason
// but each content pack set should see their own engine
export let engine: EngineImpl = null as any

export type Engine = {
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

export type EngineOptions = {
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

export class EngineImpl implements Engine {

	private readonly frameSkipCutoff: number
	readonly timePerTick: number
	readonly onTick = new EventImpl<[deltaTime: number]>()
	timePassed = 0
	lastTickTime = 0
	private lastKnownFrameTime = 0
	private tickBudget = 0
	private debugStatsDumpBudget = 0
	readonly physics: PhysicsEngine
	readonly graphics: GraphicEngine
	readonly input: UserInputController
	readonly camera: CameraImpl

	constructor(private readonly options: EngineOptions) {
		if(engine){
			throw new Error("Engine is already created! Can't create another one.")
		}
		this.frameSkipCutoff = options.frameSkipCutoff ?? defaultFrameSkipTime
		this.timePerTick = 1 / options.tickRate
		this.physics = new PhysicsEngine(options.physics ?? {})
		this.graphics = new GraphicEngine(options.content, options.container, this)
		this.camera = this.graphics.camera
		this.input = new UserInputController(this, options.content)
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		engine = this
	}

	async init(): Promise<void> {
		await this.graphics.init()
	}

	private requestedFrame: ReturnType<typeof requestAnimationFrame> | null = null
	private boundAnimationFrame = this.onAnimationFrame.bind(this)
	private onAnimationFrame(timeNow: number): void {
		this.requestedFrame = requestAnimationFrame(this.boundAnimationFrame)
		timeNow /= 1000 // I prefer to have everything in seconds

		const deltaTime = timeNow - this.lastKnownFrameTime

		this.debugStatsDumpBudget += deltaTime
		if(this.options.debugStatsDumpRate && 1 / this.debugStatsDumpBudget <= this.options.debugStatsDumpRate){
			Perf.dump(Perf.getCount("draw"), Perf.getCount("physTick"))
			Perf.reset()
			this.debugStatsDumpBudget = 0
		}

		this.lastKnownFrameTime = timeNow
		if(deltaTime > this.frameSkipCutoff){
			Perf.inc("frameskip")
			// console.warn(`Frame skipped: ${deltaTime} seconds passed since last frame, and that's more than ${this.frameSkipCutoff} seconds cutoff.`)
			return
		}

		try {
			this.tickBudget += deltaTime

			Perf.start("input")
			this.input.onFrame()
			if(this.tickBudget > this.timePerTick){
				this.input.tick(deltaTime)
			}
			Perf.end()

			while(this.tickBudget > this.timePerTick){
				this.tickBudget -= this.timePerTick
				this.lastTickTime += this.timePerTick
				Perf.start("onTick")
				this.onTick.fire(this.timePerTick)
				Perf.endStart("physTick")
				this.physics.tick(this.timePerTick)
				Perf.end()
			}

			Perf.start("draw")
			this.graphics.onFrame(deltaTime, this.physics.tickCount)
			Perf.end()
		} catch(e){
			console.error(e)
			if(this.options.stopOnFirstFail && this.requestedFrame){
				this.stop()
			}
		}

		this.timePassed += deltaTime
	}

	start(): void {
		if(this.requestedFrame){
			throw new Error("The engine is already running, can't double-start it")
		}
		this.requestedFrame = requestAnimationFrame(this.boundAnimationFrame)
	}

	stop(): void {
		if(!this.requestedFrame){
			throw new Error("The engine is not started, can't stop it")
		}
		cancelAnimationFrame(this.requestedFrame)
	}

	getLastKnownCursorEvent(): CursorMoveInputEvent {
		return this.input.cursorController.onTickCursorChange.getLastKnownEvent()
	}

	emitParticles(particleDef: ParticleDefinition, position: XY, direction: number): void {
		// TODO: think about viewport clipping...? we don't need to emit particles that are far out of viewport
		// or too small because zoom is too low
		this.graphics.emitParticles(particleDef, position, direction)
	}

	setBindHandlers(actionHandlers: Record<string, InputBindActions>): void {
		this.input.keyController.setBindHandlers(actionHandlers)
	}

	setTickCursorHandler(handler: ((event: CursorMoveInputEvent) => void) | null): void {
		this.input.cursorController.setUserTickCursorHandler(handler)
	}

}