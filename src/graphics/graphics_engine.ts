import {Content, ParticleDefinition} from "content/content"
import {EntityImpl} from "entities/entity"
import {EngineImpl} from "engine/engine"
import {CameraImpl} from "graphics/camera"
import {createWebgl2Canvas, setViewportSizeByCanvas} from "graphics/canvas"
import {AttribDataPack, AttribInstance, ShaderAttribs} from "graphics/graphic_types"
import {CompactingGraphicLayer, GraphicLayer, TimeDroppingGraphicLayer} from "graphics/layer"
import {ListPool, Pool} from "graphics/pool"
import {MainShader, makeMainShader} from "graphics/webgl/shaders/main_shader/main_shader"
import {ParticleShader, makeParticleShader} from "graphics/webgl/shaders/particle_shader/particle_shader"
import {makeSquareIndexBuffer, makeSquareVertexBuffer} from "graphics/webgl/square_buffer_creation"
import {loadSvgAsTexture} from "graphics/webgl/texture"
import {XY} from "common_types"

export type EntityGraphicsFieldType = AttribInstance<ShaderAttribs<MainShader>> | null

type SomeShader = MainShader | ParticleShader

export class GraphicEngine {
	private lastUploadedPhysicsTick = -1
	private readonly gl: WebGL2RenderingContext
	private readonly squareVertexBuffer: WebGLBuffer
	private readonly squareIndexBuffer: WebGLBuffer
	private readonly mainShader: MainShader
	private readonly mainPool: Pool<AttribDataPack<ShaderAttribs<MainShader>>>
	private readonly particleShader: ParticleShader
	private readonly particlePool: Pool<AttribDataPack<ShaderAttribs<ParticleShader>>>
	private readonly mainLayers: readonly GraphicLayer<MainShader>[]
	private readonly layers: readonly GraphicLayer<SomeShader>[]
	private readonly visibleEntities = new Set<EntityImpl>()
	readonly canvas: HTMLCanvasElement
	private screenHeight: number = 0
	private screenWidth: number = 0
	private atlasTexture: WebGLTexture | null = null
	private frameCount = 0
	private activeShader: SomeShader | null = null
	readonly camera: CameraImpl

	constructor(private readonly content: Content, container: HTMLElement, private readonly engine: EngineImpl) {
		this.camera = new CameraImpl(engine)
		const [canvas, gl] = createWebgl2Canvas()
		this.canvas = canvas
		this.gl = gl
		container.append(canvas)

		this.squareVertexBuffer = makeSquareVertexBuffer(gl)
		this.squareIndexBuffer = makeSquareIndexBuffer(gl)

		this.mainShader = makeMainShader(gl, this.squareVertexBuffer, this.squareIndexBuffer)
		this.mainPool = new ListPool(
			() => this.mainShader.makePack(),
			pack => pack.delete(),
			16
		)

		this.particleShader = makeParticleShader(gl, this.squareVertexBuffer, this.squareIndexBuffer)
		this.particlePool = new ListPool(
			() => this.particleShader.makePack(),
			pack => pack.delete(),
			16
		)

		const mainLayers: (typeof this.mainLayers[number])[] = this.mainLayers = []
		const layers: (typeof this.layers[number])[] = this.layers = []
		for(const [,def] of content.orderedLayers){
			let layer: GraphicLayer<SomeShader>
			switch(def.type){
				case "model": {
					const mainLayer = new CompactingGraphicLayer(this.mainPool, this.mainShader)
					mainLayers.push(mainLayer)
					layer = mainLayer
				} break
				case "particle":
					layer = new TimeDroppingGraphicLayer(this.particlePool, this.particleShader)
					break
			}
			layers.push(layer)
		}

		this.setupResizeObserver()
	}

	async init(): Promise<void> {
		const svg = this.content.atlasses[0]!.image
		this.atlasTexture = await loadSvgAsTexture(this.gl, svg)
	}

	addEntity(entity: EntityImpl): void {
		if(entity.graphics !== null){
			throw new Error("Assertion failed: double-add graphics")
		}

		const def = entity.model
		if(!def || !def.graphics){
			return
		}

		const layer = this.layers[def.graphics.layerIndex] as GraphicLayer<MainShader>
		const instance = layer.makeInstance()
		entity.graphics = instance
		// every single instanced attrib is expected to be filled here
		// otherwise there will be zeroes
		instance.setEntityPosition(entity.x, entity.y, entity.x, entity.y)
		instance.setEntityRotation(entity.rotation, entity.rotation)
		instance.setEntitySize(def.size.x, def.size.y)
		const t = def.graphics
		instance.setTexturePosition(t.atlasPosition.x, t.atlasPosition.y, t.size.x, t.size.y)
		this.visibleEntities.add(entity)
	}

	removeEntity(entity: EntityImpl): void {
		if(entity.graphics === null){
			throw new Error("Assertion failed: double-delete graphics")
		}

		const def = entity.model
		if(!def || !def.graphics){
			return
		}

		entity.graphics.delete()
		this.visibleEntities.delete(entity)
	}

