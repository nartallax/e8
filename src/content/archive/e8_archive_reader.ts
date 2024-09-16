import {BinformatDecoder} from "common/binformat/binformat_decoder"
import {E8ArchiveEntryCode, E8ArchiveFile, e8ArchiveEntryTypeBitLength} from "content/archive/e8_archive_writer"
import {Forest, Tree} from "common/tree"
import {E8JsonReader} from "content/archive/json/e8_json_reader"
import {E8XmlReader} from "content/archive/xml/e8_xml_reader"
import {E8SvgReader} from "content/archive/svg/e8_svg_reader"

type E8ArchiveEntryDebugInfo = {
	code: number
	name: string | undefined
	value: unknown
	byteLength: number
}

export class E8ArchiveReader extends BinformatDecoder<Forest<E8ArchiveFile, string>> {

	private jsonStringIndex: readonly string[] = []
	private xmlStringIndex: readonly string[] = []
	private svgStringIndex: readonly string[] = []
	private filenameSuffixIndex: readonly string[] = []

	protected readRootValue(): Forest<E8ArchiveFile, string> {
		this.checkMagicBytes()

		const result: Tree<E8ArchiveFile, string>[] = []

		while(!this.isAtEndOfFile()){
			const entry = this.readEntry().tree
			if(entry){
				result.push(entry)
			}
		}

		return result
	}

	private checkMagicBytes(): void {
		const firstByte = this.readByte()
		const secondByte = this.readByte()
		if(firstByte !== 0xe8 || secondByte !== 0xa0){
			throw new Error("Broken e8a file: incorrect magic bytes.")
		}
	}

	// debug/test function
	getRootEntryList(mapDictionaryValue?: (value: string) => string): E8ArchiveEntryDebugInfo[] {
		this.checkMagicBytes()

		const result: E8ArchiveEntryDebugInfo[] = []
		while(!this.isAtEndOfFile()){
			const code = this.peekPrefix(e8ArchiveEntryTypeBitLength)
			const startIndex = this.index
			const entry = this.readEntry()
			const byteLength = this.index - startIndex
			const value = entry.entryValue
			const treeValue = entry.tree?.value
			const name = typeof(treeValue) === "string" ? treeValue : treeValue?.fileName
			if(mapDictionaryValue && new Set([E8ArchiveEntryCode.filenameSuffixIndex, E8ArchiveEntryCode.svgStringIndex, E8ArchiveEntryCode.xmlStringIndex, E8ArchiveEntryCode.jsonStringIndex]).has(code) && Array.isArray(value)){
				for(let i = 0; i < value.length; i++){
					value[i] = mapDictionaryValue(value[i])
				}
			}
			result.push({code, value, name, byteLength})
		}
		return result
	}

	private readEntry(): {tree: Tree<E8ArchiveFile, string> | null, entryValue: unknown} {
		const entryCode = this.peekPrefix(e8ArchiveEntryTypeBitLength)
		const fileName = this.readFileName()
		switch(entryCode){
			case E8ArchiveEntryCode.jsonStringIndex: {
				this.jsonStringIndex = this.readStringIndex()
				return {tree: null, entryValue: this.jsonStringIndex}
			}

			case E8ArchiveEntryCode.xmlStringIndex: {
				this.xmlStringIndex = this.readStringIndex()
				return {tree: null, entryValue: this.xmlStringIndex}
			}

			case E8ArchiveEntryCode.svgStringIndex: {
				this.svgStringIndex = this.readStringIndex()
				return {tree: null, entryValue: this.svgStringIndex}
			}

			case E8ArchiveEntryCode.filenameSuffixIndex: {
				this.filenameSuffixIndex = this.readStringIndex()
				return {tree: null, entryValue: this.filenameSuffixIndex}
			}

			case E8ArchiveEntryCode.binarySuffixed:
			case E8ArchiveEntryCode.binary:{
				const fileContent = this.readByteArray()
				return {
					tree: {value: {fileName, fileContent}},
					entryValue: fileContent
				}
			}

			case E8ArchiveEntryCode.e8jsonSuffixed:
			case E8ArchiveEntryCode.e8json: {
				const json = new E8JsonReader(this.buffer, this.jsonStringIndex, this).decode()
				const jsonBinary = new TextEncoder().encode(JSON.stringify(json, null, 2))
				return {
					tree: {value: {fileName, fileContent: jsonBinary}},
					entryValue: json
				}
			}

			case E8ArchiveEntryCode.e8xml:
			case E8ArchiveEntryCode.e8xmlSuffixed: {
				const xml = new E8XmlReader(this.buffer, this.xmlStringIndex, this).decode()
				const xmlBinary = new TextEncoder().encode(xml)
				return {
					tree: {value: {fileName, fileContent: xmlBinary}},
					entryValue: xml
				}
			}

			case E8ArchiveEntryCode.e8svg:
			case E8ArchiveEntryCode.e8svgSuffixed: {
				const svg = new E8SvgReader(this.buffer, this.svgStringIndex, this).decode()
				const svgBinary = new TextEncoder().encode(svg)
				return {
					tree: {value: {fileName, fileContent: svgBinary}},
					entryValue: svg
				}
			}

			case E8ArchiveEntryCode.directory: {
				const children = this.readArray(() => {
					const entry = this.readEntry().tree
					if(!entry){
						throw new Error("Illegal e8a entry structure: only files and directories are allowed within directory; indices must reside in root.")
					}
					return entry
				})
				return {
					tree: {value: fileName, children},
					entryValue: fileName
				}
			}

			default: throw new Error(`Unknown e8a entry code: ${entryCode}`)
		}
	}

	private readFileName(): string {
		const entryCode = this.peekPrefix(e8ArchiveEntryTypeBitLength)
		let name = this.readPrefixedString(e8ArchiveEntryTypeBitLength)
		if(entryCode === E8ArchiveEntryCode.binarySuffixed
		|| entryCode === E8ArchiveEntryCode.e8jsonSuffixed
		|| entryCode === E8ArchiveEntryCode.e8svgSuffixed
		|| entryCode === E8ArchiveEntryCode.e8xmlSuffixed){
			const index = this.readUint()
			name += this.filenameSuffixIndex[index]
		}
		return name
	}

	private readStringIndex(): string[] {
		return this.readArray(() => this.readString())
	}

}