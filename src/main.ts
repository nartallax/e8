import {EngineLoaderImpl} from "glue/engine_loader"
import type {Engine, EngineLoader} from "types"

export type {Engine, XY} from "types"

export const makeE8Loader = <T extends Engine>(): EngineLoader<T> => new EngineLoaderImpl<T>()