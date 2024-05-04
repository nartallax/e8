/** List is a sequental collection that allows to add and delete items in arbitrary order */
export interface List<T> {
	append(value: T): void
	delete(index: number): void
	get(index: number): T
	clear(): void
	itemsWithIndex(): IterableIterator<[T, number]>
	[Symbol.iterator](): IterableIterator<T>
	readonly size: number
}

/** An array that has interface of a list
 * Deletion is O(n), but append is O(1), and iteration is faster than traditional linked list
 * Okay compromise for relatively small collections
 * It also works as queue
 *
 * Never shrinks in size, which can be a good thing. */
export class ArrayList<T> implements List<T> {
	private readonly arr: (T | null)[]
	size = 0

	constructor(initialSize = 0) {
		this.arr = new Array(initialSize).fill(null)
	}

	append(value: T): void {
		if(this.size === this.arr.length){
			this.arr.push(value)
		} else {
			this.arr[this.size] = value
		}
		this.size++
	}

	delete(index: number): void {
		for(let i = index; i < this.size - 1; i++){
			this.arr[i] = this.arr[i + 1]!
		}
		this.size--
		this.arr[this.size] = null
	}

	clear(): void {
		this.size = 0
		this.arr.length = 0
	}

	get(index: number): T {
		if(index >= this.size){
			throw new Error("Assertion failed, index out of bounds")
		}
		return this.arr[index]!
	}

	* itemsWithIndex(): IterableIterator<[T, number]> {
		for(let i = 0; i < this.size; i++){
			yield[this.arr[i]!, i]
		}
	}

	* [Symbol.iterator](): IterableIterator<T> {
		for(let i = 0; i < this.size; i++){
			yield this.arr[i]!
		}
	}
}