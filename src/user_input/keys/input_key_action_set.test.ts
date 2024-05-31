import {describe, test} from "@nartallax/clamsensor"
import {expect} from "chai"
import {InputKeyActionSet} from "user_input/keys/input_key_action_set"

describe("InputKeyActionSet", () => {
	const hold = () => {}
	const down = () => {}
	const down2 = () => {}
	const up = () => {}

	const dfltBind = {
		group: null,
		bindSet: 0
	}

	test("basic key press", () => {
		const s = new InputKeyActionSet([{
			...dfltBind,
			bind: 1,
			chords: [["W"]],
			handlers: {
				onDown: down,
				onHold: hold,
				onUp: up
			}
		}])

		let res = s.findActions(new Set(), [{isDown: true, key: "W"}])
		expect(res.down).to.eql([{handler: down, count: 1, binds: new Set([1])}])
		expect(res.hold).to.eql([{handler: hold, count: 2, binds: new Set([1])}])
		expect(res.up).to.eql([])
		expect(res.newDownKeys).to.eql(new Set(["W"]))

		res = s.findActions(res.newDownKeys, [{isDown: false, key: "W"}])
		expect(res.down).to.eql([])
		expect(res.hold).to.eql([])
		expect(res.up).to.eql([{handler: up, count: 1, binds: new Set([1])}])
		expect(res.newDownKeys).to.eql(new Set())
	})

	test("modifier keys can be used alone", () => {
		/** case: Ctrl to crouch
		 * hotkeys are composed out of arbitrary keys, modifier keys can act on their own, without "main" key
		 * in most application there is "main" key in hotkey and maybe some modifiers, but that's not true for games */
		const s = new InputKeyActionSet([{
			...dfltBind,
			bind: 1,
			chords: [["Ctrl"]],
			handlers: {onHold: hold}
		}])

		let res = s.findActions(new Set(), [{isDown: true, key: "Ctrl"}])
		expect(res.hold).to.eql([{handler: hold, count: 2, binds: new Set([1])}])

		// we just continue holding ctrl. nothing else going on.
		res = s.findActions(res.newDownKeys, [])
		expect(res.hold).to.eql([{handler: hold, count: 1, binds: new Set([1])}])

		res = s.findActions(res.newDownKeys, [{isDown: false, key: "Ctrl"}])
		expect(res.hold).to.eql([])
	})

	test("one-key chord clobbering", () => {
		/** case: R to rotate left, Ctrl+R to rotate right
		 * if one hotkey chord is included in another (but not equal to) - that another bigger chord should have preference */

		const s = new InputKeyActionSet([{
			...dfltBind,
			bind: 0,
			chords: [["R"]],
			handlers: {onDown: down}
		}, {
			...dfltBind,
			bind: 1,
			chords: [["Ctrl", "R"]],
			handlers: {onDown: down2}
		}])

		// Ctrl+R
		let res = s.findActions(new Set(), [{isDown: true, key: "Ctrl"}, {isDown: true, key: "R"}])
		expect(res.down).to.eql([{handler: down2, count: 1, binds: new Set([1])}])

		// just R
		res = s.findActions(new Set(), [{isDown: true, key: "R"}])
		expect(res.down).to.eql([{handler: down, count: 1, binds: new Set([0])}])

		// same thing, but in two steps
		res = s.findActions(new Set(), [{isDown: true, key: "Ctrl"}])
		expect(res.down).to.eql([])
		res = s.findActions(res.newDownKeys, [{isDown: true, key: "R"}])
		expect(res.down).to.eql([{handler: down2, count: 1, binds: new Set([1])}])

		// same two steps, but in reverse
		res = s.findActions(new Set(), [{isDown: true, key: "R"}])
		expect(res.down).to.eql([{handler: down, count: 1, binds: new Set([0])}])
		res = s.findActions(res.newDownKeys, [{isDown: true, key: "Ctrl"}])
		expect(res.down).to.eql([{handler: down2, count: 1, binds: new Set([1])}])
	})

	test("multi-key chord clobbering", () => {
		/** case: Ctrl+R to rotate left, Ctrl+Shift+R to rotateright
		 * this is just test for improper implementation of clobbering.
		 * it is easy to implement only one-key clobbering, but multi-key clobbering is trickier */

		const s = new InputKeyActionSet([{
			...dfltBind,
			bind: 0,
			chords: [["Ctrl", "R"]],
			handlers: {onDown: down}
		}, {
			...dfltBind,
			bind: 1,
			chords: [["Shift", "Ctrl", "R"]],
			handlers: {onDown: down2}
		}])

		// Ctrl+R
		let res = s.findActions(new Set(), [{isDown: true, key: "Ctrl"}, {isDown: true, key: "R"}])
		expect(res.down).to.eql([{handler: down, count: 1, binds: new Set([0])}])

		// Ctrl+Shift+R
		res = s.findActions(new Set(), [{isDown: true, key: "Ctrl"}, {isDown: true, key: "Shift"}, {isDown: true, key: "R"}])
		expect(res.down).to.eql([{handler: down2, count: 1, binds: new Set([1])}])

		// R, Ctrl, Shift
		res = s.findActions(new Set(), [{isDown: true, key: "R"}])
		expect(res.down).to.eql([])
		res = s.findActions(res.newDownKeys, [{isDown: true, key: "Ctrl"}])
		expect(res.down).to.eql([{handler: down, count: 1, binds: new Set([0])}])
		res = s.findActions(res.newDownKeys, [{isDown: true, key: "Shift"}])
		expect(res.down).to.eql([{handler: down2, count: 1, binds: new Set([1])}])

		// R, Shift, Ctrl
		res = s.findActions(new Set(), [{isDown: true, key: "R"}])
		expect(res.down).to.eql([])
		res = s.findActions(res.newDownKeys, [{isDown: true, key: "Shift"}])
		expect(res.down).to.eql([])
		res = s.findActions(res.newDownKeys, [{isDown: true, key: "Ctrl"}])
		expect(res.down).to.eql([{handler: down2, count: 1, binds: new Set([1])}])
	})

	test("single-key chord - no clobbering if there's nothing to clobber with", () => {
		/** case: R to rotate, but even if Shift+R is pressed - rotate should happen (if there's no bind for Shift+R)
 		* other keys may be pressed for different reasons, we shouldn't consider them */
		const s = new InputKeyActionSet([{
			...dfltBind,
			bind: 0,
			chords: [["R"]],
			handlers: {onDown: down}
		}])

		// Ctrl+W+R
		let res = s.findActions(new Set(), [{isDown: true, key: "Ctrl"}, {isDown: true, key: "W"}, {isDown: true, key: "R"}])
		expect(res.down).to.eql([{handler: down, count: 1, binds: new Set([0])}])

		// Ctrl+W, then R
		res = s.findActions(new Set(), [{isDown: true, key: "Ctrl"}, {isDown: true, key: "W"}])
		expect(res.down).to.eql([])
		res = s.findActions(new Set(), [{isDown: true, key: "R"}])
		expect(res.down).to.eql([{handler: down, count: 1, binds: new Set([0])}])
	})

	test("multi-key chord - no clobbering on different chords", () => {
		/** case: hotkeys for Ctrl+Shift+R and Alt+R - both should be triggered at Ctrl+Alt+Shift+R
		 * another test for improper clobbering implementation */

		const s = new InputKeyActionSet([{
			...dfltBind,
			bind: 0,
			chords: [["Alt", "R"]],
			handlers: {onDown: down}
		}, {
			...dfltBind,
			bind: 1,
			chords: [["Shift", "Ctrl", "R"]],
			handlers: {onDown: down2}
		}])

		const res = s.findActions(new Set(), [{isDown: true, key: "Ctrl"}, {isDown: true, key: "Alt"}, {isDown: true, key: "Shift"}, {isDown: true, key: "R"}])
		expect(res.down).to.eql([
			{handler: down, count: 1, binds: new Set([0])},
			{handler: down2, count: 1, binds: new Set([1])}
		])
	})

	test("already down keys should not register as down when unrelated keys are pressed", () => {
		const s = new InputKeyActionSet([{
			...dfltBind,
			bind: 0,
			chords: [["Ctrl", "R"]],
			handlers: {onDown: down}
		}])

		let res = s.findActions(new Set(), [{isDown: true, key: "Ctrl"}, {isDown: true, key: "R"}])
		expect(res.down).to.eql([{handler: down, count: 1, binds: new Set([0])}])
		res = s.findActions(res.newDownKeys, [{isDown: true, key: "Shift"}])
		expect(res.down).to.eql([])
	})

	test("already down keys should not register as down when other side mod key is pressed", () => {
		/** Case: Ctrl+R, someone presses Ctrl+R and then presses another Ctrl
		 * Another Ctrl is expected to be normalized to left variant, so you just have press of something that is already down
		 * That's unique to modifier keys, other keys are only appear in one variant */
		const s = new InputKeyActionSet([{
			...dfltBind,
			bind: 0,
			chords: [["Ctrl", "R"]],
			handlers: {onDown: down}
		}])

		let res = s.findActions(new Set(), [{isDown: true, key: "Ctrl"}, {isDown: true, key: "R"}])
		expect(res.down).to.eql([{handler: down, count: 1, binds: new Set([0])}])
		res = s.findActions(res.newDownKeys, [{isDown: true, key: "Ctrl"}])
		expect(res.down).to.eql([])
	})

	test("one-tick press hold", () => {
		/** - one-tick down-and-up events should also produce hold event
 		* this will avoid losing hold events in case of fast taps (in case of inching to something in platformer/fps, for example) */
		const s = new InputKeyActionSet([{
			...dfltBind,
			bind: 0,
			chords: [["W"]],
			handlers: {onHold: hold}
		}])

		const res = s.findActions(new Set(), [{isDown: true, key: "W"}, {isDown: false, key: "W"}])
		expect(res.hold).to.eql([{handler: hold, count: 1, binds: new Set([0])}])
	})

	test("double-press merging on same key", () => {
		/** case: double-press of jump within one tick should produce same effect as one press
 		* jump is usually implemented as "if the player is on the ground - set his vertical speed to something"
		* but if someone does this twice in a tick - player may have double the speed (or does he? anyway, that seems like input problem)
		* case: scroll controls the zoom proportional to wheel steps and is not affected by previous double-jump problem
 		* the potential problem here is - if we just remove double-presses, wheel steps will be lost sometimes (because wheel is fast), which is bad
 		* we should mitigate double-calls of handlers, but still provide data about duplicate events to handlers, so they can use it*/
		const s = new InputKeyActionSet([{
			...dfltBind,
			bind: 0,
			chords: [["W"]],
			handlers: {onHold: hold}
		}])

		const res = s.findActions(new Set(), [{isDown: true, key: "W"}, {isDown: false, key: "W"}, {isDown: true, key: "W"}, {isDown: false, key: "W"}])
		expect(res.hold).to.eql([{handler: hold, count: 2, binds: new Set([0])}])
	})

	test("double-press merging on different keys", () => {
		/** case: jump button may be bound to A and B, but even if two buttons are pressed together - only one jump should happen */
		const s = new InputKeyActionSet([{
			...dfltBind,
			bind: 0,
			chords: [["A"], ["B"]],
			handlers: {onDown: down}
		}])

		const res = s.findActions(new Set(), [{isDown: true, key: "A"}, {isDown: true, key: "B"}])
		expect(res.down).to.eql([{handler: down, count: 2, binds: new Set([0])}])
	})

	test("double-press merging on same modifier key", () => {
		/** case: Shift to jump should not be triggered twice when left and right shifts are pressed simultaneously */
		const s = new InputKeyActionSet([{
			...dfltBind,
			bind: 0,
			chords: [["Shift"]],
			handlers: {onDown: down}
		}])

		const res = s.findActions(new Set(), [{isDown: true, key: "Shift"}, {isDown: true, key: "Shift"}])
		expect(res.down).to.eql([{handler: down, count: 1, binds: new Set([0])}])
	})

	test("two actions one key, no modifier", () => {
		/** case: two actions bound to same key should be both invoked on press */
		const s = new InputKeyActionSet([{
			...dfltBind,
			bind: 0,
			chords: [["R"]],
			handlers: {onDown: down}
		}, {
			...dfltBind,
			bind: 1,
			chords: [["R"]],
			handlers: {onDown: down2}
		}])

		const res = s.findActions(new Set(), [{isDown: true, key: "R"}])
		expect(res.down).to.eql([{handler: down, count: 1, binds: new Set([0])}, {handler: down2, count: 1, binds: new Set([1])}])
	})

	test("two actions one key, modifier", () => {
		const s = new InputKeyActionSet([{
			...dfltBind,
			bind: 0,
			chords: [["Ctrl", "R"]],
			handlers: {onDown: down}
		}, {
			...dfltBind,
			bind: 1,
			chords: [["Ctrl", "R"]],
			handlers: {onDown: down2}
		}])

		const res = s.findActions(new Set(), [{isDown: true, key: "Ctrl"}, {isDown: true, key: "R"}])
		expect(res.down).to.eql([{handler: down, count: 1, binds: new Set([0])}, {handler: down2, count: 1, binds: new Set([1])}])
	})

	test("grouping", () => {
		/** case: holding "move left" and "move forward" should not be faster than just "move forward"
		 * that's achieved by grouping. only one action in group can be invoked at a time, having information about other such actions.
		 * looks like it applies to hold handlers only, but I'm not too sure about that. */
		const s = new InputKeyActionSet([{
			...dfltBind,
			bind: 0,
			chords: [["W"]],
			group: 0,
			handlers: {onHold: hold}
		}, {
			...dfltBind,
			bind: 1,
			chords: [["D"]],
			group: 0,
			handlers: {onHold: hold}
		}])

		let res = s.findActions(new Set(), [{isDown: true, key: "W"}, {isDown: true, key: "D"}])
		expect(res.hold).to.eql([{handler: hold, count: 5, binds: new Set([0, 1])}])
		res = s.findActions(res.newDownKeys, [])
		expect(res.hold).to.eql([{handler: hold, count: 2, binds: new Set([0, 1])}])
		res = s.findActions(res.newDownKeys, [{isDown: false, key: "W"}])
		expect(res.hold).to.eql([{handler: hold, count: 1, binds: new Set([1])}])
		res = s.findActions(res.newDownKeys, [{isDown: false, key: "D"}])
		expect(res.hold).to.eql([])
		res = s.findActions(res.newDownKeys, [{isDown: true, key: "W"}])
		expect(res.hold).to.eql([{handler: hold, count: 2, binds: new Set([0])}])
		res = s.findActions(res.newDownKeys, [{isDown: true, key: "D"}])
		expect(res.hold).to.eql([{handler: hold, count: 4, binds: new Set([0, 1])}])
	})
})