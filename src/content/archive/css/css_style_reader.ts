import {BinformatDecoder} from "common/binformat/binformat_decoder"
import {CssValueType, cssValueTypeBitLength} from "content/archive/css/css_style_writer"

export class CssStyleReader extends BinformatDecoder<string> {

	constructor(buffer: Uint8Array, private readonly stringIndex: readonly string[], parentDecoder?: BinformatDecoder<unknown>) {
		super(buffer, parentDecoder)
	}

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
		if(type === CssValueType.stringInline){
			return this.readPrefixedString(cssValueTypeBitLength)
		}

		if(type === CssValueType.stringReference){
			const index = this.readPrefixedUint(cssValueTypeBitLength)
			return this.stringIndex[index]!
		}

		if(type === CssValueType.hexColor){
			return this.readHexColor()
		}

		throw new Error(`Unknown css style type bits: ${type}`)
	}

	private readHexColor(): string {
		const int = this.readPrefixedUint(cssValueTypeBitLength)
		const r = (int >> 16) & 0xff
		const g = (int >> 8) & 0xff
		const b = (int >> 0) & 0xff
		return `#${twoHex(r)}${twoHex(g)}${twoHex(b)}`
	}

}

const twoHex = (x: number) => (x < 16 ? "0" : "") + x.toString(16)