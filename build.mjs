import * as Process from "process"
import { buildUtils } from "@nartallax/ts-build-utils";
import * as Fs from "fs/promises"

let {clear, runTests, build, copyToTarget, cutPackageJson, generateDts, typecheck, publishToNpm, oneAtATime, watch, printStats} = buildUtils({
	defaultBuildOptions: {
		entryPoints: ["./src/e8.ts"],
		inject: ["./src/global_overrides.ts"],
		bundle: true,
		platform: "browser",
		packages: "bundle",
		format: "esm",
		loader: {
			".glsl": "text"
		},
		// I have no idea why esbuild tries to include "buffer"
		// "buffer" is only imported through chain of dev dependencies
		external: ["buffer"]
	}
})

let main = async (mode) => {
	await clear()
	switch(mode){
		case "dev": {			
			await build()
			await cutPackageJson() // need this for `npm link`
			await watch({
				onBuildEnd: oneAtATime(generateDts)
			})
			console.log("E8 build process is running.")
		} break

		case "typecheck": {
			await typecheck()
		} break

		case "test": {
			await runTests({
				nameFilter: Process.argv[3]
			})
		} break

		case "build": {
			let buildResult = await build({minify: true})
			if(buildResult.metafile){
				await Fs.writeFile("./target/meta.json", JSON.stringify(buildResult.metafile), "utf-8")
			}
			await copyToTarget("README.md", "LICENSE")
			await cutPackageJson()
			await generateDts()
			printStats()
		} break

		case "publish": {
			await main("typecheck")
			await main("test")
			await main("build")
			await publishToNpm({dryRun: true})
		} break
	}
}

main(Process.argv[2])