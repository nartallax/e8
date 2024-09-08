import {GlVecSize, SettersByArity, ShaderFieldSizeMap, ShaderField, AttribInstance, AttribDataPack, SetterName, SetterMap} from "graphics/graphic_types"
import {makeAttribArrayCreator} from "graphics/webgl/shader_builder/attributes"
import {makeGetterName, makeSetterName} from "graphics/webgl/graphic_utils"
import {Perf} from "common/perfometer"

type AttribDataPackInternal<A extends ShaderFieldSizeMap<string>> = AttribDataPack<A> & {
	itemCount: number
	readonly data: readonly (Float32Array | Int32Array | Uint32Array)[]
	readonly instances: (AttribInstance<A> | null)[]
	deleteItem(item: AttribInstanceInternal<A>): void
	invalidationMask: number
}

type AttribInstanceInternal<A extends ShaderFieldSizeMap<string>> = AttribInstance<A> & {
	/** Reset every resettable attribute in preparation for deletion */
	reset(): void
	index: number
	pack: AttribDataPackInternal<A>
	moveTo(otherPack: AttribDataPackInternal<A>, otherIndex: number, cleanup: boolean): void
}

export function makeAttribDataPackClass<A extends ShaderFieldSizeMap<string>>(gl: WebGL2RenderingContext, program: WebGLProgram, vertexField: ShaderField, arraySize: number, attribs: ShaderField<A>[], vertexBuffer: WebGLBuffer, indexBuffer: WebGLBuffer): {new(): AttribDataPack<A>} {
	const locations = attribs.map(field => gl.getAttribLocation(program, field.name))
	const vertexLocation = gl.getAttribLocation(program, vertexField.name)
	const makeArrays = makeAttribArrayCreator(gl, locations, arraySize, attribs)
	const AttribInstanceCls = makeAttribInstanceClass(attribs)

	return class AttribDataPackImpl implements AttribDataPackInternal<A> {
		readonly data: readonly (Float32Array | Int32Array | Uint32Array)[]
		readonly buffers: readonly WebGLBuffer[]
		readonly vao: WebGLVertexArrayObject
		/** logic about distribution of models is following:
		 * 1. we need to models to always stay in consistent order, to avoid weird overlapping flickers
		 * 2. every new model is put on top of every other model in the layer
		 * so, we can only create new models at the end of the last pack
		 * and when we are compressing - we move models in current pack to the end of the pack,
		 * and models in earlier pack go from start of the pack */
		instances = new Array<AttribInstanceInternal<A> | null>(arraySize).fill(null)
		freeSlots = arraySize
		itemCount = 0
		invalidationMask = 0
		maxEndOfLifeTime = -1

		constructor() {
			// creating vao first, all the buffers will be bound to it
			const vao = gl.createVertexArray()
			if(!vao){
				throw new Error("VAO was not created.")
			}
			this.vao = vao
			gl.bindVertexArray(vao)
			gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
			gl.enableVertexAttribArray(vertexLocation)
			gl.vertexAttribPointer(vertexLocation, 2, gl.FLOAT, false, 0, 0)
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)

			const {data, buffers} = makeArrays()
			this.data = data
			this.buffers = buffers
		}

		delete(): void {
			for(const buffer of this.buffers){
				gl.deleteBuffer(buffer)
			}
			gl.deleteVertexArray(this.vao)
		}

		upload(): void {
			let mask = this.invalidationMask
			this.invalidationMask = 0
			let index = 0
			while(mask){
				if(mask & 1){
					gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[index]!)
					gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data[index]!)
				}
				mask >>= 1
				index++
			}
		}

		draw(): void {
			Perf.start("pack draw")
			Perf.inc("obj draw", this.itemCount)
			Perf.inc("empty draw", arraySize - this.itemCount)
			gl.bindVertexArray(this.vao)
			gl.drawElementsInstanced(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0, arraySize)
			Perf.end()
		}

		reserveIndex(): number {
			if(this.freeSlots === 0){
				throw new Error("Assertion failed: too many instances in single attrib data pack")
			}
			const index = arraySize - this.freeSlots
			this.freeSlots--
			this.itemCount++
			return index
		}

		makeInstance(): AttribInstanceInternal<A> {
			const index = this.reserveIndex()
			const instance = new AttribInstanceCls(index, this)
			this.instances[index] = instance
			return instance
		}

		resetInstanceCount(): void {
			this.freeSlots = arraySize
			this.itemCount = 0
		}

		deleteItem(item: AttribInstanceInternal<A>): void {
			item.reset()
			this.instances[item.index] = null
			this.itemCount--
		}

		private compactTowardsTheEnd(): void {
			if(this.freeSlots !== 0){
				throw new Error("Assertion failed, trying to compact non-depleted pack")
			}
			let lastFreeSlot = arraySize - 1
			while(this.instances[lastFreeSlot] !== null){
				lastFreeSlot--
			}
			const slotBoundary = arraySize - this.itemCount
			for(let i = lastFreeSlot - 1; lastFreeSlot >= slotBoundary; i--){
				const instance = this.instances[i]
				if(instance !== null){
					instance!.moveTo(this, lastFreeSlot--, true)
				}
			}
		}

		takeEverythingFromPreviousPack(otherPack: this): void {
			this.compactTowardsTheEnd()
			const totalCountBefore = otherPack.itemCount + this.itemCount
			if(totalCountBefore > arraySize){
				throw new Error("Assertion failed, too much instances to compact")
			}
			let firstFreeSlot = 0
			for(let i = 0; firstFreeSlot < otherPack.itemCount; i++){
				const instance = otherPack.instances[i]!
				if(instance !== null){
					instance!.moveTo(this, firstFreeSlot++, false)
				}
			}
			// we don't do any cleanup actions on other pack, it will be deleted anyway
			if(totalCountBefore !== this.itemCount){
				throw new Error(`Assertion failed, had ${totalCountBefore} instances before, and ${this.itemCount} instances after. Compaction algorithm is broken.`)
			}
		}

	}
}

