import React, { useEffect, useRef, type ReactNode, useCallback } from "react"
import { REACTIVE_CORE } from "../core"
import type { SignalId } from "../core"

// ================================
// ▸ TYPE DEFINITIONS
// ================================

/**
 * Render function for list items
 */
export type ListItemRenderProp<T> = (item: T, index: number) => ReactNode

/**
 * Render function for pattern-based lists
 */
export type PatternItemRenderProp = (itemId: string, signals: Record<string, unknown>) => ReactNode

/**
 * List rendering types
 * - `ul`: Unordered list (default)
 * - `ol`: Ordered list
 * - `slot`: Slot behavior (no wrapper)
 */
export type ListType = "ul" | "ol" | "slot"

/**
 * Props for SignalList component
 */
export interface SignalListProps<T = unknown> {
	/** Signal ID containing array data */
	id?: SignalId
	/** Pattern for pattern-based signal matching */
	pattern?: string
	/** Property to use as unique key */
	keyBy: string
	/** List type - ul, ol, or slot (no wrapper) */
	type?: ListType
	/** Placeholder content while loading */
	placeholder?: string
	/** CSS class name */
	className?: string
	/** Inline styles */
	style?: React.CSSProperties
	/** Render function for list items */
	children: ListItemRenderProp<T> | PatternItemRenderProp
	/** Additional props for the list element */
	[key: string]: any
}

// ================================
// ▸ HELPER FUNCTIONS
// ================================

/**
 * Store for event listeners that need to be attached after DOM injection
 */
const listEventListenerStore = new WeakMap<
	HTMLElement,
	Array<{ selector: string; eventType: string; handler: Function }>
