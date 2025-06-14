import { useCallback, useMemo, useRef, useSyncExternalStore } from "react"
import { REACTIVE_CORE } from "../core"
import type { SignalId, SignalOptions } from "../core"

/**
 * Hook for creating computed signals
 *
 * @param id - Unique computed signal identifier
 * @param dependencies - Array of signal IDs this computed signal depends on
 * @param computeFn - Function to compute the value from dependencies
 * @param options - Optional signal configuration
 * @returns Tuple of [computedValue, recompute]
 */
export function useSignalComputed<T>(
	id: SignalId,
	dependencies: SignalId[],
	computeFn: (...deps: unknown[]) => T,
	options?: SignalOptions<T>
): [T, () => void] {
	const depsRef = useRef<SignalId[]>(dependencies)
	const depsChanged = useMemo(() => {
		const changed =
			dependencies.length !== depsRef.current.length ||
			dependencies.some((dep, index) => dep !== depsRef.current[index])

		if (changed) {
			depsRef.current = [...dependencies]
		}
		return changed
	}, [dependencies])

	useMemo(() => {
		if (depsChanged) {
			REACTIVE_CORE.cleanup(id)
		}
		REACTIVE_CORE.upsertComputed(id, dependencies, computeFn, options)
	}, [id, depsChanged, computeFn, options, dependencies])

	const subscribe = useCallback(
		(callback: () => void) => {
			return REACTIVE_CORE.subscribe<T>(id, callback) ?? (() => {})
		},
		[id]
	)

	const getSnapshot = useCallback(() => {
		// Some war crimes happening here
		// undefined should never return though, as we upsert the signal just above
		return (REACTIVE_CORE.getValue<T>(id) ?? undefined) as T
	}, [id])

	const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

	const recompute = useCallback(() => {
		REACTIVE_CORE.recomputeSignal(id)
	}, [id])

	return [value, recompute]
}
