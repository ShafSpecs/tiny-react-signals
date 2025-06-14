import * as React from "react"
import { REACTIVE_CORE } from "../core"
import type { BindingFunction, SignalId } from "../core"

/**
 * A React hook that creates a reactive binding between a DOM element and a signal.
 * This hook provides zero React re-render updates by directly manipulating the DOM
 * when the signal value changes.
 *
 * @template T - The type of the signal value
 * @template E - The type of the HTML element (extends HTMLElement)
 *
 * @param signalId - The unique identifier of the signal to bind to
 * @param bindingFn - Function that defines how to update the DOM element when the signal changes.
 *                   Receives the element and the new signal value as parameters.
 * @param dependencies - Optional React dependency array for the binding function memoization
 *
 * @returns A React ref object that should be attached to the target DOM element
 *
 * @example
 * ```tsx
 * // Basic text content binding
 * const textRef = useReactiveElement<string>('user.name', (el, value) => {
 *   el.textContent = value || 'No name';
 * });
 *
 * return <span ref={textRef}>Loading...</span>;
 * ```
 *
 * @example
 * ```tsx
 * // Style binding with typed element
 * const colorRef = useReactiveElement<string, HTMLDivElement>('theme.color', (el, color) => {
 *   el.style.backgroundColor = color;
 *   el.textContent = `Color: ${color}`;
 * });
 *
 * return <div ref={colorRef}>Default color</div>;
 * ```
 *
 * @example
 * ```tsx
 * // Complex binding with dependencies
 * const complexRef = useReactiveElement<number>(
 *   'counter',
 *   (el, count) => {
 *     el.innerHTML = `
 *       <strong>Count: ${count}</strong>
 *       <small>Multiplier: ${multiplier}</small>
 *     `;
 *   },
 *   [multiplier] // Re-memoize when multiplier changes
 * );
 * ```
 */
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

		return () => {
			if (cleanupRef.current) {
				cleanupRef.current()
				cleanupRef.current = null
			}
		}
	}, [signalId, memoizedBindingFn])

	return elementRef
}
