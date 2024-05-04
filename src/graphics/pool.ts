import {ArrayList, List} from "graphics/list"

/** A pool is kind of buffer for some items.
 * It allows to avoid unnecessary item creation/deletion in cases when they are frequently acquired/released */
export interface Pool<T> {
	acquire(): T
	release(value: T): void
	shutdown(): void
}

export class ListPool<T> implements Pool<T> {
	private readonly freeItems: List<T>

	constructor(readonly create: () => T, readonly del: (value: T) => void, private readonly size: number) {
		this.freeItems = new ArrayList(size)
	}

	acquire(): T {
		const freeItemIndex = this.freeItems.size - 1
		if(freeItemIndex >= 0){
			const item = this.freeItems.get(freeItemIndex)
			this.freeItems.delete(freeItemIndex)
			return item
		}

		return this.create()
	}

	release(value: T): void {
		if(this.freeItems.size === this.size){
			this.del(value)
		} else {
			this.freeItems.append(value)
		}
	}

	shutdown(): void {
		for(const item of this.freeItems){
			this.del(item)
		}
		this.freeItems.clear()
	}
}