import {BinformatEncoder} from "common/binformat/binformat_encoder"
import {BufferWriter} from "common/binformat/buffer_writer"

export const enum CssValueType {
	stringInline = 0,
	stringReference = 1,
	hexColor = 2,
	// this value exists for case when we parsed css string wrong
	// and something that we think is a "pair" is actually not, because it doesn't have colon separator
	// that's why we just write this part of css as-is
	unparseablePair = 3
}

export const cssValueTypeBitLength = 2

const hexRegexp = /^#([a-f\d]{3}|[a-f\d]{6})$/i

export class CssStyleWriter extends BinformatEncoder<string> {

	constructor(inputValue: string, protected readonly indexMap: ReadonlyMap<string, number>, writer?: BufferWriter) {
		super(inputValue, writer)
	}

	static* getStrings(style: string): IterableIterator<string> {
		for(const part of this.splitIntoParts(style)){
			if(typeof(part) === "string"){
				yield part
			} else {
				yield part.key
				if(!hexRegexp.test(part.value)){
					yield part.value
				}
			}
		}
	}

	private static* splitIntoParts(style: string): IterableIterator<string | {key: string, value: string}> {
		for(const part of style.split(/\s*;\s*/)){
			const colonIndex = part.indexOf(":")
			if(colonIndex < 0){
				yield part
			}

			const key = part.substring(0, colonIndex).trim()
			const value = part.substring(colonIndex + 1).trim()
			yield{key, value}
		}
	}

	protected writeRootValue(style: string): void {
		const parts = [...CssStyleWriter.splitIntoParts(style)]
		this.writeArray(parts, part => {
			if(typeof(part) === "string"){
				this.writePrefixedString(part, CssValueType.unparseablePair, cssValueTypeBitLength)
				return
			}

			const {key, value} = part
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
			r = parseInt(digits.slice(0, 2), 16)
			g = parseInt(digits.slice(2, 4), 16)
			b = parseInt(digits.slice(4, 6), 16)
		}
		return (r << 16) | (g << 8) | (b << 0)
	}

	private writeCssValue(value: string) {
		const index = this.indexMap.get(value)
		if(index !== undefined){
			this.writePrefixedUint(index, CssValueType.stringReference, cssValueTypeBitLength)
			return
		}

		if(hexRegexp.test(value)){
			this.writePrefixedUint(this.hexToInt(value), CssValueType.hexColor, cssValueTypeBitLength)
			return
		}

		this.writePrefixedString(value, CssValueType.stringInline, cssValueTypeBitLength)
	}

}