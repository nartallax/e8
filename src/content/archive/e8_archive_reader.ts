import {BinformatDecoder} from "common/binformat/binformat_decoder"
import {E8ArchiveEntryCode, E8ArchiveFile, e8ArchiveEntryTypeBitLength} from "content/archive/e8_archive_writer"
import {Forest, Tree} from "common/tree"
import {E8JsonReader} from "content/archive/e8_json_reader"

export class E8ArchiveReader extends BinformatDecoder<Forest<E8ArchiveFile, string>> {

	private jsonStringIndex: readonly string[] = []
	private filenameSuffixIndex: readonly string[] = []

	protected readRootValue(): Forest<E8ArchiveFile, string> {
		const firstByte = this.readByte()
		const secondByte = this.readByte()
		if(firstByte !== 0xe8 || secondByte !== 0xa0){
			throw new Error("Broken e8a file: incorrect magic bytes.")
		}

		const result: Tree<E8ArchiveFile, string>[] = []

		while(!this.isAtEndOfFile()){
			const entry = this.readEntry()
			if(entry){
				result.push(entry)
			}
		}

		return result
	}

	private readEntry(): Tree<E8ArchiveFile, string> | null {
		const entryCode = this.peekPrefix(e8ArchiveEntryTypeBitLength)
		const fileName = this.readFileName()
		switch(entryCode){
			case E8ArchiveEntryCode.jsonStringIndex: {
				this.jsonStringIndex = this.readStringIndex()
				return null
			}

			case E8ArchiveEntryCode.filenameSuffixIndex: {
				this.filenameSuffixIndex = this.readStringIndex()
				return null
			}

			case E8ArchiveEntryCode.binarySuffixed:
			case E8ArchiveEntryCode.binary:{
				return {value: {fileName, fileContent: this.readByteArray()}}
			}

			case E8ArchiveEntryCode.e8jsonSuffixed:
			case E8ArchiveEntryCode.e8json: {
				const json = new E8JsonReader(this.buffer, this.jsonStringIndex, this.index).decode()
				const jsonBinary = new TextEncoder().encode(JSON.stringify(json, null, 2))
				return {value: {fileName, fileContent: jsonBinary}}
			}

			case E8ArchiveEntryCode.directory: {
				const children = this.readArray(() => {
					const entry = this.readEntry()
					if(!entry){
						throw new Error("Illegal e8a entry structure: only files and directories are allowed within directory; indices must reside in root.")
					}
					return entry
				})
				return {value: fileName, children}
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