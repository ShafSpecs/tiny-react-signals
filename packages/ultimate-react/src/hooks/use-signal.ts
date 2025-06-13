import { useCallback, useEffect, useRef, useState } from "react"
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
	const createdSignalRef = useRef(false)

	REACTIVE_CORE.upsertSignal(id, initialValue, options)

	// Local state to trigger React re-renders
	const [localValue, setLocalValue] = useState<T>(() => {
		const existingValue = REACTIVE_CORE.getValue<T>(id)
		if (existingValue !== undefined) {
			return existingValue
		}

		createdSignalRef.current = true
		return initialValue
	})

	useEffect(() => {
		let mounted = true

		// Direct subscription without DOM elements - zero overhead!
		const cleanup = REACTIVE_CORE.subscribe<T>(id, (value: T) => {
			if (mounted && value !== localValue) {
				// The behaviour of startTransition is up in the air. Not confirmed to be stable
				// https://react.dev/reference/react/startTransition#caveats
				//
				// Use React 18's automatic batching via startTransition for non-urgent updates
				// startTransition(() => {
				setLocalValue(value)
				// })
			}
		})

		return () => {
			mounted = false
			cleanup?.()
		}
	}, [id, localValue])

	// Setter function (supports both direct values and updater functions)
	const setValue = useCallback(
		(value: T | ((prev: T) => T)) => {
			if (typeof value === "function") {
				const updater = value as (prev: T) => T
				const currentValue = REACTIVE_CORE.getValue<T>(id)
				const newValue = updater(currentValue ?? initialValue)
				REACTIVE_CORE.updateSignal(id, newValue)
			} else {
				REACTIVE_CORE.updateSignal(id, value)
			}
		},
		[id, initialValue]
	)

	return [localValue, setValue]
}
