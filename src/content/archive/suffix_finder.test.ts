import {describe, test} from "@nartallax/clamsensor"
import {expect} from "chai"
import {findSuffixes} from "content/archive/suffix_finder"

describe("findSuffixes", () => {
	const costs = {
		getSuffixWriteCost: (str: string) => str.length,
		getStringWriteCost: (str: string) => str.length + 2,
		getRefWriteCost: () => 2
	}

	const run = (values: string[]) => findSuffixes({...costs, values})

	test("finds best suffixes", () => {
		expect(run(["a.json", "b.json", "c.json"]).suffixes).to.eql([".json"])
		expect(run(["a.json", "b.json", "c.json", "a.bin", "c.bin", "d.bin", "e.bin"]).suffixes).to.eql([".bin", ".json"])
		expect(run(["aaaaaaaa", "aaaaaaaaa"]).suffixes).to.eql(["aaaaaaaa"])
	})

	test("won't find anything if there's no common suffix", () => {
		expect(run(["a.json", "b.bin"]).suffixes).to.eql([])
	})

	test("will find selected suffix if there is one", () => {
		const result = run(["a.json", "b.json", "c.json", "a.bin", "c.bin", "d.bin", "e.bin"])

		expect(result.getSuffixOf("uwu.json")).to.eql(".json")
		expect(result.getSuffixOf("ayaya.bin")).to.eql(".bin")
		expect(result.getSuffixOf("nyan")).to.eql(null)
	})

})