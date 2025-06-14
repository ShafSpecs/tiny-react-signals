import { defineConfig } from "tsdown"

export default defineConfig({
	entry: [
		"src/index.ts",
		"src/reactive.ts",
		"src/signal.ts",
		"src/hooks/index.ts",
		"src/hooks/use-signal.ts",
		"src/hooks/use-signal-effect.ts",
		"src/hooks/use-signal-ref.ts",
		"src/hooks/use-signal-selector.ts",
		"src/hooks/use-signal-computed.ts",
		"src/hooks/use-reactive-element.ts",
		"src/components/index.ts",
		"src/components/signal.tsx",
		"src/components/signal-list.tsx",
	],
	sourcemap: true,
	dts: true,
	minify: false,
	format: ["esm", "cjs"],
	outDir: "dist",
	platform: "neutral",
	external: ["react", "react-dom"],
})
