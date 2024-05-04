export function capitalize<T extends string>(x: T): Capitalize<T> {
	if(x === ""){
		return x as Capitalize<T>
	}
	return x.charAt(0).toUpperCase() + x.substring(1) as Capitalize<T>
}

export function uncapitalize<T extends string>(x: T): Uncapitalize<T> {
	if(x === ""){
		return x as Uncapitalize<T>
	}
	return x.charAt(0).toLowerCase() + x.substring(1) as Uncapitalize<T>
}