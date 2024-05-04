import {BinformatCoderBase} from "common/binformat/binformat_coder_base"

export abstract class BinformatEncoder<T> extends BinformatCoderBase {
	private buffer: Uint8Array
	private index = 0

	protected abstract writeRootValue(value: T): void

	constructor(protected readonly inputValue: T) {
		super()
		// wonder if it's profitable to take writeByte/writeBytes function as input
		this.buffer = new Uint8Array(this.estimateBufferSize())
	}

	encode(): Uint8Array {
		if(this.index === 0){
			this.writeRootValue(this.inputValue)
		}
		return this.buffer
	}

	// it's ugly, but gets things done
	protected estimateBufferSize(): number {
		let index = 0
		this.writeByte = () => index++
		this.writeByteArray = arr => {
			this.writeInt(arr.length)
			index += arr.length
		}
		this.writeRootValue(this.inputValue)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		delete(this as any).writeByte
		delete(this as any).writeByteArray
		this.clearLookback()
		return index
	}

	protected writeByte(byte: number): void {
		this.buffer[this.index++] = byte
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
			uint = Math.floor(uint / 128) // >> 7 without shenanigans about sign
			this.writeByte(byte)
		} while(uint !== 0)
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
		int = Math.floor(int / 64) // >> 6 without shenanigans about sign
		this.writeByte(firstByte)

		while(int !== 0){
			let byte = 0
			if(int > 0x7f){
				byte = 0x80
			}
			byte |= int & 0x7f
			int = Math.floor(int / 128) // >> 7 without shenanigans about sign
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
		this.buffer.set(bytes, this.index)
		this.index += bytes.length
	}

	protected writeString(str: string): void {
		this.writeUint(str.length)
		for(let i = 0; i < str.length; i++){
			this.writeUint(str.charCodeAt(i))
		}
	}
}