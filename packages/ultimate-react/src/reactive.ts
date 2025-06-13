import { REACTIVE_CORE } from "./core"
import type { BindingFunction, ComputeFunction, ConditionFunction, Signal, SignalId } from "./core"

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
	createComputed<T>(id: SignalId, dependencies: SignalId[], computeFn: ComputeFunction<T>): void {
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
}
