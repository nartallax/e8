// this is the place to put various exotic module declarations in

declare module "*.css" {
	const css: {readonly [key: string]: string}
	export = css
}

declare module "*.module.scss" {
	const css: {readonly [key: string]: string}
	export = css
}

declare module "*.bin" {
	const binFileUrl: string
	export default binFileUrl
}

declare module "*.glsl" {
	const shaderCode: string
	export default shaderCode
}