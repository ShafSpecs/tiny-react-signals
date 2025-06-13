export type SignalId = string
export type SignalValue = unknown
export type BindingFunction<T = unknown> = (element: HTMLElement, value: T) => void
export type ComputeFunction<T = unknown> = (...dependencies: unknown[]) => T
export type ConditionFunction<T = unknown> = (value: T) => boolean
export type Transformer<T> = (value: T) => T
export type TransformerChain<T> = Transformer<T>[]

export interface SignalOptions<T> {
	transform?: Transformer<T> | TransformerChain<T>
}

export interface Signal<T = unknown> {
	value: T
	rawValue: T
	bindings: Map<number, SignalBinding>
	computed: Set<SignalId>
	computeFn?: ComputeFunction<T>
	dependencies?: SignalId[]
	transformers?: TransformerChain<T>
	hasTransformers: boolean
	hasComputed: boolean
}

interface ComputedSignal<T> extends Signal<T> {
	depCache: unknown[]
}

export interface SignalBinding {
	element: HTMLElement
	fn: BindingFunction
	condition?: ConditionFunction
}

export interface ElementBinding {
	signalId: SignalId
	bindingId: number
}

export interface ReactiveEngine {
	createSignal<T>(id: SignalId, initialValue: T, options?: SignalOptions<T>): Signal<T>
	upsertSignal<T>(id: SignalId, initialValue: T, options?: SignalOptions<T>): Signal<T>
	updateSignal<T>(id: SignalId, value: T): void
	getValue<T>(id: SignalId): T | undefined
	getRawValue<T>(id: SignalId): T | undefined
	createComputed<T>(
		id: SignalId,
		dependencies: SignalId[],
		computeFn: ComputeFunction<T>,
		options?: SignalOptions<T>
	): Signal<T>
	bindElement<T>(element: HTMLElement, signalId: SignalId, bindingFn: BindingFunction<T>): (() => void) | null
	bindWhen<T>(
		element: HTMLElement,
		signalId: SignalId,
		condition: ConditionFunction<T>,
		bindingFn: BindingFunction<T>
	): (() => void) | null
	cleanup(signalId: SignalId): void
	batchUpdate(fn: () => void): void
	getActiveSignals(): SignalId[]
	recomputeSignal(id: SignalId): void
	cleanupMatching(pattern: string): void
}

declare global {
	interface Window {
		__REACTIVE_CORE__?: ReactiveEngine
	}
}

class ReactiveEngineImpl implements ReactiveEngine {
	private signals = new Map<SignalId, Signal<unknown>>()
	private bindings = new WeakMap<HTMLElement, ElementBinding>()
	private bindingCounter = 0
	private isBatching = false
	private batchedUpdates = new Set<SignalId>()

	private static instance: ReactiveEngineImpl | null = null

	private constructor() {}

	static getInstance(): ReactiveEngineImpl {
		if (!ReactiveEngineImpl.instance) {
			ReactiveEngineImpl.instance = new ReactiveEngineImpl()
		}
		return ReactiveEngineImpl.instance
	}

	private normalizeTransformers<T>(
		transform: Transformer<T> | TransformerChain<T> | undefined
	): TransformerChain<T> | undefined {
		return transform ? (Array.isArray(transform) ? transform : [transform]) : undefined
	}

	private applyTransformers<T>(value: T, transformers: TransformerChain<T>): T {
		if (transformers.length === 1) return transformers[0](value)

		const len = transformers.length
		let result = value
		for (let i = 0; i < len; ++i) {
			result = transformers[i](result)
		}
		return result
	}

	private mergeTransformers<T>(
		existing: TransformerChain<T> | undefined,
		newTransformers: TransformerChain<T> | undefined
	): TransformerChain<T> | undefined {
		if (!existing) return newTransformers
		if (!newTransformers) return existing
		return [...existing, ...newTransformers]
	}

	private executeDOMUpdates(signalId: SignalId): void {
		const signal = this.signals.get(signalId)
		if (!signal || signal.bindings.size === 0) return

		const value = signal.value
		const bindings = signal.bindings.values()

		for (const binding of bindings) {
			const element = binding.element
			if (element?.isConnected) {
				binding.condition ? binding.condition(value) && binding.fn(element, value) : binding.fn(element, value)
			}
		}
	}

