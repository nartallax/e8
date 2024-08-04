import {InputBindDefinition} from "resource_pack/resource_pack"
import {InputBindActions, InputBindActionsObj} from "types"
import {InputKey, browserKeyboardCodeToInputKey, knownMouseButtonInputs} from "user_input/inputs"
import {InputKeyActionSet, InputKeyActionSourceBind, InputKeyEvent} from "user_input/keys/input_key_action_set"

export class UserKeyInputController {
	private downKeys: ReadonlySet<InputKey> = new Set()
	private actionSet = new InputKeyActionSet([])
	private readonly eventQueue: InputKeyEvent[] = []
	private bindActionHandlers: InputBindActionsObj<number>[] = []

	constructor(private readonly bindDefs: readonly InputBindDefinition[]) {}

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

	setBindHandlers(actionHandlers: {[x: number]: InputBindActions<number> | (() => void)}): void {
		this.bindActionHandlers = actionsObjectToArray(this.bindDefs, actionHandlers)
		this.rebuildActionSet()
		this.subscribe()
		// TODO: shutdown procedure for this controller
		void this.unsubscribe
	}

	private rebuildActionSet(): void {
		const binds: InputKeyActionSourceBind[] = []
		for(let bindIndex = 0; bindIndex < this.bindDefs.length; bindIndex++){
			const handlers = this.bindActionHandlers[bindIndex]
			if(!handlers){
				continue
			}

			const bind = this.bindDefs[bindIndex]!
			binds.push({
				bind: bindIndex,
				chords: bind.defaultChords,
				group: bind.groupIndex,
				handlers
			})
		}
		this.actionSet = new InputKeyActionSet(binds)
	}

	clear(): void {
		this.downKeys = new Set()
		this.eventQueue.length = 0
	}
}

function actionsObjectToArray(binds: readonly InputBindDefinition[], obj: {readonly [key: number]: InputBindActions<number>}): InputBindActionsObj<number>[] {
	let i = -1
	const result: InputBindActionsObj<number>[] = []
	while(true){
		let value = obj[++i]
		if(!value){
			break
		}
		if(typeof(value) === "function"){
			const bindDef = binds[i]!
			value = bindDef.isHold ? {onHold: value} : {onDown: value}
		}
		result.push(value)
	}
	return result
}