import {capitalize} from "common/capitalize"
import {GetterName, SetterName, ShaderField, ShaderFieldSizeMap} from "graphics/graphic_types"

export function makeSetterName<T extends string>(name: T): SetterName<T> {
	return ("set" + capitalize(name)) as SetterName<T>
}

export function makeGetterName<T extends string>(name: T): GetterName<T> {
	return ("get" + capitalize(name)) as GetterName<T>
}

export function getUniqueShaderFields<M extends ShaderFieldSizeMap<string>>(allFields: readonly ShaderField<M>[]): ShaderField<M>[] {
	const fieldsByKeys = new Map<string, ShaderField<M>>()
	for(const field of allFields){
		const otherField = fieldsByKeys.get(field.name)
		if(otherField){
			if(otherField.size !== field.size){
				throw new Error(`There are more than one field named ${field.name}; one field has size ${otherField.size}, other has ${field.size}. This won't work.`)
			}
			if(otherField.type !== field.type){
				throw new Error(`There are more than one field named ${field.name}; one field has type ${otherField.type}, other has ${field.type}. This won't work.`)
			}
			if(otherField.sourceFields.length !== field.sourceFields.length){
				throw new Error(`There are more than one field named ${field.name}; one field contains ${otherField.sourceFields.length} other fields, other contains ${field.sourceFields.length}. This won't work.`)
			}
			for(let i = 0; i < otherField.sourceFields.length; i++){
				const srcA = field.sourceFields[i]!
				const srcB = otherField.sourceFields[i]!
				if(srcA.name !== srcB.name || srcA.size !== srcB.size || srcA.type !== srcB.type){
					throw new Error(`There are more than one field named ${field.name}; source field at index ${i} differs: ${JSON.stringify(srcA)} vs ${JSON.stringify(srcB)}. This won't work.`)
				}
			}
		} else {
			fieldsByKeys.set(field.name, field)
		}
	}
	return [...fieldsByKeys.values()]
}