	private flushBatchedUpdates(): void {
		if (this.batchedUpdates.size === 0) return

		const updatedSignals = Array.from(this.batchedUpdates)
		this.batchedUpdates.clear()

		let hasComputedSignals = false
		const computedSignals = new Set<SignalId>()

		for (let i = 0; i < updatedSignals.length; i++) {
			const signalId = updatedSignals[i]
			const signal = this.signals.get(signalId)
			if (signal?.hasComputed) {
				hasComputedSignals = true
				for (const computedId of signal.computed) {
					computedSignals.add(computedId)
				}
			}
		}

		if (hasComputedSignals) {
			for (const computedId of computedSignals) {
				const signal = this.signals.get(computedId)
				if (signal?.computeFn && signal.dependencies) {
					const depValues = signal.dependencies.map((depId) => this.signals.get(depId)?.value)
					const newValue = signal.computeFn(...depValues)
					if (signal.value !== newValue) {
						signal.value = newValue
						updatedSignals.push(computedId)
					}
				}
			}
		}

		for (const signalId of updatedSignals) {
			this.executeDOMUpdates(signalId)
		}
	}

	private matchesPattern(signalId: SignalId, pattern: string): boolean {
		// Simple prefix matching for now - can be enhanced
		return signalId.startsWith(pattern)
	}

	createSignal<T>(id: SignalId, initialValue: T, options?: SignalOptions<T>): Signal<T> {
		if (this.signals.has(id)) {
			return this.signals.get(id) as Signal<T>
		}

		let finalValue: T
		let transformers: TransformerChain<T> | undefined
		let hasTransformers = false

		if (options?.transform) {
			transformers = this.normalizeTransformers(options.transform)
			hasTransformers = true
			finalValue = this.applyTransformers(initialValue, transformers ?? [])
		} else {
			finalValue = initialValue
		}

		const signal: Signal<T> = {
			value: finalValue,
			rawValue: initialValue,
			bindings: new Map(),
			computed: new Set(),
			transformers,
			hasTransformers,
			hasComputed: false,
		}

		this.signals.set(id, signal as Signal<unknown>)
		return signal
	}

	upsertSignal<T>(id: SignalId, initialValue: T, options?: SignalOptions<T>): Signal<T> {
		const existingSignal = this.signals.get(id)
		if (existingSignal) {
			if (options?.transform) {
				const newTransformers = this.normalizeTransformers(options.transform)
				const mergedTransformers = this.mergeTransformers((existingSignal as Signal<T>).transformers, newTransformers)
				;(existingSignal as Signal<T>).transformers = mergedTransformers
				;(existingSignal as Signal<T>).hasTransformers = !!mergedTransformers
			}
			return existingSignal as Signal<T>
		}

		return this.createSignal(id, initialValue, options)
	}

	bindElement<T>(element: HTMLElement, signalId: SignalId, bindingFn: BindingFunction<T>): (() => void) | null {
		const signal = this.signals.get(signalId)
		if (!signal || !element) return null

		const bindingId = ++this.bindingCounter

		signal.bindings.set(bindingId, { element, fn: bindingFn as BindingFunction<unknown> })
		this.bindings.set(element, { signalId, bindingId })

		bindingFn(element, signal.value as T)

		return () => {
			signal.bindings.delete(bindingId)
			this.bindings.delete(element)
		}
	}

	bindWhen<T>(
		element: HTMLElement,
		signalId: SignalId,
		condition: ConditionFunction<T>,
		bindingFn: BindingFunction<T>
	): (() => void) | null {
		const signal = this.signals.get(signalId)
		if (!signal) return null

		const bindingId = ++this.bindingCounter

		signal.bindings.set(bindingId, {
			element,
			fn: bindingFn as BindingFunction<unknown>,
			condition: condition as ConditionFunction<unknown>,
		})

		if (condition(signal.value as T)) {
			bindingFn(element, signal.value as T)
		}

		return () => {
			signal.bindings.delete(bindingId)
		}
	}

