export type SetterName<T extends string> = `set${Capitalize<T>}`
export type SetterMap<M extends ShaderFieldSizeMap<string>> = {
	[fieldName in keyof M & string as SetterName<fieldName>]: SettersByArity[M[fieldName]]
}

export type GetterName<T extends string> = `get${Capitalize<T>}`
type GetterArgsByArity = [never, 0, 0 | 1, 0 | 1 | 2, 0 | 1 | 2 | 3]
type GetterMap<M extends ShaderFieldSizeMap<string>> = {
	[fieldName in keyof M & string as GetterName<fieldName>]: (offset: GetterArgsByArity[M[fieldName]]) => number
}

export type ShaderRevisionMap<M extends ShaderFieldSizeMap<string>> = Record<keyof M, number>

/** One instance in instanced array.
 * You can think of it as a single object on a screen */
export type AttribInstance<A extends ShaderFieldSizeMap<string> = ShaderFieldSizeMap<string>> = Readonly<SetterMap<A>> & Readonly<GetterMap<A>> & {
	index: number
	pack: AttribDataPack<A>
	delete(): void
}

/** Pack of AttribInstances. Drawn with one draw-call. */
export interface AttribDataPack<A extends ShaderFieldSizeMap<string>> {
	readonly freeSlots: number // amount of models that can be created in this pack
	readonly itemCount: number // amount of models actually in the pack
	makeInstance(): AttribInstance<A>
	/** Get index without creating an instance.
	 * Index won't be freed on it's own! */
	reserveIndex(): number
	/** Biggest end-of-life of elements in this pack.
	 * Only has meaningful value when used with ethereal instances */
	maxEndOfLifeTime: number
	/** Makes pack think that it has zero instances without actually clearing any data
	 * Intended to use with ethereal instances */
	resetInstanceCount(): void
	// upload is separated from draw
	// in some frames, physics did not tick, so no point in trying to upload anything
	// (there could be user-generated changes, but for now I think they aren't worth it)
	upload(): void
	draw(): void
	delete(): void
	takeEverythingFromPreviousPack(otherPack: this): void
}


export type SettersByArity = {
	1: (a: number) => void
	2: (a: number, b: number) => void
	3: (a: number, b: number, c: number) => void
	4: (a: number, b: number, c: number, d: number) => void
}

export type GlVecSize = 1 | 2 | 3 | 4
export type ShaderFieldSizeMap<N extends string> = Readonly<Record<N, GlVecSize>>

export type ShaderNumberType = "float" | "int" | "uint"
export type ShaderFieldType = ShaderNumberType | "sampler2D"

export interface ShaderSourceField<N extends string, S extends GlVecSize = 1, T extends ShaderFieldType = ShaderFieldType>{
	readonly name: N
	/** Type of the fields. Defaults to float. */
	readonly type: T
	/** If set, this field will be used when clearing the instance slot in instance data array.
	 * Only one reset field is permitted per shader. */
	readonly resetValue: number | null
	/** Amount of numbers within field. Defaults to 1. */
	readonly size: S
}

export interface ShaderField<M extends ShaderFieldSizeMap<string> = ShaderFieldSizeMap<string>> {
	readonly type: ShaderFieldType
	readonly name: string
	// each actual shader field can be a group of several other user-defined shader fields
	// user should percieve them individually, but shader should know the mapping to be able to upload
	readonly sourceFields: readonly ShaderSourceField<keyof M & string, GlVecSize>[]
	readonly size: GlVecSize
	readonly resetValue: number | null
}

export interface ShaderSource<A extends ShaderFieldSizeMap<string>, U extends ShaderFieldSizeMap<string>> {
	readonly code: string
	readonly attributes: readonly ShaderField<A>[]
	readonly uniforms: readonly ShaderField<U>[]
	readonly vertexField: ShaderField | null
	readonly resetField: ShaderField | null
}

export type ShaderAttribs<S> = S extends Shader<infer A, any> ? A : never

/** Compiled and loaded graphic program.
 * Has bindings for setting uniforms. */
export type Shader<A extends ShaderFieldSizeMap<string> = Record<never, 1>, U extends ShaderFieldSizeMap<string> = Record<never, 1>> = Readonly<SetterMap<U>> & {
	delete(): void
	makePack(): AttribDataPack<A>
	activate(): void
	lastActiveFrame: number
	uniformRevisions: ShaderRevisionMap<U>
	readonly packSize: number
}