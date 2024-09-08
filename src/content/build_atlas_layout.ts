import {Growable2DBitmap} from "common/bitmap/growable_2d_bitmap"
import {XY} from "common_types"

type Rect = {
	width: number
	height: number
}

function encodeXY(x: number, y: number): number {
	return (x << 15) | y
}

function decodeXY(xy: number): XY {
	return {
		x: ((xy >> 15) & 0x7fff),
		y: xy & 0x7fff
	}
}

/** Add coordinates to the input rectangles in a way that they tile an area close to square as good as possible
 * Order of elements is preserved
 * @param cellSize discretization step. All size values will be round up to this step. */
export function buildAtlasLayout<I extends Rect>(rawInput: I[], cellSize: number): (I & XY)[] {
	const corners: Set<number> = new Set([encodeXY(0, 0)])
	const input = rawInput.map(rect => ({
		...rect,
		width: Math.ceil(rect.width / cellSize),
		height: Math.ceil(rect.height / cellSize)
	}))

	let squareSum = 0
	for(let i = 0; i < input.length; i++){
		squareSum += input[i]!.width * input[i]!.height
	}
	// it helps to pre-grow bitmap to size
	// if data is not too weird it usually helps to not grow the bitmap in runtime at all
	const squareSize = Math.sqrt(squareSum) * 1.1

	const bitmap = new Growable2DBitmap(squareSize, squareSize)
	const resultRectMap = new Map<Rect, (I & XY)>()

	function doesRectFitInCorner(corner: number, rect: Rect): boolean {
		const {x: cornerX, y: cornerY} = decodeXY(corner)

		// not very beautiful to put this action here
		// but whatever
		if(bitmap.get(cornerX, cornerY)){
			corners.delete(corner)
			return false
		}

		return !bitmap.hasAnyInRect(cornerX, cornerY, rect.width, rect.height)
	}

	function occupyCorner(corner: number, rect: I): void {
		const {x: cornerX, y: cornerY} = decodeXY(corner)
		bitmap.setRect(cornerX, cornerY, rect.width, rect.height)
		// console.log(`Putting ${rect.width} x ${rect.height} in (${cornerX}, ${cornerY})`)
		// console.log(bitmap + "")

		corners.delete(corner)
		{
			const nextYLevel = cornerY + rect.height
			for(let x = cornerX; x < cornerX + rect.width; x++){
				if(!bitmap.get(x, nextYLevel)){
					corners.add(encodeXY(x, nextYLevel))
					// console.log(`Discovered corner in (${x}, ${nextYLevel})`)
				}
			}
		}

		{
			const nextXLevel = cornerX + rect.width
			for(let y = cornerY; y < cornerY + rect.height; y++){
				if(!bitmap.get(nextXLevel, y)){
					corners.add(encodeXY(nextXLevel, y))
					// console.log(`Discovered corner in (${nextXLevel}, ${y})`)
				}
			}
		}

		resultRectMap.set(rect, {...rect, x: cornerX, y: cornerY})
	}

	// originally here input was sorted by area of the rectangle
	// but sum of sides works noticeably faster, and on test data produces undistingushable result
	// sooo it is here for now. in case of problems swap those `+` for `*`
	const sortedInput = [...input].sort((a, b) => (b.width + b.height) - (a.width + a.height))
	for(const rect of sortedInput){
		let bestCorner = 0
		let bestCornerDistance = Number.MAX_SAFE_INTEGER

		for(const corner of corners){
			if(doesRectFitInCorner(corner, rect)){
				const {x: cornerX, y: cornerY} = decodeXY(corner)
				const distance = Math.max(cornerX, cornerY)
				if(distance < bestCornerDistance){
					bestCorner = corner
					bestCornerDistance = distance
				}
			}
		}

		if(bestCornerDistance === Number.MAX_SAFE_INTEGER){
			// more of a sanity check, should never happen
			// I mean, we have infinite space, how could we NOT find the corner
			throw new Error("Could not find corner")
		}

		occupyCorner(bestCorner, rect)
	}

	return input.map(rect => {
		const resultRect = resultRectMap.get(rect)!
		return {
			...resultRect,
			width: resultRect.width * cellSize,
			height: resultRect.height * cellSize,
			x: resultRect.x * cellSize,
			y: resultRect.y * cellSize
		}
	})
}