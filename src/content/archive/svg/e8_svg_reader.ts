import {CssStyleReader} from "content/archive/css/css_style_reader"
import {defaultSvgXmlns} from "content/archive/svg/svg_optimizing"
import {SvgPathReader} from "content/archive/svg_path/svg_path_reader"
import {E8XmlReader} from "content/archive/xml/e8_xml_reader"
import * as XmlJs from "xml-js"

export class E8SvgReader extends E8XmlReader {

	protected readRootXmlElement(): XmlJs.Element {
		const root = super.readRootXmlElement()
		this.addDefaultNamespaceUrls(this.findSvgEl(root))
		return root
	}

	private findSvgEl(root: XmlJs.Element): XmlJs.Element {
		const svgRoot = (root.elements ?? []).find(el => el.name === "svg")
		if(!svgRoot){
			throw new Error("Malformed SVG, no root <svg> element")
		}
		return svgRoot
	}

	private addDefaultNamespaceUrls(svgRoot: XmlJs.Element) {
		const attrs = svgRoot.attributes ??= {}
		if(!("xmlns" in attrs)){
			attrs["xmlns"] = defaultSvgXmlns
		}
		if(!("xmlns:svg" in attrs)){
			attrs["xmlns:svg"] = defaultSvgXmlns
		}
	}

	protected readAttributeValue(attrName: string, elName: string): string {
		if(elName === "path" && attrName === "d"){
			return new SvgPathReader(this.buffer, this).decode()
		}

		if(attrName === "style"){
			return new CssStyleReader(this.buffer, this.stringIndex, this).decode()
		}

		return super.readAttributeValue(attrName, elName)
	}

}