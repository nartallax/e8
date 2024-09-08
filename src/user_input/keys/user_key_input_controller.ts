import {InputBindDefinition} from "content/content"
import {InputKey, browserKeyboardCodeToInputKey, knownMouseButtonInputs} from "user_input/inputs"
import {InputKeyActionSet, InputKeyActionSourceBind, InputKeyEvent} from "user_input/keys/input_key_action_set"

export type InputBindActions = InputBindActionsObj | InputBindActionFn
export type InputBindActionFn = ((deltaTime: number, meta: {binds: Set<string>, count: number}) => void)
export type InputBindActionsObj = {
	onDown?: InputBindActionFn
	onHold?: InputBindActionFn
	onUp?: InputBindActionFn
}

export class UserKeyInputController {
	private downKeys: ReadonlySet<InputKey> = new Set()
	private actionSet = new InputKeyActionSet([])
	private readonly eventQueue: InputKeyEvent[] = []

	constructor(private readonly bindDefs: Map<string, InputBindDefinition>) {}

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

	setBindHandlers(actionHandlers: Record<string, InputBindActions>): void {
		const bindsWithKeys = actionsObjectToArray(this.bindDefs, actionHandlers)
		this.actionSet = new InputKeyActionSet(bindsWithKeys)
		this.subscribe()
		// TODO: shutdown procedure for this controller
		void this.unsubscribe
	}

	clear(): void {
		this.downKeys = new Set()
		this.eventQueue.length = 0
	}
}

function actionsObjectToArray(binds: Map<string, InputBindDefinition>, obj: Record<string, InputBindActions>): InputKeyActionSourceBind[] {
	const result: InputKeyActionSourceBind[] = []
	for(const [name, value] of Object.entries(obj)){
		let obj: InputKeyActionSourceBind
		const def = binds.get(name)!
		if(typeof(value) === "function"){
			obj = def.isHold ? {
				group: def.groupIndex, chords: def.defaultChords, name, handlers: {onHold: value}
			} : {
				group: def.groupIndex, chords: def.defaultChords, name, handlers: {onDown: value}
			}
		} else {
			obj = {group: def.groupIndex, chords: def.defaultChords, name, handlers: value}
		}
		result.push(obj)
	}
	return result
}