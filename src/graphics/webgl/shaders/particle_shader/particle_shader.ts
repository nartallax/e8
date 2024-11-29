import {makeShaderFromSources} from "graphics/webgl/shader"
import {ShaderBuilder} from "graphics/webgl/shader_builder/shader_builder"
import applyCameraSettings from "graphics/webgl/shader_parts/apply_camera_settings.glsl"
import getRotationMatrix from "graphics/webgl/shader_parts/get_rotation_matrix.glsl"
import calculateTexCoord from "graphics/webgl/shader_parts/calculate_tex_coord.glsl"
import unpackUintColor from "graphics/webgl/shader_parts/unpack_uint_color.glsl"
import vertexMain from "graphics/webgl/shaders/particle_shader/particle_shader.vertex.glsl"
import fragmentMain from "graphics/webgl/shaders/particle_shader/particle_shader.fragment.glsl"

export type ParticleShader = ReturnType<typeof makeParticleShader>

export const makeParticleShader = (gl: WebGL2RenderingContext, vertexBuffer: WebGLBuffer, indexBuffer: WebGLBuffer) => {
	const vertexSource = new ShaderBuilder()
		.loadLimitsFromContext(gl)
		.addVertexField("vertex", {size: 2})
		.addConstant("PI", {value: Math.PI})
		.addConstant("PI2", {value: Math.PI * 2})
		.addAttribute("particleSize", {size: 4}) // width start, height start, width end, height end
		.addAttribute("particlePosition", {size: 4, resetValue: 1024 * 1024}) // start position, end position
		.addAttribute("particleRotation", {size: 2}) // start rotation, end rotation
		.addAttribute("texturePosition", {size: 4}) // u, v, w, h
		.addAttribute("particleTime", {size: 2}) // particle added, particle life duration
		.addAttribute("particleColor", {size: 2, type: "uint"}) // start, end
		.addAttribute("particleProgressPower", {size: 4}) // size, position, rotation, color
		.addUniform("screenSize", {size: 2})
		.addUniform("camera", {size: 3}) // x, y, zoom
		.addUniform("currentTime") // current frame time
		.addCode(getRotationMatrix)
		.addCode(calculateTexCoord)
		.addCode(applyCameraSettings)
		.addCode(unpackUintColor)
		.addCode(vertexMain)
		.build()

	const fragmentSource = new ShaderBuilder()
		.loadLimitsFromContext(gl)
		.setFloatPrecision("medium")
		.addUniform("image", {type: "sampler2D"})
		.addCode(fragmentMain)
		.build()

	// 256 is not even properly tested. maybe much more/less will yield more performance
	return makeShaderFromSources({
		gl, vertexSource, fragmentSource, packSize: 256, vertexBuffer, indexBuffer
	})
}