	private getCurrentTime(): number {
		return this.engine.timePassed - this.engine.timePerTick
	}

	private activateShader(shader: SomeShader): void {
		if(this.activeShader !== shader){
			shader.activate()
			this.activeShader = shader
		}
		if(this.activeShader.lastActiveFrame !== this.frameCount){
			this.setCommonUniforms(this.activeShader)
			this.activeShader.lastActiveFrame = this.frameCount
		}
	}

	private setCommonUniforms(shader: SomeShader): void {
		shader.setCurrentTime(this.getCurrentTime())

		if(this.camera.currentRevision !== shader.uniformRevisions.camera){
			shader.uniformRevisions.camera = this.camera.currentRevision
			const cameraCenter = this.camera.getCenter()
			shader.setCamera(cameraCenter.x, cameraCenter.y, this.camera.getZoom())
		}

		const screenSizeNumber = this.screenHeight << 16 | this.screenWidth
		if(shader.uniformRevisions.screenSize !== screenSizeNumber){
			shader.uniformRevisions.screenSize = screenSizeNumber
			shader.setScreenSize(this.screenWidth, this.screenHeight)
		}

		// TODO: I probably need to set it just once
		shader.setImage(0)
	}

	onFrame(deltaTime: number, currentPhysicsTick: number): void {
		this.frameCount++

		this.camera.onFrame(deltaTime)

		this.activateShader(this.mainShader) // just to upload entities
		if(this.lastUploadedPhysicsTick !== currentPhysicsTick){
			this.updateVisibleEntities()
			this.lastUploadedPhysicsTick = currentPhysicsTick
			this.mainShader.setTickTime(this.engine.lastTickTime - this.engine.timePerTick, this.engine.lastTickTime)
		}

		this.gl.activeTexture(this.gl.TEXTURE0)
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.atlasTexture)

		this.gl.clearColor(0.2, 0.2, 0.2, 1)
		this.gl.clear(this.gl.COLOR_BUFFER_BIT)

		for(const layer of this.layers){
			this.activateShader(layer.shader)
			layer.tryUpload(this.frameCount)
			layer.draw(this.getCurrentTime())
		}
	}

	// try uploading data of all the visible entities to GPU, if the data was updated
	private updateVisibleEntities(): void {
		for(const entity of this.visibleEntities){
			if(entity.lastUploadedGraphicVersion >= entity.currentGraphicVersion){
				continue
			}
			entity.lastUploadedGraphicVersion = entity.currentGraphicVersion
			const instance = entity.graphics!
			instance.setEntityPosition(instance.getEntityPosition(2), instance.getEntityPosition(3), entity.x, entity.y)
			instance.setEntityRotation(instance.getEntityRotation(1), entity.rotation)
		}
		for(const mainLayer of this.mainLayers){
			mainLayer.upload()
		}
	}

	private setupResizeObserver(): void {
		const updateScreenSize = () => {
			const {width, height} = setViewportSizeByCanvas(this.gl, this.canvas)
			this.screenWidth = width
			this.screenHeight = height
			this.camera.updateScreenSize(this.screenWidth, this.screenHeight)
		}

		const resizeObserver = new ResizeObserver(updateScreenSize)
		resizeObserver.observe(this.canvas)
		updateScreenSize()
	}

	emitParticles(def: ParticleDefinition, position: XY, direction: number): void {
		const graphics = def.graphics
		if(!graphics){
			return
		}
		const layer = this.layers[graphics.layerIndex] as GraphicLayer<ParticleShader>
		const currentTime = this.getCurrentTime()
		for(let i = 0; i < def.amount; i++){
			const thisParticleDirection = direction + (def.angle * (Math.random() - 0.5))
			const distance = def.distance.average + ((Math.random() + 0.5) * def.distance.maxDeviation)
			const dx = Math.cos(thisParticleDirection) * distance
			const dy = Math.sin(thisParticleDirection) * distance
			const lifetime = def.lifetime.average + ((Math.random() + 0.5) * def.lifetime.average)

			const instance = layer.makeEtherealInstance(currentTime + lifetime)
			instance.setParticlePosition(position.x, position.y, position.x + dx, position.y + dy)
			instance.setParticleRotation(def.rotation.start, def.rotation.end)
			instance.setParticleSize(def.size.start.x, def.size.start.y, def.size.end.x, def.size.end.y)
			instance.setParticleProgressPower(
				def.size.progressPower,
				def.distance.progressPower,
				def.rotation.progressPower,
				def.color.progressPower
			)
			instance.setParticleColor(def.color.start, def.color.end)
			instance.setParticleTime(currentTime, lifetime)
			instance.setTexturePosition(graphics.atlasPosition.x, graphics.atlasPosition.y, graphics.size.x, graphics.size.y)
		}
	}

	delete(): void {
		for(const layer of this.layers){
			layer.delete()
		}
		this.mainPool.shutdown()
		this.mainShader.delete()
		this.particlePool.shutdown()
		this.particleShader.delete()
		this.gl.deleteBuffer(this.squareVertexBuffer)
		this.gl.deleteBuffer(this.squareIndexBuffer)
		this.canvas.remove()
	}
}