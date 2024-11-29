import {BinformatEncoder} from "common/binformat/binformat_encoder"
import {E8JsonWriter, e8JsonTypeBitLength} from "content/archive/json/e8_json_writer"
import {findSuffixes} from "content/archive/suffix_finder"
import {E8XmlWriter, e8XmlStringTypeLength} from "content/archive/xml/e8_xml_writer"
import {E8SvgWriter} from "content/archive/svg/e8_svg_writer"
import {deflate} from "pako"
import {Forest, ForestPath, Tree, isTreeBranch} from "@nartallax/forest"
import {errToString} from "common/err_to_string"

export const enum E8ArchiveEntryCode {
	// binary is any binary file. means "we don't know what it is, and not making assumptions, just storing this file as-is"
	// even files of known types (like JSON) can be stored as binary, although it's not recommended
	binary = 0,
	// suffixed files have a uint after their filename, referring to suffix in suffix array
	binarySuffixed = 1,
	directory = 2,
	directorySuffixed = 13,
	filenameSuffixIndex = 3,

	jsonStringIndex = 4,
	e8json = 5,
	e8jsonSuffixed = 6,

	svgStringIndex = 7,
	e8svg = 8,
	e8svgSuffixed = 9,

	xmlStringIndex = 10,
	e8xml = 11,
	e8xmlSuffixed = 12
}

export const e8ArchiveEntryTypeBitLength = 4

export type E8ArchiveFile = {fileName: string, fileContent: Uint8Array}
export type E8ArchiveContent = readonly Tree<E8ArchiveFile, string>[]

export const encodeE8Archive = (files: E8ArchiveContent) => new E8ArchiveWriter(files).encode()

/** This is definition of .e8a format, E8 archive.
It is archive format, which means it is a file that contains multiple other files.
This format aims to compress some popular formats, like .json and .svg, better than general-purpose compression algo would, and includes some engine-specific optimizations about storage. It also has less overhead and legacy than other archive types (looking at you, .zip!).
But it can as well be used as general-purpose archive. At worst .e8a archive will take about as much space as .tar.gz archive would.

It's not technically losless, because some unimportant details are lost (like formatting of json - it has to be reformatted after decompression, or svg attributes only used for editing and not contributing to resulting image) */
export class E8ArchiveWriter extends BinformatEncoder<E8ArchiveContent> {

	private jsonStringIndex: ReadonlyMap<string, number> = new Map()
	private xmlStringIndex: ReadonlyMap<string, number> = new Map()
	private svgStringIndex: ReadonlyMap<string, number> = new Map()
	private filenameSuffixIndex: ReadonlyMap<string, number> = new Map()
	private getFileNameSuffix: (fileName: string) => string | null = () => null

	private readonly forest: Forest<E8ArchiveFile, string>

	constructor(inputValue: E8ArchiveContent) {
		super(inputValue)
		this.forest = new Forest(inputValue)
	}

	protected compress(bytes: Uint8Array): Uint8Array {
		return deflate(bytes, {level: 9, memLevel: 9})
	}

	protected writeRootValue(): void {
		// magic bytes
		this.writeByte(0xe8)
		this.writeByte(0xa0)

		this.writeIndex()
		this.writeSuffixes()

		for(const tree of this.inputValue){
			this.writeTree(tree)
		}
	}

	private writeIndex(): void {
		if(this.hasAnyFileWithExtension(".json")){
			this.jsonStringIndex = this.buildJsonStringIndexMap()
			if(this.jsonStringIndex.size > 0){
				this.writeIndexMapEntry(this.jsonStringIndex, E8ArchiveEntryCode.jsonStringIndex)
			}
		}

		if(this.hasAnyFileWithExtension(".xml")){
			this.xmlStringIndex = this.buildXmlStringIndexMap(".xml")
			if(this.xmlStringIndex.size > 0){
				this.writeIndexMapEntry(this.xmlStringIndex, E8ArchiveEntryCode.xmlStringIndex)
			}
		}

		if(this.hasAnyFileWithExtension(".svg")){
			this.svgStringIndex = this.buildSvgStringIndexMap(".svg")
			if(this.svgStringIndex.size > 0){
				this.writeIndexMapEntry(this.svgStringIndex, E8ArchiveEntryCode.svgStringIndex)
			}
		}
	}

