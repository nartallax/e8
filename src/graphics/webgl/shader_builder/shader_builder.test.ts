import {describe, test} from "@nartallax/clamsensor"
import {expect} from "chai"
import {ShaderBuilder} from "graphics/webgl/shader_builder/shader_builder"

describe("shader builder", () => {
	test("can generate shader", () => {
		const builder = new ShaderBuilder()
			.addAttribute("coords", {type: "float", size: 2})
			.addUniform("time", {type: "float", size: 2})
			.addUniform("tickCount", {type: "int"})
			.addConstant("PI", {value: Math.PI})
			.addCode(`
out vec2 texCoord;

void main() {
	texCoord = calculateTexCoord();
	gl_Position = applyCameraSettings(result);
}
`)
		const result = builder.build()
		const {code, attributes, uniforms} = result

		expect(code).contain("uniform int tickCount;")
		expect(code).contain("uniform vec2 time;")
		expect(code).contain("in vec2 coords;")

		expect(attributes.length).eql(1)
		expect(uniforms.length).eql(2)
	})

	test("will throw if can't fit everything into attribs limit", () => {
		const builder = new ShaderBuilder()
			.setAttribsLimit(1)
			.addAttribute("xyz", {size: 3})
			.addAttribute("abc", {size: 3})

		expect(() => builder.build()).throw(/Failed to fit/)
	})

	test("can compact fields", () => {
		const builder = new ShaderBuilder()
			.setAttribsLimit(2)
			.addAttribute("xyz", {size: 3})
			.addAttribute("abc", {size: 3})
			.addAttribute("i")
			.addAttribute("j")
		const result = builder.build()

		expect(result.code).contain("in vec4 _attr0;")
		expect(result.code).contain("#define xyz (_attr0.xyz)")
		expect(result.code).contain("#define i (_attr0.w)")

		expect(result.code).contain("in vec4 _attr1;")
		expect(result.code).contain("#define abc (_attr1.xyz)")
		expect(result.code).contain("#define j (_attr1.w)")

		expect(result.attributes.length).eql(2)
	})

	test("won't break single large fields when compacting", () => {
		const builder = new ShaderBuilder()
			.setAttribsLimit(2)
			.addAttribute("xyz", {size: 3})
			.addAttribute("abc", {size: 3})
			.addAttribute("ij", {size: 2})

		expect(() => builder.build()).throw(/Failed to fit/)
	})

	test("can use uints", () => {
		const shader = new ShaderBuilder()
			.addAttribute("abc", {type: "uint"})
			.addAttribute("def", {type: "uint", size: 3})
			.build()

		expect(shader.code).contain("in uint abc;")
		expect(shader.code).contain("in uvec3 def;")
	})
})