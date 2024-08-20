import {Content} from "content/content"
import {EngineImpl} from "glue/engine"
import {UserCursorInputController} from "user_input/cursor/user_cursor_input_controller"
import {UserKeyInputController} from "user_input/keys/user_key_input_controller"


export class UserInputController {
	readonly keyController: UserKeyInputController
	readonly cursorController: UserCursorInputController

	constructor(readonly engine: EngineImpl, content: Content) {
		this.keyController = new UserKeyInputController(content.inputBinds)
		this.cursorController = new UserCursorInputController(this)
	}

	tick(deltaTime: number): void {
		this.keyController.tick(deltaTime)
		this.cursorController.tick()
	}

	onFrame(): void {
		this.cursorController.onFrame()
	}
}