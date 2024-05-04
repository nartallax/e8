// indices are mouse codes, as given by browser in MouseEvent.button
// names are made up
export const knownMouseButtonInputs = ["LMB", "MMB", "RMB", "Mouse3", "Mouse4", "Mouse5", "Mouse6", "Mouse7", "Mouse8", "Mouse9"] as const

// key names, as given by browser in KeyboardEvent.code
const knownKeyboardInputs = ["Backspace", "Tab", "Enter", "ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight", "AltLeft", "AltRight", "Pause", "CapsLock", "Escape", "Space", "PageUp", "PageDown", "End", "Home", "ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown", "PrintScreen", "Insert", "Delete", "Digit0", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "KeyA", "KeyB", "KeyC", "KeyD", "KeyE", "KeyF", "KeyG", "KeyH", "KeyI", "KeyJ", "KeyK", "KeyL", "KeyM", "KeyN", "KeyO", "KeyP", "KeyQ", "KeyR", "KeyS", "KeyT", "KeyU", "KeyV", "KeyW", "KeyX", "KeyY", "KeyZ", "MetaLeft", "MetaRight", "ContextMenu", "Numpad0", "Numpad1", "Numpad2", "Numpad3", "Numpad4", "Numpad5", "Numpad6", "Numpad7", "Numpad8", "Numpad9", "NumpadMultiply", "NumpadAdd", "NumpadSubtract", "NumpadDecimal", "NumpadDivide", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "NumLock", "ScrollLock", "AudioVolumeMute", "AudioVolumeDown", "AudioVolumeUp", "LaunchMediaPlayer", "LaunchApplication1", "LaunchApplication2", "Semicolon", "Equal", "Comma", "Minus", "Period", "Slash", "Backquote", "BracketLeft", "Backslash", "BracketRight", "Quote"] as const

// wheeldown = positive delta, wheelup = negative delta
// names are made up
const knownMouseWheelInputs = ["WheelDown", "WheelUp"] as const

export type InputKey = typeof knownKeyboardInputs[number] | typeof knownMouseButtonInputs[number] | typeof knownMouseWheelInputs[number]

/** Simplified inputs can be used for presentation, or storage */
export function simplifyInputKey(input: InputKey): string {
	if(input.startsWith("Key") && input.length === 4){
		return input.substring("Key".length)
	}
	if(input.startsWith("Digit")){
		return input.substring("Digit".length)
	}
	if(input === "ControlLeft" || input === "ControlRight"){
		return "Ctrl"
	}
	if(input === "AltLeft" || input === "AltRight"){
		return "Alt"
	}
	if(input === "ShiftLeft" || input === "ShiftRight"){
		return "Shift"
	}
	if(input === "MetaLeft" || input === "MetaRight"){
		return "Meta"
	}
	return input
}

/** Reverses effect of simplifyInputKey() */
export function unsimplifyInputKey(input: string): InputKey {
	let result: InputKey = input as InputKey
	if(input.length === 1){
		if(/\d/.test(input)){
			result = ("Digit" + input) as InputKey
		} else {
			result = ("Key" + input) as InputKey
		}
	}
	if(input === "Ctrl"){
		return "ControlLeft"
	}
	if(input === "Alt"){
		return "AltLeft"
	}
	if(input === "Shift"){
		return "ShiftLeft"
	}
	if(input === "Meta"){
		return "MetaLeft"
	}
	// here we just hope that input is legit user input
	// of couse we can check, but what if user system supports some exotic unknown input?
	// like gamepads or something
	// let's just leave it as it is
	return result
}

export function isModifierKey(e: InputKey): boolean {
	return e === "AltLeft" || e === "AltRight" || e === "ControlLeft" || e === "ControlRight" || e === "ShiftLeft" || e === "ShiftRight" || e === "MetaLeft" || e === "MetaRight"
}