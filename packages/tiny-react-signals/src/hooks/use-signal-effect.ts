import { useEffect, useRef } from "react"
import { REACTIVE_CORE } from "../core"
import type { SignalId } from "../core"

/**
 * Hook for running effects when signals change
 *
 * @param effect - Effect function to run
 * @param signalDeps - Array of signal IDs to watch
 */
export function useSignalEffect(effect: ((values: unknown[]) => void) | (() => void), signalDeps: SignalId[]): void {
	const cleanupRef = useRef<(() => void) | null>(null)

	// biome-ignore lint/correctness/useExhaustiveDependencies: Probably using effect wrong here. Open a PR.
	useEffect(() => {
		if (cleanupRef.current) {
			cleanupRef.current()
			cleanupRef.current = null
		}

		const getCurrentValues = () => signalDeps.map((id) => REACTIVE_CORE.getValue(id))

		const runEffect = () => {
			if (cleanupRef.current) {
				cleanupRef.current()
				cleanupRef.current = null
			}

			const values = getCurrentValues()
			const effectCleanup = effect(values)

			if (typeof effectCleanup === "function") {
				cleanupRef.current = effectCleanup
			}
		}

		const bindings = signalDeps
			.map((signalId) => REACTIVE_CORE.subscribe(signalId, runEffect))
			.filter((cleanup): cleanup is () => void => cleanup !== null)

		runEffect()

		return () => {
			if (cleanupRef.current) {
				cleanupRef.current()
				cleanupRef.current = null
			}

			for (const cleanup of bindings) {
				cleanup()
			}
		}
	}, [signalDeps.join(",")])
}