	private writeSuffixes(): void {
		const allFilenames = [
			...[...this.forest.getLeaves()].map((file => file.fileName)),
			...this.forest.getBranches()
		]
		const suffixes = findSuffixes({
			values: allFilenames,
			getRefWriteCost: () => 2,
			getStringWriteCost: str => str.length + 2,
			getSuffixWriteCost: str => str.length
		})
		if(suffixes.suffixes.length > 0){
			this.filenameSuffixIndex = new Map(suffixes.suffixes.map((suffix, index) => [suffix, index]))
			this.writeIndexArrayEntry(suffixes.suffixes, E8ArchiveEntryCode.filenameSuffixIndex)
			this.getFileNameSuffix = str => suffixes.getSuffixOf(str)
		}
	}

	private writeTree(tree: Tree<E8ArchiveFile, string>): void {
		if(isTreeBranch(tree)){
			this.writeFilename(tree.value, E8ArchiveEntryCode.directory, E8ArchiveEntryCode.directorySuffixed)
			this.writeArray(tree.children, tree => {
				this.writeTree(tree)
			})
			return
		}

		const {fileName, fileContent} = tree.value
		if(fileName.toLowerCase().endsWith(".json")){
			this.writeFilename(fileName, E8ArchiveEntryCode.e8json, E8ArchiveEntryCode.e8jsonSuffixed)
			const json = JSON.parse(new TextDecoder().decode(fileContent))
			new E8JsonWriter(json, this.jsonStringIndex, this.writer).encodeWithoutMerging()
			return
		}

		if(fileName.toLowerCase().endsWith(".xml")){
			this.writeFilename(fileName, E8ArchiveEntryCode.e8xml, E8ArchiveEntryCode.e8xmlSuffixed)
			const xml = new TextDecoder().decode(fileContent)
			new E8XmlWriter(xml, this.xmlStringIndex, this.writer).encodeWithoutMerging()
			return
		}

		if(fileName.toLowerCase().endsWith(".svg")){
			this.writeFilename(fileName, E8ArchiveEntryCode.e8svg, E8ArchiveEntryCode.e8svgSuffixed)
			const svg = new TextDecoder().decode(fileContent)
			new E8SvgWriter(svg, this.svgStringIndex, this.writer).encodeWithoutMerging()
			return
		}

		this.writeFilename(fileName, E8ArchiveEntryCode.binary, E8ArchiveEntryCode.binarySuffixed)
		this.writeByteArray(fileContent)
	}

	private writeFilename(name: string, unsuffixedType: E8ArchiveEntryCode, suffixedType: E8ArchiveEntryCode) {
		const suffix = this.getFileNameSuffix(name)
		if(!suffix){
			this.writePrefixedString(name, unsuffixedType, e8ArchiveEntryTypeBitLength)
		} else {
			name = name.substring(0, name.length - suffix.length)
			this.writePrefixedString(name, suffixedType, e8ArchiveEntryTypeBitLength)
			const index = this.filenameSuffixIndex.get(suffix)!
			this.writeUint(index)
		}
	}

	private writeIndexMapEntry(map: ReadonlyMap<string, number>, type: E8ArchiveEntryCode) {
		const orderedValues = [...map.entries()].sort(([,a], [,b]) => a - b)
		this.writeIndexArrayEntry(orderedValues.map(([str]) => str), type)
	}

	private writeIndexArrayEntry(indexArray: readonly string[], type: E8ArchiveEntryCode) {
		this.writePrefixedString("", type, e8ArchiveEntryTypeBitLength)
		this.writeArray(indexArray, str => {
			this.writeString(str)
		})
	}

