export function sortBy<T>(values: T[], getField: (value: T) => number | string): void {
	values.sort((a, b) => {
		const aField = getField(a)
		const bField = getField(b)
		return aField > bField ? 1 : aField < bField ? -1 : 0
	})
}

export function copySortBy<T>(values: readonly T[], getField: (value: T) => number | string): T[] {
	const copy = [...values]
	sortBy(copy, getField)
	return copy
}