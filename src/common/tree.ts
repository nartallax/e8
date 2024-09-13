export type Tree<T, B> = TreeLeaf<T> | TreeBranch<T, B>
export type Forest<T, B> = readonly Tree<T, B>[]

/** Tree path is a sequence of indices (first being index of root in a forest) that point to some element in tree */
export type TreePath = readonly number[]

export interface TreeLeaf<T>{
	readonly value: T
}

export interface TreeBranch<T, B>{
	readonly value: B
	readonly children: readonly Tree<T, B>[]
}

export const isTreeBranch = <T, B>(x: Tree<T, B>): x is TreeBranch<T, B> => {
	return "children" in x
}

export const getForestLeaves = <T, B>(forest: Forest<T, B>): IterableIterator<[TreePath, T]> => {
	return getForestLeavesInternal(forest, [])
}

export const getLeafByPath = <T, B>(forest: Forest<T, B>, path: TreePath): T => {
	const tree = getTreeByPath(forest, path)
	if(isTreeBranch(tree)){
		throw new Error("Path does not point to tree leaf, but to tree branch.")
	}
	return tree.value
}

export const getAllTreesByPath = <T, B>(forest: Forest<T, B>, path: TreePath): Tree<T, B>[] => {
	const result: Tree<T, B>[] = []
	for(let i = 0; i < path.length; i++){
		const currentKey = path[i]!
		const nextTree = forest[currentKey]
		if(i === path.length - 1){
			if(!nextTree){
				throw new Error("Path does not point to tree node.")
			}
			result.push(nextTree)
			return result
		}
		if(!nextTree || !isTreeBranch(nextTree)){
			throw new Error("Path does not point to tree node.")
		}
		result.push(nextTree)
		forest = nextTree.children
	}
	throw new Error("Path does not point to tree node.")
}

export const getTreeByPath = <T, B>(forest: Forest<T, B>, path: TreePath): Tree<T, B> => {
	for(let i = 0; i < path.length; i++){
		const currentKey = path[i]!
		const nextTree = forest[currentKey]
		if(i === path.length - 1){
			if(!nextTree){
				throw new Error("Path does not point to tree node.")
			}
			return nextTree
		}
		if(!nextTree || !isTreeBranch(nextTree)){
			throw new Error("Path does not point to tree node.")
		}
		forest = nextTree.children
	}
	throw new Error("Path does not point to tree node.")
}

function* getForestLeavesInternal<T, B>(forest: Forest<T, B>, path: TreePath): IterableIterator<[TreePath, T]> {
	let i = -1
	for(const tree of forest){
		i++
		const itemPath = [...path, i]
		if(isTreeBranch(tree)){
			yield* getForestLeavesInternal(tree.children, itemPath)
		} else {
			yield[itemPath, tree.value]
		}
	}
}