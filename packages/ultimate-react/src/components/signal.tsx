import React, { useEffect, useRef, type ReactNode, type ElementType, useMemo, useCallback } from "react"
import { REACTIVE_CORE } from "../core"
import type { SignalId } from "../core"

// ================================
// ▸ TYPE DEFINITIONS
// ================================

/**
 * Render prop function for single signal
 */
export type SignalRenderProp<T> = (value: T) => ReactNode

/**
 * Render prop function for multiple signals
 */
export type MultiSignalRenderProp<T extends Record<string, unknown>> = (values: T) => ReactNode

/**
 * Props for Signal component
 */
export interface SignalProps<T = unknown> {
	/** Single signal ID to bind to */
	id?: SignalId
	/** Multiple signal IDs to bind to */
	ids?: SignalId[]
	/** Element type to render or null for slot behavior */
	as?: ElementType | null
	/** Placeholder content while loading */
	placeholder?: string
	/** CSS class name */
	className?: string
	/** Inline styles */
	style?: React.CSSProperties
	/** Render prop for custom rendering or static children */
	children?: SignalRenderProp<T> | ReactNode
	/** Security: Allow HTML content within signal (dangerous) */
	dangerouslySetInnerHTML?: boolean
	/** Additional props for the element */
	[key: string]: any
}

// ================================
// ▸ HELPER FUNCTIONS
// ================================

/**
 * Store for event listeners that need to be attached after DOM injection
 */
const eventListenerStore = new WeakMap<HTMLElement, Array<{ selector: string; eventType: string; handler: Function }>>()

/**
 * Check if a prop name is an event handler
 */
function isEventHandler(propName: string): boolean {
	return propName.startsWith("on") && propName.length > 2
}

/**
 * Convert React event name to DOM event name
 */
function getEventType(propName: string): string {
	return propName.substring(2).toLowerCase()
}

/**
 * HTML renderer that extracts event handlers for later attachment
 */
function renderToHTML(node: ReactNode, parentElement?: HTMLElement, elementPath = ""): string {
	if (node == null) return ""
	if (typeof node === "string" || typeof node === "number") {
		return String(node)
	}
	if (typeof node === "boolean") return ""

	if (React.isValidElement(node)) {
		const props = node.props as any
		const type = node.type as string

		if (typeof type === "string") {
			const elementId = `signal-el-${Math.random().toString(36).substr(2, 9)}`
			const currentPath = elementPath ? `${elementPath} > ${type}#${elementId}` : `${type}#${elementId}`

			const eventHandlers: { eventType: string; handler: Function }[] = []
			const attributes = Object.keys(props)
				.filter((key) => {
					if (key === "children" || props[key] == null) return false

					if (isEventHandler(key)) {
						eventHandlers.push({
							eventType: getEventType(key),
							handler: props[key],
						})
						return false
					}

					return true
				})
				.map((key) => {
					if (key === "className") return `class="${props[key]}"`
					if (key === "style" && typeof props[key] === "object") {
						const styleStr = Object.entries(props[key])
							.map(([k, v]) => `${k.replace(/([A-Z])/g, "-$1").toLowerCase()}: ${v}`)
							.join("; ")
						return `style="${styleStr}"`
					}
					return `${key}="${props[key]}"`
				})
				.join(" ")

			// Add the unique ID for event listener attachment
			const allAttributes = `id="${elementId}" ${attributes}`.trim()

			if (eventHandlers.length > 0 && parentElement) {
				if (!eventListenerStore.has(parentElement)) {
					eventListenerStore.set(parentElement, [])
				}
				const listeners = eventListenerStore.get(parentElement) ?? []
				for (const { eventType, handler } of eventHandlers) {
					listeners.push({
						selector: `#${elementId}`,
						eventType,
						handler,
					})
				}
			}

			const openTag = `<${type}${allAttributes ? ` ${allAttributes}` : ""}>`
			const closeTag = `</${type}>`
			const childrenHTML = props.children ? renderToHTML(props.children, parentElement, currentPath) : ""

			return `${openTag}${childrenHTML}${closeTag}`
		}
	}

	if (Array.isArray(node)) {
		return node.map((child, index) => renderToHTML(child, parentElement, `${elementPath}[${index}]`)).join("")
	}

	return String(node)
}

/**
 * Attach stored event listeners to DOM elements
 */
function attachEventListeners(containerElement: HTMLElement) {
	const listeners = eventListenerStore.get(containerElement)
	if (!listeners) return

	for (const { selector, eventType, handler } of listeners) {
		const element = containerElement.querySelector(selector)
		if (element) {
			element.addEventListener(eventType, handler as EventListener)
		}
	}
}

/**
 * Render a React element to HTML string for DOM injection
 * Uses lightweight manual conversion perfect for Signal components
 */
