import {nonNull} from "common/non_null"

export type Tree<T, B> = TreeLeaf<T> | TreeBranch<T, B>

export interface TreeLeaf<T>{
	readonly value: T
}

export function isTreeLeaf<T, B>(x: Tree<T, B>): x is TreeLeaf<T> {
	return !isTreeBranch(x)
}

export interface TreeBranch<T, B>{
	readonly value: B
	readonly children: readonly Tree<T, B>[]
}

export function isTreeBranch<T, B>(x: Tree<T, B>): x is TreeBranch<T, B> {
	return "children" in x
}

export function getTreeLeaves<T, B>(tree: Tree<T, B>): IterableIterator<[readonly TreeBranch<T, B>[], T]> {
	return getTreeLeavesInternal(tree, [])
}

function* getTreeLeavesInternal<T, B>(tree: Tree<T, B>, parents: TreeBranch<T, B>[]): IterableIterator<[readonly TreeBranch<T, B>[], T]> {
	if(isTreeLeaf(tree)){
		yield[parents, tree.value]
	} else {
		parents.push(tree)
		for(const child of tree.children){
			yield* getTreeLeavesInternal(child, parents)
		}
		parents.pop()
	}
}

export function findOneLeafInTrees<T, B>(trees: readonly Tree<T, B>[], isThisIt: (value: T) => boolean): TreeLeaf<T> | undefined {
	for(const tree of trees){
		const result = findOneLeaf(tree, isThisIt)
		if(result !== undefined){
			return result
		}
	}
	return undefined
}

export function findOneLeaf<T, B>(tree: Tree<T, B>, isThisIt: (value: T) => boolean): TreeLeaf<T> | undefined {
	if(isTreeBranch(tree)){
		for(const child of tree.children){
			const result = findOneLeaf(child, isThisIt)
			if(result !== undefined){
				return result
			}
		}
	} else if(isThisIt(tree.value)){
		return tree
	}
	return undefined
}

export function filterTreeLeaves<T, B>(tree: Tree<T, B>, shouldKeepLeaf: (value: T) => boolean): Tree<T, B> | null {
	if(isTreeLeaf(tree)){
		if(!shouldKeepLeaf(tree.value)){
			return null
		}
		return tree
	}

	const newChildren = tree.children
		.map(x => filterTreeLeaves(x, shouldKeepLeaf))
		.filter(nonNull)

	return {children: newChildren, value: tree.value}
}

export function mapTreeLeaves<T, B, R>(tree: Tree<T, B>, map: (value: T) => R): Tree<R, B> {
	if(isTreeLeaf(tree)){
		return {value: map(tree.value)}
	}

	const newChildren = tree.children.map(x => mapTreeLeaves(x, map))
	return {children: newChildren, value: tree.value}
}