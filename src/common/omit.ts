export function omit<T, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
	const result: any = {}
	const keySet = new Set<any>(keys)
	for(const key in obj){
		if(keySet.has(key)){
			continue
		}
		result[key] = obj[key]
	}
	return result
}