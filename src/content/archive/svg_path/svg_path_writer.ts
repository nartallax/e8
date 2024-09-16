import {BinformatEncoder} from "common/binformat/binformat_encoder"
import {BufferWriter} from "common/binformat/buffer_writer"

// 16 bits is a good midpoint
// worst case scenario is space from 0 to 1, noone would really go smaller than this;
// that means in the worst case precision of numbers in SVG is 16 bits;
// that is, as in 65535x65535 raster image (not really, because curves exist, but close)
// and that's a good precision.
// also 16 bits means that in most cases each numeric element of path will fit in exactly 3 bytes, which is good enough
export const svgPathFloatPrecisionMultiplier = 1 << 16

export const svgPathCommandsIndex = ["m", "l", "h", "v", "c", "s", "q", "t", "a", "z"]
const svgPathCommandsMap = new Map(svgPathCommandsIndex.map((cmd, index) => [cmd, index]))

export const svgPathNumericFlag = 1 << 0
export const svgPathNumericNegFlag = 1 << 1
export const svgPathCommandAbsFlag = 1 << 1
export const svgPathPrefixLength = 2 // numeric flag, abs flag or neg flag

export class SvgPathWriter extends BinformatEncoder<string> {

	constructor(inputValue: string, writer?: BufferWriter) {
		super(inputValue, writer)
	}

	protected writeRootValue(value: string): void {
		const pathParts = [...getPathParts(value)]
		this.writeArray(pathParts, part => {
			if(typeof(part) === "number"){
				part = Math.round(part * svgPathFloatPrecisionMultiplier)
				let flags = svgPathNumericFlag
				if(part < 0){
					flags |= svgPathNumericNegFlag
					part = -part
				}
				this.writePrefixedUint(part, flags, svgPathPrefixLength)
			} else {
				const index = svgPathCommandsMap.get(part.toLowerCase())
				if(index === undefined){
					throw new Error(`Unrecognized character in SVG path: ${part}`)
				}
				const flags = part.toLowerCase() !== part ? svgPathCommandAbsFlag : 0
				this.writePrefixedUint(index, flags, svgPathPrefixLength)
			}
		})
	}

}

const zeroCode = "0".charCodeAt(0)
const nineCode = "9".charCodeAt(0)
const isNumericChar = (char: string) => {
	if(char === "." || char === "-" || char === "e"){
		return true
	}

	const code = char.charCodeAt(0)
	return code >= zeroCode && code <= nineCode
}

// we can't just split it, because "L0 0" is valid path, but there's nothing to split on between L and first 0
// (we can try using \b in regexps, but I'm not sure about that)
function* getPathParts(path: string): IterableIterator<string | number> {
	let index = 0
	while(index < path.length){
		let char = path.charAt(index)

		if(char === " " || char === ","){
			// skipping the spacer
			index++
			continue
		}

		if(isNumericChar(char)){
			// number reading mode
			let numStr = char
			while(++index < path.length){
				char = path.charAt(index)
				if(!isNumericChar(char)){
					break
				}
				numStr += char
			}
			const num = parseFloat(numStr)
			if(Number.isNaN(num)){
				throw new Error("Failed to parse SVG path float from " + JSON.stringify(numStr))
			}
			yield num
		} else {
			// it's a command
			yield char
			index++
		}
	}
}