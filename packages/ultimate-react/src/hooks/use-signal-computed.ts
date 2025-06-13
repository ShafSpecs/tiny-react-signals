import { useCallback, useEffect, useState } from "react"
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
	const signal = REACTIVE_CORE.createComputed(id, dependencies, computeFn, options)

	const [localValue, setLocalValue] = useState<T>(() => signal.value)

	useEffect(() => {
		let mounted = true

		const cleanup = REACTIVE_CORE.subscribe<T>(id, (value: T) => {
			if (mounted) {
				setLocalValue(value)
			}
		})

		return () => {
			mounted = false
			cleanup?.()
		}
	}, [id])

	const recompute = useCallback(() => {
		REACTIVE_CORE.recomputeSignal(id)
	}, [id])

	return [localValue, recompute]
}
