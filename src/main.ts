import {EngineLoaderImpl} from "glue/engine_loader"
import type {ResourcePack} from "resource_pack/resource_pack"
import {ResourcePackDecoder} from "resource_pack/resource_pack_decoder"
import {ResourcePackEncoder} from "resource_pack/resource_pack_encoder"
import type {Engine, EngineLoader} from "types"

export type {Engine, XY} from "types"
export type {ResourcePack} from "resource_pack/resource_pack"

export const makeE8Loader = <T extends Engine>(): EngineLoader<T> => new EngineLoaderImpl<T>()
export const encodeResourcePack = (resourcePack: ResourcePack): Uint8Array => new ResourcePackEncoder(resourcePack).encode()
export const decodeResourcePack = (data: Uint8Array): ResourcePack => new ResourcePackDecoder(data).decode()