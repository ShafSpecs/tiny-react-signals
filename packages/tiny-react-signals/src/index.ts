// Core reactive functionality
export { reactive } from "./reactive"
export { signal } from "./signal"

// Core types
export type {
	SignalId,
	SignalValue,
	BindingFunction,
	ComputeFunction,
} from "./core"

// React hooks
export { useReactiveElement } from "./hooks/use-reactive-element"
export { useSignal } from "./hooks/use-signal"
export { useSignalComputed } from "./hooks/use-signal-computed"
export { useSignalEffect } from "./hooks/use-signal-effect"
export { useSignalRef } from "./hooks/use-signal-ref"

// React components
export { Signal } from "./components/signal"
export { SignalList } from "./components/signal-list"

// Component types
export type {
	SignalRenderProp,
	MultiSignalRenderProp,
	SignalProps,
} from "./components/signal"

export type {
	ListItemRenderProp,
	PatternItemRenderProp,
	ListType,
	SignalListProps,
} from "./components/signal-list"

export const test = (): void => {}
