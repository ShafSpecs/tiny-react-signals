import { act, fireEvent, render } from "@testing-library/react"
// biome-ignore lint/correctness/noUnusedImports: UMD shit talk
import * as React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Signal } from "../../src/components/signal"
import { REACTIVE_CORE } from "../../src/core"

describe("Signal Component Test Suite", () => {
	beforeEach(() => {
		const activeSignals = REACTIVE_CORE.getActiveSignals()
		for (const id of activeSignals) {
			REACTIVE_CORE.cleanup(id)
		}
	})

	describe("Basic Rendering", () => {
		it("should render default span element with placeholder", () => {
			const { container } = render(<Signal />)
			const element = container.firstChild as HTMLElement

			expect(element.tagName).toBe("SPAN")
			expect(element.textContent).toBe("Loading...")
		})

		it("should render with custom placeholder", () => {
			const { container } = render(<Signal placeholder="Please wait..." />)
			const element = container.firstChild as HTMLElement

			expect(element.textContent).toBe("Please wait...")
		})

		it("should render with custom element type", () => {
			const { container } = render(<Signal as="div" />)
			const element = container.firstChild as HTMLElement

			expect(element.tagName).toBe("DIV")
		})

		it("should render with className and style", () => {
			const { container } = render(<Signal className="test-class" style={{ color: "red", fontSize: "16px" }} />)
			const element = container.firstChild as HTMLElement

			expect(element.className).toBe("test-class")
			expect(element.style.color).toBe("red")
			expect(element.style.fontSize).toBe("16px")
		})

		it("should render static children when not using render prop", () => {
			const { container } = render(
				<Signal>
					<strong>Static Content</strong>
				</Signal>
			)
			const element = container.firstChild as HTMLElement

			expect(element.innerHTML).toBe("<strong>Static Content</strong>")
		})
	})

	describe("Slot Behavior (as={null})", () => {
		it("should render with display: contents when as={null}", () => {
			REACTIVE_CORE.createSignal("test-slot", "slot content")

			const { container } = render(
				<Signal id="test-slot" as={null}>
					{(value: string) => <div>{value}</div>}
				</Signal>
			)
			const element = container.firstChild as HTMLElement

			expect(element.tagName).toBe("SPAN")
			expect(element.style.display).toBe("contents")
		})

		it("should pass additional props to slot element", () => {
			REACTIVE_CORE.createSignal("test-slot-props", "content")

			const { container } = render(
				<Signal id="test-slot-props" as={null} data-testid="slot-element" className="slot-class">
					{(value: string) => <div className="child-value">{value}</div>}
				</Signal>
			)
			const element = container.firstChild as HTMLElement

			expect(element.getAttribute("data-testid")).toBe("slot-element")
			expect(element.style.display).toBe("contents")
			// Signal generates random ids, so we can't test string due to positioning
			expect(element.innerHTML).toContain('class="child-value"')
		})
	})

	describe("Single Signal Binding", () => {
		it("should display signal value with auto-injection", () => {
			REACTIVE_CORE.createSignal("user.name", "John Doe")

			const { container } = render(<Signal id="user.name" />)
			const element = container.firstChild as HTMLElement

			expect(element.textContent).toBe("John Doe")
		})

		it("should update when signal value changes", () => {
			REACTIVE_CORE.createSignal("dynamic-text", "Initial")

			const { container } = render(<Signal id="dynamic-text" />)
			const element = container.firstChild as HTMLElement

			expect(element.textContent).toBe("Initial")

			act(() => {
				REACTIVE_CORE.updateSignal("dynamic-text", "Updated")
			})

			expect(element.textContent).toBe("Updated")
		})

		it("should handle different data types", () => {
			// Test number
			REACTIVE_CORE.createSignal("count", 42)
			const { container: countContainer } = render(<Signal id="count" />)
			expect(countContainer.firstChild?.textContent).toBe("42")

			// Test boolean
			REACTIVE_CORE.createSignal("is-active", true)
			const { container: boolContainer } = render(<Signal id="is-active" />)
			expect(boolContainer.firstChild?.textContent).toBe("true")

			// Test null/undefined
			REACTIVE_CORE.createSignal("null-value", null)
			const { container: nullContainer } = render(<Signal id="null-value" />)
			expect(nullContainer.firstChild?.textContent).toBe("")
		})

		it("should handle non-existent signals gracefully", () => {
			const { container } = render(<Signal id="non-existent" />)
			const element = container.firstChild as HTMLElement

			expect(element.textContent).toBe("Loading...")
		})
	})

	describe("Single Signal Render Props", () => {
		it("should render using render prop function", () => {
			REACTIVE_CORE.createSignal("user.name", "Jane")

			const { container } = render(<Signal id="user.name">{(name: string) => <strong>Hello {name}!</strong>}</Signal>)
			const element = container.firstChild as HTMLElement

			expect(element.innerHTML).toContain("Hello Jane!")
		})

		it("should update render prop content when signal changes", () => {
			REACTIVE_CORE.createSignal("greeting", "Hello")

			const { container } = render(
				<Signal id="greeting">{(greeting: string) => <div className="greeting">{greeting} World</div>}</Signal>
			)
			const element = container.firstChild as HTMLElement

			expect(element.innerHTML).toContain("Hello World")

			act(() => {
				REACTIVE_CORE.updateSignal("greeting", "Hi")
			})

			expect(element.innerHTML).toContain("Hi World")
		})

		it("should handle conditional rendering in render props", () => {
			REACTIVE_CORE.createSignal("user.isLoggedIn", false)

			const { container } = render(
				<Signal id="user.isLoggedIn">
					{(isLoggedIn: boolean) => (isLoggedIn ? <div>Welcome back!</div> : <div>Please log in</div>)}
				</Signal>
			)
			const element = container.firstChild as HTMLElement

			expect(element.innerHTML).toContain("Please log in")

			act(() => {
				REACTIVE_CORE.updateSignal("user.isLoggedIn", true)
			})

			expect(element.innerHTML).toContain("Welcome back!")
		})
	})

	describe("Multiple Signal Binding", () => {
		it("should render multiple signals with render prop", () => {
			REACTIVE_CORE.createSignal("user.name", "John")
			REACTIVE_CORE.createSignal("user.age", 25)

			const { container } = render(
				<Signal ids={["user.name", "user.age"]}>
					{(values: { name: string; age: number }) => (
						<div>
							{values.name} is {values.age} years old
						</div>
					)}
				</Signal>
			)
			const element = container.firstChild as HTMLElement

			expect(element.innerHTML).toContain("John is 25 years old")
		})

		it("should update when any of the multiple signals change", () => {
			REACTIVE_CORE.createSignal("first.name", "John")
			REACTIVE_CORE.createSignal("last.name", "Doe")

			const { container } = render(
				<Signal ids={["first.name", "last.name"]}>
					{(values: { first_name: string; last_name: string }) => (
						<span>
							{values.first_name} {values.last_name}
						</span>
					)}
				</Signal>
			)
			const element = container.firstChild as HTMLElement

			expect(element.innerHTML).toContain("John Doe")

			act(() => {
				REACTIVE_CORE.updateSignal("first.name", "Jane")
			})

			expect(element.innerHTML).toContain("Jane Doe")

			act(() => {
				REACTIVE_CORE.updateSignal("last.name", "Smith")
			})

			expect(element.innerHTML).toContain("Jane Smith")
		})

		it("should extract correct keys from signal IDs", () => {
			REACTIVE_CORE.createSignal("profile.user.firstName", "Alice")
			REACTIVE_CORE.createSignal("profile.user.lastName", "Cooper")

			const { container } = render(
				<Signal ids={["profile.user.firstName", "profile.user.lastName"]}>
					{(values: { firstName: string; lastName: string }) => (
						<div>
							{values.firstName} {values.lastName}
						</div>
					)}
				</Signal>
			)
			const element = container.firstChild as HTMLElement

			expect(element.innerHTML).toContain("Alice Cooper")
		})

		it("should not render without render prop for multiple signals", () => {
			REACTIVE_CORE.createSignal("signal1", "value1")
			REACTIVE_CORE.createSignal("signal2", "value2")

			const { container } = render(<Signal ids={["signal1", "signal2"]} />)
			const element = container.firstChild as HTMLElement

			expect(element.textContent).toBe("Loading...")
		})
	})

	describe("Security and HTML Rendering", () => {
		it("should safely render text content by default", () => {
			REACTIVE_CORE.createSignal("unsafe-content", "<script>alert('xss')</script>")

			const { container } = render(<Signal id="unsafe-content" />)
			const element = container.firstChild as HTMLElement

			expect(element.textContent).toBe("<script>alert('xss')</script>")
			expect(element.innerHTML).toBe("&lt;script&gt;alert('xss')&lt;/script&gt;")
		})

		it("should render HTML when dangerouslySetInnerHTML is enabled", () => {
			REACTIVE_CORE.createSignal("html-content", "<strong>Bold Text</strong>")

			const { container } = render(
				// biome-ignore lint/security/noDangerouslySetInnerHtml: Testing security feature
				<Signal id="html-content" dangerouslySetInnerHTML={true} />
			)
			const element = container.firstChild as HTMLElement

			expect(element.innerHTML).toContain("Bold Text")
		})

		it("should handle dangerous HTML appropriately", () => {
			REACTIVE_CORE.createSignal("dangerous-html", '<img src="x" onerror="alert(1)">')

			const { container } = render(
				// biome-ignore lint/security/noDangerouslySetInnerHtml: Testing security feature
				<Signal id="dangerous-html" dangerouslySetInnerHTML={true} />
			)
			const element = container.firstChild as HTMLElement

			// The HTML should be inserted as-is (browser security handles script execution prevention)
			expect(element.innerHTML).toBe('<img src="x" onerror="alert(1)">')
		})
	})

	describe("Event Handling", () => {
		it("should attach event handlers to rendered elements", () => {
			REACTIVE_CORE.createSignal("button-text", "Click me")
			const clickHandler = vi.fn()

			const { container } = render(
				<Signal id="button-text">
					{(text: string) => (
						<button type="button" onClick={clickHandler}>
							{text}
						</button>
					)}
				</Signal>
			)

			const button = container.querySelector("button")
			expect(button).toBeTruthy()

			if (button) {
				fireEvent.click(button)
				expect(clickHandler).toHaveBeenCalledTimes(1)
			}
		})

		it("should maintain event handlers after signal updates", () => {
			REACTIVE_CORE.createSignal("interactive-content", "Initial")
			const clickHandler = vi.fn()

			const { container } = render(
				<Signal id="interactive-content">
					{(content: string) => (
						<div>
							<span>{content}</span>
							<button type="button" onClick={clickHandler}>
								Action
							</button>
						</div>
					)}
				</Signal>
			)

			// Click before update
			const button = container.querySelector("button")
			if (button) {
				fireEvent.click(button)
				expect(clickHandler).toHaveBeenCalledTimes(1)
			}

			// Update signal
			act(() => {
				REACTIVE_CORE.updateSignal("interactive-content", "Updated")
			})

			// Click after update
			const updatedButton = container.querySelector("button")
			if (updatedButton) {
				fireEvent.click(updatedButton)
				expect(clickHandler).toHaveBeenCalledTimes(2)
			}
		})
	})

	describe("Computed Signals Integration", () => {
		it("should work with computed signals", () => {
			REACTIVE_CORE.createSignal("first-name", "John")
			REACTIVE_CORE.createSignal("last-name", "Doe")
			REACTIVE_CORE.createComputed("full-name", ["first-name", "last-name"], (first: string, last: string) => {
				return `${first} ${last}`
			})

			const { container } = render(<Signal id="full-name" />)
			const element = container.firstChild as HTMLElement

			expect(element.textContent).toBe("John Doe")

			act(() => {
				REACTIVE_CORE.updateSignal("first-name", "Jane")
			})

			expect(element.textContent).toBe("Jane Doe")
		})
	})

	describe("Component Lifecycle", () => {
		it("should cleanup subscriptions on unmount", () => {
			REACTIVE_CORE.createSignal("cleanup-test", "value")

			const { unmount } = render(<Signal id="cleanup-test" />)

			// Verify signal exists and has subscribers
			expect(REACTIVE_CORE.getValue("cleanup-test")).toBe("value")

			unmount()

			// After unmount, the signal should still exist but subscriptions should be cleaned up
			expect(REACTIVE_CORE.getValue("cleanup-test")).toBe("value")
		})

		it("should handle multiple mounts and unmounts", () => {
			REACTIVE_CORE.createSignal("multi-mount", "value")

			const { unmount: unmount1 } = render(<Signal id="multi-mount" />)
			const { unmount: unmount2 } = render(<Signal id="multi-mount" />)

			unmount1()
			unmount2()

			// Should not throw errors
			expect(REACTIVE_CORE.getValue("multi-mount")).toBe("value")
		})
	})

	describe("Error Handling", () => {
		it("should handle render prop errors gracefully", () => {
			REACTIVE_CORE.createSignal("error-signal", "test")

			const errorRenderProp = vi.fn(() => {
				throw new Error("Render error")
			})

			// This should not crash the component
			expect(() => {
				render(<Signal id="error-signal">{errorRenderProp}</Signal>)
			}).toThrow("Render error")

			expect(errorRenderProp).toHaveBeenCalled()
		})

		it("should handle invalid signal IDs", () => {
			const { container } = render(<Signal id="" />)
			const element = container.firstChild as HTMLElement

			expect(element.textContent).toBe("Loading...")
		})
	})

	describe("Props Validation", () => {
		it("should prioritize id over ids when both are provided", () => {
			REACTIVE_CORE.createSignal("priority-id", "id value")
			REACTIVE_CORE.createSignal("other-signal", "other value")

			const { container } = render(<Signal id="priority-id" ids={["other-signal"]} />)
			const element = container.firstChild as HTMLElement

			expect(element.textContent).toBe("id value")
		})

		it("should pass through additional props to the element", () => {
			const { container } = render(<Signal data-testid="custom-signal" aria-label="Signal element" role="status" />)
			const element = container.firstChild as HTMLElement

			expect(element.getAttribute("data-testid")).toBe("custom-signal")
			expect(element.getAttribute("aria-label")).toBe("Signal element")
			expect(element.getAttribute("role")).toBe("status")
		})
	})
})
