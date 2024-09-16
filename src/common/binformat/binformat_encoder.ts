import {BinformatCoderBase} from "common/binformat/binformat_coder_base"
import {BufferWriter} from "common/binformat/buffer_writer"

export abstract class BinformatEncoder<T> extends BinformatCoderBase {
	protected readonly writeByte: (byte: number) => void
	protected readonly writeByteArrayContent: (bytes: Uint8Array) => void
	private readonly dblBuffer = new DataView(new ArrayBuffer(8))

	protected abstract writeRootValue(value: T): void
	private didWrite = false

	constructor(protected readonly inputValue: T, protected readonly writer = new BufferWriter()) {
		super()
		this.writeByte = this.writer.writeByte.bind(this.writer)
		this.writeByteArrayContent = this.writer.writeBytes.bind(this.writer)
	}

	encode(): Uint8Array {
		this.encodeWithoutMerging()
		return this.writer.toArray()
	}

	encodeWithoutMerging(): void {
		if(!this.didWrite){
			this.writeRootValue(this.inputValue)
			this.didWrite = true
		}
	}

	protected writePrefixedByte(byte: number, prefix: number, prefixBitLength: number): void {
		this.writeByte((byte << prefixBitLength) | prefix)
	}

	protected writeBool(bool: boolean): void {
		this.writeByte(bool ? 1 : 0)
	}

	protected writeInt(int: number): void {
		this.doWriteInt(int)
		this.pushLookback(int)
	}

	protected writeUint(uint: number): void {
		do {
			let byte = 0
			if(uint > 0x7f){
				byte = 0x80
			}
			byte |= uint & 0x7f
			uint = Math.floor(uint / 128) // >> 7 without sign troubles
			this.writeByte(byte)
		} while(uint !== 0)
	}

	protected getUintByteLength(uint: number, prefixBitLength = 0): number {
		uint *= 1 << prefixBitLength
		let result = 0
		do {
			uint = Math.floor(uint / 128)
			result++
		} while(uint !== 0)
		return result
	}

	private doWriteInt(int: number): void {
		const neg = int < 0
		let firstByte = 0
		if(neg){
			int = -int
			firstByte = 0x80
		}
		if(int > 0x3f){
			firstByte |= 0x40
		}
		firstByte |= int & 0x3f
		int = Math.floor(int / 64) // >> 6 without sign troubles
		this.writeByte(firstByte)

		while(int !== 0){
			let byte = 0
			if(int > 0x7f){
				byte = 0x80
			}
			byte |= int & 0x7f
			int = Math.floor(int / 128) // >> 7 without sign troubles
			this.writeByte(byte)
		}
	}

	protected writeArray<T>(array: readonly T[], writeItem: (value: T) => void): void {
		this.writeUint(array.length)
		for(let i = 0; i < array.length; i++){
			writeItem(array[i]!)
		}
	}

	protected writeDiffencodedInt(int: number, lookback: number): void {
		this.doWriteInt(int - this.getLookback(lookback))
		this.pushLookback(int)
	}

	protected writeByteArray(bytes: Uint8Array): void {
		this.writeUint(bytes.length)
		this.writeByteArrayContent(bytes)
	}

	protected writePrefixedByteArray(bytes: Uint8Array, prefix: number, bits: number) {
		this.writePrefixedUint(bytes.length, prefix, bits)
		this.writeByteArrayContent(bytes)
	}

	protected writeString(str: string): void {
		this.writeUint(str.length)
		this.writeStringContent(str)
	}

	protected writePrefixedString(str: string, prefix: number, bits: number): void {
		this.writePrefixedUint(str.length, prefix, bits)
		this.writeStringContent(str)
	}

	private writeStringContent(str: string): void {
		for(let i = 0; i < str.length; i++){
			this.writeUint(str.charCodeAt(i))
		}
	}

	protected getStringByteLength(str: string, prefixBitLength = 0): number {
		let result = this.getUintByteLength(str.length, prefixBitLength)
		for(let i = 0; i < str.length; i++){
			result += this.getUintByteLength(str.charCodeAt(i))
		}
		return result
	}

	protected writeDouble(dbl: number): void {
		this.dblBuffer.setFloat64(0, dbl)
		for(let i = 0; i < 8; i++){
			this.writeByte(this.dblBuffer.getUint8(i))
		}
	}

	protected writePrefixedUint(value: number, prefix: number, bits: number): void {
		value *= 1 << bits
		value += prefix
		this.writeUint(value)
	}
}