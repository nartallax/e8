import {XY} from "types"
import {InputKey} from "user_input/inputs"

/** Content is collection of everything that was defined in content-packs, processed and ready to be used in the engine */
export type Content = {
	inworldUnitPixelSize: number
	atlasses: Atlas[]
	models: Map<string, ModelDefinition>
	layers: Map<string, LayerDefinition>
	inputBinds: Map<string, InputBindDefinition>
	particles: Map<string, ParticleDefinition>
	collisionGroupMasks: number[] // index of collision group -> bitmask for this collision group
	// TODO: we should also have here entity definitions somehow. not sure how this will look like exactly
}

export type Chord = InputKey[]

export type StartEnd<T> = {
	start: T
	end: T
	progressPower: number
}

export type DeviatingValueRange = {
	average: number
	maxDeviation: number
}

export type ParticleDefinition = {
	amount: number
	size: StartEnd<XY>
	// TODO: option to align rotation to angle
	// TODO: randomize rotation...?
	// TODO: gravity for particles? for non-linear movement
	rotation: StartEnd<number>
	color: StartEnd<number>
	distance: DeviatingValueRange & {progressPower: number}
	lifetime: DeviatingValueRange
	// TODO: deviation type, linear/normal/etc
	angle: number // it's deviation too, but average is decided in runtime
	graphics: AtlasPartWithLayer
}

export type LayerType = "particle" | "model"

export type LayerDefinition = {
	type: LayerType
	drawPriority: number
}

/** Input bind is a way to bind some ingame action to user input */
export type InputBindDefinition = {
	groupIndex: number | null
	isHold: boolean
	defaultChords: readonly Chord[]
}

export type Atlas = {
	size: XY // pixels
	// TODO: it's svg only for now, but we probably should change this
	// in real world we want to be able to:
	// - mix raster and vector
	// - store them in the same image
	// - have common pipeline for browser and non-browser implementations of the engine...? this is far-fetched
	image: string
}

export type AtlasPart = {
	atlasIndex: number
	atlasPosition: XY
	/** Width and height of area on the atlas */
	size: XY
}

export type AtlasPartWithLayer = AtlasPart & {
	layerIndex: number
}

export type ModelPhysics = {
	isStatic: boolean
	collisionGroup: number // integer, 0-31
	/** Shapes are convex polygons.
	 * More than one can be specified if source polygon was concave, or if there's detached polygon */
	shapes: XY[][]
}

/** A model is a template for some object in the world */
export interface ModelDefinition {
	/** Width and height in ingame units. */
	size: XY
	graphics: AtlasPartWithLayer | null
	physics: ModelPhysics | null
}