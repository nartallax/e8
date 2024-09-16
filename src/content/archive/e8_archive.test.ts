import {describe, test} from "@nartallax/clamsensor"
import {expect} from "chai"
import {E8ArchiveReader} from "content/archive/e8_archive_reader"
import {E8ArchiveEntryCode, E8ArchiveWriter} from "content/archive/e8_archive_writer"

describe("e8a format", () => {
	const toBytes = (str: string) => new TextEncoder().encode(str)
	const toJson = (bytes: Uint8Array) => JSON.parse(new TextDecoder().decode(bytes))

	const jsonA = toBytes(JSON.stringify({name: "dog", skin: "hairy", age: 10}))
	const jsonB = toBytes(JSON.stringify({name: "sphinx", skin: "smooth", age: 3}))
	const jsonC = toBytes(JSON.stringify({name: "dracula", skin: "bad", age: 563}))

	const svgString = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="64" height="64" viewBox="-0.5 -0.5 1 1" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg">
  <path d="m -0.5 1.5 V 0 Z" style="fill:#03b3b3;fill-opacity:1" />
</svg>`
	const svgBytes = toBytes(svgString)

	test("is able to compress JSON files", () => {
		const archive = new E8ArchiveWriter([
			{value: {fileName: "json_a.creature.json", fileContent: jsonA}},
			{value: {fileName: "json_b.creature.json", fileContent: jsonB}},
			{value: {fileName: "json_c.creature.json", fileContent: jsonC}}
		]).encode()

		// adding "!" to test if everything is substituted correctly
		const entryList = new E8ArchiveReader(archive).getRootEntryList(value => "!" + value)
		expect(entryList).to.eql([
			{
				code: E8ArchiveEntryCode.jsonStringIndex,
				value: ["!name", "!skin", "!age"],
				name: undefined,
				byteLength: 16
			},
			{
				code: E8ArchiveEntryCode.filenameSuffixIndex,
				value: ["!.creature.json"],
				name: undefined,
				byteLength: 17
			},
			{
				code: E8ArchiveEntryCode.e8jsonSuffixed,
				value: {"!name": "dog", "!skin": "hairy", "!age": 10},
				name: "json_a!.creature.json",
				byteLength: 23
			},
			{
				code: E8ArchiveEntryCode.e8jsonSuffixed,
				value: {"!name": "sphinx", "!skin": "smooth", "!age": 3},
				name: "json_b!.creature.json",
				byteLength: 27
			},
			{
				code: E8ArchiveEntryCode.e8jsonSuffixed,
				value: {"!name": "dracula", "!skin": "bad", "!age": 563},
				name: "json_c!.creature.json",
				byteLength: 26
			}
		])

		const dec = new E8ArchiveReader(archive).decode().map(({value}) => {
			if(typeof(value) === "string"){
				throw new Error("Unexpected directory")
			}
			return toJson(value.fileContent)
		})

		expect(dec).to.eql([
			{name: "dog", skin: "hairy", age: 10},
			{name: "sphinx", skin: "smooth", age: 3},
			{name: "dracula", skin: "bad", age: 563}
		])
	})

	test("is able to compress SVG files", () => {
		const archive = new E8ArchiveWriter([
			{value: {fileName: "img_a.texture.svg", fileContent: svgBytes}},
			{value: {fileName: "img_b.texture.svg", fileContent: svgBytes}},
			{value: {fileName: "img_c.texture.svg", fileContent: svgBytes}}
		]).encode()

		const entryList = new E8ArchiveReader(archive)
			.getRootEntryList(value =>
				value === "d" || value === "svg" || value === "style" || value === "path" || value.startsWith("xmlns") ? value : "!" + value
			)

		const exclamationSvg = `<?xml !version="!1.0" !encoding="!UTF-8" !standalone="!no"?>
<svg !width="!64" !height="!64" !viewBox="!-0.5 -0.5 1 1" !version="!1.1" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg">
  <path d="m -0.5 1.5 V 0 Z" style="!fill: #03b3b3; !fill-opacity: !1"/>
</svg>`

		expect(entryList).to.eql([
			{
				code: E8ArchiveEntryCode.svgStringIndex,
				value: [
					"!version",
					"!64",
					"!1.0",
					"!encoding",
					"!UTF-8",
					"!standalone",
					"!no",
					"svg",
					"!width",
					"!height",
					"!viewBox",
					"!-0.5 -0.5 1 1",
					"!1.1",
					"path",
					"d",
					"style",
					"!fill",
					"!fill-opacity",
					"!1"
				],
				name: undefined,
				byteLength: 122
			},
			{
				code: E8ArchiveEntryCode.filenameSuffixIndex,
				value: ["!.texture.svg"],
				name: undefined,
				byteLength: 15
			},
			{
				code: E8ArchiveEntryCode.e8svgSuffixed,
				value: exclamationSvg,
				name: "img_a!.texture.svg",
				byteLength: 50
			},
			{
				code: E8ArchiveEntryCode.e8svgSuffixed,
				value: exclamationSvg,
				name: "img_b!.texture.svg",
				byteLength: 50
			},
			{
				code: E8ArchiveEntryCode.e8svgSuffixed,
				value: exclamationSvg,
				name: "img_c!.texture.svg",
				byteLength: 50
			}
		])
	})
})