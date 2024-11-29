import {EngineImpl} from "engine/engine"
import {Event, EventImpl} from "common/event"
import {EntityImpl} from "entities/entity"
import {XY} from "common_types"
import {CursorMoveInputEvent} from "user_input/cursor/user_cursor_input_controller"



export type Camera = {
	getCenter(options?: GetCameraCenterOptions): XY
	moveTo(xy: XY): void

	/** Number of pixels single ingame unit occupies on screen */
	getZoom(): number
	setZoom(zoom: number): void
	stepZoom(steps: number): void

	/** Skip animations related to zoom or center change and immediately go to final state */
	skipAnimations(): void

	readonly settings: CameraSettings
	setSettings(newSettings: CameraSettings): void

	readonly followTarget: EntityImpl | null
	setFollowTarget(target: EntityImpl | null): void

	screenCoordsToInworldCoords(xy: XY): XY
	/** Called on frames which had some changes in camera zoom or position. */
	readonly onChange: Event
}

export type CameraSettings = {
	/** How much zoom changes per call of stepZoom(). Logarithmic value, base 2. */
	readonly zoomStepSize: number
	/** How much ingame units should camera be shifted by when cursor is shifted by one unit from the center of screen
	 * Default is zero */
	readonly cursorPanMultiplier: number
	/** in seconds */
	readonly zoomAnimationDuration: number
	/** Pan animation happens when there is a follow target or moveTo is called. Seconds. */
	readonly panAnimationDuration: number
	/** Offset animation happens when user moves mouse cursor and there's nonzero cursorPanMultiplier. Seconds. */
	readonly offsetPanAnimationDuration: number
	readonly maxZoom: number
	readonly minZoom: number
}

type GetCameraCenterOptions = {
	/** When false, result won't include offsets introduced by cursor movements. Default is true. */
	withCursorOffset?: boolean
	/** When true, result will return value camera is animating to, not current one. Default is false. */
	withAnimationSkip?: boolean
}

export class CameraImpl implements Camera {

	// that's for graphic engine to update uniforms only after change
	currentRevision = 0

	public followTarget: EntityImpl | null = null
	public readonly onChange = new EventImpl()
	public settings: CameraSettings

	private _x: AnimatableValue
	private _y: AnimatableValue
	private _zoom: AnimatableValue
	private _mousePanX: AnimatableValue
	private _mousePanY: AnimatableValue
	private lastEventRevision = 0
	private screenWidth = 0
	private screenHeight = 0

	private prevTargetX = 0
	private prevTargetY = 0

	constructor(private readonly engine: EngineImpl, settings: Partial<CameraSettings> = {}) {
		this.settings = {
			maxZoom: 10000,
			minZoom: 1,
			cursorPanMultiplier: 0,
			zoomStepSize: 0.25,
			zoomAnimationDuration: 0.25,
			offsetPanAnimationDuration: 0.25,
			panAnimationDuration: 0.25,
			...settings
		}
		this._x = new AnimatableValue(0, engine)
		this._y = new AnimatableValue(0, engine)
		this._zoom = new AnimatableValue(100, engine, 3)
		this._mousePanX = new AnimatableValue(0, engine, 3)
		this._mousePanY = new AnimatableValue(0, engine, 3)

		engine.onTick.sub(() => {
			if(this.followTarget){
				this.prevTargetX = this.followTarget.x
				this.prevTargetY = this.followTarget.y
			}
		})

		this.setSettings(this.settings)
	}

	getCenter(opts?: GetCameraCenterOptions): XY {
		let x = opts?.withAnimationSkip ? this._x.endValue : this._x.value
		let y = opts?.withAnimationSkip ? this._y.endValue : this._y.value

		if(opts?.withCursorOffset ?? true){
			x += opts?.withAnimationSkip ? this._mousePanX.endValue : this._mousePanX.value
			y += opts?.withAnimationSkip ? this._mousePanY.endValue : this._mousePanY.value
		}

		return {x, y}
	}

	setSettings(newSettings: CameraSettings): void {
		this.settings = newSettings
		this._mousePanX.animationDuration = newSettings.offsetPanAnimationDuration
		this._mousePanY.animationDuration = newSettings.offsetPanAnimationDuration
		this._x.animationDuration = newSettings.panAnimationDuration
		this._y.animationDuration = newSettings.panAnimationDuration
		this._zoom.animationDuration = newSettings.zoomAnimationDuration

		const evt = this.engine.input.cursorController.onFrameCursorChange
		if(this.settings.cursorPanMultiplier === 0){
			this._mousePanX.set(0)
			this._mousePanY.set(0)
			evt.unsub(this.onPanByCursor)
		} else {
			evt.sub(this.onPanByCursor)
		}
	}

	getZoom(): number {
		return this._zoom.value
	}