	updateSignal<T>(id: SignalId, value: T): void {
		const signal = this.signals.get(id)
		if (!signal) return

		const newValue = signal.hasTransformers ? this.applyTransformers(value, signal.transformers ?? []) : value

		if (signal.value === newValue) return

		signal.rawValue = value
		signal.value = newValue

		if (this.isBatching) {
			this.batchedUpdates.add(id)
		} else {
			this.executeDOMUpdates(id)

			if (signal.hasComputed) {
				for (const computedId of signal.computed) {
					this.recomputeSignal(computedId)
				}
			}
		}
	}

	getValue<T>(id: SignalId): T | undefined {
		return this.signals.get(id)?.value as T
	}

	getRawValue<T>(id: SignalId): T | undefined {
		return this.signals.get(id)?.rawValue as T
	}

	createComputed<T>(
		id: SignalId,
		dependencies: SignalId[],
		computeFn: ComputeFunction<T>,
		options?: SignalOptions<T>
	): Signal<T> {
		if (this.signals.has(id)) {
			return this.signals.get(id) as Signal<T>
		}

		const initialValue = computeFn(...dependencies.map((depId) => this.getValue(depId)))

		let finalValue: T
		let transformers: TransformerChain<T> | undefined
		let hasTransformers = false

		if (options?.transform) {
			transformers = this.normalizeTransformers(options.transform)
			hasTransformers = true
			finalValue = this.applyTransformers(initialValue, transformers ?? [])
		} else {
			finalValue = initialValue
		}

		const signal: Signal<T> = {
			value: finalValue,
			rawValue: initialValue,
			bindings: new Map(),
			computed: new Set(),
			transformers,
			hasTransformers,
			hasComputed: false,
			computeFn,
			dependencies,
		}

		this.signals.set(id, signal as Signal<unknown>)

		for (const depId of dependencies) {
			const depSignal = this.signals.get(depId)
			if (depSignal) {
				depSignal.computed.add(id)
				depSignal.hasComputed = true
			}
		}

		return signal
	}

	recomputeSignal(id: SignalId): void {
		const signal = this.signals.get(id) as ComputedSignal<unknown>
		if (!signal?.computeFn || !signal.dependencies) return

		if (!signal.depCache) {
			signal.depCache = new Array(signal.dependencies.length)
		}

		const deps = signal.depCache
		const dependencies = signal.dependencies
		let hasChanged = false

		for (let i = 0; i < dependencies.length; i++) {
			const newVal = this.signals.get(dependencies[i])?.rawValue
			if (deps[i] !== newVal) {
				deps[i] = newVal
				hasChanged = true
			}
		}

		if (hasChanged) {
			const newValue = signal.computeFn(...deps)
			this.updateSignal(id, newValue)
		}
	}

	batchUpdate(fn: () => void): void {
		if (this.isBatching) {
			fn()
			return
		}

		this.isBatching = true
		try {
			fn()
		} finally {
			this.isBatching = false
			this.flushBatchedUpdates()
		}
	}

	cleanup(signalId: SignalId): void {
		const signal = this.signals.get(signalId)
		if (signal) {
			signal.bindings.clear()
			this.signals.delete(signalId)
		}
	}

	getActiveSignals(): SignalId[] {
		return Array.from(this.signals.keys())
	}

	cleanupMatching(pattern: string): void {
		const toDelete: SignalId[] = []
		for (const signalId of this.signals.keys()) {
			if (this.matchesPattern(signalId, pattern)) {
				toDelete.push(signalId)
			}
		}
		for (const signalId of toDelete) {
			this.cleanup(signalId)
		}
	}
}

// Global namespace fallback for cross-bundle compatibility
export const REACTIVE_CORE = (() => {
	if (typeof window !== "undefined" && window.__REACTIVE_CORE__) {
		return window.__REACTIVE_CORE__
	}

	const core = ReactiveEngineImpl.getInstance()

	if (typeof window !== "undefined") {
		window.__REACTIVE_CORE__ = core
	}

	return core
})()
