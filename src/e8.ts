import type {ResourcePack} from "resource_pack/resource_pack"
import {ResourcePackDecoder} from "resource_pack/resource_pack_decoder"
import {ResourcePackEncoder} from "resource_pack/resource_pack_encoder"

export {browserKeyboardCodeToInputKey as browserKeyboardKeyToInputKey} from "user_input/inputs"
export {knownMouseButtonInputs, knownKeyboardInputs, knownMouseWheelInputs} from "user_input/inputs"

export type {Engine, XY} from "types"
export type {ResourcePack} from "resource_pack/resource_pack"
export {Entity} from "entities/entity"
export {defineEntity} from "entities/define_entity"

export const encodeResourcePack = (resourcePack: ResourcePack): Uint8Array => new ResourcePackEncoder(resourcePack).encode()
export const decodeResourcePack = (data: Uint8Array): ResourcePack => new ResourcePackDecoder(data).decode()