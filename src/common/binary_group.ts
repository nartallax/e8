/** Having collection of values, separate them into two groups by given condition */
export function binaryGroup<V>(values: readonly V[], checker: (value: V) => boolean): [trues: V[], falses: V[]] {
	const trues: V[] = []
	const falses: V[] = []

	for(const value of values){
		(checker(value) ? trues : falses).push(value)
	}

	return [trues, falses]
}