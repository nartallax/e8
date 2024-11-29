import {binaryGroup} from "common/binary_group"
import {findLowestBy} from "common/find_lowest_by"
import {sortBy} from "common/sort_by"
import {GlVecSize, ShaderSourceField, ShaderFieldSizeMap, ShaderFieldType, ShaderNumberType, ShaderSource, ShaderField} from "graphics/graphic_types"

type ShaderPrecision = "low" | "medium" | "high"
type ShaderAttribSourceField<N extends string, S extends GlVecSize = 1> = ShaderSourceField<N, S, ShaderNumberType>
type ShaderUniformSourceField<N extends string, S extends GlVecSize = 1> = ShaderSourceField<N, S, ShaderFieldType>
type ShaderConstant = {
	readonly name: string
	readonly type: ShaderNumberType
	readonly value: number
}

const glMaxVecSize = 4
const swizzleLetters = ["x", "y", "z", "w"] as const
const getFieldDefaults = <T extends ShaderFieldType, SS extends GlVecSize>(): Omit<ShaderSourceField<string, SS, T>, "name"> => ({
	resetValue: null,
	size: 1 as SS,
	type: "float" as T
})

// yes, I really want {} here. they make the resulting types after building look better
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export class ShaderBuilder<A extends ShaderFieldSizeMap<string> = {}, U extends ShaderFieldSizeMap<string> = {}> {
	private attributeFields: readonly ShaderAttribSourceField<keyof A & string, GlVecSize>[] = []
	private vertexField: ShaderAttribSourceField<string, GlVecSize> | null = null
	private uniformFields: readonly ShaderUniformSourceField<keyof U & string, GlVecSize>[] = []
	private constants: readonly ShaderConstant[] = []
	private codeParts: readonly string[] = []
	private glVersion = "300 es"
	private floatPrecision: ShaderPrecision = "high"
	private intPrecision: ShaderPrecision = "high"
	private attribsLimit = 16 // guaranteed by spec
	// there's no related field for uniforms, because uniform limits are not very straightforward, and it's better to just rely on compiler to throw
	// the limits are quite large, so we shouldn't exceed them realistically anyway

	private clone<AA extends ShaderFieldSizeMap<string> = A, UU extends ShaderFieldSizeMap<string> = U>(adjuster: (builder: ShaderBuilder<AA & A, UU & U>) => void): ShaderBuilder<AA & A, UU & U> {
		const builder = new ShaderBuilder<AA & A, UU & U>()
		builder.attributeFields = this.attributeFields
		builder.vertexField = this.vertexField
		builder.uniformFields = this.uniformFields
		builder.constants = this.constants
		builder.codeParts = this.codeParts
		builder.floatPrecision = this.floatPrecision
		builder.intPrecision = this.intPrecision
		builder.glVersion = this.glVersion
		builder.attribsLimit = this.attribsLimit
		adjuster(builder)
		return builder
	}

	build(): ShaderSource<A, U> {
		let result = `#version ${this.glVersion}\n`
		result += `precision ${this.floatPrecision}p float;\n`
		result += `precision ${this.intPrecision}p int;\n`
		result += "\n"

		for(const {name, type, value} of this.constants){
			result += `#define ${name} (${this.formatNumericLiteral(type, value)})\n`
		}
		result += "\n"

		const uniformFields = this.defsToFields("_unf", Number.MAX_SAFE_INTEGER, this.uniformFields)
		for(const field of uniformFields){
			result += this.fieldToDefString(field, "uniform")
		}

		let effectiveAttribsLimit = this.attribsLimit
		let vertexField: ShaderField | null = null
		if(this.vertexField){
			effectiveAttribsLimit--
			vertexField = {
				name: this.vertexField.name,
				type: this.vertexField.type,
				size: this.vertexField.size,
				sourceFields: [this.vertexField],
				resetValue: null
			}

			result += this.fieldToDefString(vertexField, "attribute")
		}

		let unprocessedAttribFields = this.attributeFields
		const resetSrcField = this.attributeFields.find(field => field.resetValue !== null)
		let resetField: ShaderField | null = null
		if(resetSrcField){
			effectiveAttribsLimit--
			unprocessedAttribFields = unprocessedAttribFields.filter(field => field !== resetSrcField)
			resetField = {
				name: resetSrcField.name,
				type: resetSrcField.type,
				size: resetSrcField.size,
				sourceFields: [resetSrcField],
				resetValue: resetSrcField.resetValue
			}
		}

		let attrFields = this.defsToFields("_attr", effectiveAttribsLimit, unprocessedAttribFields)
		if(resetField){
			// reset field must not be merged with anything else.
			// to achieve that, we process it separately
			attrFields = [resetField, ...attrFields]
		}
		for(const field of attrFields){
			result += this.fieldToDefString(field, "attribute")
		}

		for(const code of this.codeParts){
			result += code
			result += "\n\n"
		}

		sortBy(attrFields, field => field.name)
		sortBy(attrFields, field => field.size)
		sortBy(uniformFields, field => field.name)
		sortBy(uniformFields, field => field.size)

		return {
			code: result,
			attributes: attrFields,
			uniforms: uniformFields,
			vertexField,
			resetField
		}

	}

	private fieldTypeName(type: ShaderFieldType, count: number): string {
		switch(type){
			case "sampler2D": return "sampler2D"
			case "float": return count === 1 ? "float" : "vec" + count
			case "int": return count === 1 ? "int" : "ivec" + count
			case "uint": return count === 1 ? "uint" : "uvec" + count
		}
	}

	private fieldToDefString<M extends ShaderFieldSizeMap<string>>(field: ShaderField<M>, type: "uniform" | "attribute"): string {
		let result = `${type === "uniform" ? "uniform" : "in"} ${this.fieldTypeName(field.type, field.size)} ${field.name};\n`
		if(field.sourceFields.length === 1){
			if(field.sourceFields[0]!.name !== field.name){
				// we cannot allow that because you can't take [0] on a float
				// anyway, our resolution algo should just name fields as expected, so that's just sanity check
				throw new Error(`There's only one external field "${field.sourceFields[0]!.name}" for internal field "${field.name}", but names don't match; that's illegal`)
			}
		} else {
			let offset = 0
			for(const src of field.sourceFields){
				const size = src.size ?? 1
				result += `#define ${src.name} (${field.name}.${this.getSwizzlingAccessor(offset, size)})\n`
				offset += size
			}
		}
		return result
	}

	private defsToFields<M extends ShaderFieldSizeMap<string>>(namePrefix: string, limit: number, defs: readonly (ShaderAttribSourceField<keyof M & string, GlVecSize> | ShaderUniformSourceField<keyof M & string, GlVecSize>)[]): ShaderField<M>[] {
		const samplers: ShaderField<M>[] = []
		let floats: ShaderField<M>[] = []
		let ints: ShaderField<M>[] = []
		let uints: ShaderField<M>[] = []

		const [samplerDefs, numberDefs] = binaryGroup(defs, def => def.type === "sampler2D")
		for(const def of samplerDefs){
			samplers.push({
				name: def.name,
				sourceFields: [def],
				type: "sampler2D",
				size: 1,
				resetValue: null
			})
		}

		for(const def of numberDefs){
			const arr = def.type === "int" ? ints : def.type === "uint" ? uints : floats
			arr.push({
				name: def.name,
				sourceFields: [def],
				type: def.type,
				size: def.size ?? 1,
				resetValue: def.resetValue
			})
		}

		let synthFieldsCount = 0
		while(samplers.length + floats.length + ints.length + uints.length > limit){
			const intCompResult = this.tryCompressFields(ints, namePrefix, synthFieldsCount)
			const uintCompResult = this.tryCompressFields(uints, namePrefix, synthFieldsCount)
			const floatCompResult = this.tryCompressFields(floats, namePrefix, synthFieldsCount)

			if(intCompResult === null && floatCompResult === null && uintCompResult === null){
				throw new Error(`Failed to fit all the fields within the limit: limit is ${limit}, but lowest possible amount of fields is ${samplers.length + floats.length + ints.length + uints.length}`)
			}

			const leastFieldSize = Math.min(
				intCompResult?.[0] ?? Number.MAX_VALUE,
				floatCompResult?.[0] ?? Number.MAX_VALUE,
				uintCompResult?.[0] ?? Number.MAX_VALUE
			)
			if(intCompResult && leastFieldSize === intCompResult[0]){
				ints = intCompResult[1]
			} else if(uintCompResult && leastFieldSize === uintCompResult[0]){
				uints = uintCompResult[1]
			} else {
				floats = floatCompResult![1]
			}
			synthFieldsCount++
		}

		return [...samplers, ...ints, ...uints, ...floats]
	}

	private tryCompressFields<M extends ShaderFieldSizeMap<string>>(fields: readonly ShaderField<M>[], prefix: string, synthFieldsCount: number): [number, ShaderField<M>[]] | null {
		const smallestField = findLowestBy(fields, field => field.size)
		if(!smallestField || smallestField.size === glMaxVecSize){
			return null
		}

		let otherFields = fields.filter(x => x !== smallestField)
		const fieldsThatCanTakeTheSmallest = otherFields.filter(x => x.size + smallestField.size <= glMaxVecSize)
		const biggestCompressableField = findLowestBy(fieldsThatCanTakeTheSmallest, x => -x.size)
		if(!biggestCompressableField){
			return null
		}
		otherFields = otherFields.filter(x => x !== biggestCompressableField)

		const extFields = [
			...biggestCompressableField.sourceFields,
			...smallestField.sourceFields
		]
		const newSynthField: ShaderField<M> = {
			name: prefix + synthFieldsCount,
			type: smallestField.type,
			sourceFields: extFields,
			size: (biggestCompressableField.size + smallestField.size) as GlVecSize,
			resetValue: null
		}

		return [
			smallestField.size,
			[
				...otherFields,
				newSynthField
			]
		]

	}

	private formatNumericLiteral(type: ShaderNumberType, value: number): string {
		if(type === "int" || type === "uint"){
			return value.toFixed(0)
		}

		let result = value.toFixed(16)
		result = result.replace(/0+$/, "")
		if(result.endsWith(".")){
			result += "0"
		}
		return result
	}

	private getSwizzlingAccessor(offset: number, count: number): string {
		let result = ""
		for(let i = offset; i < count + offset; i++){
			result += swizzleLetters[i]
		}
		return result
	}

	addAttribute<const N extends string, const SS extends GlVecSize = 1>(name: N, field: Partial<Omit<ShaderAttribSourceField<N, SS>, "name">> = {}): ShaderBuilder<A & {[key in N]: SS}, U> {
		if(typeof(field.resetValue) === "number"){
			const oldResetField = this.attributeFields.find(x => x.resetValue !== null)
			if(oldResetField){
				throw new Error("Can't have two reset fields on one shader.")
			}
		}
		const fullField: ShaderAttribSourceField<N, SS> = {name, ...getFieldDefaults(), ...field}
		return this.clone(b => b.attributeFields = [...b.attributeFields, fullField])
	}

	/** Vertex field is different from other attribute fields.
	 * 1. other attribute fields are instanceable, vertex field is not
	 * 2. other attributes cannot be attached to vertex internal field
	 * 3. only one vertex field is allowed */
	addVertexField<const SS extends GlVecSize = 1>(name: string, field: Partial<Omit<ShaderAttribSourceField<string, SS>, "name">> = {}): ShaderBuilder<A, U> {
		if(this.vertexField !== null){
			throw new Error("This shader builder already has vertex field.")
		}
		const fullField: ShaderAttribSourceField<string, SS> = {name, ...getFieldDefaults(), ...field}
		return this.clone(b => b.vertexField = fullField)
	}

	addUniform<const N extends string, const SS extends GlVecSize = 1>(name: N, field: Partial<Omit<ShaderUniformSourceField<N, SS>, "name">> = {}): ShaderBuilder<A, U & {[key in N]: SS}> {
		const fullField: ShaderUniformSourceField<string, SS> = {name, ...getFieldDefaults(), ...field}
		return this.clone(b => b.uniformFields = [...b.uniformFields, fullField])
	}

	addConstant(name: string, def: Partial<Omit<ShaderConstant, "name" | "value">> & {value: ShaderConstant["value"]}): ShaderBuilder<A, U> {
		const fullConstant: ShaderConstant = {name, type: "float", ...def}
		return this.clone(b => b.constants = [...b.constants, fullConstant])
	}

	addCode(code: string): ShaderBuilder<A, U> {
		return this.clone(b => b.codeParts = [...b.codeParts, code])
	}

	setFloatPrecision(precision: ShaderPrecision): ShaderBuilder<A, U> {
		return this.clone(b => b.floatPrecision = precision)
	}

	setIntPrecision(precision: ShaderPrecision): ShaderBuilder<A, U> {
		return this.clone(b => b.intPrecision = precision)
	}

	setPrecision(precision: ShaderPrecision): ShaderBuilder<A, U> {
		return this.clone(b => {
			b.floatPrecision = b.intPrecision = precision
		})
	}

	setGlVersion(version: string): ShaderBuilder<A, U> {
		return this.clone(b => b.glVersion = version)
	}

	// should be set in runtime. can be queried by `gl.getParameter(gl.MAX_VERTEX_ATTRIBS)`
	// more attribs means less memory thoroughput
	// see also .loadLimitsFromContext()
	setAttribsLimit(limit: number): ShaderBuilder<A, U> {
		// limit of 31 is here because other parts of the engine may use bit masks to refer to attribs
		// and if we go over 31 - that will break
		return this.clone(b => b.attribsLimit = Math.min(limit, 31))
	}

	loadLimitsFromContext(gl: WebGL2RenderingContext): ShaderBuilder<A, U> {
		return this.setAttribsLimit(gl.getParameter(gl.MAX_VERTEX_ATTRIBS))
	}

}