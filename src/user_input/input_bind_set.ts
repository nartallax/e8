import {InputBindSetDefinition} from "resource_pack/resource_pack"
import {InputBindActions, InputBindActionsObj, CursorMoveInputEvent, InputBindSet} from "types"
import {UserInputController} from "user_input/user_input_controller"

export class InputBindSetImpl implements InputBindSet<number> {

	get isActive(): boolean {
		return this.inputController.keyController.isBindSetActive(this)
	}

	private cursorMoveHandler: ((e: CursorMoveInputEvent) => void) | null = null
	private isCursorPanEnabled = false
	private isSubbedToTickCursorChange = false
	private isSubbedToFrameCursorChange = false
	// TODO: rewrite this to subscription-based system, like with cursor? and make it private
	bindActionHandlers: InputBindActionsObj<number>[] = []


	constructor(readonly index: number, readonly def: InputBindSetDefinition, private readonly inputController: UserInputController) {}

	private readonly onTickCursorMove = (evt: CursorMoveInputEvent) => {
		if(this.cursorMoveHandler){
			this.cursorMoveHandler(evt)
		}
	}

	private readonly onFrameCursorMove = (evt: CursorMoveInputEvent) => {
		this.inputController.engine.camera.setCursorPosition(evt.inworldCoords)
	}

	setBindHandlers(actionHandlers: {[x: number]: InputBindActions<number> | (() => void)}): void {
		this.bindActionHandlers = actionsObjectToArray(this.def, actionHandlers)
		this.inputController.keyController.notifyBindSetUpdated(this)
	}

	private updateTickCursorMoveSub(): void {
		const shouldBeSubbed = this.isActive && this.cursorMoveHandler !== null
		if(shouldBeSubbed && !this.isSubbedToTickCursorChange){
			this.isSubbedToTickCursorChange = true
			this.inputController.cursorController.onTickCursorChange.sub(this.onTickCursorMove)
		}
		if(!shouldBeSubbed && this.isSubbedToTickCursorChange){
			this.isSubbedToTickCursorChange = false
			this.inputController.cursorController.onTickCursorChange.unsub(this.onTickCursorMove)
		}
	}

	private updateFrameCursorMoveSub(): void {
		const shouldBeSubbed = this.isActive && this.isCursorPanEnabled
		if(shouldBeSubbed && !this.isSubbedToFrameCursorChange){
			this.isSubbedToFrameCursorChange = true
			this.inputController.cursorController.onFrameCursorChange.sub(this.onFrameCursorMove)
		}
		if(!shouldBeSubbed && this.isSubbedToFrameCursorChange){
			this.isSubbedToFrameCursorChange = false
			this.inputController.cursorController.onFrameCursorChange.unsub(this.onFrameCursorMove)
		}
	}

	setTickCursorHandler(handler: ((event: CursorMoveInputEvent) => void) | null): void {
		this.cursorMoveHandler = handler
		this.updateTickCursorMoveSub()
	}

	setCursorPan(isEnabled: boolean): void {
		this.isCursorPanEnabled = isEnabled
		this.updateFrameCursorMoveSub()
	}

	activate(): void {
		this.inputController.keyController.activateBindSet(this)
		this.updateTickCursorMoveSub()
		this.updateFrameCursorMoveSub()
	}

	deactivate(): void {
		this.inputController.keyController.deactivateBindSet(this)
		this.updateTickCursorMoveSub()
		this.updateFrameCursorMoveSub()
	}

}

function actionsObjectToArray(def: InputBindSetDefinition, obj: {readonly [key: number]: InputBindActions<number>}): InputBindActionsObj<number>[] {
	let i = -1
	const result: InputBindActionsObj<number>[] = []
	while(true){
		let value = obj[++i]
		if(!value){
			break
		}
		if(typeof(value) === "function"){
			const bindDef = def.binds[i]!
			value = bindDef.isHold ? {onHold: value} : {onDown: value}
		}
		result.push(value)
	}
	return result
}