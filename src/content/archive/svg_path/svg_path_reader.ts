import {BinformatDecoder} from "common/binformat/binformat_decoder"
import {svgPathNumericNegFlag, svgPathFloatPrecisionMultiplier, svgPathNumericFlag, svgPathPrefixLength, svgPathCommandsIndex, svgPathCommandAbsFlag} from "content/archive/svg_path/svg_path_writer"

export class SvgPathReader extends BinformatDecoder<string> {

	protected readRootValue(): string {
		const parts = this.readArray(() => {
			const prefix = this.peekPrefix(svgPathPrefixLength)
			if((prefix & svgPathNumericFlag) !== 0){
				let num = this.readPrefixedUint(svgPathPrefixLength)
				num /= svgPathFloatPrecisionMultiplier
				if((prefix & svgPathNumericNegFlag) !== 0){
					num = -num
				}
				return num
			} else {
				const index = this.readPrefixedUint(svgPathPrefixLength)
				let command = svgPathCommandsIndex[index]!
				if((prefix & svgPathCommandAbsFlag) !== 0){
					command = command.toUpperCase()
				}
				return command
			}
		})
		return parts.join(" ")
	}

}