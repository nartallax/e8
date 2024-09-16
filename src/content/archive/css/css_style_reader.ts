import {BinformatDecoder} from "common/binformat/binformat_decoder"
import {CssValueType, cssValueTypeBitLength, knownCssKeywordsIndex} from "content/archive/css/css_style_writer"

export class CssStyleReader extends BinformatDecoder<string> {

	protected readRootValue(): string {
		const parts = this.readArray(() => {
			const type = this.peekPrefix(cssValueTypeBitLength)
			if(type === CssValueType.unparseablePair){
				return this.readPrefixedString(cssValueTypeBitLength)
			}

			const key = this.readCssValue()
			const value = this.readCssValue()
			return key + ": " + value
		})
		return parts.join("; ")
	}

	private readCssValue(): string {
		const type = this.peekPrefix(cssValueTypeBitLength)
		if(type === CssValueType.string){
			return this.readPrefixedString(cssValueTypeBitLength)
		}

		if(type === CssValueType.keyword){
			const index = this.readPrefixedUint(cssValueTypeBitLength)
			return knownCssKeywordsIndex[index]!
		}

		if(type === CssValueType.hexColor){
			return this.readHexColor()
		}

		throw new Error(`Unknown css style type bits: ${type}`)
	}

	private readHexColor(): string {
		const int = this.readPrefixedUint(cssValueTypeBitLength)
		const r = int & 0xff
		const g = (int >> 8) & 0xff
		const b = (int >> 16) & 0xff
		return `#${twoHex(r)}${twoHex(g)}${twoHex(b)}`
	}

}

const twoHex = (x: number) => (x < 16 ? "0" : "") + x.toString(16)