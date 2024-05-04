const squareVertexData: readonly number[] = [0, 0, 1, 0, 1, 1, 0, 1]
const squareIndexData: readonly number[] = [0, 1, 2, 0, 2, 3]

function makeBindBuffer(gl: WebGL2RenderingContext, target: GLenum): WebGLBuffer {
	const buf = gl.createBuffer()
	if(!buf){
		throw new Error("Buffer was not created.")
	}
	gl.bindBuffer(target, buf)
	return buf
}

/** Make vertex buffer that contains 2d coordinates for a square with side length = 1 */
export function makeSquareVertexBuffer(gl: WebGL2RenderingContext): WebGLBuffer {
	const buffer = makeBindBuffer(gl, gl.ARRAY_BUFFER)
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(squareVertexData), gl.STATIC_DRAW)
	return buffer
}

/** Make corresponding index buffer for vertex from `makeSquareVertexBuffer()` */
export function makeSquareIndexBuffer(gl: WebGL2RenderingContext): WebGLBuffer {
	const buffer = makeBindBuffer(gl, gl.ELEMENT_ARRAY_BUFFER)
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(squareIndexData), gl.STATIC_DRAW)
	return buffer
}