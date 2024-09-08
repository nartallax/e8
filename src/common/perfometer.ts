export namespace Perf {

	type Counter = {
		name: string
		depth: number
		count: number
		startTime: number
		totalTime: number
		children: Record<string, Counter>
		parent: Counter | null
	}

	const makeCounter = (name: string, parent: Counter | null): Counter => ({
		name,
		depth: (parent?.depth ?? -1) + 1,
		count: 0,
		startTime: performance.now(),
		totalTime: 0,
		children: {},
		parent
	})

	let currentCounter = makeCounter("root", null)

	export const getCount = (name: string): number => {
		const child = currentCounter.children[name]
		return child?.count ?? 0
	}

	export const inc = (name: string, count = 1) => {
		const child = (currentCounter.children[name] ??= makeCounter(name, currentCounter))
		child.count += count
	}

	export const start = (name: string) => {
		const child = (currentCounter.children[name] ??= makeCounter(name, currentCounter))
		child.startTime = performance.now()
		child.count++
		currentCounter = child
	}

	export const end = () => {
		currentCounter.totalTime += performance.now() - currentCounter.startTime
		if(currentCounter.parent === null){
			throw new Error("Cannot end root counter. Order of start/end is broken.")
		}
		currentCounter = currentCounter.parent
	}

	export const endStart = (name: string) => {
		end()
		start(name)
	}

	type DumpTable = string[][]

	export const dump = (frameCount: number, tickCount: number) => {
		if(currentCounter.parent === null){
			// there's no other way to update total time on root counter
			// so we do it on dump
			// that way, it will display time since last reset
			currentCounter.totalTime = performance.now() - currentCounter.startTime
		}
		const secondsPassed = currentCounter.totalTime / 1000

		const table: DumpTable = []
		dumpCounter(table, currentCounter, secondsPassed, frameCount, tickCount)
		console.log(formatDumpTable(table))
	}

	const dumpCounter = (table: DumpTable, counter: Counter, secondsPassed: number, frameCount: number, tickCount: number) => {
		let name = counter.name
		for(let i = 0; i < counter.depth; i++){
			name = "  " + name
		}

		if(counter.count !== 0 || counter.parent === null){
			table.push([
				name,
				counter.totalTime.toFixed(2),
				counter.parent === null ? "" : formatPercent(counter.totalTime / counter.parent.totalTime),
				counter.count + "",
				toFixedNoZeroes((counter.count / secondsPassed), 2),
				toFixedNoZeroes((counter.count / frameCount), 2),
				toFixedNoZeroes((counter.count / tickCount), 2)
			])
		}

		for(const childName in counter.children){
			dumpCounter(table, counter.children[childName]!, secondsPassed, frameCount, tickCount)
		}
	}

	const toFixedNoZeroes = (x: number, decimals: number): string => {
		let str = x.toFixed(decimals)
		if(str.indexOf(".") !== 0){
			str = str.replace(/\.?0+$/, "")
		}
		return str
	}

	const sep = " | "
	const headers = ["", "time(ms)", "time%", "count", "per sec", "per frame", "per tick"]
	const formatDumpTable = (table: DumpTable): string => {
		if(table.length === 0){
			return ""
		}
		const widths: number[] = headers.map(x => x.length)
		for(const row of table){
			for(let i = 0; i < row.length; i++){
				widths[i] = Math.max(widths[i]!, row[i]!.length)
			}
		}

		let result = "\n" + headers.map((x, i) => pad(x, widths[i]!)).join(sep) + "\n"
		result += widths.map(w => pad("", w, "-")).join("-+-")
		for(const row of table){
			result += "\n" + row.map((x, i) => pad(x, widths[i]!)).join(sep)
		}
		return result
	}

	const pad = (base: string, length: number, padder = " "): string => {
		while(base.length < length){
			base += padder
		}
		return base
	}

	const formatPercent = (rate: number): string => {
		return (rate * 100).toFixed(1) + "%"
	}

	export const reset = () => {
		resetCounter(currentCounter)
	}

	const resetCounter = (counter: Counter) => {
		counter.count = 0
		counter.startTime = performance.now()
		counter.totalTime = 0
		for(const childName in counter.children){
			resetCounter(counter.children[childName]!)
		}
	}

}
