import { useMemo, useSyncExternalStore } from "react"
import { REACTIVE_CORE } from "../core"
import type { SignalId, SignalOptions } from "../core"

/**
 * Drop-in replacement for useState that creates global signals
 *
 * @param id - Unique signal identifier
 * @param initialValue - Initial value for the signal
 * @param options - Optional signal configuration
 * @returns Tuple of [currentValue, setValue] like useState
 */
export function useSignal<T>(
	id: SignalId,
	initialValue: T,
	options?: SignalOptions<T>
): [T, (value: T | ((prev: T) => T)) => void] {
	// biome-ignore lint/correctness/useExhaustiveDependencies: Depend on only id for perf
	const signal = useMemo(() => {
		REACTIVE_CORE.upsertSignal(id, initialValue, options)
		return { id, initialValue }
	}, [id])

	const subscribe = useMemo(() => {
		return (callback: () => void) => {
			return REACTIVE_CORE.subscribe<T>(signal.id, callback) || (() => {})
		}
	}, [signal.id])

	const getSnapshot = useMemo(() => {
		return () => REACTIVE_CORE.getValue<T>(signal.id) ?? signal.initialValue
	}, [signal.id, signal.initialValue])

	const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

	const setValue = useMemo(() => {
		return (newValue: T | ((prev: T) => T)) => {
			if (typeof newValue === "function") {
				const current = REACTIVE_CORE.getValue<T>(signal.id) ?? signal.initialValue
				REACTIVE_CORE.updateSignal(signal.id, (newValue as (prev: T) => T)(current))
			} else {
				REACTIVE_CORE.updateSignal(signal.id, newValue)
			}
		}
	}, [signal.id, signal.initialValue])

	return [value, setValue]
}