>()

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
function renderReactNodeToHTML(node: ReactNode, parentElement?: HTMLElement, elementPath = ""): string {
	if (node == null) return ""
	if (typeof node === "string" || typeof node === "number") {
		return String(node)
	}
	if (typeof node === "boolean") return ""

	if (React.isValidElement(node)) {
		const props = node.props as any
		const type = node.type as string

		if (typeof type === "string") {
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

			let allAttributes = attributes
			let elementId = ""

			// Only generate ID and attach event handlers if there are any
			if (eventHandlers.length > 0 && parentElement) {
				elementId = `signal-list-el-${Math.random().toString(36).substr(2, 9)}`
				allAttributes = `id="${elementId}" ${attributes}`.trim()

				if (!listEventListenerStore.has(parentElement)) {
					listEventListenerStore.set(parentElement, [])
				}
				const listeners = listEventListenerStore.get(parentElement) ?? []

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
			const childrenHTML = props.children ? renderReactNodeToHTML(props.children, parentElement, elementPath) : ""

			return `${openTag}${childrenHTML}${closeTag}`
		}
	}

	if (Array.isArray(node)) {
		return node.map((child, index) => renderReactNodeToHTML(child, parentElement, `${elementPath}[${index}]`)).join("")
	}

	return String(node)
}

/**
 * Attach stored event listeners to DOM elements
 */
function attachEventListeners(containerElement: HTMLElement) {
	const listeners = listEventListenerStore.get(containerElement)
	if (!listeners) return

	for (const { selector, eventType, handler } of listeners) {
		const element = containerElement.querySelector(selector)
		if (element) {
			element.addEventListener(eventType, handler as EventListener)
		}
	}

	listEventListenerStore.delete(containerElement)
}

/**
 * Check if we should wrap the result in a list item
 */
function shouldWrapInListItem(result: ReactNode, isSlot: boolean): boolean {
	if (isSlot) return false // Never wrap for slot

	// If it's a React element, check its type
	if (React.isValidElement(result)) {
		const elementType = result.type
		// Don't wrap if it's already a list-related element
		if (elementType === "li" || elementType === "ul" || elementType === "ol") {
			return false
		}
	}

	// Wrap everything else when in ul/ol mode
	return true
}

// ================================
// ▸ SIGNALLIST COMPONENT
// ================================

/**
 * SignalList component for efficient list rendering with zero React re-renders
 */
export function SignalList<T = unknown>(props: SignalListProps<T>): React.ReactElement {
	const listRef = useRef<HTMLElement>(null)
	const cleanupRef = useRef<(() => void) | null>(null)

	const {
		id,
		pattern,
		keyBy,
		type = "ul",
		placeholder = "Loading...",
		children,
		className,
		style,
		...otherProps
	} = props

	const isSlot = type === "slot"

	const createArrayListBinding = useCallback(
		(_: SignalId) => {
			return (value: T[]) => {
				const element = listRef.current
				if (!element) return

				if (!Array.isArray(value) || value.length === 0) {
					element.innerHTML = `<li>${placeholder}</li>`
					return
				}

				const itemsHTML = value
					.map((item, index) => {
						const key = String((item as any)[keyBy] || index)
						const result = (children as ListItemRenderProp<T>)(item, index)
						const resultHTML = renderReactNodeToHTML(result, element)

						if (shouldWrapInListItem(result, isSlot)) {
							// Wrap in li for ul/ol
							return `<li data-key="${key}">${resultHTML}</li>`
						}

						if (React.isValidElement(result)) {
							return resultHTML.replace(/^<(\w+)/, `<$1 data-key="${key}"`)
						}

						return `<span data-key="${key}">${resultHTML}</span>`
					})
					.join("")

				element.innerHTML = itemsHTML
				attachEventListeners(element)
			}
		},
		[children, keyBy, isSlot, placeholder]
	)

	const createPatternListBinding = useCallback(
		(patternStr: string) => {
			return () => {
				const element = listRef.current
				if (!element) return

				const allSignals = REACTIVE_CORE.getActiveSignals()
				const matchingSignals = allSignals.filter((signalId) => signalId.startsWith(patternStr))

				const itemGroups: Record<string, Record<string, unknown>> = {}

				for (const signalId of matchingSignals) {
					const parts = signalId.split(".")
					if (parts.length >= 3) {
						const itemId = parts[1]
						const property = parts.slice(2).join(".")

						if (!itemGroups[itemId]) {
							itemGroups[itemId] = {}
						}
						itemGroups[itemId][property] = REACTIVE_CORE.getValue(signalId)
					}
				}

				const itemsHTML = Object.keys(itemGroups)
					.map((itemId) => {
						const result = (children as PatternItemRenderProp)(itemId, itemGroups[itemId])
						const resultHTML = renderReactNodeToHTML(result, element)

						if (shouldWrapInListItem(result, isSlot)) {
							return `<li data-key="${itemId}">${resultHTML}</li>`
						}

						if (React.isValidElement(result)) {
							// Add data-key to the existing element
							return resultHTML.replace(/^<(\w+)/, `<$1 data-key="${itemId}"`)
						}

						return `<span data-key="${itemId}">${resultHTML}</span>`
					})
					.join("")

				// Update DOM and attach event listeners
				element.innerHTML = itemsHTML || `<li>${placeholder}</li>`
				attachEventListeners(element)
			}
		},
		[children, isSlot, placeholder]
	)

	useEffect(() => {
		if (cleanupRef.current) {
			cleanupRef.current()
			cleanupRef.current = null
		}

		if (id) {
			// Prefer id over pattern
			const bindingFn = createArrayListBinding(id)
			cleanupRef.current = REACTIVE_CORE.subscribe(id, bindingFn)

			bindingFn(REACTIVE_CORE.getValue(id) as T[])
		} else if (pattern && !id) {
			const bindingFn = createPatternListBinding(pattern)

			const allSignals = REACTIVE_CORE.getActiveSignals()
			const matchingSignals = allSignals.filter((signalId) => signalId.startsWith(pattern))

			const cleanups = matchingSignals.map((signalId) => REACTIVE_CORE.subscribe(signalId, bindingFn))

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
	}, [id, pattern, createArrayListBinding, createPatternListBinding])

	if (isSlot) {
		return React.createElement("span", {
			ref: listRef,
			// CSS display: contents makes the element invisible
			style: { display: "contents" },
			...otherProps,
		})
	}

	// Normal list rendering - MOUNTS ONCE with placeholder
	const ListComponent = type === "ol" ? "ol" : "ul"

	return React.createElement(
		ListComponent,
		{
			ref: listRef,
			className,
			style,
			...otherProps,
		},
		// Initial placeholder content - will be replaced by signal updates
		React.createElement("li", { key: "loading" }, placeholder)
	)
}
