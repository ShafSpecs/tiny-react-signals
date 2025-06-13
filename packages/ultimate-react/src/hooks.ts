import * as React from "react"
import { REACTIVE_CORE } from "./core"
import type { BindingFunction, SignalId } from "./core"

export function useReactiveElement<T = unknown, E extends HTMLElement = HTMLElement>(
	signalId: SignalId,
	bindingFn: BindingFunction<T>,
	dependencies: React.DependencyList = []
): React.RefObject<E | null> {
	const elementRef = React.useRef<E>(null)
	const cleanupRef = React.useRef<(() => void) | null>(null)

	const memoizedBindingFn = React.useCallback(bindingFn, dependencies)

	React.useEffect(() => {
		const element = elementRef.current
		if (!element || !memoizedBindingFn) return

		if (cleanupRef.current) {
			cleanupRef.current()
		}

		cleanupRef.current = REACTIVE_CORE.bindElement(element, signalId, memoizedBindingFn)

		// Cleanup on unmount
		return () => {
			if (cleanupRef.current) {
				cleanupRef.current()
				cleanupRef.current = null
			}
		}
	}, [signalId, memoizedBindingFn])

	return elementRef
}
