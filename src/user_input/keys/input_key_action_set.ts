import {sortBy} from "common/sort_by"
import {Chord} from "resource_pack/resource_pack"
import {InputBindActionFn, InputBindActionsObj} from "types"
import {InputKey} from "user_input/inputs"

export interface InputKeyEvent {
	readonly isDown: boolean
	readonly key: InputKey
}

export interface InputKeyActionCallData {
	readonly handler: InputBindActionFn<number>
	/** How much times user pressed the chord.
	 * For hold actions this number doesn't mean anything. */
	count: number
	/** What binds were combined to produce this action call.
	 * For non-grouped actions doesn't mean anything. For grouped actions contains other binds from the group which were invoked by user */
	readonly binds: Set<number>
}

export interface InputKeyActionSearchResult {
	readonly down: readonly InputKeyActionCallData[]
	readonly up: readonly InputKeyActionCallData[]
	readonly hold: readonly InputKeyActionCallData[]
	readonly newDownKeys: ReadonlySet<InputKey>
}

interface Action {
	/** Excludes main key for the action, for sake of performance */
	readonly chord: BitSet
	readonly chordSize: number
	readonly handler: InputBindActionFn<number>
	/** If group is absent from source definition - it will be some fake group */
	readonly group: number
	readonly bind: number
}

/** For each key of bind chord, action is added to array for that key
 * We need to have primary key to be able to get actions on press, not just on hold
 *
 * That means - for most keys there will be only small number of actions (one or two maybe),
 * but for keys like Ctrl there could be a lot, because this mod key can be widely used.
 * Storing actions like that helps to trigger handlers regardless of key order (Ctrl+R vs R+Ctrl)
 *
 * Possible optimizations for that case include storing actions in tree, with tree keys being input keys,
 * but that will mean that we will need to check every combination of held input keys to find all we need,
 * and that's 2^n complexity (n being number of pressed keys), which is unacceptable.
 *
 * So, for now, I just store them in linear array and optimize search by storing chord key set as bitmap.
 * Hope it will be enough. */
type ActionMap = ReadonlyMap<InputKey, readonly Action[]>


export interface InputKeyActionSourceBind {
	readonly handlers: InputBindActionsObj<number>
	readonly chords: readonly Chord[]
	readonly bind: number
	readonly bindSet: number
	readonly group: number | null
}

/** Immutable set of actions with chords that can trigger those actions.
 * Can be searched by key state and events, to get ready-to-call actions.
 *
 * Is decently optimized for general case.
 * It can be optimized further, but that requires adding some input restrictions, so I don't want to do that.
 *
 * It is written in very particular way to support a lot of corner-cases and conventions, see tests */
export class InputKeyActionSet {
	private readonly upActions: ActionMap
	private readonly downActions: ActionMap
	private readonly holdActions: ActionMap
	private readonly totalGroupsCount: number
	private readonly keyIndexMap: ReadonlyMap<InputKey, number>

	constructor(binds: readonly InputKeyActionSourceBind[]) {
		let group = binds.map(x => x.group).reduce((a, b) => Math.max(a ?? -1, b ?? -1), -1) ?? -1
		const bindToGroupMap = new Map<string, number>()
		for(const bind of binds){
			const key = makeBindGroupKey(bind.bindSet, bind.bind)
			if(!bindToGroupMap.has(key)){
				bindToGroupMap.set(key, bind.group ?? ++group)
			}
		}
		this.totalGroupsCount = group + 1

		const allKnownKeys = new Set(binds.flatMap(bind => bind.chords.flatMap(chord => chord)))
		let i = 0
		const keyIndexMap = this.keyIndexMap = new Map<InputKey, number>()
		for(const key of allKnownKeys){
			keyIndexMap.set(key, i++)
		}

		this.upActions = this.buildActionMap(binds, bindToGroupMap, "onUp")
		this.downActions = this.buildActionMap(binds, bindToGroupMap, "onDown")
		this.holdActions = this.buildActionMap(binds, bindToGroupMap, "onHold")
	}

	private buildActionMap(binds: readonly InputKeyActionSourceBind[], bindGroupMap: ReadonlyMap<string, number>, type: keyof InputBindActionsObj<number>): ActionMap {
		const resultMap = new Map<InputKey, Action[]>()
		for(const bind of binds){
			const handler = bind.handlers[type]
			if(!handler){
				continue
			}

			const groupKey = makeBindGroupKey(bind.bindSet, bind.bind)
			const group = bindGroupMap.get(groupKey)!

			for(const chord of bind.chords){
				for(const primaryKey of chord){
					let arr = resultMap.get(primaryKey)
					if(!arr){
						arr = []
						resultMap.set(primaryKey, arr)
					}
					arr.push({
						bind: bind.bind,
						group,
						chordSize: chord.length,
						chord: BitSet.ofValues(chord.filter(key => key !== primaryKey), this.keyIndexMap),
						handler
					})
				}
			}
		}

		for(const arr of resultMap.values()){
			sortBy(arr, action => -action.chordSize) // biggest chords first, for proper clobbering
		}

		return resultMap
	}

