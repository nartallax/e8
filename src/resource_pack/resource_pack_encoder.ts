import {BinformatEncoder} from "common/binformat/binformat_encoder"
import {InputKey, simplifyInputKey} from "user_input/inputs"
import {AltasPartWithLayer, Atlas, DeviatingValueRange, ResourcePack, StartEnd} from "resource_pack/resource_pack"
import {ResourcePackDecoder} from "resource_pack/resource_pack_decoder"
import {XY} from "types"

export class ResourcePackEncoder extends BinformatEncoder<ResourcePack> {

	protected getMaxLookback(): number {
		return 2
	}

	private writeDefaultFloat(float: number): void {
		this.writeInt(Math.round(float * ResourcePackDecoder.defaultFloatDivider))
	}

	private writeXY(xy: XY): void {
		this.writeDefaultFloat(xy.x)
		this.writeDefaultFloat(xy.y)
	}

	private writeStartEnd<T>(startEnd: StartEnd<T>, writeValue: (value: T) => void): void {
		writeValue(startEnd.start)
		writeValue(startEnd.end)
		this.writeDefaultFloat(startEnd.progressPower)
	}

	private writeDeviatingRange(range: DeviatingValueRange): void {
		this.writeDefaultFloat(range.average)
		this.writeDefaultFloat(range.maxDeviation)
	}

	private writeAtlasPartWithLayer(texture: AltasPartWithLayer, atlasses: readonly Atlas[]): void {
		const atlas = atlasses[texture.atlasIndex]!
		this.writeUint(texture.layer)
		this.writeUint(texture.atlasIndex)
		// this can take less space, if we diffencode it
		// but that will complicate writing-reading process
		// and the profit is not even that high
		// so, whatever.
		this.writeUint(texture.position[0] * atlas.size[0])
		this.writeUint(texture.position[1] * atlas.size[1])
		this.writeUint(texture.size[0] * atlas.size[0])
		this.writeUint(texture.size[1] * atlas.size[1])
	}

	protected override writeRootValue(resourcePack: ResourcePack): void {
		this.writeString("resourcepack_v1")
		this.writeUint(resourcePack.inworldUnitPixelSize)

		this.writeArray(resourcePack.layers, layer => {
			switch(layer.type){
				case "model": this.writeByte(0); break
				case "particle": this.writeByte(1); break
			}
		})

		this.writeUint(resourcePack.collisionGroupCount)
		this.writeArray(resourcePack.collisionGroupPairs, ([a, b]) => {
			this.writeUint(a)
			this.writeUint(b)
		})

		this.writeArray(resourcePack.atlasses, atlas => {
			this.writeUint(atlas.size[0])
			this.writeUint(atlas.size[1])
			this.writeArray(atlas.pictures, picture => {
				this.writeString(picture.extension)
				if(picture.extension === "svg"){
					if(typeof(picture.data) !== "string"){
						throw new Error("Atlas data must be string for svg")
					}
					// TODO: consider writing svg in more compact way than just a string
					// XML can be compressed a lot if you know the structure
					// but first I need to gather various assets, to be able to induce which elements/properties I should write in more concise way and how
					this.writeString(picture.data)
				} else {
					if(typeof(picture.data) === "string"){
						throw new Error("Atlas data can only be string for svg")
					}
					this.writeByteArray(picture.data)
				}
			})
		})

		this.writeArray(resourcePack.models, model => {
			this.writeUint(model.size[0])
			this.writeUint(model.size[1])
			this.writeAtlasPartWithLayer(model.texture, resourcePack.atlasses)
			this.writeBool(model.physics.isStatic)
			this.writeUint(model.physics.collisionGroup)
			this.writeArray(model.physics.shapes, shape => {
				this.writeArray(shape, xy => {
					this.writeDiffencodedInt(
						Math.round(xy[0] * resourcePack.inworldUnitPixelSize),
						2
					)
					this.writeDiffencodedInt(
						Math.round(xy[1] * resourcePack.inworldUnitPixelSize),
						2
					)
				})
			})
		})

		this.writeArray(resourcePack.particles, particle => {
			this.writeUint(particle.amount)
			this.writeStartEnd(particle.size, xy => this.writeXY(xy))
			this.writeStartEnd(particle.rotation, rotation => this.writeDefaultFloat(rotation))
			this.writeStartEnd(particle.color, color => this.writeUint(color))
			this.writeDeviatingRange(particle.distance)
			this.writeDefaultFloat(particle.distance.progressPower)
			this.writeDeviatingRange(particle.lifetime)
			this.writeDefaultFloat(particle.angle)
			this.writeAtlasPartWithLayer(particle.texture, resourcePack.atlasses)
		})

		this.writeArray(resourcePack.inputBinds, bindSet => {
			this.writeArray(bindSet.binds, bind => {
				this.writeUint(bind.group === null ? 0 : bind.group + 1)
				this.writeBool(bind.isHold)
				this.writeArray(bind.defaultChords, chord => {
					const mainKeys: InputKey[] = []
					let modMask = 0
					for(const key of chord){
						switch(key){
							case "AltLeft":
							case "AltRight":
								modMask |= 1 << 0
								continue
							case "ControlLeft":
							case "ControlRight":
								modMask |= 1 << 1
								continue
							case "ShiftLeft":
							case "ShiftRight":
								modMask |= 1 << 2
								continue
							case "MetaLeft":
							case "MetaRight":
								modMask |= 1 << 3
								continue
							default:
								mainKeys.push(key)
								continue
						}
					}
					this.writeUint(modMask)
					this.writeArray(mainKeys, key => this.writeString(simplifyInputKey(key)))
				})
			})
		})
	}

}