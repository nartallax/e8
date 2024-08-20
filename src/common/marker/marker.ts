const mark = Symbol()
const markKey = "__e8_mark"

/** Marking values is useful when detecting if someone bundled copy of the engine in the mod by accident
When we define values like mixins, entities etc - they are getting marked by our version of engine
They are then exported; if engine processing exports detect that those values are marked with different mark -
error is thrown, because it means that another engine is present in runtime, which is unacceptable */
export const markValue = (value: any) => {
	value[markKey] = mark
}
const valueHasOurMark = (value: any) => value[markKey] === mark
const valueHasSomeMark = (value: any) => markKey in value

const throwBadMark = (valueKind: string, name: string) => {
	throw new Error(`${valueKind} ${name} is created by different instance of the engine. That probably means that another copy of the engine is bundled within some content pack. This is wrong and must be fixed.`)
}

export const checkValueHasOurMark = (valueKind: string, name: string, value: any) => {
	if(!valueHasOurMark(value)){
		throwBadMark(valueKind, name)
	}
}

/** This is useful when we don't know for sure if a value should be marked or not
When we have an object with module exports, we can't robustly check if exported value should be marked or not
Because only some values are marked (entity classes, mixins) and not all of them (any other user-defined value won't be marked) */
export const checkValueHasNoWrongMark = (valueKind: string, name: string, value: any) => {
	if(valueHasSomeMark(value) && !valueHasOurMark(value)){
		throwBadMark(valueKind, name)
	}
}