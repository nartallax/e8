import {EngineImpl} from "glue/engine"
import {ResourcePack} from "resource_pack/resource_pack"
import {UserCursorInputController} from "user_input/cursor/user_cursor_input_controller"
import {InputBindSetImpl} from "user_input/input_bind_set"
import {UserKeyInputController} from "user_input/keys/user_key_input_controller"


export class UserInputController {
	readonly keyController: UserKeyInputController
	readonly cursorController: UserCursorInputController
	private readonly allBindSets: readonly InputBindSetImpl[]

	constructor(readonly engine: EngineImpl, rp: ResourcePack) {
		this.keyController = new UserKeyInputController()
		this.cursorController = new UserCursorInputController(this)

		const arr: InputBindSetImpl[] = this.allBindSets = []
		for(let i = 0; i < rp.inputBinds.length; i++){
			arr.push(new InputBindSetImpl(i, rp.inputBinds[i]!, this))
		}
	}

	getBindSet(index: number): InputBindSetImpl {
		return this.allBindSets[index]!
	}

	tick(deltaTime: number): void {
		this.keyController.tick(deltaTime)
		this.cursorController.tick()
	}

	onFrame(): void {
		this.cursorController.onFrame()
	}
}