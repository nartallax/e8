export class BufferWriter {
	private currentChunk: Uint8Array
	private allChunks: Uint8Array[] = []
	private currentChunkPosition = 0
	private currentChunkSize: number

	constructor(startChunkSize = 128, private readonly maxChunkSize = 4096, private readonly chunkSizeGrowthFactor = 2) {
		this.currentChunkSize = startChunkSize
		this.currentChunk = new Uint8Array(startChunkSize)
		this.allChunks.push(this.currentChunk)
	}

	private allocateNextChunk(): void {
		this.currentChunkSize = Math.min(this.maxChunkSize, this.chunkSizeGrowthFactor * this.currentChunkSize)
		this.currentChunk = new Uint8Array(this.currentChunkSize)
		this.allChunks.push(this.currentChunk)
		this.currentChunkPosition = 0
	}

	get length(): number {
		let length = this.allChunks.map(chunk => chunk.length).reduce((a, b) => a + b, 0)
		length -= this.currentChunk.length
		length += this.currentChunkPosition
		return length
	}

	writeByte(byte: number): void {
		if(this.currentChunkPosition >= this.currentChunk.length){
			this.allocateNextChunk()
		}

		this.currentChunk[this.currentChunkPosition++] = byte
	}

	writeBytes(bytes: Uint8Array): void {
		const freeSpaceInCurrentChunk = this.currentChunk.length - this.currentChunkPosition
		if(freeSpaceInCurrentChunk >= bytes.length){
			this.currentChunk.set(bytes, this.currentChunkPosition)
			this.currentChunkPosition += bytes.length
			return
		}

		this.currentChunk.set(bytes.slice(0, freeSpaceInCurrentChunk), this.currentChunkPosition)
		this.allChunks.push(bytes.slice(freeSpaceInCurrentChunk))
		this.allocateNextChunk()
	}

	toArray(): Uint8Array {
		const length = this.length

		const result = new Uint8Array(length)
		let index = 0
		for(const chunk of this.allChunks){
			if(chunk === this.currentChunk){
				result.set(chunk.slice(0, this.currentChunkPosition), index)
				break
			}
			result.set(chunk, index)
			index += chunk.length
		}
		return result
	}
}