import {EventImpl} from "common/event"
import {XY} from "common_types"
import {UserInputController} from "user_input/user_input_controller"

export type CursorMoveInputEvent = {
	/** Coords of mouse cursor in inworld units */
	readonly inworldCoords: XY
}

export class UserCursorInputController {
	private userTickHandler: ((event: CursorMoveInputEvent) => void) | null = null
	private lastKnownCursorEvent: MouseEvent | TouchEvent | null = null
	private currentRevision = 0

	private subCount = 0
	incSubCount(): void {
		this.subCount++
		if(this.subCount === 1){
			this.subscribe()
		}
	}
	decSubCount(): void {
		this.subCount--
		if(this.subCount === 0){
			this.unsubscribe()
		}
	}

	readonly onTickCursorChange: CursorEvent
	readonly onFrameCursorChange: CursorEvent

	private onMove = (e: MouseEvent | TouchEvent) => {
		this.lastKnownCursorEvent = e
		this.currentRevision++
	}

	constructor(readonly inputController: UserInputController) {
		// this is to avoid situation when cursor didn't move, but camera did, so now cursor points to something else
		inputController.engine.camera.onChange.sub(() => this.currentRevision++)
		this.onTickCursorChange = new CursorEvent(this)
		this.onFrameCursorChange = new CursorEvent(this)
	}

	clear(): void {
		this.lastKnownCursorEvent = null
	}

	tick(): void {
		if(this.lastKnownCursorEvent){
			this.onTickCursorChange.update(this.currentRevision, this.lastKnownCursorEvent)
		}
	}

	onFrame(): void {
		if(this.lastKnownCursorEvent){
			this.onFrameCursorChange.update(this.currentRevision, this.lastKnownCursorEvent)
		}
	}

	private subscribe(): void {
		this.clear()
		window.addEventListener("mousemove", this.onMove, {passive: true})
		window.addEventListener("touchmove", this.onMove, {passive: true})
	}

	private unsubscribe(): void {
		window.removeEventListener("mousemove", this.onMove)
		window.removeEventListener("touchmove", this.onMove)
		this.clear()
	}

	setUserTickCursorHandler(handler: ((event: CursorMoveInputEvent) => void) | null): void {
		if(handler){
			this.onTickCursorChange.sub(handler)
		}
		if(this.userTickHandler){
			this.onTickCursorChange.unsub(this.userTickHandler)
		}
		this.userTickHandler = handler
	}
}

class CursorEvent extends EventImpl<[evt: CursorMoveInputEvent]> {
	private lastKnownPosition = {x: 0, y: 0}
	private lastKnownRevision = 0

	constructor(private readonly controller: UserCursorInputController) {
		super({
			onFirstSub: () => {
				controller.incSubCount()
			},
			onLastUnsub: () => {
				controller.decSubCount()
			}
		})
	}

	getLastKnownEvent(): CursorMoveInputEvent {
		return {inworldCoords: this.lastKnownPosition}
	}

	update(revision: number, evt: MouseEvent | TouchEvent): void {
		if(revision === this.lastKnownRevision){
			return
		}
		this.lastKnownRevision = revision

		let {x, y} = pointerEventsToClientCoords(evt)
		const eng = this.controller.inputController.engine
		const canvas = eng.graphics.canvas
		x -= canvas.clientLeft
		y -= canvas.clientTop
		const cursorPosition = this.controller.inputController.engine.camera.screenCoordsToInworldCoords({x, y})
		if(cursorPosition.x === this.lastKnownPosition.x && cursorPosition.y === this.lastKnownPosition.y){
			return
		}
		this.lastKnownPosition = cursorPosition

		this.fire(this.getLastKnownEvent())
	}
}

function isTouchEvent(e: MouseEvent | TouchEvent): e is TouchEvent {
	return !!(e as TouchEvent).touches
}

function pointerEventsToClientCoords(e: MouseEvent | TouchEvent): XY {
	if(isTouchEvent(e)){
		const touch = (e.touches[0] ?? e.changedTouches[0])!
		return {
			x: touch.clientX,
			y: touch.clientY
		}
	} else {
		return {
			x: e.clientX,
			y: e.clientY
		}
	}
}