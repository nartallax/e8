import {EngineImpl} from "glue/engine"
import {EntityImpl} from "glue/entity"
import {EventImpl} from "glue/event"
import {XY, Camera} from "types"

export class CameraImpl implements Camera<number, EntityImpl> {

	followTarget: EntityImpl | null = null
	private _x: AnimatableValue
	private _y: AnimatableValue
	private _zoom: AnimatableValue
	private _mousePanX: AnimatableValue
	private _mousePanY: AnimatableValue
	currentRevision = 0
	lastEventRevision = 0
	screenWidth = 0
	screenHeight = 0
	cursorPanMultiplier = 0
	zoomStepSize = 0.25
	private prevTargetX = 0
	private prevTargetY = 0
	onChange = new EventImpl()
	maxZoom = 10000
	minZoom = 1

	get x(): number {
		return this._x.value + this._mousePanX.value
	}

	get y(): number {
		return this._y.value + this._mousePanY.value
	}

	get zoom(): number {
		return this._zoom.value
	}

	get panAnimationDuration(): number {
		return this._x.animationDuration
	}

	get zoomAnimationDuration(): number {
		return this._zoom.animationDuration
	}

	get offsetPanAnimationDuration(): number {
		return this._mousePanX.animationDuration
	}

	constructor(private readonly engine: EngineImpl) {
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
	}

	setZoomAnimationDuration(durationSeconds: number): void {
		this._zoom.animationDuration = durationSeconds
	}

	setZoomBounds(min: number, max: number): void {
		this.minZoom = min
		this.maxZoom = max
	}

	setPanAnimationDuration(durationSeconds: number): void {
		this._x.animationDuration = durationSeconds
		this._y.animationDuration = durationSeconds
	}

	setCursorPanAnimationDuration(durationSeconds: number): void {
		this._mousePanX.animationDuration = durationSeconds
		this._mousePanY.animationDuration = durationSeconds
	}

	setCursorPosition(xy: XY): void {
		const x = xy.x - this.x
		const y = xy.y - this.y
		// this check is here to prevent (almost) infinite loop camera pans - cursor is updated - camera pans - ...
		// existence of this loop is not too bad, as it do 1 loop per frame at most
		// but still, not great
		if(Math.abs(this._mousePanX.endValue - x) < 0.001 && Math.abs(this._mousePanY.endValue - y) < 0.001){
			return
		}
		this._mousePanX.set(x * this.cursorPanMultiplier)
		this._mousePanY.set(y * this.cursorPanMultiplier)
	}

	onFrame(deltaTime: number): void {
		if(this.followTarget !== null){
			const coords = interpolateCoords(
				this.prevTargetX, this.prevTargetY,
				this.followTarget.x, this.followTarget.y,
				this.engine.lastTickTime, this.engine.lastTickTime + this.engine.timePerTick,
				this.engine.timePassed
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

	zoomTo(zoom: number): void {
		this._zoom.set(Math.min(this.maxZoom, Math.max(this.minZoom, zoom)))
	}

	setZoomStepSize(value: number): void {
		this.zoomStepSize = value
	}

	stepZoom(steps: number): void {
		if((steps % 1) !== 0){
			throw new Error("Non-integer number of zoom steps: " + steps)
		}
		while(steps !== 0){
			let pow = Math.log2(this._zoom.endValue)
			pow += (steps > 0 ? 1 : -1) * this.zoomStepSize
			this.zoomTo(2 ** pow)
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

	setCursorPanMultiplier(multiplier: number): void {
		this.cursorPanMultiplier = multiplier
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
		const cameraX = this.x
		const cameraY = this.y
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

function interpolateCoords(xStart: number, yStart: number, xEnd: number, yEnd: number, timeStart: number, timeEnd: number, timeNow: number): {x: number, y: number} {
	const timeSpan = timeEnd - timeStart
	const timePassed = timeNow - timeStart
	const progress = Math.min(1, Math.max(0, timePassed / timeSpan))

	const dx = xEnd - xStart
	const dy = yEnd - yStart
	return {x: xStart + (dx * progress), y: yStart + (dy * progress)}
}