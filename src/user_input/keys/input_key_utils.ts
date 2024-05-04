import {InputKey, isModifierKey, simplifyInputKey} from "user_input/inputs"
import {Chord} from "resource_pack/resource_pack"
import {copySortBy} from "common/sort_by"

export function chordToString(chord: Chord): string {
	if(chord.length === 0){
		return "<empty>"
	}
	return copySortBy(chord, key => isModifierKey(key) ? 0 : 1)
		.map(key => simplifyInputKey(key))
		.join("+")
}

/** All mod keys shoult be of left variety. No duplicate modkeys allowed. */
export function fixChord(chord: Chord): Chord {
	const result = new Set<InputKey>()
	for(const key of chord){
		result.add(fixInputKey(key))
	}
	return [...result]
}

export function fixInputKey(key: InputKey): InputKey {
	switch(key){
		case "AltRight": return "AltLeft"
		case "ControlRight": return "ControlLeft"
		case "ShiftRight": return "ShiftLeft"
		case "MetaRight": return "MetaLeft"
		default: return key
	}
}