import { useCallback, useEffect, useRef, useState } from "react"
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
	const [localValue, setLocalValue] = useState<T>(() => {
		const signal = REACTIVE_CORE.createComputed(id, dependencies, computeFn, options)
		return signal.value
	})

	const depsChanged =
		dependencies.length !== depsRef.current.length || dependencies.some((dep, index) => dep !== depsRef.current[index])

	useEffect(() => {
		if (depsChanged) {
			REACTIVE_CORE.cleanup(id)

			const signal = REACTIVE_CORE.createComputed(id, dependencies, computeFn, options)
			setLocalValue(signal.value)

			depsRef.current = dependencies
		}
	}, [id, dependencies, computeFn, options, depsChanged])

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
