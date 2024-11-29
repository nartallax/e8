import {describe, test} from "@nartallax/clamsensor"
import {Growable2DBitmap} from "common/bitmap/growable_2d_bitmap"

describe("growable 2d bitmap", () => {

	test("hasAnyInRect", () => {
		const testCases: [
			pointX: number, pointY: number,
			rectX: number, rectY: number,
			rectWidth: number, rectHeight: number,
			expectedResult: boolean
		][] = [
			[0, 0, 0, 0, 1, 1, true],
			[0, 0, 1, 1, 1, 1, false],
			[4, 0, 2, 0, 4, 1, true],
			[4, 0, 6, 0, 4, 1, false],
			[5, 0, 2, 0, 4, 1, true],
			[5, 0, 2, 0, 3, 1, false],
			[8, 0, 8, 0, 1, 1, true],
			[8, 0, 7, 0, 1, 1, false],
			[8, 0, 7, 0, 2, 1, true],
			[9, 0, 7, 0, 2, 1, false]
		]

		for(const [x, y, rectX, rectY, w, h, expected] of testCases){
			const maxWidth = Math.max(x, rectX + w)
			const maxHeight = Math.max(y, rectY + h)
			for(const isUndersized of [false, true]){
				for(const isSet of [true, false]){

					const bitmap = new Growable2DBitmap(
						isUndersized ? maxWidth / 2 : maxWidth,
						isUndersized ? maxHeight / 2 : maxHeight
					)

					if(isSet){
						bitmap.set(x, y)
					}

					const result = bitmap.hasAnyInRect(rectX, rectY, w, h)
					const shouldBeTrue = !isSet ? false : expected
					if(result !== shouldBeTrue){
						throw new Error("Test failed for following params: " + JSON.stringify({
							x, y, rectX, rectY, w, h, isUndersized, isSet, expected, result
						}))
					}
				}
			}
		}
	})

})