	private hasAnyFileWithExtension(ext: string): boolean {
		ext = ext.toLowerCase()
		for(const {fileName} of this.forest.getLeaves()){
			if(fileName.toLowerCase().endsWith(ext)){
				return true
			}
		}
		return false
	}

	private buildJsonStringIndexMap(): ReadonlyMap<string, number> {
		return this.buildStringIndexMap(".json", e8JsonTypeBitLength, bin => {
			const json = JSON.parse(new TextDecoder().decode(bin))
			return E8JsonWriter.getStrings(json)
		})
	}

	private buildXmlStringIndexMap(ext: string): ReadonlyMap<string, number> {
		return this.buildStringIndexMap(ext, e8XmlStringTypeLength, bin => {
			const xml = new TextDecoder().decode(bin)
			return E8XmlWriter.getStrings(xml)
		})
	}

	private buildSvgStringIndexMap(ext: string): ReadonlyMap<string, number> {
		// e8XmlStringTypeLength here is not a mistake -
		// svg writer doesn't do anything more smart about string storage than xml writer
		return this.buildStringIndexMap(ext, e8XmlStringTypeLength, bin => {
			const xml = new TextDecoder().decode(bin)
			return E8SvgWriter.getStrings(xml)
		})
	}

	private pathStringFromTreePath(path: ForestPath): string {
		const trees = this.forest.pathToTrees(path)
		const parts = trees.map(tree => isTreeBranch(tree) ? tree.value : tree.value.fileName)
		return parts.join("/")
	}

	private buildStringIndexMap(ext: string, typeBitOffset: number, getStrings: (fileContent: Uint8Array) => IterableIterator<string>): ReadonlyMap<string, number> {
		const usageCountMap = this.buildUsageCountMap(ext, getStrings)
		return this.usageCountMapToIndexMap(usageCountMap, typeBitOffset)
	}

	private buildUsageCountMap(ext: string, getKeys: (fileContent: Uint8Array) => IterableIterator<string>): ReadonlyMap<string, number> {
		ext = ext.toLowerCase()
		const usageCountMap = new Map<string, number>()
		for(const [value, path] of this.forest.getLeavesWithPaths()){
			if(!value.fileName.toLowerCase().endsWith(ext)){
				continue
			}

			const fileContent = this.forest.getLeafAt(path).fileContent

			try {
				for(const key of getKeys(fileContent)){
					usageCountMap.set(key, (usageCountMap.get(key) ?? 0) + 1)
				}
			} catch(e){
				throw new Error(`Failed to process file at ${this.pathStringFromTreePath(path)}: ${errToString(e)}`)
			}
		}

		return usageCountMap
	}

	private usageCountMapToIndexMap(usageCountMap: ReadonlyMap<string, number>, typeBitOffset: number): ReadonlyMap<string, number> {
		let pairs = [...usageCountMap.entries()]
		pairs = pairs.sort(([,a], [,b]) => b - a) // more usages go first
		pairs = pairs.filter(([str, count], index) => {
			const strByteLength = this.getStringByteLength(str, typeBitOffset)
			const indexByteLength = this.getUintByteLength(index, typeBitOffset)

			// how much bytes will this string, repeated several times, occupy if index substitute happens
			const subTotalBytes = strByteLength + (count * indexByteLength)
			// same as above, but if substitute won't happen
			const notSubTotalBytes = strByteLength * count

			// if there will be size decrease after index substitution - substitution gets to stay
			// it's not flawless, because when we are throwing away early substitutions - indices of later subtitutions will decrease,
			// which means some of substitutions will be thrown away while still being profitable size-wise
			// but difference will be minimal anyway
			return subTotalBytes < notSubTotalBytes
		})

		return new Map(pairs.map(([str], index) => [str, index]))
	}

}