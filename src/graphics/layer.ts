import {Perf} from "glue/perfometer"
import {AttribDataPack, AttribInstance, Shader, ShaderAttribs} from "graphics/graphic_types"
import {ArrayList} from "graphics/list"
import {Pool} from "graphics/pool"

export interface GraphicLayer<S extends Shader> {
	tryUpload(frame: number): void
	upload(): void
	makeInstance(): AttribInstance<ShaderAttribs<S>>
	/** Ethereal instance, unlike normal instance, is only valid to use immediately after it is created
	 * and only one can exist per layer.
	 * (it's the same instance every time, that's why you can't save it)
	 * Intended for use in cases like particles, when you don't want to create new instance for each particle,
	 * but still need to upload particle data somehow */
	makeEtherealInstance(endOfLifeTime: number): AttribInstance<ShaderAttribs<S>>
	draw(currentTime: number): void
	delete(): void
	readonly shader: S
}

abstract class BaseGraphicLayer<S extends Shader> implements GraphicLayer<S> {
	protected readonly packList = new ArrayList<AttribDataPack<ShaderAttribs<S>>>(0)
	private lastUploadedFrame = -1
	private etherealInstance: AttribInstance<ShaderAttribs<S>> | null = null

	constructor(protected readonly packPool: Pool<AttribDataPack<ShaderAttribs<S>>>, readonly shader: S) {}

	tryUpload(frame: number): void {
		if(this.lastUploadedFrame === frame){
			return
		}
		this.upload()
		this.lastUploadedFrame = frame
	}

	upload(): void {
		for(const pack of this.packList){
			pack.upload()
		}
	}

	protected getVacantPack(): AttribDataPack<ShaderAttribs<S>> {
		if(this.packList.size > 0){
			const lastPack = this.packList.get(this.packList.size - 1)
			if(lastPack.freeSlots > 0){
				return lastPack
			}
		}

		const pack = this.packPool.acquire()
		this.packList.append(pack)
		return pack
	}

	makeInstance(): AttribInstance<ShaderAttribs<S>> {
		return this.getVacantPack().makeInstance()
	}

	makeEtherealInstance(endOfLifeTime: number): AttribInstance<ShaderAttribs<S>> {
		if(!this.etherealInstance){
			this.etherealInstance = this.makeInstance()
			return this.etherealInstance
		}

		const pack = this.getVacantPack()
		pack.maxEndOfLifeTime = Math.max(endOfLifeTime, pack.maxEndOfLifeTime)
		const index = pack.reserveIndex()
		this.etherealInstance.index = index
		this.etherealInstance.pack = pack
		return this.etherealInstance
	}

	delete(): void {
		while(this.packList.size > 0){
			const pack = this.packList.get(0)
			this.packList.delete(0)
			pack.delete()
		}
	}

	abstract draw(currentTime: number): void
}

/** Graphic layer that smartly compacts its contents */
export class CompactingGraphicLayer<S extends Shader> extends BaseGraphicLayer<S> {
	draw(): void {
		let compactionCandidate: number | null = null
		let prevPack: AttribDataPack<ShaderAttribs<S>> | null = null
		for(const [pack, index] of this.packList.itemsWithIndex()){
			pack.draw()
			if(pack.freeSlots === 0 // never compact into non-depleted pack, that doesn't make sense
				&& prevPack !== null
				&& pack.itemCount + prevPack.itemCount <= this.shader.packSize){
				// taking the last possible candidate, because that'll make array list faster to shift
				// not a big deal, but anyway
				compactionCandidate = index - 1
			}
			prevPack = pack
		}

		if(compactionCandidate !== null){
			Perf.start("compaction")
			const packToDelete = this.packList.get(compactionCandidate)
			const packToReceive = this.packList.get(compactionCandidate + 1)
			packToReceive.takeEverythingFromPreviousPack(packToDelete)
			this.packList.delete(compactionCandidate)
			this.packPool.release(packToDelete)
			Perf.end()
		}
	}
}

/** Graphic layer that just drops empty packs, without other compaction */
export class EmptyDroppingGraphicLayer<S extends Shader> extends BaseGraphicLayer<S> {
	draw(): void {
		while(this.packList.size > 0){
			const pack = this.packList.get(0)
			if(pack.itemCount > 0){
				break
			}
			this.packList.delete(0)
			this.packPool.release(pack)
		}

		for(const pack of this.packList){
			pack.draw()
		}
	}
}

/** Graphic layer that uses maxEndOfLifeTime property on packs to drop them when they run out */
export class TimeDroppingGraphicLayer<S extends Shader> extends BaseGraphicLayer<S> {
	draw(currentTime: number): void {
		while(this.packList.size > 0){
			const pack = this.packList.get(0)
			if(pack.maxEndOfLifeTime >= currentTime){
				break
			}
			pack.resetInstanceCount()
			this.packList.delete(0)
			this.packPool.release(pack)
		}

		for(const pack of this.packList){
			pack.draw()
		}
	}
}