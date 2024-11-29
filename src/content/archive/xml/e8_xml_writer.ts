import {BinformatEncoder} from "common/binformat/binformat_encoder"
import {BufferWriter} from "common/binformat/buffer_writer"
import * as XmlJs from "xml-js"

export const e8XmlStringReferredBit = 1 << 0
export const e8XmlStringTypeLength = 1 // referrence bit

export const enum E8XmlNodeType {
	text = 0,
	cdata = 1,
	element = 2,
	doctype = 3
}

export const e8XmlNodeReferredBit = 1 << 2
export const e8XmlNodeTypeLength = 3 // four values and referrence bit

export const e8XmlElementChildrenBit = 1 << 3
export const e8XmlElementAttributesBit = 1 << 4
export const e8XmlElementTypeLength = 5 // 2 bits for "element" costant, referrence bit, children bit, attributes bit

function* dfltGetStringsOfAttributeValue(value: string, attrName: string, elName: string): IterableIterator<string> {
	void attrName
	void elName // that's for overriding
	yield value
}

export class E8XmlWriter extends BinformatEncoder<string> {

	constructor(inputValue: string, protected readonly indexMap: ReadonlyMap<string, number>, writer?: BufferWriter) {
		super(inputValue, writer)
	}

	static getStrings(value: string): IterableIterator<string> {
		return this.getStringsOfElement(this.parseXml(value))
	}

	protected static parseXml(xml: string): XmlJs.Element {
		const params = {
			compact: false, // compact is for the case when you know the shape of the data
			nativeType: false, // no number/boolean attributes or text content
			ignoreComment: true, // we just don't need them
			// this flag is not in the typings for some reason
			nativeTypeAttributes: false
		}
		return XmlJs.xml2js(xml, params) as XmlJs.Element
	}

	protected static* getStringsOfElement(value: XmlJs.Element, getStringOfAttribute = dfltGetStringsOfAttributeValue): IterableIterator<string> {
		if(value.type === "comment"){
			return
		}

		if(value.type === "text" && typeof(value.text) === "string"){
			yield value.text
		}

		if(value.name){
			yield value.name
		}

		if(value.cdata){
			yield value.cdata
		}

		if(value.attributes){
			for(const [k, v] of Object.entries(value.attributes)){
				yield k
				if(typeof(v) === "string"){
					yield* getStringOfAttribute(v, k, value.name ?? "")
				}
			}
		}

		if(value.declaration?.attributes){
			for(const [k, v] of Object.entries(value.declaration.attributes)){
				yield k
				if(typeof(v) === "string"){
					yield* getStringOfAttribute(v, k, value.name ?? "")
				}
			}
		}

		if(value.elements){
			for(const child of value.elements){
				yield* this.getStringsOfElement(child, getStringOfAttribute)
			}
		}
	}

	protected writeRootValue(value: string): void {
		this.writeRootXmlElement(E8XmlWriter.parseXml(value))
	}

	protected writeRootXmlElement(root: XmlJs.Element) {
		const declAttributes = root.declaration?.attributes ?? {}
		this.writeAttributes(declAttributes, "?xml")

		this.writeArray(root.elements ?? [], el => {
			this.writeElement(el)
		})
	}

	private writeXmlString(value: string, baseType: number, refBit: number, bits: number) {
		const index = this.indexMap.get(value)
		if(index !== undefined){
			this.writePrefixedUint(index, baseType | refBit, bits)
		} else {
			this.writePrefixedString(value, baseType, bits)
		}
	}

	protected writeAttributeValue(value: string, attrName: string, elName: string) {
		void attrName
		void elName // that's for subclasses
		this.writeXmlString(value, 0, e8XmlStringReferredBit, e8XmlStringTypeLength)
	}

	protected writeAttribute(name: string, value: string, elName: string) {
		this.writeXmlString(name, 0, e8XmlStringReferredBit, e8XmlStringTypeLength)
		this.writeAttributeValue(value, name, elName)
	}

	private writeAttributes(attrs: XmlJs.Attributes | XmlJs.DeclarationAttributes, elName: string) {
		this.writeArray(Object.entries(attrs), ([k, v]) => {
			if(typeof(v) !== "string"){
				throw new Error("Expected attribute value to always be string")
			}
			this.writeAttribute(k, v, elName)
		})
	}

	private writeElement(el: XmlJs.Element) {
		if(el.type === "text"){
			const str = el.text ?? ""
			if(typeof(str) !== "string"){
				throw new Error("Expected text values to always be string")
			}
			this.writeXmlString(str, E8XmlNodeType.text, e8XmlNodeReferredBit, e8XmlNodeTypeLength)
			return
		}

		if(el.type === "doctype"){
			const str = el.doctype ?? ""
			this.writeXmlString(str, E8XmlNodeType.doctype, e8XmlNodeReferredBit, e8XmlNodeTypeLength)
			return
		}

		if(el.type === "cdata"){
			const str = el.cdata ?? ""
			this.writeXmlString(str, E8XmlNodeType.cdata, e8XmlNodeReferredBit, e8XmlNodeTypeLength)
			return
		}

		// only generic elements at this point, no more special cases left
		const elName = el.name
		if(!elName){
			throw new Error("Expected XML element to always have a name")
		}
		const hasAttributes = !!el.attributes && Object.keys(el.attributes).length > 0
		const hasChildren = !!el.elements && el.elements.length > 0
		const typeBits = E8XmlNodeType.element
		| (hasAttributes ? e8XmlElementAttributesBit : 0)
		| (hasChildren ? e8XmlElementChildrenBit : 0)
		this.writeXmlString(elName, typeBits, e8XmlNodeReferredBit, e8XmlElementTypeLength)

		if(hasAttributes){
			this.writeAttributes(el.attributes!, elName)
		}

		if(hasChildren){
			this.writeArray(el.elements!, el => {
				this.writeElement(el)
			})
		}
	}

}