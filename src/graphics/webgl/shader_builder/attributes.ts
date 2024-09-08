import {ShaderFieldSizeMap, ShaderField} from "graphics/graphic_types"

type AttribArraysAndData = {
	// all linked by index
	data: (Float32Array | Int32Array | Uint32Array)[]
	buffers: WebGLBuffer[]
}

export function makeAttribArrayCreator<M extends ShaderFieldSizeMap<string>>(gl: WebGL2RenderingContext, locations: readonly number[], arraySize: number, fields: readonly ShaderField<M>[]): () => AttribArraysAndData {
	return () => {
		const data = new Array(locations.length)
		const buffers = new Array(locations.length)
		for(let i = 0; i < locations.length; i++){
			const field = fields[i]!
			const arr = data[i] = makeDataArray(field, arraySize)
			buffers[i] = makeBuffer(gl, arr, field.size, locations[i]!)
		}
		return {data, buffers}
	}
}

function makeDataArray<M extends ShaderFieldSizeMap<string>>(field: ShaderField<M>, arraySize: number): Float32Array | Int32Array | Uint32Array {
	const arr = field.type === "float" ? new Float32Array(arraySize * field.size)
		: field.type === "int" ? new Int32Array(arraySize * field.size)
			: new Uint32Array(arraySize * field.size)
	if(field.resetValue !== null){
		arr.fill(field.resetValue)
	}
	return arr
}

function makeBuffer(gl: WebGL2RenderingContext, data: Float32Array | Int32Array | Uint32Array, fieldSize: number, location: number): WebGLBuffer {
	const buffer = gl.createBuffer()
	if(!buffer){
		throw new Error("Buffer was not created.")
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
	gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW)
	// this must be done when proper vao is active
	gl.enableVertexAttribArray(location)
	if(data instanceof Float32Array){
		gl.vertexAttribPointer(location, fieldSize, gl.FLOAT, false, 0, 0)
	} else {
		gl.vertexAttribIPointer(location, fieldSize, data instanceof Uint32Array ? gl.UNSIGNED_INT : gl.INT, 0, 0)
	}
	gl.vertexAttribDivisor(location, 1)
	return buffer
}