import {XY} from "types"
import {InputKey} from "user_input/inputs"

/** A collection of textures, models and sounds */
export interface ResourcePack {
	readonly inworldUnitPixelSize: number
	readonly atlasses: readonly Atlas[]
	readonly models: readonly Model[]
	readonly layers: readonly LayerDefinition[]
	readonly collisionGroupCount: number
	readonly collisionGroupPairs: readonly (readonly [number, number])[]
	readonly inputBinds: readonly InputBindDefinition[]
	readonly particles: readonly ParticleDefinition[]
}

export interface StartEnd<T>{
	readonly start: T
	readonly end: T
	readonly progressPower: number
}

export interface DeviatingValueRange {
	readonly average: number
	readonly maxDeviation: number
}

export interface ParticleDefinition {
	readonly amount: number
	readonly size: StartEnd<XY>
	// TODO: option to align rotation to angle
	// TODO: randomize rotation...?
	readonly rotation: StartEnd<number>
	readonly color: StartEnd<number>
	readonly distance: DeviatingValueRange & {progressPower: number}
	readonly lifetime: DeviatingValueRange
	// TODO: deviation type, linear/normal/etc
	readonly angle: number // it's deviation too, but average is decided in runtime
	readonly texture: AltasPartWithLayer
}

export type AltasPartWithLayer = AtlasPart & {readonly layer: number}

export type LayerType = "particle" | "model"

export interface LayerDefinition {
	readonly type: LayerType
}

/** One action that can be triggered by user input */
export interface InputBindDefinition {
	readonly group: number | null
	readonly isHold: boolean
	readonly defaultChords: readonly Chord[]
}

/** Chord is a set of keys.
 * When all the keys in the chord are pressed simultaneously - action happens. */
export type Chord = readonly InputKey[]

// points in asset project are {x, y} objects, but in resource pack are tuples
// this helps avoid runtime conversions, as our physics engine expects tuples
export type XYTuple = readonly [x: number, y: number]

export interface Atlas {
	readonly size: XYTuple // px
	/** One atlas could consist of more than one picture
	 * In case of some pictures beind vector and some being raster
	 * When atlas is used, pictures are expected to be overlayed over each other to form the texture */
	readonly pictures: AtlasPicture[]
}

export interface AtlasPart {
	readonly atlasIndex: number
	readonly position: XYTuple
	/** Width and height of area on the atlas */
	readonly size: XYTuple
}

export interface AtlasPicture {
	readonly extension: string // svg/png/webp/...
	readonly data: Uint8Array | string // string in case of svg
}

/** A model is a template for some object in the world */
export interface Model {
	/** Width and height in ingame units. */
	readonly size: XYTuple
	readonly texture: AltasPartWithLayer | null
	readonly physics: ModelPhysics
}

export interface ModelPhysics {
	readonly isStatic: boolean
	readonly collisionGroup: number // integer, 0-31
	/** Shapes are convex polygons.
	 * More than one can be specified if source polygon was concave, or if there's detached polygon */
	readonly shapes: readonly (readonly XYTuple[])[]
}