	/** Process pack of key events and find actions that need to be called.
	 * @param downKeys keys that are currently in "down" state. It is expected that modifier keys are normalized; that is, only "left" variation */
	findActions(downKeys: ReadonlySet<InputKey>, events: readonly InputKeyEvent[]): InputKeyActionSearchResult {
		const downCalls: (null | InputKeyActionCallData)[] = new Array(this.totalGroupsCount).fill(null)
		const upCalls: (null | InputKeyActionCallData)[] = new Array(this.totalGroupsCount).fill(null)
		const holdCalls: (null | InputKeyActionCallData)[] = new Array(this.totalGroupsCount).fill(null)

		const currentlyDownKeys = new Set([...downKeys])
		const currentlyDownKeyBits = BitSet.ofValues(currentlyDownKeys, this.keyIndexMap)
		for(const event of events){
			if(event.isDown){
				if(currentlyDownKeys.has(event.key)){
					// this can happen in case of two of the same modifier keys are pressed (left and right)
					continue
				}

				currentlyDownKeys.add(event.key)
				currentlyDownKeyBits.set(this.keyIndexMap.get(event.key)!)

				const downActions = this.findActionsForKey(currentlyDownKeyBits, event.key, this.downActions)
				this.addCalls(downCalls, downActions)

				const holdActions = this.findActionsForHold(currentlyDownKeys, currentlyDownKeyBits)
				this.addCalls(holdCalls, holdActions)
			} else {
				if(!currentlyDownKeys.has(event.key)){
					// this can happen in the same case as double-press (two mod keys)
					// or in case of user pressing keys off-focus and then turning back to the game to release them
					continue
				}

				currentlyDownKeys.delete(event.key)
				currentlyDownKeyBits.reset(this.keyIndexMap.get(event.key)!)

				const upActions = this.findActionsForKey(currentlyDownKeyBits, event.key, this.upActions)
				this.addCalls(upCalls, upActions)
			}
		}

		// there could be inputs remaining hels from previous state
		// let's include them as hold actions
		const holdActions = this.findActionsForHold(currentlyDownKeys, currentlyDownKeyBits)
		this.addCalls(holdCalls, holdActions)

		return {
			down: dropNulls(downCalls),
			hold: dropNulls(holdCalls),
			up: dropNulls(upCalls),
			newDownKeys: currentlyDownKeys
		}
	}

	private addCalls(calls: (null | InputKeyActionCallData)[], actions: Action[] | null): void {
		if(actions === null){
			return
		}

		for(const action of actions){
			const callData = calls[action.group]!
			if(callData === null){
				calls[action.group] = {
					handler: action.handler,
					binds: new Set([action.bind]),
					count: 1
				}
			} else {
				callData.count++
				callData.binds.add(action.bind)
			}
		}
	}

	private findActionsForHold(downKeys: ReadonlySet<InputKey>, keyBits: BitSet): Action[] | null {
		let result: Action[] | null = null
		for(const key of downKeys){
			const actions = this.findActionsForKey(keyBits, key, this.holdActions)
			if(!actions){
				continue
			}
			if(!result){
				result = actions
			} else {
				result.push(...actions)
			}
		}
		return result
	}

	private findActionsForKey(downKeys: BitSet, key: InputKey, map: ActionMap): Action[] | null {
		let actions = this.findRawActionsForKey(downKeys, key, map)
		if(actions !== null){
			actions = this.throwAwayClobberedActions(actions)
		}
		return actions
	}

	private findRawActionsForKey(downKeys: BitSet, key: InputKey, map: ActionMap): Action[] | null {
		const arr = map.get(key)
		if(!arr){
			return null
		}
		const result: Action[] = []
		for(const action of arr){
			if(downKeys.hasAllOf(action.chord)){
				result.push(action)
			}
		}
		return result.length === 0 ? null : result
	}

	private throwAwayClobberedActions(actions: Action[]): Action[] {
		if(actions.length < 2){
			return actions
		}

		const result: Action[] = []
		outer: for(const testedAction of actions){
			for(const acceptedAction of result){
				if(acceptedAction.chordSize <= testedAction.chordSize){
					continue
				}
				if(acceptedAction.chord.hasAllOf(testedAction.chord)){
					continue outer
				}
			}
			result.push(testedAction)
		}
		return result
	}
}

class BitSet {
	private readonly bits: Uint32Array
	private mask = 0
	constructor(size: number) {
		this.bits = new Uint32Array(Math.ceil(size / 32))
	}

	static ofValues<T>(keys: Iterable<T>, map: ReadonlyMap<T, number>): BitSet {
		const result = new BitSet(map.size)
		for(const key of keys){
			result.set(map.get(key)!)
		}
		return result
	}

	toValues<T>(map: ReadonlyMap<T, number>): T[] {
		const result: T[] = []
		for(const [value, position] of map){
			if(this.bits[position >> 5]! & (1 << (position & 0x1f))){
				result.push(value)
			}
		}
		return result
	}

	set(position: number): void {
		this.mask |= 1 << (position & 0x1f)
		this.bits[position >> 5]! |= (1 << (position & 0x1f))
	}

	// note that resetting a bit takes more time than setting it
	// because we need to reset the quick-check mask
	reset(position: number): void {
		this.bits[position >> 5]! &= ~(1 << (position & 0x1f))
		this.mask = 0
		for(let i = 0; i < this.bits.length; i++){
			this.mask |= this.bits[i]!
		}
	}

	// maybe inlining this function can be profitable for performance
	// wonder if v8 is smart enough to do that
	hasAllOf(otherBitSet: BitSet): boolean {
		if((this.mask & otherBitSet.mask) !== otherBitSet.mask){
			// this is just a simple optimization, akin to bloom filter
			return false
		}

		for(let i = 0; i < this.bits.length; i++){
			const b = otherBitSet.bits[i]!
			if((this.bits[i]! & b) !== b){
				return false
			}
		}

		return true
	}
}

function dropNulls<T>(arr: readonly (T | null)[]): T[] {
	return arr.filter((x): x is T => x !== null)
}

function makeBindGroupKey(bindSet: number, bind: number): string {
	return bindSet + "|" + bind
}