import {describe, test} from "@nartallax/clamsensor"
import {expect} from "chai"
import {Mixin} from "mixins/mixin"

describe("Mixin", () => {
	test("works", () => {
		let index = 0

		const MixinA = Mixin.define(parent => class extends parent {
			id = index++

			constructor() {
				super()
				this.id += 10
			}

			getId(): string {
				return this.id + ""
			}
		})

		const MyObj = class extends Mixin.mix([MixinA]) {}
		const myObj = new MyObj()
		expect(myObj.getId()).to.eql("10")
	})

	test("mixin inheritance", () => {
		const A = Mixin.define(parent => class extends parent {
			age = 20
		})
		const AA = Mixin.define([A], parent => class extends parent {
			height = 180
			constructor() {
				super()
				this.age *= 2
			}
		})
		const AAA = Mixin.define([AA], parent => class extends parent {
			constructor() {
				super()
				this.age -= 3
				this.height -= 4
			}
		})
		const Cls = class extends Mixin.mix([A, AAA]) {}
		const obj = new Cls()
		expect(obj.age).to.eql(37)
		expect(obj.height).to.eql(176)
	})

	test("error on improper inheritance", () => {
		expect(() => Mixin.define(() => class {
			id = 0
		})).to.throw("Improper mixin declaration: mixin must inherit parent class.")
	})

	test("using two mixins at once", () => {
		const A = Mixin.define(parent => class extends parent {
			height = 180
		})
		const B = Mixin.define(parent => class extends parent {
			age = 20
		})

		const result = new(Mixin.mix([A, B]))()
		expect(result.height).to.eql(180)
		expect(result.age).to.eql(20)
	})

	test("inheriting two mixins at once", () => {
		const A = Mixin.define(parent => class extends parent {
			height = 180
		})
		const B = Mixin.define(parent => class extends parent {
			age = 20
		})
		const AB = Mixin.define([A, B], parent => class extends parent {
			constructor() {
				super()
				this.height /= 2
				this.age *= 2
			}
		})

		const result = new(Mixin.mix([AB]))()
		expect(result.height).to.eql(90)
		expect(result.age).to.eql(40)
	})

	test("diamond pattern mixing", () => {
		let idCounter = 0
		const Root = Mixin.define(parent => class extends parent {
			id = ++idCounter
		})
		const A = Mixin.define([Root], parent => class extends parent {
			name = "uwu"
		})
		const B = Mixin.define([Root], parent => class extends parent {
			age = 51
		})

		const obj = new(Mixin.mix([A, B]))()
		expect(obj.id).to.eql(1)
		expect(obj.name).to.eql("uwu")
		expect(obj.age).to.eql(51)
		expect(idCounter).to.eql(1)
	})

	test("diamond pattern inheritance", () => {
		let idCounter = 0
		const Root = Mixin.define(parent => class extends parent {
			id = ++idCounter
		})
		const A = Mixin.define([Root], parent => class extends parent {
			name = "uwu"
		})
		const B = Mixin.define([Root], parent => class extends parent {
			age = 51
		})
		const AB = Mixin.define([A, B], parent => class extends parent {
			isDiamond = true
			constructor() {
				super()
				this.id++
				this.name += this.name
				this.age += 4
			}
		})

		const obj = new(Mixin.mix([AB]))()
		expect(obj.id).to.eql(2)
		expect(obj.name).to.eql("uwuuwu")
		expect(obj.age).to.eql(55)
		expect(obj.isDiamond).to.eql(true)
		expect(idCounter).to.eql(1)
	})
})
