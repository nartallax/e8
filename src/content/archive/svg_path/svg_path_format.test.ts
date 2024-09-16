import {describe, test} from "@nartallax/clamsensor"
import {expect} from "chai"
import {SvgPathReader} from "content/archive/svg_path/svg_path_reader"
import {SvgPathWriter} from "content/archive/svg_path/svg_path_writer"

describe("svg path format", () => {
	test("encodes and decodes a path", () => {
		const pathStr = "m -0.2752,-0.165 0.1459,-0.0756 0.1006,-0.1486 0.1821,0.1269 0.08,-0.0209 0.0634,0.1091 -0.0897,-0.0586 -0.0404,0.068 0.0988,0.0622 -0.1369,-0.0151 -7e-4,-0.0998 -0.1387,-0.0931 -0.0681,0.1013 L 0.0042,-0.148 0.0273,0 0.0043,0.1481 -0.0788,0.2094 -0.0107,0.3107 0.128,0.2176 0.1287,0.1178 0.2655,0.1026 0.1667,0.1648 0.2072,0.2328 0.2969,0.1742 0.2334,0.2833 0.1534,0.2624 -0.0287,0.3893 -0.1293,0.2406 -0.2752,0.165 V0 Z"
		const enc = new SvgPathWriter(pathStr).encode()
		expect(enc.length).to.lt(pathStr.length / 2)
		const dec = new SvgPathReader(enc).decode()

		// I'm not checking the whole string here because floats are imprecise and could change a bit and it's fine
		expect(dec).to.match(/^m -0\.275/)
		expect(dec).to.match(/ -0.0007\d+ /) // that's about -7e-4
		expect(dec).to.match(/ V 0 Z$/)
	})
})