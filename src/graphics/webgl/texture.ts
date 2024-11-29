export async function loadSvgAsTexture(gl: WebGL2RenderingContext, svg: string): Promise<WebGLTexture> {
	const blob = new Blob([svg], {type: "image/svg+xml"})
	const url = URL.createObjectURL(blob)
	try {
		return await loadTexture(gl, url)
	} finally {
		URL.revokeObjectURL(url)
	}

}

function loadTexture(gl: WebGL2RenderingContext, url: string): Promise<WebGLTexture> {
	return new Promise((ok, bad) => {
		const img = new Image()
		img.onload = () => {
			try {
				const tex = makeBindSetupTexture(gl)
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
				gl.generateMipmap(gl.TEXTURE_2D)
				ok(tex)
			} catch(e){
				bad(e)
			}
		}
		img.onerror = () => {
			bad(new Error("Failed to load texture: " + url))
		}
		img.src = url
	})
}

function makeBindSetupTexture(gl: WebGL2RenderingContext): WebGLTexture {
	const tex = gl.createTexture()
	if(!tex){
		throw new Error("No texture was created.")
	}
	gl.activeTexture(gl.TEXTURE0)
	gl.bindTexture(gl.TEXTURE_2D, tex)
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST)
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
	return tex
}