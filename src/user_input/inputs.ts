// indices are mouse codes, as given by browser in MouseEvent.button
// names are made up
export const knownMouseButtonInputs = ["LMB", "MMB", "RMB", "Mouse3", "Mouse4", "Mouse5", "Mouse6", "Mouse7", "Mouse8", "Mouse9"] as const

// key names. sometimes equal to browser's KeyboardEvent.code, sometimes not (in cases of digits and letter-keys)
export const knownKeyboardInputs = ["Backspace", "Tab", "Enter", "Shift", "Ctrl", "Alt", "Pause", "CapsLock", "Escape", "Space", "PageUp", "PageDown", "End", "Home", "ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown", "PrintScreen", "Insert", "Delete", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "Meta", "ContextMenu", "Numpad0", "Numpad1", "Numpad2", "Numpad3", "Numpad4", "Numpad5", "Numpad6", "Numpad7", "Numpad8", "Numpad9", "NumpadMultiply", "NumpadAdd", "NumpadSubtract", "NumpadDecimal", "NumpadDivide", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "NumLock", "ScrollLock", "AudioVolumeMute", "AudioVolumeDown", "AudioVolumeUp", "LaunchMediaPlayer", "LaunchApplication1", "LaunchApplication2", "Semicolon", "Equal", "Comma", "Minus", "Period", "Slash", "Backquote", "BracketLeft", "Backslash", "BracketRight", "Quote"] as const

// wheeldown = positive delta, wheelup = negative delta
// names are made up
export const knownMouseWheelInputs = ["WheelDown", "WheelUp"] as const

export type InputKey = typeof knownKeyboardInputs[number] | typeof knownMouseButtonInputs[number] | typeof knownMouseWheelInputs[number]

const keyboardKeySet = new Set(knownKeyboardInputs)
export function browserKeyboardCodeToInputKey(key: string): InputKey | null {
	if((key.startsWith("Key") && key.length === 4) || (key.startsWith("Digit") && key.length === 6)){
		return key.charAt(key.length - 1) as InputKey
	}
	if(key === "AltRight" || key === "AltLeft"){
		return "Alt"
	}
	if(key === "ShiftRight" || key === "ShiftLeft"){
		return "Shift"
	}
	if(key === "ControlRight" || key === "ControlLeft"){
		return "Ctrl"
	}
	if(key === "MetaRight" || key === "MetaLeft"){
		return "Meta"
	}
	if(keyboardKeySet.has(key as typeof knownKeyboardInputs[number])){
		return key as InputKey
	}
	return null
}

export function isModifierKey(e: InputKey): boolean {
	return e === "Alt" || e === "Shift" || e === "Ctrl" || e === "Meta"
}