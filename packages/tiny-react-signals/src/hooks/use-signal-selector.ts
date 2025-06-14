import { useMemo, useRef, useSyncExternalStore } from "react"
import { REACTIVE_CORE } from "../core"
import type { SignalId, SignalOptions } from "../core"

/**
 * Hook for selecting part of a signal value with memoization
 * Only triggers re-renders when the selected value changes (based on equality function)
 * Perfect for object states where you only want to react to specific property changes
 *
 * NOTE: Optimized for performance - selector and signal ID should be stable.
 * Dynamic changes to selector/ID are not supported.
 *
 * @param id - Signal identifier
 * @param initialValue - Initial value for the signal
 * @param selector - Function to select part of the signal value
 * @param equalityFn - Function to determine if selected values are equal (defaults to `Object.is`)
 * @param options - Optional signal configuration
 * @returns Selected value that only updates when equality check fails
 *
 * @example
 * // Only re-render when user.name changes, not other user properties
 * const userName = useSignalSelector('user', {name: '', age: 0}, user => user.name)
 *
 * @example
 * // Custom equality for complex selections
 * const userProfile = useSignalSelector(
 *   'user',
 *   defaultUser,
 *   user => ({ name: user.name, avatar: user.avatar }),
 *   (a, b) => a.name === b.name && a.avatar === b.avatar
 * )
 */
export function useSignalSelector<T, R>(
	id: SignalId,
	initialValue: T,
	selector: (value: T) => R,
	equalityFn: (a: R, b: R) => boolean = Object.is,
	options?: SignalOptions<T>
): R {
	// biome-ignore lint/correctness/useExhaustiveDependencies: Depend on only id for perf
	const signal = useMemo(() => {
		REACTIVE_CORE.upsertSignal(id, initialValue, options)
		return { id, initialValue }
	}, [id])

	// Stable reference for selector state
	const selectorRef = useRef<{
		selector: (value: T) => R
		equalityFn: (a: R, b: R) => boolean
		lastSelected?: R
		hasSelected: boolean
	}>({
		selector,
		equalityFn,
		hasSelected: false,
	})

	// Update refs without causing re-renders
	selectorRef.current.selector = selector
	selectorRef.current.equalityFn = equalityFn

	// Memoized subscribe function
	const subscribe = useMemo(() => {
		return (listener: () => void) => {
			return (
				REACTIVE_CORE.subscribe<T>(signal.id, (newState: T) => {
					const ref = selectorRef.current
					const newSelected = ref.selector(newState)

					if (!ref.hasSelected || !ref.equalityFn(ref.lastSelected as R, newSelected)) {
						ref.lastSelected = newSelected
						ref.hasSelected = true
						listener()
					}
				}) || (() => {})
			)
		}
	}, [signal.id])

	// Memoized getSnapshot
	const getSnapshot = useMemo(() => {
		return () => {
			const ref = selectorRef.current
			if (ref.hasSelected) {
				return ref.lastSelected as R
			}

			const state = REACTIVE_CORE.getValue<T>(signal.id) ?? signal.initialValue
			const selected = ref.selector(state)
			ref.lastSelected = selected
			ref.hasSelected = true
			return selected
		}
	}, [signal.id, signal.initialValue])

	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
