import {buildAtlasLayout} from "content/build_atlas_layout"
import {Atlas, AtlasPart} from "content/content"
import {ContentPack} from "content/content_pack"
import {XY} from "common_types"
import * as XmlJs from "xml-js"

type SvgTextureFile = {
	width: number
	height: number
	svg: string
	path: string
}

export const contentPacksToAtlasses = (packs: ContentPack[]): [Atlas[], Map<string, AtlasPart>] => {
	const texturesWithPositions = projectToAtlasLayout(packs)
	// TODO: having just one atlas is not the best choice. we could have multiple and have less memory overhead
	// we just need a heuristic to estimate atlas size and then we could break it down
	const atlasSideLength = getAtlasSideLength(texturesWithPositions)
	const atlasSvg = glueSvgsIntoAtlas(texturesWithPositions, atlasSideLength)
	const atlas: Atlas = {
		size: {x: atlasSideLength, y: atlasSideLength},
		image: atlasSvg
	}
	const map = new Map(texturesWithPositions.map(svg => [svg.path, getAtlasPart(0, svg)]))
	return [[atlas], map]
}

const getAtlasPart = (atlasIndex: number, svg: (SvgTextureFile & XY)): AtlasPart => ({
	atlasIndex,
	atlasPosition: {x: svg.x, y: svg.y},
	size: {x: svg.width, y: svg.height}
})

export function getAtlasSideLength(textures: (SvgTextureFile & XY)[]): number {
	const width = textures.map(el => el.width + el.x).reduce((a, b) => Math.max(a, b), 0)
	const height = textures.map(el => el.height + el.y).reduce((a, b) => Math.max(a, b), 0)

	// atlas needs to be square and power-of-two
	let sideSize = Math.max(width, height)
	sideSize = 2 ** Math.ceil(Math.log2(sideSize))
	return sideSize
}

const projectToAtlasLayout = (packs: ContentPack[]): (SvgTextureFile & XY)[] => {
	const allTextures = packs
		.map(pack => [...pack.textures.entries()])
		.flat()
		.map(([path, texture]) => {
			if(texture.extension !== ".svg"){
				throw new Error("Only SVG textures are supported for now")
			}
			const decoder = new TextDecoder()
			const svgString = decoder.decode(texture.content)
			return exploreSvg(svgString, path)
		})
	// wonder how slow will be to have cellSize = 1 here
	// maybe I'll need to optimize that
	return buildAtlasLayout(allTextures, 1)
}

function glueSvgsIntoAtlas(textures: (SvgTextureFile & XY)[], sideLength: number): string {
	const compoundSvg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${sideLength} ${sideLength}" width="${sideLength}" height="${sideLength}">
	${textures
		.map(texture => setSvgPosition(texture.svg, texture)
			.replace(/<\?xml.*?\?>/, ""))
		.join("\n")}
</svg>`

	return compoundSvg
}

const exploreSvg = (srcSvgText: string, path: string): SvgTextureFile => {
	const dom = XmlJs.xml2js(srcSvgText, {compact: false}) as XmlJs.Element
	const svgAttrs = getSvgFromDom(dom).attributes ?? {}
	const width = parseFloat(svgAttrs.width + "")
	const height = parseFloat(svgAttrs.height + "")
	if(Number.isNaN(width) || Number.isNaN(height)){
		throw new Error(`SVG at ${path} has weird width/height: ${svgAttrs.width}/${svgAttrs.height}`)
	}
	return {
		svg: XmlJs.js2xml(dom), width, height, path
	}
}

export function setSvgPosition(srcSvgText: string, xy: XY): string {
	// wonder if this parsing will affect performance
	// it's probably faster to just run two regexps, but for how much?
	const dom = XmlJs.xml2js(srcSvgText, {compact: false}) as XmlJs.Element
	const svg = getSvgFromDom(dom)

	const attrs = svg.attributes ?? {}
	attrs.x = xy.x
	attrs.y = xy.y
	svg.attributes = attrs
	return XmlJs.js2xml(dom)
}

const getSvgFromDom = (dom: XmlJs.Element): XmlJs.Element => {
	const svg = dom.elements?.[0]
	if(!svg || svg.name !== "svg"){
		throw new Error("First DOM element is not <svg>, wtf")
	}
	return svg
}