/** 2d array of booleans that grows
 * x and y could be any int in [0, 2^31) (maybe more!)
 * Just keep in mind that it is always rectangular;
 * that is, if you set (0, 1000) and (1000, 0) - you'll have at least 1000x1000 elements, which may be a lot */
export class Growable2DBitmap {

	private widthPow: number
	private heightPow: number
	private width: number
	private height: number
	private data: Uint8Array

	constructor(initialWidth = 32, initialHeight = 32) {
		this.widthPow = Math.ceil(Math.log2(Math.max(8, Math.ceil(initialWidth))))
		this.heightPow = Math.ceil(Math.log2(Math.max(8, Math.ceil(initialHeight))))
		this.width = 1 << this.widthPow
		this.height = 1 << this.heightPow
		this.data = new Uint8Array((this.width * this.height) >> 3)
	}

	// keep in mind that actual width could differ from passed values in constructor
	get actualWidth(): number {
		return this.width
	}

	get actualHeight(): number {
		return this.height
	}

	get(x: number, y: number): boolean {
		if(x >= this.width || y >= this.height){
			return false
		}
		const byteIndex = ((y << this.widthPow) + x) >> 3
		const byte = this.data[byteIndex]!
		return !!(byte & (1 << (x & 0x7)))
	}

	set(x: number, y: number): void {
		if(x >= this.width){
			this.growWidth(this.calcSteps(x, this.width))
		}

		if(y >= this.height){
			this.growHeight(this.calcSteps(y, this.height))
		}

		const byteIndex = ((y << this.widthPow) + x) >> 3
		this.data[byteIndex] |= 1 << (x & 0x7)
	}

	reset(x: number, y: number): void {
		if(x >= this.width){
			this.growWidth(this.calcSteps(x, this.width))
		}

		if(y >= this.height){
			this.growHeight(this.calcSteps(y, this.height))
		}

		const byteIndex = ((y << this.widthPow) + x) >> 3
		this.data[byteIndex] &= ~(1 << (x & 0x7))
	}

	setRect(_x: number, _y: number, xLength: number, yLength: number): void {
		const xLim = _x + xLength
		if(xLim >= this.width){
			this.growWidth(this.calcSteps(xLim, this.width))
		}

		const yLim = _y + yLength
		if(yLim > this.height){
			this.growHeight(this.calcSteps(yLim, this.height))
		}

		const rowStartIndex = _x >> 3
		const rowEndIndex = xLim >> 3

		let startMask = 0xff & ~((1 << (_x & 0x7)) - 1)
		let endMask = (1 << (xLim & 0x7)) - 1
		if(rowStartIndex === rowEndIndex){
			startMask &= endMask
			endMask = startMask
		}

		for(let y = _y; y < yLim; y++){
			let mask = startMask
			const rowOffset = _y << this.widthPow
			for(let rowIndex = rowStartIndex; rowIndex < rowEndIndex; rowIndex++){
				const byte = this.data[rowIndex + rowOffset]!
				this.data[rowIndex + rowOffset] = byte | mask
				mask = 0xff
			}
			const byte = this.data[rowEndIndex + rowOffset]!
			this.data[rowEndIndex + rowOffset] = byte | endMask
		}
	}

	hasAnyInRect(_x: number, _y: number, xLength: number, yLength: number): boolean {
		const xLim = Math.min(_x + xLength, this.width)
		const yLim = Math.min(_y + yLength, this.height)

		const rowStartIndex = _x >> 3
		const rowEndIndex = xLim >> 3

		let startMask = 0xff & ~((1 << (_x & 0x7)) - 1)
		let endMask = (1 << (xLim & 0x7)) - 1
		if(rowStartIndex === rowEndIndex){
			startMask &= endMask
			endMask = startMask
		}
		// console.log("start mask: " + startMask.toString(2))
		// console.log("end mask: " + endMask.toString(2))
		// console.log({rowStartIndex, rowEndIndex, _x, xLim})

		for(let y = _y; y < yLim; y++){
			let mask = startMask
			const rowOffset = _y << this.widthPow
			for(let rowIndex = rowStartIndex; rowIndex < rowEndIndex; rowIndex++){
				const byte = this.data[rowIndex + rowOffset]!
				if(byte & mask){
					return true
				}
				mask = 0xff
			}
			const byte = this.data[rowEndIndex + rowOffset]!
			// console.log(byte.toString(2) + " & " + endMask.toString(2) + " = " + (byte & endMask).toString(2))
			if(byte & endMask){
				return true
			}
		}

		return false
	}

	private calcSteps(requiredSize: number, currentSize: number): number {
		let growthSteps = 1
		while(requiredSize > (currentSize << growthSteps)){
			growthSteps++
		}
		return growthSteps
	}

	private growWidth(steps: number): void {
		// this is kinda ugly.
		// but I don't have a good idea how to make this better
		const newWidth = this.width << steps
		const newWidthPow = this.widthPow + steps
		const newArr = new Uint8Array((this.height * (this.width << steps)) >> 3)
		for(let y = 0; y < this.height; y++){
			for(let x = 0; x < this.width; x++){
				const oldByteIndex = ((y << this.widthPow) + x) >> 3
				const newByteIndex = ((y << newWidthPow) + x) >> 3
				newArr[newByteIndex] = this.data[oldByteIndex]!
			}
		}
		this.data = newArr
		this.widthPow = newWidthPow
		this.width = newWidth
	}

	private growHeight(steps: number): void {
		const len = this.data.length
		this.height <<= steps
		this.heightPow += steps
		const newArr = new Uint8Array((this.width * this.height) >> 3)
		for(let i = 0; i < len; i++){
			newArr[i] = this.data[i]!
		}
		this.data = newArr
	}

	toString(): string {
		let result = ""
		for(let y = 0; y < this.height; y++){
			for(let x = 0; x < this.width; x++){
				result += this.get(x, y) ? "x " : ". "
			}
			if(y !== this.height - 1){
				result += "\n"
			}
		}
		return result
	}

	upscale(factor: number): Growable2DBitmap {
		// this really could be more optimal, but whatever
		const result = new Growable2DBitmap(this.width * factor, this.height * factor)
		for(let x = 0; x < this.width; x++){
			for(let y = 0; y < this.height; y++){
				if(this.get(x, y)){
					const startX = x * factor
					const startY = y * factor
					for(let dx = 0; dx < factor; dx++){
						for(let dy = 0; dy < factor; dy++){
							result.set(startX + dx, startY + dy)
						}
					}
				}
			}
		}
		return result
	}

}
