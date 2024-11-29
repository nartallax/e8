
type Args = {
	values: readonly string[]
	getSuffixWriteCost: (str: string) => number
	getStringWriteCost: (str: string) => number
	getRefWriteCost: () => number
}

type Trie = {
	children: Record<string, Trie>
	char: string
	count: number
	savedCost: number
	isSelected: boolean
}

type Result = {
	suffixes: string[]
	getSuffixOf: (str: string) => string | null
}

/** Having array of strings that potentially ends with the same sequences of characters, find those sequences.
This function will try to minimise overall cost of writing all the values + array of suffix + all references to suffix
Resulting array is sorted; most frequent suffix appears first

It's imprecise, in a sense that it's not possible to accurately calculate costs because bigger values will take more space (in binformat),
but it's a good approximation anyway */
export const findSuffixes = ({
	values, getSuffixWriteCost, getStringWriteCost, getRefWriteCost
}: Args): Result => {
	const root: Trie = {
		children: {}, count: 0, savedCost: 0, char: "", isSelected: false
	}

	// filling initial trie
	for(const value of values){
		let currentTrie = root
		currentTrie.count++
		for(let i = value.length - 1; i >= 0; i--){
			const char = value.charAt(i)
			currentTrie = (currentTrie.children[char] ??= {
				children: {}, char, count: 0, savedCost: 0, isSelected: false
			})
			currentTrie.count++
		}
	}

	// calculating saved costs
	iterateTrie(root, (target, tries) => {
		const suffix = tries.map(trie => trie.char).join("")
		const noSubCost = target.count * getSuffixWriteCost(suffix)
		const subCost = getStringWriteCost(suffix) + getRefWriteCost() * target.count
		const savedCost = noSubCost - subCost
		target.savedCost = savedCost
	})

	// console.log(trieToString(root))

	// finding best suffixes
	let result: string[] = []
	iterateTrie(root, (trie, tries) => {
		const maxChildSavedCost = Object.values(trie.children)
			.map(child => child.savedCost)
			.reduce((a, b) => Math.max(a, b), 0)
		if(trie.savedCost <= 0 || maxChildSavedCost >= trie.savedCost){
			return true
		}

		const suffix = tries.map(trie => trie.char).reverse().join("")
		trie.isSelected = true
		result.push(suffix)
		return false
	})

	// sorting by frequency
	result = result.map(suffix => [suffix, getTrieBySuffix(root, suffix).count] as const)
		.sort(([,a], [,b]) => b - a)
		.map(([suffix]) => suffix)

	return {
		suffixes: result,
		getSuffixOf: str => {
			const seq = getLastSelectedTrieSeqBySuffix(root, str)
			return seq.length === 0 ? null : seq.reverse().map(trie => trie.char).join("")
		}
	}
}

// it's a debug util, it's allowed to be unused
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const trieToString = (trie: Trie, suffix = ""): string => {
	suffix = trie.char + suffix
	let result = `${suffix} (count = ${trie.count}, saved cost = ${trie.savedCost})`
	for(const child of Object.values(trie.children)){
		result += "\n" + trieToString(child, suffix)
	}
	return result
}

const getTrieBySuffix = (trie: Trie, suffix: string): Trie => {
	for(let i = suffix.length - 1; i >= 0; i--){
		const child = trie.children[suffix.charAt(i)]
		if(!child){
			throw new Error(`Failed to resolve trie by suffix ${suffix}`)
		}
		trie = child
	}
	return trie
}

const getLastSelectedTrieSeqBySuffix = (trie: Trie, suffix: string): Trie[] => {
	let lastSelectedTrieSeq: Trie[] = []
	const currentSeq: Trie[] = []
	for(let i = suffix.length - 1; i >= 0; i--){
		const child = trie.children[suffix.charAt(i)]
		if(!child){
			break
		}
		currentSeq.push(child)
		if(child.isSelected){
			lastSelectedTrieSeq = [...currentSeq]
		}
		trie = child
	}
	return lastSelectedTrieSeq
}

const iterateTrie = (trie: Trie, handler: (child: Trie, seq: readonly Trie[]) => (boolean | void), arr: Trie[] = []) => {
	for(const child of Object.values(trie.children)){
		arr.push(child)
		if(handler(child, arr) !== false){
			iterateTrie(child, handler, arr)
		}
		arr.pop()
	}
}