	private onPanByCursor = (e: CursorMoveInputEvent): void => {
		const xy = e.inworldCoords
		const cameraXy = this.getCenter()
		const x = xy.x - cameraXy.x
		const y = xy.y - cameraXy.y
		// this check is here to prevent (almost) infinite loop camera pans - cursor is updated - camera pans - ...
		// existence of this loop is not too bad, as it do 1 loop per frame at most
		// but still, not great
		if(Math.abs(this._mousePanX.endValue - x) < 0.001 && Math.abs(this._mousePanY.endValue - y) < 0.001){
			return
		}
		this._mousePanX.set(x * this.settings.cursorPanMultiplier)
		this._mousePanY.set(y * this.settings.cursorPanMultiplier)
	}

	onFrame(deltaTime: number): void {
		if(this.followTarget !== null){
			const coords = interpolateCoords(
				{x: this.prevTargetX, y: this.prevTargetY},
				{x: this.followTarget.x, y: this.followTarget.y},
				{start: this.engine.lastTickTime, end: this.engine.lastTickTime + this.engine.timePerTick, now: this.engine.timePassed}
			)
			this.moveTo(coords)
		}
		this.currentRevision
			+= this._x.animate(deltaTime)
			+ this._y.animate(deltaTime)
			+ this._zoom.animate(deltaTime)
			+ this._mousePanX.animate(deltaTime)
			+ this._mousePanY.animate(deltaTime)

		if(this.currentRevision !== this.lastEventRevision){
			this.lastEventRevision = this.currentRevision
			this.onChange.fire()
		}
	}

	moveTo(xy: XY): void {
		this._x.set(xy.x)
		this._y.set(xy.y)
	}

	setZoom(zoom: number): void {
		this._zoom.set(Math.min(this.settings.maxZoom, Math.max(this.settings.minZoom, zoom)))
	}

	stepZoom(steps: number): void {
		if((steps % 1) !== 0){
			throw new Error("Non-integer number of zoom steps: " + steps)
		}
		while(steps !== 0){
			let pow = Math.log2(this._zoom.endValue)
			pow += (steps > 0 ? 1 : -1) * this.settings.zoomStepSize
			this.setZoom(2 ** pow)
			steps += steps > 0 ? -1 : 1
		}
	}

	skipAnimations(): void {
		this._x.skipToEnd()
		this._y.skipToEnd()
		this._zoom.skipToEnd()
		this.currentRevision++
	}

	setFollowTarget(target: EntityImpl | null): void {
		this.followTarget = target
	}

	updateScreenSize(width: number, height: number): void {
		this.screenWidth = width
		this.screenHeight = height
	}

	private screenCoordsToCenterRelativeInworldCoords(xy: XY): XY {
		const zoom = this._zoom.value

		const halfWidth = this.screenWidth / 2
		const inworldX = ((xy.x - halfWidth) / zoom)

		const halfHeight = this.screenHeight / 2
		const inworldY = ((xy.y - halfHeight) / zoom)
		return {x: inworldX, y: inworldY}
	}

	screenCoordsToInworldCoords(xy: XY): XY {
		const {x: cameraX, y: cameraY} = this.getCenter()
		let {x, y} = this.screenCoordsToCenterRelativeInworldCoords(xy)
		x += cameraX
		y += cameraY
		return {x, y}
	}

}

class AnimatableValue {
	animationDuration = 0.25
	endValue = 0
	private startValue = 0
	private startTime = 0
	private endTime = 0

	constructor(public value: number, private readonly engine: EngineImpl, private readonly progressCurvePower = 1) {
		this.endValue = this.startValue = value
	}

	setAndSkipAnimation(value: number): void {
		this.startTime = this.endTime = 0
		this.endValue = this.startValue = this.value = value
	}

	skipToEnd(): void {
		this.setAndSkipAnimation(this.endValue)
	}

	set(value: number): void {
		this.startTime = this.engine.timePassed
		this.endTime = this.engine.timePassed + this.animationDuration
		this.startValue = this.value
		this.endValue = value
	}

	animate(deltaTime: number): 1 | 0 {
		let progress = (this.engine.timePassed - this.startTime + deltaTime) / (this.endTime - this.startTime)
		progress = Math.max(0, Math.min(1, progress))
		const isReachedEnd = this.value === this.endValue
		if(progress === 1 || Number.isNaN(progress) || isReachedEnd){
			const result = isReachedEnd ? 0 : 1
			this.value = this.endValue
			return result
		}

		progress = this.applyProgressCurve(progress)
		this.value = this.startValue + ((this.endValue - this.startValue) * progress)
		return 1
	}

	private applyProgressCurve(progress: number): number {
		return 1 - ((1 - progress) ** this.progressCurvePower)
	}


}

function interpolateCoords(start: XY, end: XY, time: {start: number, end: number, now: number}): {x: number, y: number} {
	const timeSpan = time.end - time.start
	const timePassed = time.now - time.start
	const progress = Math.min(1, Math.max(0, timePassed / timeSpan))

	const dx = end.x - start.x
	const dy = end.y - start.y
	return {x: start.x + (dx * progress), y: start.y + (dy * progress)}
}