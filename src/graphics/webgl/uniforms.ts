import {SettersByArity, ShaderFieldSizeMap, ShaderField, SetterMap} from "graphics/graphic_types"
import {getUniqueShaderFields, makeSetterName} from "graphics/webgl/graphic_utils"

export function makeUniformSetterMap<M extends ShaderFieldSizeMap<string>>(gl: WebGL2RenderingContext, program: WebGLProgram, fields: readonly ShaderField<M>[]): SetterMap<M> {
	const uniforms: Partial<SetterMap<M>> = {}
	for(const field of getUniqueUniforms(fields)){
		(uniforms as any)[makeSetterName(field.name)] = makeUniform(gl, program, field) as any // ffs, I'm tired of dealing with those types
	}
	return uniforms as unknown as SetterMap<M>
}

function makeUniform<M extends ShaderFieldSizeMap<string>, K extends keyof M & string>(gl: WebGL2RenderingContext, program: WebGLProgram, field: ShaderField<M>): SettersByArity[M[K]] {
	const loc = gl.getUniformLocation(program, field.name)
	if(field.type === "float"){
		switch(field.size){
			case 1: return (a: number) => {
				gl.uniform1f(loc, a)
			}
			case 2: return ((a: number, b: number) => {
				gl.uniform2f(loc, a, b)
			}) as SettersByArity[M[K]]
			case 3: return ((a: number, b: number, c: number) => {
				gl.uniform3f(loc, a, b, c)
			}) as SettersByArity[M[K]]
			case 4: return ((a: number, b: number, c: number, d: number) => {
				gl.uniform4f(loc, a, b, c, d)
			}) as SettersByArity[M[K]]
		}
	} else {
		switch(field.size){
			case 1: return ((a: number) => {
				gl.uniform1i(loc, a)
			})
			case 2: return ((a: number, b: number) => {
				gl.uniform2i(loc, a, b)
			}) as SettersByArity[M[K]]
			case 3: return ((a: number, b: number, c: number) => {
				gl.uniform3i(loc, a, b, c)
			}) as SettersByArity[M[K]]
			case 4: return ((a: number, b: number, c: number, d: number) => {
				gl.uniform4i(loc, a, b, c, d)
			}) as SettersByArity[M[K]]
		}
	}
}

function getUniqueUniforms<M extends ShaderFieldSizeMap<string>>(allFields: readonly ShaderField<M>[]): ShaderField<M>[] {
	const uniforms = getUniqueShaderFields(allFields)

	for(const field of allFields){
		if(field.sourceFields.length !== 1){
			throw new Error("Only one uniform per field is allowed, builder is broken")
		}
	}

	return uniforms
}