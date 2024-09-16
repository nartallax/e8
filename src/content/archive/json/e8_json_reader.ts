import {BinformatDecoder} from "common/binformat/binformat_decoder"
import {E8JsonOtherTypeCode, E8JsonTypeCode, e8JsonTypeBitLength} from "content/archive/json/e8_json_writer"

export class E8JsonReader extends BinformatDecoder<unknown> {

	constructor(buffer: Uint8Array, private readonly stringIndex: readonly string[], parentDecoder?: BinformatDecoder<unknown>) {
		super(buffer, parentDecoder)
	}

	protected readRootValue(): unknown {
		return this.readAnyJsonValue()
	}

	protected readAnyJsonValue(): unknown {
		const typeCode = this.peekPrefix(e8JsonTypeBitLength)
		switch(typeCode){
			case E8JsonTypeCode.posInt: return this.readPrefixedUint(e8JsonTypeBitLength)
			case E8JsonTypeCode.negInt: return -this.readPrefixedUint(e8JsonTypeBitLength)
			case E8JsonTypeCode.string: return this.readPrefixedString(e8JsonTypeBitLength)
			case E8JsonTypeCode.stringBase64: {
				const bytes = this.readPrefixedByteArray(e8JsonTypeBitLength)
				let result = ""
				for(let i = 0; i < bytes.length; i++){
					result += String.fromCharCode(bytes[i]!)
				}
				const decodedBitString = btoa(result)
				return decodedBitString
			}
			case E8JsonTypeCode.stringIndex: return this.stringIndex[this.readPrefixedUint(e8JsonTypeBitLength)]!
			case E8JsonTypeCode.array: {
				const length = this.readPrefixedUint(e8JsonTypeBitLength)
				const result = new Array(length)
				for(let i = 0; i < length; i++){
					result[i] = this.readAnyJsonValue()
				}
				return result
			}
			case E8JsonTypeCode.mapObject: {
				const result: Record<string, unknown> = {}
				const length = this.readPrefixedUint(e8JsonTypeBitLength)
				for(let i = 0; i < length; i++){
					const key = this.readAnyJsonValue()
					if(typeof(key) !== "string"){
						throw new Error("Malformed e8json, key is not string")
					}
					const value = this.readAnyJsonValue()
					result[key] = value
				}
				return result
			}

			case E8JsonTypeCode.other: {
				const otherCode = this.readPrefixedByte(e8JsonTypeBitLength)
				switch(otherCode){
					case E8JsonOtherTypeCode.true: return true
					case E8JsonOtherTypeCode.false: return false
					case E8JsonOtherTypeCode.null: return null
					case E8JsonOtherTypeCode.dbl: return this.readDouble()
					default: throw new Error(`Unknown e8json other type code: ${otherCode}`)
				}
			}

			// shouldn't really be possible. all 8 values of 3 bits we red are covered
			default: throw new Error(`Unknown e8json type code: ${typeCode}`)
		}
	}

}