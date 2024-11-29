import * as Process from "process"
import { buildUtils } from "@nartallax/ts-build-utils";

let {clear, runTests, build, copyToTarget, cutPackageJson, generateDts, typecheck, publishToNpm, oneAtATime, watch, printStats} = buildUtils({
	defaultBuildOptions: {
		entryPoints: ["./src/e8.ts"],
		bundle: true,
		platform: "browser",
		packages: "external",
		format: "esm",
		loader: {
			".glsl": "text"
		}
	}
})

let main = async (mode) => {
	await clear()
	switch(mode){
		case "dev": {
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
			await build({minify: true})
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