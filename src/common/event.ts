const noop = () => {
	// no-op!
}

type Handler<A extends unknown[]> = (...args: A) => void

type EventImplParams = {
	readonly onFirstSub?: () => void
	readonly onLastUnsub?: () => void
}

export type Event<A extends unknown[] = []> = {
	sub(handler: (...args: A) => void): void
	unsub(handler: (...args: A) => void): void
	fire(...args: A): void
}

export class EventImpl<A extends unknown[]> implements Event<A> {

	private subs: Handler<A>[] = []
	private boundFire = this.doFire.bind(this)

	constructor(private readonly params: EventImplParams = {}) {}

	// I do it this way to avoid an extra function call
	// it's not really needed, or even noticeable, but it'll bug me
	// (most of events have only one subscriber,
	// so most of the time it's nice to just call it instead of iterating the array)
	// TODO: perf-test this assumption. maybe v8 has some smart optimizations around functions-as-properties
	public fire: Handler<A> = noop

	sub(handler: (...args: A) => void): void {
		if(this.subs.length === 0 && this.params.onFirstSub){
			this.params.onFirstSub()
		}
		this.subs.push(handler)
		this.refreshFireHandler()
	}

	unsub(handler: (...args: A) => void): void {
		this.subs = this.subs.filter(x => x !== handler)
		if(this.subs.length === 0 && this.params.onLastUnsub){
			this.params.onLastUnsub()
		}
		this.refreshFireHandler()
	}

	private refreshFireHandler(): void {
		switch(this.subs.length){
			case 0: this.fire = noop; return
			case 1: this.fire = this.subs[0]!; return
			default: this.fire = this.boundFire; return
		}
	}

	private doFire(...args: A): void {
		for(const sub of this.subs){
			sub(...args)
		}
	}


}