import {makeAttribDataPackClass} from "graphics/webgl/attrib_data_pack"
import {SetterMap, Shader, ShaderField, ShaderFieldSizeMap, ShaderRevisionMap, ShaderSource} from "graphics/graphic_types"
import {getUniqueShaderFields} from "graphics/webgl/graphic_utils"
import {makeUniformSetterMap} from "graphics/webgl/uniforms"

export function makeShaderFromSources<A extends ShaderFieldSizeMap<string>, AA extends ShaderFieldSizeMap<string>, U extends ShaderFieldSizeMap<string>, UU extends ShaderFieldSizeMap<string>>({
	gl, vertexSource, fragmentSource, packSize, vertexBuffer, indexBuffer
}: {gl: WebGL2RenderingContext, vertexSource: ShaderSource<A, U>, fragmentSource: ShaderSource<AA, UU>, packSize: number, vertexBuffer: WebGLBuffer, indexBuffer: WebGLBuffer}): Shader<A & AA, U & UU> {
	const vertexField = vertexSource.vertexField
	if(!vertexField){
		throw new Error("Cannot make shader without vertex field")
	}
	const attribs = getUniqueShaderFields<A & AA>([...vertexSource.attributes, ...fragmentSource.attributes])

	const {program, shaders} = makeProgram(gl, vertexSource.code, fragmentSource.code)

	const Pack = makeAttribDataPackClass<A & AA>({
		gl, program, vertexField, arraySize: packSize, attribs, vertexBuffer, indexBuffer
	})

	const uniforms = [...vertexSource.uniforms, ...fragmentSource.uniforms]
	const setters: SetterMap<U & UU> = makeUniformSetterMap<U & UU>(gl, program, uniforms)
	const shader: Shader<A & AA, U & UU> = {
		...setters as any, // ffs. I don't know what's wrong with types here
		uniformRevisions: makeRevisions<U & UU>(uniforms),
		packSize,
		delete: () => {
			gl.deleteProgram(program)
			for(const shader of shaders){
				gl.deleteShader(shader)
			}
		},
		makePack: () => new Pack(),
		activate: () => {
			gl.useProgram(program)
		},
		lastActiveFrame: -1
	}

	return shader
}

function makeRevisions<M extends ShaderFieldSizeMap<string>>(fields: ShaderField<M>[]): ShaderRevisionMap<M> {
	const result: Record<string, number> = {}
	for(const field of fields){
		result[field.name] = -1
	}
	return result as ShaderRevisionMap<M>
}

function makeProgram(gl: WebGL2RenderingContext, vertexShaderCode: string, fragmentShaderCode: string): {program: WebGLProgram, shaders: WebGLShader[]} {
	let fragShader: WebGLShader | null = null
	let vertShader: WebGLShader | null = null
	let program: WebGLProgram | null = null
	try {
		fragShader = makeShader(gl, "fragment", fragmentShaderCode)
		vertShader = makeShader(gl, "vertex", vertexShaderCode)
		program = gl.createProgram()
		if(!program){
			throw new Error("No webgl program was created.")
		}

		gl.attachShader(program, fragShader)
		gl.attachShader(program, vertShader)
		gl.linkProgram(program)

		const success = gl.getProgramParameter(program, gl.LINK_STATUS)
		const log = gl.getProgramInfoLog(program)
		if(!success){
			throw new Error("Failed to link program: " + log)
		} else if(log){
			console.warn("WebGL program log: ", log)
		}

		return {program, shaders: [fragShader, vertShader]}
	} catch(e){
		if(fragShader){
			gl.deleteShader(fragShader)
		}
		if(vertShader){
			gl.deleteShader(vertShader)
		}
		if(program){
			gl.deleteProgram(program)
		}
		throw e
	}
}

function makeShader(gl: WebGL2RenderingContext, type: "vertex" | "fragment", code: string): WebGLShader {
	let shader: WebGLShader | null = null
	try {
		shader = gl.createShader(type === "vertex" ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER)
		if(!shader){
			throw new Error("No shader is created of type " + type)
		}
		gl.shaderSource(shader, code)
		gl.compileShader(shader)

		const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
		const log = gl.getShaderInfoLog(shader)
		if(!success){
			console.log(code)
			throw new Error("Failed to compile shader of type " + type + ": " + log)
		} else if(log){
			console.warn("WebGL " + type + " shader compile log: ", log)
		}

		return shader
	} catch(e){
		gl.deleteShader(shader)
		throw e
	}
}