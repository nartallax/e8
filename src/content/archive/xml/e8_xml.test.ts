import {describe, test} from "@nartallax/clamsensor"
import {expect} from "chai"
import {E8XmlReader} from "content/archive/xml/e8_xml_reader"
import {E8XmlWriter} from "content/archive/xml/e8_xml_writer"

describe("e8 xml", () => {
	test("reads-writes XML", () => {
		const enc = new E8XmlWriter("<b age=\"5\"><a na:me=\"uwu\"></a>ayaya</b>", new Map()).encode()
		const dec = new E8XmlReader(enc, []).decode()
		expect(dec).to.eql(`<b age="5">
  <a na:me="uwu"/>
  ayaya
</b>`)
	})

	test("strips comments", () => {
		const enc = new E8XmlWriter("<el><!-- comment --></el>", new Map()).encode()
		const dec = new E8XmlReader(enc, []).decode()
		expect(dec).to.eql("<el/>")
	})

	test("retains cdata", () => {
		const enc = new E8XmlWriter("<el><![CDATA[some stuff]]></el>", new Map()).encode()
		const dec = new E8XmlReader(enc, []).decode()
		expect(dec).to.eql("<el>\n  <![CDATA[some stuff]]>\n</el>")
	})

	test("retains xml declaration", () => {
		const enc = new E8XmlWriter("<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?>\n<a/>", new Map()).encode()
		const dec = new E8XmlReader(enc, []).decode()
		expect(dec).to.eql("<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?>\n<a/>")
	})

	test("retains doctype", () => {
		const enc = new E8XmlWriter("<!DOCTYPE NAME SYSTEM \"names.dtd\">\n<a/>", new Map()).encode()
		const dec = new E8XmlReader(enc, []).decode()
		expect(dec).to.eql("<!DOCTYPE NAME SYSTEM \"names.dtd\">\n<a/>")
	})

	test("uses name maps", () => {
		const index = ["b", "age", "na:me", "uwu", "ayaya"]
		const indexMap = new Map(index.map((str, index) => [str, index]))
		const input = "<b age=\"5\"><a na:me=\"uwu\"></a>ayaya</b>"

		const encNoMaps = new E8XmlWriter(input, new Map()).encode()
		const encWithMap = new E8XmlWriter(input, indexMap).encode()
		expect(encNoMaps.length).to.gt(encWithMap.length)

		const dec = new E8XmlReader(encWithMap, index).decode()
		expect(dec).to.eql(`<b age="5">
  <a na:me="uwu"/>
  ayaya
</b>`)
	})

	test("all of the above at once", () => {
		const index = ["b", "age", "na:me", "uwu", "ayaya", "ISO-8859-1"]
		const indexMap = new Map(index.map((str, index) => [str, index]))
		const enc = new E8XmlWriter("<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?>\n<!DOCTYPE NAME SYSTEM \"names.dtd\">\n<![CDATA[some stuff]]><b age=\"5\"><!-- cmt --><a na:me=\"uwu\"></a>ayaya</b>", indexMap).encode()
		const dec = new E8XmlReader(enc, index).decode()
		expect(dec).to.eql(`<?xml version="1.0" encoding="ISO-8859-1"?>
<!DOCTYPE NAME SYSTEM "names.dtd">
<![CDATA[some stuff]]>
<b age="5">
  <a na:me="uwu"/>
  ayaya
</b>`)
	})
})