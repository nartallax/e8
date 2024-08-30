export const setClassName = <T>(cls: T, newName: string): void => {
	Object.defineProperty(cls, "name", {
		...Object.getOwnPropertyDescriptor(cls, "name"),
		value: newName
	})
}