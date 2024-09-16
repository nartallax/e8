import * as XmlJs from "xml-js"

export const defaultSvgXmlns = "http://www.w3.org/2000/svg"

// more ideas about what to do here:
// https://vecta.io/blog/how-nano-compresses-svg
// we could do most of the things that article does, but it requires more solid knowledge on SVG structure
// for example, we could compress IDs, but I'm not sure which attributes can refer to IDs, so I can't for sure say if an attribute needs to be updated because it actually refers to an ID, or it just coincidentally have the same value as ID and doesn't need to be updated
// the same goes for attributes having default values, unknown attributes, etc - all of those require SVG knowledge
// that means - maybe later, when I have more solid examples

export const optimizeSvg = (el: XmlJs.Element) => {
	dropAttributes(el)
	dropEmptyDefs(el)

	const allRemainingAttrValues = new Set([...getAllNonIdAttrValues(el)])
	dropUnusedIds(el, allRemainingAttrValues)
}

const dropAttributes = (el: XmlJs.Element) => {
	if(el.attributes){
		for(const key in el.attributes){
			if(el.name === "svg" && key === "xmlns" && el.attributes[key] === defaultSvgXmlns){
				// that's default value, uninteresting
				delete el.attributes[key]
				continue
			}

			if(!key.includes(":")){
				continue // no namespace
			}

			if(el.name === "svg" && key === "xmlns:svg" && el.attributes[key] !== defaultSvgXmlns){
				continue // that's one important attribute with non-default value, let's not remove it
			}

			delete el.attributes[key]
		}
	}

	if(el.elements){
		el.elements = el.elements.filter(child => {
			if(child.name?.includes(":")){
				return false
			}

			dropAttributes(child)
			return true
		})
	}
}

const dropEmptyDefs = (el: XmlJs.Element) => {
	if(!el.elements){
		return
	}

	el.elements = el.elements.filter(el => {
		if(el.name === "defs" && (!el.elements || el.elements.length === 0)){
			return false
		}

		dropEmptyDefs(el)
		return true
	})
}

function* getAllNonIdAttrValues(el: XmlJs.Element): IterableIterator<string> {
	if(el.attributes){
		for(const [key, value] of Object.entries(el.attributes)){
			if(key === "id" || typeof(value) !== "string"){
				continue
			}
			yield value
		}
	}

	for(const child of el.elements ?? []){
		yield* getAllNonIdAttrValues(child)
	}
}

const dropUnusedIds = (el: XmlJs.Element, attrs: Set<string>) => {
	if(el.attributes && "id" in el.attributes){
		const id = el.attributes["id"]
		if(typeof(id) === "string" && !attrs.has(id)){
			delete el.attributes["id"]
		}
	}

	for(const child of el.elements ?? []){
		dropUnusedIds(child, attrs)
	}
}