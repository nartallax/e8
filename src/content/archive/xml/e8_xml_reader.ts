import {BinformatDecoder} from "common/binformat/binformat_decoder"
import {E8XmlNodeType, e8XmlElementAttributesBit, e8XmlElementChildrenBit, e8XmlElementTypeLength, e8XmlNodeReferredBit, e8XmlNodeTypeLength, e8XmlStringReferredBit, e8XmlStringTypeLength} from "content/archive/xml/e8_xml_writer"
import * as XmlJs from "xml-js"

export class E8XmlReader extends BinformatDecoder<string> {

	constructor(buffer: Uint8Array, protected readonly stringIndex: readonly string[], parentDecoder?: BinformatDecoder<unknown>) {
		super(buffer, parentDecoder)
	}

	protected readRootValue(): string {
		const root = this.readRootXmlElement()
		return XmlJs.js2xml(root, {spaces: "  ", indentText: true, indentAttributes: false, indentCdata: true})
	}

	protected readRootXmlElement(): XmlJs.Element {
		const root: XmlJs.Element = {}

		const declAttrs = this.readAttributes("?xml")
		if(Object.keys(declAttrs).length > 0){
			root.declaration = {attributes: declAttrs}
		}

		root.elements = this.readArray(() => this.readElement())

		return root
	}

	private readXmlString(refBit: number, prefixBitLength: number): string {
		const prefix = this.peekPrefix(prefixBitLength)
		if((prefix & refBit) !== 0){
			const index = this.readPrefixedUint(prefixBitLength)
			return this.stringIndex[index]!
		} else {
			return this.readPrefixedString(prefixBitLength)
		}
	}

	protected readAttributeValue(attrName: string, elName: string): string {
		void attrName, elName // that's for subclasses
		return this.readXmlString(e8XmlStringReferredBit, e8XmlStringTypeLength)
	}

	private readAttributes(elName: string): Record<string, string> {
		const result: Record<string, string> = {}
		this.readArrayElements(() => {
			const k = this.readXmlString(e8XmlStringReferredBit, e8XmlStringTypeLength)
			const v = this.readAttributeValue(k, elName)
			result[k] = v
		})
		return result
	}

	private readElement(): XmlJs.Element {
		const prefix = this.peekPrefix(e8XmlNodeTypeLength)
		const type = prefix & 0x3

		if(type === E8XmlNodeType.text){
			return {
				type: "text",
				text: this.readXmlString(e8XmlNodeReferredBit, e8XmlNodeTypeLength)
			}
		}

		if(type === E8XmlNodeType.cdata){
			return {
				type: "cdata",
				cdata: this.readXmlString(e8XmlNodeReferredBit, e8XmlNodeTypeLength)
			}
		}

		if(type === E8XmlNodeType.doctype){
			return {
				type: "doctype",
				doctype: this.readXmlString(e8XmlNodeReferredBit, e8XmlNodeTypeLength)
			}
		}

		const elTypeBits = this.peekPrefix(e8XmlElementTypeLength)
		const hasChildren = (elTypeBits & e8XmlElementChildrenBit) > 0
		const hasAttributes = (elTypeBits & e8XmlElementAttributesBit) > 0

		const name = this.readXmlString(e8XmlNodeReferredBit, e8XmlElementTypeLength)
		const result: XmlJs.Element = {type: "element", name}

		if(hasAttributes){
			result.attributes = this.readAttributes(name)
		}

		if(hasChildren){
			result.elements = this.readArray(() => this.readElement())
		}

		return result
	}

}