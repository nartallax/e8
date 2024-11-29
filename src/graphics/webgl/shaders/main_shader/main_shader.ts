import {makeShaderFromSources} from "graphics/webgl/shader"
import {ShaderBuilder} from "graphics/webgl/shader_builder/shader_builder"
import interpolateRotation from "graphics/webgl/shader_parts/interpolate_rotation.glsl"
import applyCameraSettings from "graphics/webgl/shader_parts/apply_camera_settings.glsl"
import getRotationMatrix from "graphics/webgl/shader_parts/get_rotation_matrix.glsl"
import calculateTexCoord from "graphics/webgl/shader_parts/calculate_tex_coord.glsl"
import getTickProgress from "graphics/webgl/shader_parts/get_tick_progress.glsl"
import vertexMain from "graphics/webgl/shaders/main_shader/main_shader.vertex.glsl"
import fragmentMain from "graphics/webgl/shaders/main_shader/main_shader.fragment.glsl"

export type MainShader = ReturnType<typeof makeMainShader>

export const makeMainShader = (gl: WebGL2RenderingContext, vertexBuffer: WebGLBuffer, indexBuffer: WebGLBuffer) => {
	const vertexSource = new ShaderBuilder()
		.loadLimitsFromContext(gl)
		.addVertexField("vertex", {size: 2})
		.addConstant("PI", {value: Math.PI})
		.addConstant("PI2", {value: Math.PI * 2})
		.addAttribute("entitySize", {size: 2})
		.addAttribute("entityPosition", {size: 4, resetValue: 1024 * 1024}) // previous tick position, current tick position
		.addAttribute("entityRotation", {size: 2}) // previous rotation, current rotation
		.addAttribute("texturePosition", {size: 4}) // u, v, w, h
		.addUniform("screenSize", {size: 2})
		.addUniform("camera", {size: 3}) // x, y, zoom
		.addUniform("tickTime", {size: 2}) // previous tick time, current tick time
		.addUniform("currentTime") // current frame time
		.addCode(interpolateRotation)
		.addCode(getTickProgress)
		.addCode(getRotationMatrix)
		.addCode(calculateTexCoord)
		.addCode(applyCameraSettings)
		.addCode(vertexMain)
		.build()

	const fragmentSource = new ShaderBuilder()
		.loadLimitsFromContext(gl)
		.setFloatPrecision("medium")
		.addUniform("image", {type: "sampler2D"})
		.addCode(fragmentMain)
		.build()

	return makeShaderFromSources({
		gl, vertexSource, fragmentSource, packSize: 32, vertexBuffer, indexBuffer
	})
}