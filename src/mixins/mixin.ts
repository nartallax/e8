import {markValue} from "common/marker/marker"

type Cls<T> = {new(): T}
type MixinMaker<T, P> = (parentClass: Cls<P>) => Cls<T & P>
export type MixinArray<T extends object[]> = [...{[I in keyof T]: Mixin<T[I]>}]
export type MixinArrayMixingResult<T extends object[]> = T extends [infer First, ...infer Rest extends object[]] ? First & MixinArrayMixingResult<Rest> : unknown


let index = 0
/** Mixin is a class without strict sequence of superclasses.
Mixin may require other mixins to be present, but cannot control order of appearance of those classes in prototype chain
(other than extended classes will appear before the mixin)

Mixins can be used to share functionality (like methods) without having problems with extending multiple classes at the same time */
export class Mixin<T extends object> {
	private cache = new Map<Cls<unknown>, Cls<T>>()
	private id = Symbol()
	private index = index++
	private ancestorsCount: number

	constructor(readonly parents: Mixin<object>[], readonly maker: MixinMaker<T, unknown>) {
		this.ancestorsCount = [...new Set(this.gatherAncestors())].length
		this.testForImproperDeclaration()
		markValue(this)
	}

	private testForImproperDeclaration() {
		const result = this.maker(EmptyClass)
		if(Object.getPrototypeOf(result.prototype).constructor !== EmptyClass){
			throw new Error("Improper mixin declaration: mixin must inherit parent class.")
		}
	}

	private makeClass<P>(parent: Cls<P>): Cls<T & P> {
		let result = this.cache.get(parent)
		if(!result){
			result = this.maker(parent)
			result.prototype[this.id] = true
			this.cache.set(parent, result as Cls<T>)
		}
		return result as Cls<T & P>
	}

	private gatherAncestors(): Mixin<object>[] {
		const result = [...this.parents]
		for(const parent of result){
			result.push(...parent.gatherAncestors())
		}
		return result
	}

	/** This method can be used as `instanceof`
	As mixins, strictly speaking, are not classes they cannot be used as `myObj instanceof myMixin`
	Instead we should use this method: `myMixin.isIn(myObj)` */
	isIn(obj: object): obj is object & T {
		return (obj as any)[this.id] === true
	}

	static define<T extends object>(maker: MixinMaker<T, object>): Mixin<T>
	static define<Ts extends object[], R extends object>(parents: MixinArray<Ts>, maker: MixinMaker<R, MixinArrayMixingResult<Ts>>): Mixin<MixinArrayMixingResult<Ts> & R>
	static define<T extends object>(...args: any[]): Mixin<T> {
		return args.length === 1 ? new Mixin([], args[0]) : new Mixin(args[0], args[1])
	}

	static mix<Ts extends object[]>(mixins: MixinArray<Ts>): Cls<MixinArrayMixingResult<Ts>> {
		const allMixins = [...new Set([
			...mixins,
			...mixins.map(x => x.gatherAncestors()).flat()
		])]

		// zero-dependency mixins first, lots-of-dependencies mixins last
		// within groups of same dependency: sort by index
		// here should be some alghoritm that uses cache more efficiently, but I can't think of anything at the moment
		allMixins.sort((a, b) =>
			a.ancestorsCount < b.ancestorsCount ? -1
				: a.ancestorsCount > b.ancestorsCount ? 1
					: a.index < b.index ? -1
						: a.index > b.index ? 1 : 0)

		let result: Cls<unknown> = Object
		for(const mixin of allMixins){
			result = mixin.makeClass(result)
		}
		return result as Cls<MixinArrayMixingResult<Ts>>
	}
}

class EmptyClass {}