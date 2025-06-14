import { REACTIVE_CORE } from "./core"
import type { BindingFunction, ConditionFunction, Signal, SignalId, TypedComputeFunction } from "./core"

type Notation = "dot" | "underscore" | "hyphen"

/**
 * Safe reactive API - curated subset of REACTIVE_CORE functionality
 * Exposes only the intended public methods for end users
 */
export const reactive = {
	/**
	 * Create a new signal with initial value
	 * @param id - Unique signal identifier
	 * @param initialValue - Initial value for the signal
	 */
	createSignal<T>(id: SignalId, initialValue: T): Signal<T> {
		return REACTIVE_CORE.createSignal(id, initialValue)
	},

	/**
	 * Create a signal if it doesn't exist, or get existing signal
	 * @param id - Unique signal identifier
	 * @param initialValue - Initial value to use if signal doesn't exist
	 */
	upsertSignal<T>(id: SignalId, initialValue: T): Signal<T> {
		return REACTIVE_CORE.upsertSignal(id, initialValue)
	},

	/**
	 * Update signal value
	 * @param id - Signal identifier
	 * @param value - New value to set
	 */
	updateSignal<T>(id: SignalId, value: T): void {
		REACTIVE_CORE.updateSignal(id, value)
	},

	/**
	 * Get current signal value
	 * @param id - Signal identifier
	 * @returns Current signal value or undefined if not found
	 */
	getValue<T>(id: SignalId): T | undefined {
		return REACTIVE_CORE.getValue<T>(id)
	},

	/**
	 * Create a computed signal that depends on other signals
	 * @param id - Unique computed signal identifier
	 * @param dependencies - Array of signal IDs this computed signal depends on
	 * @param computeFn - Function to compute the value from dependencies
	 */
	createComputed<T>(id: SignalId, dependencies: SignalId[], computeFn: TypedComputeFunction<T>): void {
		REACTIVE_CORE.createComputed(id, dependencies, computeFn)
	},

	/**
	 * Bind an element to a signal for reactive updates
	 * @param element - DOM element to bind
	 * @param signalId - Signal to bind to
	 * @param bindingFn - Function to update the element when signal changes
	 * @returns Cleanup function or null if binding failed
	 */
	bindElement(element: HTMLElement, signalId: SignalId, bindingFn: BindingFunction): (() => void) | null {
		return REACTIVE_CORE.bindElement(element, signalId, bindingFn)
	},

	/**
	 * Bind an element to a signal with a condition
	 * Updates only occur when the condition function returns true
	 * @param element - DOM element to bind
	 * @param signalId - Signal to bind to
	 * @param condition - Function that determines if binding should update
	 * @param bindingFn - Function to update the element when signal changes and condition is true
	 * @returns Cleanup function or null if binding failed
	 */
	bindWhen<T>(
		element: HTMLElement,
		signalId: SignalId,
		condition: ConditionFunction<T>,
		bindingFn: BindingFunction<T>
	): (() => void) | null {
		return REACTIVE_CORE.bindWhen(element, signalId, condition, bindingFn)
	},

	/**
	 * Batch multiple signal updates for optimal performance
	 * All updates within the function will be collected and executed in a single DOM pass
	 * @param fn - Function containing multiple signal updates
	 */
	batchUpdate(fn: () => void): void {
		REACTIVE_CORE.batchUpdate(fn)
	},

	/**
	 * Remove a signal and clean up its bindings
	 * @param id - Signal identifier to remove
	 */
	cleanup(id: SignalId): void {
		REACTIVE_CORE.cleanup(id)
	},

	/**
	 * Create multiple signals from an object
	 * @param signals - Object with signal IDs as keys and initial values as values
	 */
	create<T extends Record<string, unknown>>(signals: T): void {
		for (const [id, value] of Object.entries(signals)) {
			REACTIVE_CORE.upsertSignal(id, value)
		}
	},

	/**
	 * Create signals from nested object structure (converts to dot notation)
	 * @param obj - Nested object to convert to signals
	 * @param prefix - Optional prefix for all signal IDs
	 * @param notation - Notation to use for the signal IDs (dot, underscore, hyphen)
	 */
	createNested<T extends Record<string, unknown>>(obj: T, prefix = "", notation: Notation = "dot"): void {
		let notationMap: string

		switch (notation) {
			case "dot":
				notationMap = "."
				break
			case "underscore":
				notationMap = "_"
				break
			case "hyphen":
				notationMap = "-"
				break
		}

		const flattenObject = (obj: any, currentPrefix = ""): Record<string, unknown> => {
			const result: Record<string, unknown> = {}

			for (const [key, value] of Object.entries(obj)) {
				const newKey = currentPrefix ? `${currentPrefix}${notationMap}${key}` : key

				if (value && typeof value === "object" && !Array.isArray(value)) {
					Object.assign(result, flattenObject(value, newKey))
				} else {
					result[newKey] = value
				}
			}

			return result
		}

		const flattened = flattenObject(obj, prefix)
		this.create(flattened)
	},

	/**
	 * Create signals from array of tuples
	 * @param entries - Array of [id, value] tuples
	 */
	createFromTuples(entries: Array<[string, unknown]>): void {
		for (const [id, value] of entries) {
			REACTIVE_CORE.upsertSignal(id, value)
		}
	},
}
