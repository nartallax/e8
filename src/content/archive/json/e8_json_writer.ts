import {BinformatEncoder} from "common/binformat/binformat_encoder"
import {BufferWriter} from "common/binformat/buffer_writer"

export const e8JsonTypeBitLength = 3

export const enum E8JsonTypeCode {
	string = 0,
	stringIndex = 1,
	stringBase64 = 2,
	negInt = 3,
	posInt = 4,
	mapObject = 5,
	array = 6,
	other = 7 // double, true, false, or null, depending on next 4 bits
	// it's important to keep this at 8 elements to fit in 3 bits
	// this allows us to write uints below 16 within the same byte as type code,
	// which is very good, because a lot of things in this format are uints of small value
}

/** Additional type code that is used when main type code is `other` */
export const enum E8JsonOtherTypeCode {
	true = 0,
	false = 1,
	null = 2,
	dbl = 3
}

/** Definition of E8 JSON binary format, a way to (more) efficiently write JSON.
Accepts index map as a way to store some of the strings somewhere else and only refer to them by index

Assumes that input value is a correct JSON;
for example, `undefined` is not a correct JSON; `JSON.stringify()` will remove undefineds or replace them with nulls, but this class will fail;
recursive values are not allowed; etc.

It's not very fast to write, but it's about as compact as it gets, without requiring a scheme like protobuf. */
export class E8JsonWriter extends BinformatEncoder<unknown> {

	constructor(inputValue: unknown, protected readonly indexMap: ReadonlyMap<string, number>, writer?: BufferWriter) {
		super(inputValue, writer)
	}

	static* getStrings(value: unknown): IterableIterator<string> {
		if(typeof(value) === "string"){
			if(value.length > 0){ // zero-length strings are always 1 byte anyway
				yield value
			}
			return
		}

		if(typeof(value) !== "object" || value === null){
			return
		}

		if(Array.isArray(value)){
			for(const item of value){
				yield* this.getStrings(item)
			}
			return
		}

		for(const key in value){
			yield key
			yield* this.getStrings((value as any)[key])
		}
	}

	private writePossiblyBase64String(str: string): void {
		try {
			const decodedStr = atob(str)
			if(btoa(decodedStr) !== str){
				this.writeNonBase64String(str)
				return
			}
			const bytes = new Uint8Array(decodedStr.length)
			for(let i = 0; i < decodedStr.length; i++){
				bytes[i] = decodedStr.charCodeAt(i)
			}
			this.writePrefixedByteArray(bytes, E8JsonTypeCode.stringBase64, e8JsonTypeBitLength)
		} catch(e){
			this.writeNonBase64String(str)
		}
	}

	private writeNonBase64String(str: string): void {
		this.writePrefixedString(str, E8JsonTypeCode.string, e8JsonTypeBitLength)
	}

	private writeTypedUint(value: number, type: E8JsonTypeCode): void {
		this.writePrefixedUint(value, type, e8JsonTypeBitLength)
	}

	protected writeRootValue(value: unknown): void {
		this.writeAnyJsonValue(value)
	}

	protected writeAnyJsonValue(value: unknown): void {
		switch(typeof(value)){

			case "boolean": {
				this.writePrefixedByte(value ? E8JsonOtherTypeCode.true : E8JsonOtherTypeCode.false, E8JsonTypeCode.other, e8JsonTypeBitLength)
			} return

			case "number": {
				if((value % 1) === 0){
					if(value > 0){
						this.writeTypedUint(value, E8JsonTypeCode.posInt)
					} else {
						this.writeTypedUint(-value, E8JsonTypeCode.negInt)
					}
				} else {
					this.writePrefixedByte(E8JsonOtherTypeCode.dbl, E8JsonTypeCode.other, e8JsonTypeBitLength)
					// not terribly efficient, but whatever
					// I prefer not to mess with doubles and their accuracy
					this.writeDouble(value)
				}
			} return

			case "string": {
				if(value.length === 0){
					// empty string is always just 1 byte, no need to optimize further
					this.writePrefixedString("", E8JsonTypeCode.string, e8JsonTypeBitLength)
					return
				}
				const index = this.indexMap.get(value)
				if(index === undefined){
					this.writePossiblyBase64String(value)
				} else {
					this.writeTypedUint(index, E8JsonTypeCode.stringIndex)
				}
			} return

			case "object": {
				if(value === null){
					this.writePrefixedByte(E8JsonOtherTypeCode.null, E8JsonTypeCode.other, e8JsonTypeBitLength)
				} else if(Array.isArray(value)){
					this.writeTypedUint(value.length, E8JsonTypeCode.array)
					for(const item of value){
						this.writeAnyJsonValue(item)
					}
				} else {
					const entries = Object.entries(value)
					this.writeTypedUint(entries.length, E8JsonTypeCode.mapObject)
					for(const [k, v] of entries){
						const index = this.indexMap.get(k)
						if(index === undefined){
							// chance that user will put base64 as key is minimal
							// but will introduce performance hit if we'll try to assume it is and fail
							this.writeNonBase64String(k)
						} else {
							this.writeTypedUint(index, E8JsonTypeCode.stringIndex)
						}
						this.writeAnyJsonValue(v)
					}
				}
			} return

			default: throw new Error(`Cannot write JSON value ${JSON.stringify(value)}: unknown type ${typeof(value)}`)
		}
	}

}