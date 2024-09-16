import {CssStyleWriter} from "content/archive/css/css_style_writer"
import {optimizeSvg} from "content/archive/svg/svg_optimizing"
import {SvgPathWriter} from "content/archive/svg_path/svg_path_writer"
import {E8XmlWriter} from "content/archive/xml/e8_xml_writer"
import * as XmlJs from "xml-js"

export class E8SvgWriter extends E8XmlWriter {

	protected static parseSvg(svg: string): XmlJs.Element {
		const dom = E8XmlWriter.parseXml(svg)
		optimizeSvg(dom)
		return dom
	}

	protected writeRootValue(value: string): void {
		this.writeRootXmlElement(E8SvgWriter.parseSvg(value))
	}

	static getStrings(value: string): IterableIterator<string> {
		return E8XmlWriter.getStringsOfElement(this.parseSvg(value), function* (attrValue, attrName, elName) {
			if(attrName === "style"){
				yield* CssStyleWriter.getStrings(attrValue)
			} else if(elName === "path" && attrName === "d"){
				return // never index path value, it will never be used directly anyway
			} else {
				yield attrValue
			}
		})
	}

	protected writeAttributeValue(value: string, attrName: string, elName: string): void {
		if(elName === "path" && attrName === "d"){
			new SvgPathWriter(value, this.writer).encodeWithoutMerging()
			return
		}

		if(attrName === "style"){
			new CssStyleWriter(value, this.indexMap, this.writer).encodeWithoutMerging()
			return
		}

		super.writeAttributeValue(value, attrName, elName)
	}

}