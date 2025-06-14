import { act, render, renderHook } from "@testing-library/react"
import * as React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { REACTIVE_CORE } from "../../src/core"
import { useReactiveElement } from "../../src/hooks/use-reactive-element"

describe("useReactiveElement Hook Test Suite", () => {
	beforeEach(() => {
		const activeSignals = REACTIVE_CORE.getActiveSignals()
		for (const id of activeSignals) {
			REACTIVE_CORE.cleanup(id)
		}
	})

	describe("Basic Ref Functionality", () => {
		it("should return a ref object", () => {
			REACTIVE_CORE.createSignal("test-signal", "test value")

			const bindingFn = vi.fn((el: HTMLElement, value: string) => {
				el.textContent = value
			})

			const { result } = renderHook(() => useReactiveElement("test-signal", bindingFn))

			expect(result.current).toHaveProperty("current")
			expect(result.current.current).toBeNull() // Initially null
		})

		it("should bind element when ref is attached", () => {
			REACTIVE_CORE.createSignal("text-content", "Hello World")

			const bindingFn = vi.fn((el: HTMLElement, value: string) => {
				el.textContent = value
			})

			// Test with a component that actually uses the ref
			const TestComponent = () => {
				const ref = useReactiveElement("text-content", bindingFn)
				return React.createElement("div", { ref })
			}

			const { container } = render(React.createElement(TestComponent))
			const element = container.firstChild as HTMLElement

			expect(bindingFn).toHaveBeenCalledWith(element, "Hello World")
			expect(element.textContent).toBe("Hello World")
		})

		it("should not bind when signal does not exist", () => {
			const bindingFn = vi.fn()

			renderHook(() => useReactiveElement("non-existent", bindingFn))

			expect(bindingFn).not.toHaveBeenCalled()
		})

		it("should not bind when element is null", () => {
			REACTIVE_CORE.createSignal("null-element", "value")

			const bindingFn = vi.fn()

			renderHook(() => useReactiveElement("null-element", bindingFn))

			expect(bindingFn).not.toHaveBeenCalled()
		})
	})

	describe("Signal Updates with React Components", () => {
		it("should update element when signal changes", () => {
			REACTIVE_CORE.createSignal("dynamic-text", "Initial Text")

			const bindingFn = vi.fn((el: HTMLElement, value: string) => {
				el.textContent = value
			})

			const TestComponent = () => {
				const ref = useReactiveElement("dynamic-text", bindingFn)
				return React.createElement("div", { ref })
			}

			const { container } = render(React.createElement(TestComponent))
			const element = container.firstChild as HTMLElement

			expect(element.textContent).toBe("Initial Text")
			expect(bindingFn).toHaveBeenCalledTimes(1)

			act(() => {
				REACTIVE_CORE.updateSignal("dynamic-text", "Updated Text")
			})

			expect(bindingFn).toHaveBeenCalledTimes(2)
			expect(element.textContent).toBe("Updated Text")
		})

		it("should handle different data types", () => {
			// Number binding
			REACTIVE_CORE.createSignal("opacity", 0.5)
			const opacityBinding = vi.fn((el: HTMLElement, value: number) => {
				el.style.opacity = value.toString()
			})

			const OpacityComponent = () => {
				const ref = useReactiveElement("opacity", opacityBinding)
				return React.createElement("div", { ref })
			}

			const { container: opacityContainer } = render(React.createElement(OpacityComponent))
			const opacityElement = opacityContainer.firstChild as HTMLElement

			expect(opacityBinding).toHaveBeenCalledWith(opacityElement, 0.5)
			expect(opacityElement.style.opacity).toBe("0.5")

			// Boolean binding
			REACTIVE_CORE.createSignal("is-visible", true)
			const visibilityBinding = vi.fn((el: HTMLElement, value: boolean) => {
				el.style.display = value ? "block" : "none"
			})

			const VisibilityComponent = () => {
				const ref = useReactiveElement("is-visible", visibilityBinding)
				return React.createElement("div", { ref })
			}

			const { container: visibilityContainer } = render(React.createElement(VisibilityComponent))
			const visibilityElement = visibilityContainer.firstChild as HTMLElement

			expect(visibilityBinding).toHaveBeenCalledWith(visibilityElement, true)
			expect(visibilityElement.style.display).toBe("block")
		})
	})

	describe("Integration with Reactive Core", () => {
		it("should work with computed signals", () => {
			REACTIVE_CORE.createSignal("first-name", "John")
			REACTIVE_CORE.createSignal("last-name", "Doe")
			REACTIVE_CORE.createComputed("full-name", ["first-name", "last-name"], (...deps: unknown[]) => {
				const [first, last] = deps as [string, string]
				return `${first} ${last}`
			})

			const bindingFn = vi.fn((el: HTMLElement, value: string) => {
				el.textContent = value
			})

			const TestComponent = () => {
				const ref = useReactiveElement("full-name", bindingFn)
				return React.createElement("div", { ref })
			}

			const { container } = render(React.createElement(TestComponent))
			const element = container.firstChild as HTMLElement

			expect(element.textContent).toBe("John Doe")

			act(() => {
				REACTIVE_CORE.updateSignal("first-name", "Jane")
			})

			expect(element.textContent).toBe("Jane Doe")
		})
	})
})
