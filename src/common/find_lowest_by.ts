export function findLowestBy<T>(values: readonly T[], getValue: (value: T) => number | string): T | undefined {
	if(values.length === 0){
		return undefined
	}
	let lowestItem = values[0]!
	let lowestValue = getValue(lowestItem)
	for(let i = 1; i < values.length; i++){
		const item = values[i]!
		const itemValue = getValue(item)
		if(itemValue < lowestValue){
			lowestItem = item
			lowestValue = itemValue
		}
	}
	return lowestItem
}