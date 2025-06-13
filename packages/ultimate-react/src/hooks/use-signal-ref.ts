import { useEffect, useRef } from "react"
import { REACTIVE_CORE } from "../core"
import type { SignalId, SignalOptions } from "../core"

/**
 * Hook for accessing signal values without triggering React re-renders
 * Perfect for read-only access or when you handle updates manually
 *
 * @param id - Signal identifier
 * @param initialValue - Initial value for the signal
 * @param options - Optional signal configuration
 * @returns Ref object with current signal value
 */
export function useSignalRef<T>(
	id: SignalId,
	initialValue?: T,
	options?: SignalOptions<T>
): { readonly current: T | undefined } {
	if (initialValue !== undefined) {
		REACTIVE_CORE.upsertSignal(id, initialValue, options)
	}

	const valueRef = useRef<T | undefined>(REACTIVE_CORE.getValue<T>(id))

	useEffect(() => {
		const cleanup = REACTIVE_CORE.subscribe<T>(id, (value: T) => {
			valueRef.current = value
		})

		return () => {
			cleanup?.()
		}
	}, [id])

	return valueRef
}
