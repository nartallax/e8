export function setViewportSizeByCanvas(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement): {width: number, height: number} {
	const width = canvas.clientWidth * window.devicePixelRatio
	const height = canvas.clientHeight * window.devicePixelRatio
	canvas.width = width
	canvas.height = height
	gl.viewport(0, 0, width, height)
	return {width, height}
}

export function createWebgl2Canvas(): [HTMLCanvasElement, WebGL2RenderingContext] {
	const canvas = document.createElement("canvas")
	const gl = canvas.getContext("webgl2")
	if(!gl){
		throw new Error("WebGL2 is not supported.")
	}
	gl.enable(gl.BLEND)
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
	gl.disable(gl.SCISSOR_TEST) // can be good, need further investigation
	gl.disable(gl.CULL_FACE)
	gl.disable(gl.DEPTH_TEST)
	gl.disable(gl.POLYGON_OFFSET_FILL)
	gl.disable(gl.STENCIL_TEST)
	return [canvas, gl]
}