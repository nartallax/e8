import {BinformatDecoder} from "common/binformat/binformat_decoder"
import {InputKey} from "user_input/inputs"
import {AltasPartWithLayer, Atlas, AtlasPicture, Chord, DeviatingValueRange, InputBindDefinition, LayerDefinition, Model, ParticleDefinition, ResourcePack, StartEnd} from "resource_pack/resource_pack"
import {XY} from "types"

export class ResourcePackDecoder extends BinformatDecoder<ResourcePack> {

	static readonly defaultFloatDivider = 0xffff

	protected getMaxLookback(): number {
		return 2
	}

	private readStartEnd<T>(readValue: () => T): StartEnd<T> {
		const start = readValue()
		const end = readValue()
		const progressPower = this.readDefaultFloat()
		return {start, end, progressPower}
	}

	private readDeviatingRange(): DeviatingValueRange {
		const average = this.readDefaultFloat()
		const maxDeviation = this.readDefaultFloat()
		return {average, maxDeviation}
	}

	private readDefaultFloat(): number {
		return this.readInt() / ResourcePackDecoder.defaultFloatDivider
	}

	private readXY(): XY {
		const x = this.readDefaultFloat()
		const y = this.readDefaultFloat()
		return {x, y}
	}

	private readNullable<T>(readValue: () => T): T | null {
		if(!this.readBool()){
			return null
		}
		return readValue()
	}

	private readAtlasPartWithLayer(atlasses: Atlas[]): AltasPartWithLayer {
		const layer = this.readUint()
		const atlasIndex = this.readUint()
		const atlas = atlasses[atlasIndex]!
		let x = this.readUint() / atlas.size[0]
		let y = this.readUint() / atlas.size[1]
		const position = [x, y] as const
		x = this.readUint() / atlas.size[0]
		y = this.readUint() / atlas.size[1]
		const size = [x, y] as const
		return {atlasIndex, position, size, layer}
	}

	protected readRootValue(): ResourcePack {
		const magicBytes = this.readString()
		if(magicBytes !== "resourcepack_v1"){
			throw new Error("Unexpected format. That's not a resourcepack.")
		}

		const inworldUnitPixelSize = this.readUint()

		const layers = this.readArray((): LayerDefinition => {
			const typeCode = this.readByte()
			switch(typeCode){
				case 0: return {type: "model"}
				case 1: return {type: "particle"}
				default: throw new Error("Unsupported model definition type code: " + typeCode)
			}
		})

		const collisionGroupCount = this.readUint()
		const collisionGroupPairs = this.readArray(() => [this.readUint(), this.readUint()] as const)

		const atlasses = this.readArray((): Atlas => {
			const x = this.readUint()
			const y = this.readUint()
			const pictures = this.readArray((): AtlasPicture => {
				const extension = this.readString()
				const data = extension === "svg" ? this.readString() : this.readByteArray()
				return {extension, data}
			})
			return {size: [x, y], pictures}
		})

		const models = this.readArray((): Model => {
			const x = this.readUint()
			const y = this.readUint()
			const modelSize = [x, y] as const
			const texture = this.readNullable(() => this.readAtlasPartWithLayer(atlasses))
			const isStatic = this.readBool()
			const collisionGroup = this.readUint()

			const shapes = this.readArray(() => this.readArray(() => {
				const x = this.readDiffencodedInt(2)
				const y = this.readDiffencodedInt(2)
				return [x / inworldUnitPixelSize, y / inworldUnitPixelSize] as const
			}))

			return {
				size: modelSize,
				texture,
				physics: {isStatic, collisionGroup, shapes}
			}
		})

		const particles = this.readArray((): ParticleDefinition => {
			const amount = this.readUint()
			const size = this.readStartEnd(() => this.readXY())
			const rotation = this.readStartEnd(() => this.readDefaultFloat())
			const color = this.readStartEnd(() => this.readUint())
			const distanceValues = this.readDeviatingRange()
			const distance = {
				...distanceValues,
				progressPower: this.readDefaultFloat()
			}
			const lifetime = this.readDeviatingRange()
			const angle = this.readDefaultFloat()
			const texture = this.readAtlasPartWithLayer(atlasses)
			return {amount, size, rotation, color, distance, lifetime, angle, texture}
		})

		const inputBinds = this.readArray((): InputBindDefinition => {
			let inputGroup: number | null = this.readUint()
			inputGroup = inputGroup === 0 ? null : inputGroup - 1
			const isHold = this.readBool()
			return {
				group: inputGroup,
				isHold,
				defaultChords: this.readArray((): Chord => {
					const modMask = this.readUint()
					const keys = this.readArray(() => this.readString() as InputKey)
					if(modMask & (1 << 0)){
						keys.push("Alt")
					}
					if(modMask & (1 << 1)){
						keys.push("Ctrl")
					}
					if(modMask & (1 << 2)){
						keys.push("Shift")
					}
					if(modMask & (1 << 3)){
						keys.push("Meta")
					}
					return keys
				})
			}
		})

		return {inworldUnitPixelSize, atlasses, models, particles, layers, collisionGroupPairs, collisionGroupCount, inputBinds}
	}
}