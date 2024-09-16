import {BinformatCoderBase} from "common/binformat/binformat_coder_base"

export abstract class BinformatDecoder<T> extends BinformatCoderBase {
	private hasResult = false
	private result: T | null = null
	private readonly dblBuffer = new DataView(new ArrayBuffer(8))
	protected abstract readRootValue(): T
	protected index = 0

	constructor(protected readonly buffer: Uint8Array, protected parentDecoder?: BinformatDecoder<unknown>) {
		super()
	}

	decode(): T {
		if(!this.hasResult){
			this.hasResult = true
			if(this.parentDecoder){
				this.index = this.parentDecoder.index
			}
			this.result = this.readRootValue()
			if(this.parentDecoder){
				this.parentDecoder.index = this.index
			}
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

	protected readArrayElements(reader: () => void): void {
		const len = this.readUint()
		for(let i = 0; i < len; i++){
			reader()
		}
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
		return this.readByteArrayContent(length)
	}

	protected readPrefixedByteArray(prefixBits: number): Uint8Array {
		const length = this.readPrefixedUint(prefixBits)
		return this.readByteArrayContent(length)
	}

	protected readByteArrayContent(length: number): Uint8Array {
		const result = this.buffer.slice(this.index, this.index + length)
		this.index += length
		return result
	}

	protected readString(): string {
		const length = this.readUint()
		return this.readStringContent(length)
	}

	protected readPrefixedString(prefixBits: number): string {
		const length = this.readPrefixedUint(prefixBits)
		return this.readStringContent(length)
	}

	private readStringContent(length: number): string {
		let result = ""
		for(let i = 0; i < length; i++){
			result += String.fromCharCode(this.readUint())
		}
		return result
	}

	protected readByte(): number {
		return this.buffer[this.index++]!
	}

	protected readPrefixedByte(prefixBitLength: number): number {
		return this.readByte() >> prefixBitLength
	}

	protected readDouble(): number {
		for(let i = 0; i < 8; i++){
			this.dblBuffer.setUint8(i, this.readByte())
		}
		return this.dblBuffer.getFloat64(0)
	}

	protected peekByte(): number {
		return this.buffer[this.index]!
	}

	protected peekPrefix(bits: number): number {
		return (this.buffer[this.index]! & ((1 << bits) - 1))
	}

	protected readPrefixedUint(prefixBits: number): number {
		const result = this.readUint()
		return Math.floor(result / (1 << prefixBits))
	}

	protected isAtEndOfFile(): boolean {
		return this.index >= this.buffer.length
	}
}