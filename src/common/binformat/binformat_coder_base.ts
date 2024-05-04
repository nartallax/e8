export abstract class BinformatCoderBase {
	private readonly lookbackArray = new Array(this.getMaxLookback()).fill(0)
	private lookbackIndex = 0

	protected getMaxLookback(): number {
		return 1
	}

	protected pushLookback(int: number): void {
		this.lookbackArray[this.lookbackIndex++] = int
		if(this.lookbackIndex === this.lookbackArray.length){
			this.lookbackIndex = 0
		}
	}

	protected getLookback(lookback: number): number {
		let index = this.lookbackIndex - lookback
		if(index < 0){
			index += this.lookbackArray.length
		}
		return this.lookbackArray[index]!
	}

	protected clearLookback(): void {
		for(let i = 0; i < this.lookbackArray.length; i++){
			this.lookbackArray[i] = 0
		}
	}

}