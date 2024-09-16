import {describe, test} from "@nartallax/clamsensor"
import {expect} from "chai"
import {E8SvgReader} from "content/archive/svg/e8_svg_reader"
import {E8SvgWriter} from "content/archive/svg/e8_svg_writer"

describe("e8 svg", () => {
	test("encodes and decodes svg", () => {
		const svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg
   width="64"
   height="64"
   viewBox="-0.5 -0.5 1 1"
   version="1.1"
   id="svg1091"
   sodipodi:docname="robot.svg"
   inkscape:version="1.2.1 (9c6d41e, 2022-07-14)"
   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
   xmlns="http://www.w3.org/2000/svg"
   xmlns:svg="http://www.w3.org/2000/svg?THATS_NOT_THE_DEFAULT_VALUE_HERE">
  <defs
     id="defs1095" />
  <sodipodi:namedview
     id="namedview1093"
     pagecolor="#505050"
     bordercolor="#ffffff"
     borderopacity="1"
     inkscape:showpageshadow="0"
     inkscape:pageopacity="0"
     inkscape:pagecheckerboard="1"
     inkscape:deskcolor="#505050"
     showgrid="false"
     inkscape:zoom="3.6301089"
     inkscape:cx="22.31338"
     inkscape:cy="15.15106"
     inkscape:window-width="1920"
     inkscape:window-height="1056"
     inkscape:window-x="0"
     inkscape:window-y="24"
     inkscape:window-maximized="0"
     inkscape:current-layer="svg1091" />
  <path
     style="fill:#03b3b3;fill-opacity:1;stroke:#666666;stroke-width:0.03;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"
     d="m -0.2752,-0.165 0.1459,-0.0756 0.1006,-0.1486 0.1821,0.1269 0.08,-0.0209 0.0634,0.1091 -0.0897,-0.0586 -0.0404,0.068 0.0988,0.0622 -0.1369,-0.0151 -7e-4,-0.0998 -0.1387,-0.0931 -0.0681,0.1013 L 0.0042,-0.148 0.0273,0 0.0043,0.1481 -0.0788,0.2094 -0.0107,0.3107 0.128,0.2176 0.1287,0.1178 0.2655,0.1026 0.1667,0.1648 0.2072,0.2328 0.2969,0.1742 0.2334,0.2833 0.1534,0.2624 -0.0287,0.3893 -0.1293,0.2406 -0.2752,0.165 V0Z"
     id="path1089" />
</svg>
`
		const index = ["version", "path", "width", "64"]
		const indexMap = new Map(index.map((str, index) => [str, index]))
		const enc = new E8SvgWriter(svg, indexMap).encode()
		expect(enc.length).to.lt(svg.length / 3)

		const dec = new E8SvgReader(enc, index).decode()
		expect(dec).to.match(/<path style="fill: #03b3b3/)
		expect(dec).to.match(/ d="m -0.2752[^"]+ V 0 Z"/)
		expect(dec).to.match(/ xmlns="http/)
		expect(dec).to.match(/ xmlns:svg="http:\/\/www.w3.org\/2000\/svg\?THATS_NOT_THE_DEFAULT_VALUE_HERE"/)
		expect(dec).to.match(/ viewBox="-0.5 -0.5 1 1" /)
		expect(dec).to.match(/ width="64" /)
		expect(dec).to.match(/ height="64" /)
		expect(dec).to.not.match(/sodipodi/)
		expect(dec).to.not.match(/inkscape/)
		expect(dec).to.not.match(/ id="/)
	})
})