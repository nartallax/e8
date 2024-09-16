import {BinformatEncoder} from "common/binformat/binformat_encoder"

export const knownCssKeywordsIndex = [
	"fill",
	"fill-opacity",
	"stroke",
	"stroke-width",
	"stroke-linecap",
	"stroke-linejoin",
	"stroke-miterlimit",
	"stroke-dasharray",
	"stroke-opacity",
	"butt",
	"miter",
	"none"
	// feel free to add more stuff here, won't hurt
	// but don't shuffle existing ones, index = ID
]
const knownCssKeywordsMap = new Map(knownCssKeywordsIndex.map((kw, index) => [kw, index]))

export const enum CssValueType {
	string = 0,
	keyword = 1,
	hexColor = 2,
	// this value exists for case when we parsed css string wrong
	// and something that we think is a "pair" is actually not, because it doesn't have colon separator
	// that's why we just write this part of css as-is
	unparseablePair = 3
}

export const cssValueTypeBitLength = 2

const hexRegexp = /^#(\d{3}|\d{6})$/

export class CssStyleWriter extends BinformatEncoder<string> {

	protected writeRootValue(value: string): void {
		const parts = value.split(/\s*;\s*/)
		this.writeArray(parts, part => {
			const colonIndex = part.indexOf(":")
			if(colonIndex < 0){
				this.writePrefixedString(part, CssValueType.unparseablePair, cssValueTypeBitLength)
			}

			const key = part.substring(0, colonIndex).trim()
			const value = part.substring(colonIndex + 1).trim()
			this.writeCssValue(key)
			this.writeCssValue(value)
		})
	}

	private hexToInt(value: string): number {
		const digits = value.substring(1)
		let r: number, g: number, b: number
		if(digits.length === 3){
			r = parseInt(digits.charAt(0), 16)
			r = (r << 4) | r
			g = parseInt(digits.charAt(1), 16)
			g = (g << 4) | g
			b = parseInt(digits.charAt(2), 16)
			b = (b << 4) | b
		} else {
			r = parseInt(digits.slice(0, 1), 16)
			g = parseInt(digits.slice(2, 3), 16)
			b = parseInt(digits.slice(4, 5), 16)
		}
		return r | (g << 8) | (b << 16)
	}

	private writeCssValue(value: string) {
		const kwIndex = knownCssKeywordsMap.get(value)
		if(kwIndex !== undefined){
			this.writePrefixedUint(kwIndex, CssValueType.keyword, cssValueTypeBitLength)
			return
		}

		if(hexRegexp.test(value)){
			this.writePrefixedUint(this.hexToInt(value), CssValueType.hexColor, cssValueTypeBitLength)
			return
		}

		this.writePrefixedString(value, CssValueType.string, cssValueTypeBitLength)
	}

}