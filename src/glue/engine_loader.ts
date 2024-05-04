import {IndexTypeOfEngine, Entity, EntityClassBase, EntityClass, Engine, EngineLoader, EngineOptions} from "types"
import {EngineImpl} from "glue/engine"
import {EntityImpl, addEngineToEntityClass, addStaticMethodsToEntityClass} from "glue/entity"
import {ResourcePack} from "resource_pack/resource_pack"
import {ResourcePackDecoder} from "resource_pack/resource_pack_decoder"

export class EngineLoaderImpl<E extends Engine> implements EngineLoader<E> {

	private engine: E | null = null
	private entityClasses: EntityClass[] = []

	async createEngine(options: EngineOptions): Promise<E> {
		if(this.engine){
			throw new Error("Engine is already created. No more than one engine may be created by a single loader.")
		}
		const engine = new EngineImpl(options)
		this.engine = engine as unknown as E
		await engine.init()

		for(const cls of this.entityClasses){
			addEngineToEntityClass(cls, engine)
		}
		// just for sake of not hoarding memory
		this.entityClasses.length = 0

		return this.engine
	}

	async getResourcePack(urlOrData: string | Uint8Array): Promise<ResourcePack> {
		if(typeof(urlOrData) === "string"){
			const fetchRes = await fetch(urlOrData)
			const arrayBuffer = await fetchRes.arrayBuffer()
			const bytes = new Uint8Array(arrayBuffer)
			return new ResourcePackDecoder(bytes).decode()
		} else {
			return new ResourcePackDecoder(urlOrData).decode()
		}
	}

	registerEntity<I extends IndexTypeOfEngine<E>, T extends Entity<I>>(index: I, clsBase: EntityClassBase<I, T>): EntityClass<I, T> {
		if(clsBase as unknown === EntityImpl){
			throw new Error("You have attempted to register root entity class as a class of some entity. That's not allowed; you must create a subclass to register it.")
		}
		if(this.engine){
			// I think nothing actually stops us from adding new classes when engine is already created
			// but that's unlikely, so just for sake of error-proofing - throwing
			throw new Error("Engine is already created. No new entities may be registered.")
		}
		const cls = addStaticMethodsToEntityClass(clsBase, index)
		this.entityClasses.push(cls)
		return cls
	}

}