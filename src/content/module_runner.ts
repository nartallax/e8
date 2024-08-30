const windowReceiverName = "__e8_module_runner_value_receiver"

/** This class can run JS modules and return their exports
All running should be done through same ModuleRunner, or else some modules won't be resolved

This implementation is browser-specific */
export class ModuleRunner {
	private readonly nameToUrlMap = new Map<string, string>()

	private makeGetterModuleCode(targetName: string): string {
		return `import * as targetModuleValue from "${targetName}";\nwindow["${windowReceiverName}"](targetModuleValue);`
	}

	private runGetterModule(targetName: string): Promise<unknown> {
		return new Promise(ok => {
			(window as any)[windowReceiverName] = (value: unknown) => {
				delete(window as any)[windowReceiverName]

				// we definitely could do this, because this module isn't supposed to ever be imported
				// I'm not so sure it's safe to do with content-modules, which can and should be reused
				// in my tests it was fine, but I'm not sure it's cross-browser
				el.remove()
				URL.revokeObjectURL(url)

				ok(value)
			}

			const code = this.makeGetterModuleCode(targetName)
			const [url, el] = this.addScriptTag(code)
		})
	}

	private addScriptTag(code: string): [string, HTMLScriptElement] {
		const blob = new Blob([code], {type: "application/javascript"})
		const url = URL.createObjectURL(blob)
		const el = document.createElement("script")
		el.setAttribute("type", "module")
		el.setAttribute("src", url)
		document.appendChild(el)
		return [url, el]
	}

	// this is very crude approach, but what other options do I have?
	// importmaps are not supposed to be modifiable in runtime
	// (modifying them works, but browser clearly states his miscontent)
	private patchModuleCode(code: string): string {
		return code.replaceAll(/(^|[^a-zA-Z])(from|import)\s*('[^']+'|"[^"]+")/g, str => {
			const origName = this.getLastStringLiteral(str)
			const url = this.nameToUrlMap.get(origName)
			if(!url){
				return str
			}

			return this.replaceLastStringLiteral(str, url + "")
		})
	}

	// those string literal manipulations are simplified
	// for example I expect them to never contain escaped anything
	// that's reasonable for imports I think
	private getLastStringLiteral(base: string): string {
		const delim = base.endsWith("'") ? "'" : "\""
		const prevDelim = base.lastIndexOf(delim, delim.length - 2)
		return base.substring(prevDelim + 1, base.length - 1)
	}

	private replaceLastStringLiteral(base: string, literalContent: string): string {
		const delim = base.endsWith("'") ? "'" : "\""
		if(literalContent.indexOf(delim) > 0){
			throw new Error(`Cannot replace string delimited with ${delim} with ${literalContent}: that literal contains the delimiter.`)
		}

		const prevDelim = base.lastIndexOf(delim, delim.length - 2)
		return `${base.substring(0, prevDelim)}${delim}${literalContent}${delim}`
	}

	async runModule(name: string, code: string): Promise<unknown> {
		if(this.nameToUrlMap.has(name)){
			throw new Error(`Cannot run module ${name} twice.`)
		}
		const patchedCode = this.patchModuleCode(code)
		const [url] = this.addScriptTag(patchedCode)
		this.nameToUrlMap.set(name, url)
		return await this.runGetterModule(name)
	}

}