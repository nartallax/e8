export const errToString = (e: unknown): string => {
	return e instanceof Error ? e.stack ? e.stack + "" : e.message + "" : ((e as any) + "")
}