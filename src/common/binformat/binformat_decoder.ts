import {BinformatCoderBase} from "common/binformat/binformat_coder_base"

export abstract class BinformatDecoder<T> extends BinformatCoderBase {
	private index = 0
	private hasResult = false
	private result: T | null = null

	protected abstract readRootValue(): T

	constructor(private readonly buffer: Uint8Array) {
		super()
	}

	decode(): T {
		if(!this.hasResult){
			this.hasResult = true
			this.result = this.readRootValue()
		}
		return this.result!
	}

	protected readInt(): number {
		const int = this.doReadInt()
		this.pushLookback(int)
		return int
	}

	protected readBool(): boolean {
		return this.buffer[this.index++] !== 0
	}

	private doReadInt(): number {
		const firstByte = this.buffer[this.index++]!
		const neg = !!(firstByte & 0x80)
		let haveNext = !!(firstByte & 0x40)
		let int = firstByte & 0x3f
		let mult = 64

		while(haveNext){
			const byte = this.buffer[this.index++]!
			haveNext = !!(byte & 0x80)
			int += (byte & 0x7f) * mult
			mult *= 128
		}

		return neg ? -int : int
	}

	protected readUint(): number {
		let uint = 0
		let haveNext = true
		let mult = 1
		while(haveNext){
			const byte = this.buffer[this.index++]!
			haveNext = !!(byte & 0x80)
			uint += (byte & 0x7f) * mult
			mult *= 128
		}
		return uint
	}

	protected readArray<T>(reader: () => T): T[] {
		const len = this.readUint()
		const result: T[] = new Array(len)
		for(let i = 0; i < result.length; i++){
			result[i] = reader()
		}
		return result
	}

	protected readDiffencodedInt(lookback: number): number {
		const int = this.doReadInt() + this.getLookback(lookback)
		this.pushLookback(int)
		return int
	}

	protected readByteArray(): Uint8Array {
		const length = this.readUint()
		const result = this.buffer.slice(this.index, length)
		this.index += length
		return result
	}

	protected readString(): string {
		const length = this.readUint()
		let result = ""
		for(let i = 0; i < length; i++){
			result += String.fromCharCode(this.readUint())
		}
		return result
	}

	protected readByte(): number {
		return this.buffer[this.index++]!
	}
}