function makeAttribInstanceClass<M extends ShaderFieldSizeMap<string>>(attribs: ShaderField<M>[]): {new(index: number, pack: AttribDataPackInternal<M>): AttribInstanceInternal<M>} {

	class AttribInstanceImpl {
		constructor(public index: number, public pack: AttribDataPackInternal<M>) {}

		reset(): void {
			// clobbered later, see prototype modification
		}

		delete(): void {
			this.pack.deleteItem(this as unknown as AttribInstanceInternal<M>)
		}

		moveTo(otherPack: AttribDataPackInternal<M>, otherIndex: number, cleanup: boolean) {
			for(let fieldIndex = 0; fieldIndex < attribs.length; fieldIndex++){
				const field = attribs[fieldIndex]!
				const aArr = this.pack.data[fieldIndex]!
				const bArr = otherPack.data[fieldIndex]!
				const aOffset = this.index * field.size
				const bOffset = otherIndex * field.size
				for(let i = 0; i < field.size; i++){
					bArr[bOffset + i] = aArr[aOffset + i]!
				}
			}
			if(cleanup){
				this.reset()
				this.pack.instances[this.index] = null
				this.pack.itemCount--
			}
			this.pack = otherPack
			this.index = otherIndex
			this.pack.instances[this.index] = this as unknown as AttribInstanceInternal<M>
			this.pack.invalidationMask = (1 << attribs.length) - 1
			this.pack.itemCount++
		}
	}

	const argNames = ["a", "b", "c", "d"]

	function arrOffsetCode(fieldIndex: number, fieldSize: number, extOffset: number): string {
		let code = ""
		code += `const arr = this.pack.data[${fieldIndex}]\n`
		const plusOffset = extOffset === 0 ? "" : " + " + extOffset
		switch(fieldSize){
			case 1: code += "const offset = this.index\n"; break
			case 2: code += `const offset = (this.index << 1)${plusOffset}\n`; break
			case 3: code += `const offset = (this.index << 1) + this.index${plusOffset}\n`; break
			case 4: code += `const offset = (this.index << 2)${plusOffset}\n`; break
		}
		return code
	}

	function makeSetter<S extends GlVecSize>(fieldSize: GlVecSize, fieldIndex: number, extSize: S, extOffset: number): SettersByArity[S] {
		const mask = 1 << fieldIndex
		let fnCode = ""
		fnCode += `this.pack.invalidationMask |= ${mask}\n`
		fnCode += arrOffsetCode(fieldIndex, fieldSize, extOffset)
		for(let i = 0; i < extSize; i++){
			fnCode += `arr[offset${i === 0 ? "" : " + " + i}] = ${argNames[i]}\n`
		}
		return new Function(...argNames.slice(0, extSize), fnCode) as SettersByArity[S]
	}

	function makeGetter(fieldIndex: number, fieldSize: number, extOffset: number): (this: AttribInstanceImpl, offset: 0 | 1 | 2 | 3) => number {
		let fnCode = ""
		fnCode += arrOffsetCode(fieldIndex, fieldSize, extOffset)
		fnCode += "return arr[offset + offsetWithinField]"
		return new Function("offsetWithinField", fnCode) as (this: AttribInstanceImpl, offset: 0 | 1 | 2 | 3) => number
	}

	const _resetField = attribs.find(field => field.resetValue !== null)
	if(!_resetField){
		throw new Error("At least one reset field is expected")
	}
	const resetField = _resetField // for typechecking
	let resetFieldSetterName: SetterName<keyof M & string> = "" as any // we'll set it anyway

	const proto = AttribInstanceImpl.prototype as any
	for(let i = 0; i < attribs.length; i++){
		const field = attribs[i]!
		let offset = 0
		for(const src of field.sourceFields){
			const setterName = makeSetterName(src.name)
			proto[setterName] = makeSetter(field.size, i, src.size, offset)
			if(field === resetField){
				resetFieldSetterName = setterName
			}
			proto[makeGetterName(src.name)] = makeGetter(i, field.size, offset)
			offset += src.size
		}
	}

	function makeResetter(): (this: SetterMap<M>) => void {
		// `this` is typed like this because since TS 5.4 indexing Readonly<Record<smth, smth>>
		// is not the same as indexing non-readonly Record<smth, smth>
		// why? who knows.
		const v = resetField.resetValue!
		switch(resetField.size){
			case 1: return function() {
				(this[resetFieldSetterName] as SettersByArity[1])(v)
			}
			case 2: return function() {
				(this[resetFieldSetterName] as SettersByArity[2])(v, v)
			}
			case 3: return function() {
				(this[resetFieldSetterName] as SettersByArity[3])(v, v, v)
			}
			case 4: return function() {
				(this[resetFieldSetterName] as SettersByArity[4])(v, v, v, v)
			}
		}
	}
	proto.reset = makeResetter()

	return AttribInstanceImpl as {new(index: number, pack: AttribDataPackInternal<M>): AttribInstanceInternal<M>}
}