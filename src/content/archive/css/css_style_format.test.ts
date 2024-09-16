import {describe, test} from "@nartallax/clamsensor"
import {expect} from "chai"
import {CssStyleReader} from "content/archive/css/css_style_reader"
import {CssStyleWriter} from "content/archive/css/css_style_writer"

describe("css style format", () => {
	test("should write and read CSS style string", () => {
		const encoded = new CssStyleWriter("fill:#03b3b3;fill-opacity:1;stroke:#666; stroke-width:0.03 ;stroke-linecap: butt;stroke-linejoin :miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1").encode()
		const decoded = new CssStyleReader(encoded).decode()

		expect(decoded).to.eql("fill: #03b3b3; fill-opacity: 1; stroke: #666666; stroke-width: 0.03; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 4; stroke-dasharray: none; stroke-opacity: 1")
	})
})