function renderReactNodeToHTML(node: ReactNode, parentElement?: HTMLElement): string {
	if (node == null) return ""
	if (typeof node === "string" || typeof node === "number") {
		return String(node)
	}
	if (typeof node === "boolean") return ""

	if (React.isValidElement(node)) {
		return renderToHTML(node, parentElement)
	}

	// Handle arrays of React elements
	if (Array.isArray(node)) {
		return node.map((child) => renderReactNodeToHTML(child, parentElement)).join("")
	}

	return String(node)
}

// ================================
// ▸ SIGNAL COMPONENT
// ================================

/**
 * Signal component for zero-rerender reactive updates
 *
 * @example
 * // Simple value display
 * <Signal id="user.name" />
 *
 * @example
 * // With render prop
 * <Signal id="user.name">
 *   {name => <strong>Hello {name}!</strong>}
 * </Signal>
 *
 * @example
 * // Multiple signals
 * <Signal ids={['user.name', 'user.age']}>
 *   {({name, age}) => <div>{name} is {age} years old</div>}
 * </Signal>
 *
 * @example
 * // Slot behavior (invisible wrapper)
 * <Signal id="theme.color" as={null}>
 *   {color => <div style={{backgroundColor: color}}>Themed content</div>}
 * </Signal>
 */
export function Signal<T = unknown>(props: SignalProps<T>): React.ReactElement {
	const elementRef = useRef<HTMLElement>(null)
	const cleanupRef = useRef<(() => void) | null>(null)

	const {
		id,
		ids,
		as,
		placeholder = "Loading...",
		children,
		className,
		style,
		dangerouslySetInnerHTML = false,
		...otherProps
	} = props

	// Check if this is slot behavior
	const isSlot = as === null

	// biome-ignore lint/correctness/useExhaustiveDependencies: This is why I created a lib to bypass React model
	const memoizedIds = useMemo(() => ids, [ids?.join(",")])

	const createSingleSignalBinding = useCallback(
		(_: SignalId) => {
			return (value: T) => {
				const element = elementRef.current
				if (!element) return

				if (typeof children === "function") {
					const result = (children as SignalRenderProp<T>)(value)
					const htmlString = renderReactNodeToHTML(result, element)
					element.innerHTML = htmlString
					attachEventListeners(element)
				} else {
					if (dangerouslySetInnerHTML && typeof value === "string") {
						element.innerHTML = value
					} else {
						// If value is undefined, keep placeholder
						if (value === undefined) {
							return
						}
						element.textContent = String(value ?? "") // In case of explicit null -- should we use placeholder?
					}
				}
			}
		},
		[children, dangerouslySetInnerHTML]
	)

	const createMultiSignalBinding = useCallback(
		(signalIds: SignalId[]) => {
			return () => {
				const element = elementRef.current
				if (!element) return

				if (typeof children === "function") {
					const values: Record<string, unknown> = {}

					// First, check if short keys would cause collisions
					const shortKeys = signalIds.map((id) => id.split(".").pop()?.replaceAll("-", "_") || id)
					const hasCollisions = new Set(shortKeys).size !== shortKeys.length

					for (const signalId of signalIds) {
						const key = hasCollisions ? signalId.replace(/[^a-zA-Z0-9_]/g, "_") : signalId.split(".").pop() || signalId
						values[key] = REACTIVE_CORE.getValue(signalId)
					}

					const result = (children as MultiSignalRenderProp<any>)(values)
					const htmlString = renderReactNodeToHTML(result, element)
					element.innerHTML = htmlString
					attachEventListeners(element)
				}
			}
		},
		[children]
	)

	// biome-ignore lint/correctness/useExhaustiveDependencies: No explanation needed
	useEffect(() => {
		if (cleanupRef.current) {
			cleanupRef.current()
			cleanupRef.current = null
		}

		if (id) {
			const bindingFn = createSingleSignalBinding(id)
			cleanupRef.current = REACTIVE_CORE.subscribe(id, bindingFn)

			bindingFn(REACTIVE_CORE.getValue(id) as T)
		} else if (memoizedIds && !id) {
			if (typeof children !== "function") {
				return
			}

			const bindingFn = createMultiSignalBinding(memoizedIds)

			const cleanups = memoizedIds.map((signalId) => REACTIVE_CORE.subscribe(signalId, bindingFn))

			cleanupRef.current = () => {
				for (const cleanup of cleanups) {
					cleanup?.()
				}
			}

			bindingFn()
		}

		return () => {
			if (cleanupRef.current) {
				cleanupRef.current()
				cleanupRef.current = null
			}
		}
	}, [id, memoizedIds, createSingleSignalBinding, createMultiSignalBinding])

	if (isSlot) {
		return React.createElement("span", {
			ref: elementRef,
			style: { ...otherProps.style, display: "contents" },
			...otherProps,
		})
	}

	const Component = as || "span"

	return React.createElement(
		Component,
		{
			ref: elementRef,
			className,
			style,
			...otherProps,
		},

		typeof children === "function" ? placeholder : children || placeholder
	)
}
