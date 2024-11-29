import {describe, test} from "@nartallax/clamsensor"
import {expect} from "chai"
import {E8JsonReader} from "content/archive/json/e8_json_reader"
import {E8JsonWriter} from "content/archive/json/e8_json_writer"

describe("E8Json", () => {
	const check = (value: unknown, map: ReadonlyMap<string, number> = new Map()) => {
		const bytes = new E8JsonWriter(value, map).encode()
		const arr = [...map.entries()].sort(([,a], [,b]) => a - b).map(([str]) => str)
		const recoded = new E8JsonReader(bytes, arr).decode()
		expect(recoded).to.eql(value)
	}

	test("numbers", () => {
		check(5)
		check(-5)
		check(15)
		check(16)
		check(17)
		check(-15)
		check(-16)
		check(-17)
		check(64)
		check(159)
		check(255)
		check(256)
		check(257)
		check(0.5)
		check(-0.5)

		expect(new E8JsonWriter(15, new Map()).encode().length).to.eql(1)
	})

	test("strings", () => {
		check("")
		check("uwu")

		expect(new E8JsonWriter("", new Map()).encode().length).to.eql(1)
		// first byte: 3 bits for type, 2 bits for padding length, 3 bits for length of 2 bytes of base64
		expect(new E8JsonWriter("owo", new Map()).encode().length).to.eql(3)
	})

	test("booleans and null", () => {
		check(null)
		check(true)
		check(false)

		expect(new E8JsonWriter(null, new Map()).encode().length).to.eql(1)
		expect(new E8JsonWriter(true, new Map()).encode().length).to.eql(1)
		expect(new E8JsonWriter(false, new Map()).encode().length).to.eql(1)
	})

	test("base64 strings", () => {
		const content = "nya!"
		const b64 = btoa(content)
		const encoded = new E8JsonWriter(b64, new Map()).encode()
		expect(encoded.length).to.eql(content.length + 2) // 1 for type+paddinglength+length
		const decoded = new E8JsonReader(encoded, []).decode()
		expect(atob(decoded as string)).to.eql(content)
	})

	test("arrays", () => {
		check([1, 2, 3, 3.5, "ayaya", null])
		check([{name: "first"}, {name: "second"}, {name: "third"}])
	})

	test("map objects", () => {
		check({a: 5, test: "yep!", true: false})
		check({names: ["first", "second", "third"]})
	})

	test("indexed strings", () => {
		const map = new Map([["name", 0], ["disposition", 1]])
		check({name: "uwu", disposition: "on the floor"}, map)
		const encoded = new E8JsonWriter(["name", "name", "name"], map).encode()
		expect(encoded.length).to.eql(4) // +1 for array length+type byte
	})

	test("size check", () => {
		const index = ["name", "skin", "age"]
		const indexMap = new Map(index.map((str, index) => [str, index]))

		const json = {
			name: "dog", skin: "hairy", age: 10, siblings: [
				{name: "cat", disposition: "ignored"},
				{name: "hamster", disposition: "delicious"}
			]
		}

		check(json, indexMap)

		const enc = new E8JsonWriter(json, indexMap).encode()
		expect(enc.length).to.eql(81)
	})
})