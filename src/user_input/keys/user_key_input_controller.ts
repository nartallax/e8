import {InputBindSetImpl} from "user_input/input_bind_set"
import {InputKey, browserKeyboardCodeToInputKey, knownMouseButtonInputs} from "user_input/inputs"
import {InputKeyActionSet, InputKeyActionSourceBind, InputKeyEvent} from "user_input/keys/input_key_action_set"

export class UserKeyInputController {
	private activeBindSets: InputBindSetImpl[] = []
	private downKeys: ReadonlySet<InputKey> = new Set()
	private actionSet = new InputKeyActionSet([])
	private readonly eventQueue: InputKeyEvent[] = []

	private onKeyDown = (e: KeyboardEvent) => {
		const key = browserKeyboardCodeToInputKey(e.code)
		if(key !== null){
			this.eventQueue.push({isDown: true, key})
		}
	}
	private onKeyUp = (e: KeyboardEvent) => {
		const key = browserKeyboardCodeToInputKey(e.code)
		if(key !== null){
			this.eventQueue.push({isDown: false, key})
		}
	}
	private onMouseDown = (e: MouseEvent) =>
		this.eventQueue.push({isDown: true, key: knownMouseButtonInputs[e.button]!})
	private onMouseUp = (e: MouseEvent) =>
		this.eventQueue.push({isDown: false, key: knownMouseButtonInputs[e.button]!})
	private onWheel = (e: WheelEvent) => {
		const key: InputKey = e.deltaY > 0 ? "WheelDown" : "WheelUp"
		this.eventQueue.push({isDown: true, key})
		this.eventQueue.push({isDown: false, key})
	}
	private onBlur = () => {
		for(const key of this.downKeys){
			this.eventQueue.push({key, isDown: false})
		}
	}

	tick(deltaTime: number): void {
		const handlers = this.actionSet.findActions(this.downKeys, this.eventQueue)
		this.eventQueue.length = 0
		this.downKeys = handlers.newDownKeys

		for(const handler of handlers.down){
			handler.handler(deltaTime, handler)
		}
		for(const handler of handlers.hold){
			handler.handler(deltaTime, handler)
		}
		for(const handler of handlers.up){
			handler.handler(deltaTime, handler)
		}
	}

	private subscribe(): void {
		this.clear()
		window.addEventListener("keydown", this.onKeyDown, {passive: true})
		window.addEventListener("keyup", this.onKeyUp, {passive: true})
		window.addEventListener("mousedown", this.onMouseDown, {passive: true})
		window.addEventListener("mouseup", this.onMouseUp, {passive: true})
		window.addEventListener("wheel", this.onWheel, {passive: true})
		window.addEventListener("blur", this.onBlur, {passive: true})
	}

	private unsubscribe(): void {
		window.removeEventListener("keydown", this.onKeyDown)
		window.removeEventListener("keyup", this.onKeyUp)
		window.removeEventListener("mousedown", this.onMouseDown)
		window.removeEventListener("mouseup", this.onMouseUp)
		window.removeEventListener("wheel", this.onWheel)
		window.removeEventListener("blur", this.onBlur)
		this.clear()
	}

	activateBindSet(bindSet: InputBindSetImpl): void {
		if(this.isBindSetActive(bindSet)){
			throw new Error("Bind set is already active")
		}
		this.activeBindSets.push(bindSet)
		if(this.activateBindSet.length === 1){
			this.subscribe()
		}
		this.rebuildActionSet()
	}

	deactivateBindSet(bindSet: InputBindSetImpl): void {
		if(!this.isBindSetActive(bindSet)){
			throw new Error("Bind set is already not active")
		}
		this.activeBindSets = this.activeBindSets.filter(x => x !== bindSet)
		if(this.activeBindSets.length === 0){
			this.unsubscribe()
		}
		this.rebuildActionSet()
	}

	// TODO: event here
	notifyBindSetUpdated(bindSet: InputBindSetImpl): void {
		if(this.isBindSetActive(bindSet)){
			this.rebuildActionSet()
		}
	}

	private rebuildActionSet(): void {
		const binds: InputKeyActionSourceBind[] = []
		for(const bindSet of this.activeBindSets){
			for(let bindIndex = 0; bindIndex < bindSet.def.binds.length; bindIndex++){
				const handlers = bindSet.bindActionHandlers[bindIndex]
				if(!handlers){
					continue
				}

				const bind = bindSet.def.binds[bindIndex]!
				binds.push({
					bind: bindIndex,
					bindSet: bindSet.index,
					chords: bind.defaultChords,
					group: bind.group,
					handlers
				})
			}
		}
		this.actionSet = new InputKeyActionSet(binds)
	}

	isBindSetActive(bindSet: InputBindSetImpl): boolean {
		return !!this.activeBindSets.find(x => x === bindSet)
	}

	clear(): void {
		this.downKeys = new Set()
		this.eventQueue.length = 0
	}
}