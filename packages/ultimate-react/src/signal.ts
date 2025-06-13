import { REACTIVE_CORE } from "./core"
import type {
	BindingFunction,
	CallbackFunction,
	ComputeFunction,
	ConditionFunction,
	Signal,
	SignalId,
	SignalOptions,
} from "./core"

/**
 * Direct signal API for creating and managing signals
 */
export const signal = {
	/**
	 * Create a new signal with initial value
	 * @param id - Unique signal identifier
	 * @param initialValue - Initial value for the signal
	 * @param options - Optional configuration including transformers
	 */
	create<T>(id: SignalId, initialValue: T, options?: SignalOptions<T>): Signal<T> {
		return REACTIVE_CORE.createSignal(id, initialValue, options)
	},

	/**
	 * Create a signal if it doesn't exist, or get existing signal
	 * @param id - Unique signal identifier
	 * @param initialValue - Initial value to use if signal doesn't exist
	 * @param options - Optional configuration including transformers
	 */
	upsert<T>(id: SignalId, initialValue: T, options?: SignalOptions<T>): Signal<T> {
		return REACTIVE_CORE.upsertSignal(id, initialValue, options)
	},

	/**
	 * Update signal value
	 * @param id - Signal identifier
	 * @param value - New value to set
	 */
	set<T>(id: SignalId, value: T): void {
		REACTIVE_CORE.updateSignal(id, value)
	},

	/**
	 * Get current signal value
	 * @param id - Signal identifier
	 * @returns Current signal value or undefined if not found
	 */
	get<T>(id: SignalId): T | undefined {
		return REACTIVE_CORE.getValue<T>(id)
	},

	/**
	 * Get current raw (untransformed) signal value
	 * @param id - Signal identifier
	 * @returns Current raw signal value or undefined if not found
	 */
	getRawValue<T>(id: SignalId): T | undefined {
		return REACTIVE_CORE.getRawValue<T>(id)
	},

	/**
	 * Create a computed signal that depends on other signals
	 * @param id - Unique computed signal identifier
	 * @param dependencies - Array of signal IDs this computed signal depends on
	 * @param computeFn - Function to compute the value from dependencies
	 * @param options - Optional configuration including transformers
	 */
	computed<T>(id: SignalId, dependencies: SignalId[], computeFn: ComputeFunction<T>, options?: SignalOptions<T>): void {
		REACTIVE_CORE.createComputed(id, dependencies, computeFn, options)
	},

	/**
	 * Bind an element to a signal for reactive updates
	 * @param element - DOM element to bind
	 * @param signalId - Signal to bind to
	 * @param bindingFn - Function to update the element when signal changes
	 * @returns Cleanup function or null if binding failed
	 */
	bind<T>(element: HTMLElement, signalId: SignalId, bindingFn: BindingFunction<T>): (() => void) | null {
		return REACTIVE_CORE.bindElement(element, signalId, bindingFn as BindingFunction<unknown>)
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
	// TODO: Support ref binding too
	bindWhen<T>(
		element: HTMLElement,
		signalId: SignalId,
		condition: ConditionFunction<T>,
		bindingFn: BindingFunction<T>
	): (() => void) | null {
		return REACTIVE_CORE.bindWhen(element, signalId, condition, bindingFn as BindingFunction<unknown>)
	},

	/**
	 * Batch multiple signal updates for optimal performance
	 * All updates within the function will be collected and executed in a single DOM pass
	 * @param fn - Function containing multiple signal updates
	 */
	batch(fn: () => void): void {
		REACTIVE_CORE.batchUpdate(fn)
	},

	/**
	 * Remove a signal and clean up its bindings
	 * @param id - Signal identifier to remove
	 */
	remove(id: SignalId): void {
		REACTIVE_CORE.cleanup(id)
	},

	/**
	 * Subscribe to a signal for changes
	 * @param id - Signal identifier
	 * @param callback - Function to call when signal changes
	 * @returns Cleanup function or null if subscription failed
	 */
	subscribe<T>(id: SignalId, callback: CallbackFunction<T>): (() => void) | null {
		return REACTIVE_CORE.subscribe(id, callback)
	},

	/**
	 * Get all active signal IDs
	 * @returns Array of active signal IDs
	 */
	getActiveSignals(): SignalId[] {
		return REACTIVE_CORE.getActiveSignals()
	},

	/**
	 * Remove all signals matching a prefix pattern
	 * @param pattern - Prefix to match (e.g., "user." to remove all user signals)
	 */
	removeByPrefix(pattern: string): void {
		REACTIVE_CORE.cleanupMatching(pattern)
	},
}
