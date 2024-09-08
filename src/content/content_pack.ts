import {InputBindDefinition, LayerDefinition, ModelDefinition, ModelPhysics, ParticleDefinition} from "content/content"
import {supportedTextureExtensions} from "content/content_pack_reader"
import {XY} from "common_types"

export type ContentPack = {
	description: ContentPackDescription
	/** JS code that is bundled with the pack.
	May be absent if the pack exist purely for providing textures */
	js?: string
	// MODDING: figure out how to actually generate type definitions for module like this
	// it should look something like `declare module "e8:pack_with_stuff" { entities: [...]; mixins: [...] }`
	/** Type definitions. Typescript code. Describes what entrypoint code exports.
	Is mandatory if the content pack is not standalone and entrypoint code is present. */
	types?: string
	// all those maps are fully-qualified path name -> value
	// (fully-qualified = with content pack names prefixed, but without extension)
	// paths that refer to those values are also supposed to be fully-qualified
	collisionGroups: Map<string, ContentPackCollisionGroup>
	layers: Map<string, ContentPackLayer>
	textures: Map<string, ContentPackTexture>
	models: Map<string, ContentPackModel>
	inputBinds: Map<string, ContentPackInputBind>
	inputGroups: Map<string, ContentPackInputGroup>
	particles: Map<string, ContentPackParticle>
}

export type ContentPackInputBind = Omit<InputBindDefinition, "groupIndex"> & {
	groupPath?: string
}

export type ContentPackInputGroup = {
	// TODO: redo this. it's simplier to add something like "bind names" to InputBind, allow to have multiple of them, and pass them to handler of this input bind

	// this object is supposed to be empty
}

export type ContentPackLayer = LayerDefinition

export type ContentPackCollisionGroup = {
	/** List of groups this collision group collides with
	If only one of collision groups mentions other one - they will collide */
	collidesWithGroupPaths: string[]
}

export type ContentPackTexture = {
	extension: (typeof supportedTextureExtensions)[number]
	content: ArrayBuffer
}

export type ContentPackGraphics = {
	texturePath: string
	layerPath: string
}

export type ContentPackModelPhysics = Omit<ModelPhysics, "collisionGroup" | "collisionGroupMask" | "shapes" | "shapesLowerBounds"> & {
	collisionGroupPath: string
	shapes: XY[][]
}

/** A model is a template for some object in the world */
export type ContentPackModel = Omit<ModelDefinition, "graphics" | "physics"> & {
	graphics?: ContentPackGraphics
	physics?: ContentPackModelPhysics
}

export type ContentPackDescription = {
	/** Identifier of a content pack. Should be unique.
	It is used as module name when importing, as file name of the pack, and possibly in other places.
	Because of that, this name should be path-safe and many-other-things-safe. */
	identifier: string
	/** Semver string of this content pack's version */
	version: string
	/** displayName is user-friendly name. May contain arbitrary characters. */
	displayName: string
	/** Some user-friendly text to explain what the package is about */
	description: string
	/** Some reference to author of this content pack.
	Only strings are supported; npm allows more stuff here than we support */
	author?: string
	/** List of dependencies that this content pack expects to be provided in runtime.
	All content packs this content pack depends on must be referenced here.
	Dependencies are loaded before content packs that depend on them.
	Key is module name; value is semver-expression. Like { "e8:core": ">=2.1.0"}  */
	dependencies: Record<string, string>
	/** The same as dependencies, but can be absent in runtime.
	This field is useful for controlling order of content pack loading.
	Circular dependencies are not allowed, even optional. */
	optionalDependencies: Record<string, string>
	/** Standalone content pack is a game/piece of functionality in itself.
	It's not usable from outside world and is not using anything from outside world.
	Pros/cons/limitations for standalone content packs are:
	- it is not allowed to refer to other content-packs
	- it is not required to have type definitions
	- can be compressed better than non-standalone content packs
	- can have pre-built atlas layouts to speed up loading times */
	isStandalone: boolean
	// MODDING: add references to other content packs here. with versions probably..?
	// MODDING: prebuild atlas layout...? and maybe atlasses alltogether?
	// MODDING: think about actually better compressing standalone content packs (throwing away archive tree in favor of some other way of storing tree...? just `tar`ing all the files in the archive...?)
	/** Size, in pixels, of one in-world unit on x1 zoom. Affects many things.
	Scale must be defined at least for one content pack among all loaded */
	scale?: number
}

export type ContentPackParticle = Omit<ParticleDefinition, "graphics"> & {
	graphics: ContentPackGraphics
}