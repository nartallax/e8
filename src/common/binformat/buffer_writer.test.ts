import {describe, test} from "@nartallax/clamsensor"
import {expect} from "chai"
import {BufferWriter} from "common/binformat/buffer_writer"

describe("BufferWriter", () => {
	test("receives bytes", () => {
		const writer = new BufferWriter(4)
		expect(writer.toArray().length).to.eql(0)

		writer.writeByte(1)
		writer.writeByte(5)
		expect(writer.toArray()).to.eql(new Uint8Array([1, 5]))

		writer.writeByte(7)
		writer.writeByte(15)
		expect(writer.toArray()).to.eql(new Uint8Array([1, 5, 7, 15]))

		writer.writeByte(21)
		expect(writer.toArray()).to.eql(new Uint8Array([1, 5, 7, 15, 21]))
	})

	test("receives byte arrays", () => {
		const writer = new BufferWriter(4, 4)
		writer.writeBytes(new Uint8Array([3]))
		expect(writer.toArray()).to.eql(new Uint8Array([3]))

		writer.writeByte(4)
		writer.writeBytes(new Uint8Array([5, 6]))
		expect(writer.toArray()).to.eql(new Uint8Array([3, 4, 5, 6]))

		writer.writeBytes(new Uint8Array([5, 4, 3, 2]))
		expect(writer.toArray()).to.eql(new Uint8Array([3, 4, 5, 6, 5, 4, 3, 2]))
	})
})