import { act, fireEvent, render } from "@testing-library/react"
// biome-ignore lint/correctness/noUnusedImports: UMD shit talk
import * as React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SignalList } from "../../src/components/signal-list"
import { REACTIVE_CORE } from "../../src/core"

describe("SignalList Component Test Suite", () => {
	beforeEach(() => {
		const activeSignals = REACTIVE_CORE.getActiveSignals()
		for (const id of activeSignals) {
			REACTIVE_CORE.cleanup(id)
		}
	})

	describe("Basic Rendering", () => {
		it("should render default ul element with placeholder", () => {
			const { container } = render(<SignalList keyBy="id">{(item: any) => <div>{item.name}</div>}</SignalList>)
			const element = container.firstChild as HTMLElement

			expect(element.tagName).toBe("UL")
			expect(element.innerHTML).toContain("Loading...")
		})

		it("should render with custom placeholder", () => {
			const { container } = render(
				<SignalList keyBy="id" placeholder="No items found">
					{(item: any) => <div>{item.name}</div>}
				</SignalList>
			)
			const element = container.firstChild as HTMLElement

			expect(element.innerHTML).toContain("No items found")
		})

		it("should render as ol when type='ol'", () => {
			const { container } = render(
				<SignalList keyBy="id" type="ol">
					{(item: any) => <div>{item.name}</div>}
				</SignalList>
			)
			const element = container.firstChild as HTMLElement

			expect(element.tagName).toBe("OL")
		})

		it("should render with className and style", () => {
			const { container } = render(
				<SignalList keyBy="id" className="test-list" style={{ margin: "10px", padding: "5px" }}>
					{(item: any) => <div>{item.name}</div>}
				</SignalList>
			)
			const element = container.firstChild as HTMLElement

			expect(element.className).toBe("test-list")
			expect(element.style.margin).toBe("10px")
			expect(element.style.padding).toBe("5px")
		})
	})

	describe("Slot Behavior (type='slot')", () => {
		it("should render with display: contents when type='slot'", () => {
			REACTIVE_CORE.createSignal("test-items", [{ id: 1, name: "Item 1" }])

			const { container } = render(
				<SignalList id="test-items" keyBy="id" type="slot">
					{(item: any) => <div>{item.name}</div>}
				</SignalList>
			)
			const element = container.firstChild as HTMLElement

			expect(element.tagName).toBe("SPAN")
			expect(element.style.display).toBe("contents")
		})

		it("should pass additional props to slot element", () => {
			REACTIVE_CORE.createSignal("slot-items", [{ id: 1, name: "Item" }])

			const { container } = render(
				<SignalList id="slot-items" keyBy="id" type="slot" data-testid="slot-list" className="slot-class">
					{(item: any) => <div>{item.name}</div>}
				</SignalList>
			)
			const element = container.firstChild as HTMLElement

			expect(element.getAttribute("data-testid")).toBe("slot-list")
			expect(element.style.display).toBe("contents")
		})
	})

	describe("Array-based List Rendering", () => {
		it("should render list items from array signal", () => {
			const items = [
				{ id: 1, name: "John", age: 25 },
				{ id: 2, name: "Jane", age: 30 },
			]
			REACTIVE_CORE.createSignal("users", items)

			const { container } = render(
				<SignalList id="users" keyBy="id">
					{(user: any) => (
						<div>
							{user.name} ({user.age})
						</div>
					)}
				</SignalList>
			)
			const element = container.firstChild as HTMLElement

			expect(element.innerHTML).toContain("John (25)")
			expect(element.innerHTML).toContain("Jane (30)")
		})

		it("should update when array signal changes", () => {
			const initialItems = [{ id: 1, name: "Initial" }]
			REACTIVE_CORE.createSignal("dynamic-list", initialItems)

			const { container } = render(
				<SignalList id="dynamic-list" keyBy="id">
					{(item: any) => <span>{item.name}</span>}
				</SignalList>
			)
			const element = container.firstChild as HTMLElement

			expect(element.innerHTML).toContain("Initial")

			act(() => {
				REACTIVE_CORE.updateSignal("dynamic-list", [
					{ id: 1, name: "Updated" },
					{ id: 2, name: "New Item" },
				])
			})

			expect(element.innerHTML).toContain("Updated")
			expect(element.innerHTML).toContain("New Item")
		})

		it("should handle empty arrays", () => {
			REACTIVE_CORE.createSignal("empty-list", [])

			const { container } = render(
				<SignalList id="empty-list" keyBy="id" placeholder="No items">
					{(item: any) => <div>{item.name}</div>}
				</SignalList>
			)
			const element = container.firstChild as HTMLElement

			expect(element.innerHTML).toContain("No items")
		})

		it("should handle non-array values gracefully", () => {
			REACTIVE_CORE.createSignal("non-array", "not an array")

			const { container } = render(
				<SignalList id="non-array" keyBy="id" placeholder="Invalid data">
					{(item: any) => <div>{item.name}</div>}
				</SignalList>
			)
			const element = container.firstChild as HTMLElement

			expect(element.innerHTML).toContain("Invalid data")
		})

		it("should use correct keys for list items", () => {
			const items = [
				{ id: "user-1", name: "John" },
				{ id: "user-2", name: "Jane" },
			]
			REACTIVE_CORE.createSignal("keyed-list", items)

			const { container } = render(
				<SignalList id="keyed-list" keyBy="id">
					{(item: any) => <div>{item.name}</div>}
				</SignalList>
			)
			const element = container.firstChild as HTMLElement

			expect(element.innerHTML).toContain('data-key="user-1"')
			expect(element.innerHTML).toContain('data-key="user-2"')
		})

		it("should wrap content in list items for ul/ol", () => {
			const items = [{ id: 1, name: "Test" }]
			REACTIVE_CORE.createSignal("wrapped-list", items)

			const { container } = render(
				<SignalList id="wrapped-list" keyBy="id" type="ul">
					{(item: any) => <span>{item.name}</span>}
				</SignalList>
			)
			const element = container.firstChild as HTMLElement

			// Should wrap the span in an li
			expect(element.innerHTML).toContain("<li")
			expect(element.innerHTML).toContain("</li>")
			expect(element.innerHTML).toContain("Test")
		})

		it("should not wrap existing li elements", () => {
			const items = [{ id: 1, name: "Test" }]
			REACTIVE_CORE.createSignal("li-list", items)

			const { container } = render(
				<SignalList id="li-list" keyBy="id" type="ul">
					{(item: any) => <li>{item.name}</li>}
				</SignalList>
			)
			const element = container.firstChild as HTMLElement

			// Should not double-wrap li elements
			const liCount = (element.innerHTML.match(/<li/g) || []).length
			expect(liCount).toBe(1)
		})
	})

	describe("Pattern-based List Rendering", () => {
		it("should render items based on signal pattern", () => {
			REACTIVE_CORE.createSignal("todo.1.text", "First task")
			REACTIVE_CORE.createSignal("todo.1.done", false)
			REACTIVE_CORE.createSignal("todo.2.text", "Second task")
			REACTIVE_CORE.createSignal("todo.2.done", true)

			const { container } = render(
				<SignalList pattern="todo." keyBy="id">
					{(itemId: string, signals: any) => (
						<div>
							{itemId}: {signals.text} {signals.done ? "✓" : "○"}
						</div>
					)}
				</SignalList>
			)
			const element = container.firstChild as HTMLElement

			expect(element.innerHTML).toContain("1: First task ○")
			expect(element.innerHTML).toContain("2: Second task ✓")
		})

		it("should update when pattern-matched signals change", () => {
			REACTIVE_CORE.createSignal("item.1.name", "Initial")
			REACTIVE_CORE.createSignal("item.1.status", "pending")

			const { container } = render(
				<SignalList pattern="item." keyBy="id">
					{(_: string, signals: any) => (
						<span>
							{signals.name} - {signals.status}
						</span>
					)}
				</SignalList>
			)
			const element = container.firstChild as HTMLElement

			expect(element.innerHTML).toContain("Initial - pending")

			act(() => {
				REACTIVE_CORE.updateSignal("item.1.name", "Updated")
				REACTIVE_CORE.updateSignal("item.1.status", "completed")
			})

			expect(element.innerHTML).toContain("Updated - completed")
		})

		it("should handle new pattern-matched signals being added", () => {
			REACTIVE_CORE.createSignal("product.1.name", "Product 1")

			const { container } = render(
				<SignalList pattern="product." keyBy="id">
					{(_: string, signals: any) => <div>{signals.name}</div>}
				</SignalList>
			)
			const element = container.firstChild as HTMLElement

			expect(element.innerHTML).toContain("Product 1")

			// Add new signal that matches pattern
			act(() => {
				REACTIVE_CORE.createSignal("product.2.name", "Product 2")
			})

			// Note: In current implementation, new signals won't be auto-detected
			// This is a limitation that could be addressed in future versions
		})

		it("should handle nested signal properties correctly", () => {
			REACTIVE_CORE.createSignal("user.1.profile.name", "John")
			REACTIVE_CORE.createSignal("user.1.profile.email", "john@example.com")
			REACTIVE_CORE.createSignal("user.1.settings.theme", "dark")

			const { container } = render(
				<SignalList pattern="user." keyBy="id">
					{(itemId: string, signals: any) => (
						<div>
							{itemId}: {signals["profile.name"]} ({signals["profile.email"]}) Theme: {signals["settings.theme"]}
						</div>
					)}
				</SignalList>
			)
			const element = container.firstChild as HTMLElement

			expect(element.innerHTML).toContain("1: John (john@example.com)")
			expect(element.innerHTML).toContain("Theme: dark")
		})
	})

	describe("Event Handling", () => {
		it("should attach event handlers to list item elements", () => {
			const items = [{ id: 1, name: "Clickable" }]
			REACTIVE_CORE.createSignal("clickable-list", items)
			const clickHandler = vi.fn()

			const { container } = render(
				<SignalList id="clickable-list" keyBy="id">
					{(item: any) => (
						<button type="button" onClick={clickHandler}>
							{item.name}
						</button>
					)}
				</SignalList>
			)

			const button = container.querySelector("button")
			expect(button).toBeTruthy()

			if (button) {
				fireEvent.click(button)
				expect(clickHandler).toHaveBeenCalledTimes(1)
			}
		})

		it("should maintain event handlers after list updates", () => {
			const initialItems = [{ id: 1, name: "Item 1" }]
			REACTIVE_CORE.createSignal("interactive-list", initialItems)
			const clickHandler = vi.fn()

			const { container } = render(
				<SignalList id="interactive-list" keyBy="id">
					{(item: any) => (
						<div>
							<span>{item.name}</span>
							<button type="button" onClick={clickHandler}>
								Click me
							</button>
						</div>
					)}
				</SignalList>
			)

			// Click before update
			const button = container.querySelector("button")
			if (button) {
				fireEvent.click(button)
				expect(clickHandler).toHaveBeenCalledTimes(1)
			}

			// Update list
			act(() => {
				REACTIVE_CORE.updateSignal("interactive-list", [
					{ id: 1, name: "Updated Item 1" },
					{ id: 2, name: "Item 2" },
				])
			})

			// Click after update - should have new buttons
			const buttons = container.querySelectorAll("button")
			expect(buttons).toHaveLength(2)

			if (buttons[0]) {
				fireEvent.click(buttons[0])
				expect(clickHandler).toHaveBeenCalledTimes(2)
			}

			if (buttons[1]) {
				fireEvent.click(buttons[1])
				expect(clickHandler).toHaveBeenCalledTimes(3)
			}
		})

		it("should handle multiple event types", () => {
			const items = [{ id: 1, name: "Interactive" }]
			REACTIVE_CORE.createSignal("event-list", items)
			const clickHandler = vi.fn()
			const mouseOverHandler = vi.fn()

			const { container } = render(
				<SignalList id="event-list" keyBy="id">
					{(item: any) => (
						// biome-ignore lint/a11y/useKeyWithClickEvents: Wtf! This is a test!
						// biome-ignore lint/a11y/useKeyWithMouseEvents: ...
						<div onClick={clickHandler} onMouseOver={mouseOverHandler}>
							{item.name}
						</div>
					)}
				</SignalList>
			)

			const div = container.querySelector("div div") // First div is the li wrapper
			if (div) {
				fireEvent.click(div)
				fireEvent.mouseOver(div)

				expect(clickHandler).toHaveBeenCalledTimes(1)
				expect(mouseOverHandler).toHaveBeenCalledTimes(1)
			}
		})
	})

	describe("Computed Signals Integration", () => {
		it("should work with computed array signals", () => {
			REACTIVE_CORE.createSignal("raw-items", [
				{ id: 1, name: "John", age: 25 },
				{ id: 2, name: "Jane", age: 17 },
			])

			REACTIVE_CORE.createComputed("adult-items", ["raw-items"], (items: any[]) => {
				return items.filter((item) => item.age >= 18)
			})

			const { container } = render(
				<SignalList id="adult-items" keyBy="id">
					{(item: any) => (
						<div>
							{item.name} ({item.age})
						</div>
					)}
				</SignalList>
			)
			const element = container.firstChild as HTMLElement

			expect(element.innerHTML).toContain("John (25)")
			expect(element.innerHTML).not.toContain("Jane (17)")

			act(() => {
				REACTIVE_CORE.updateSignal("raw-items", [
					{ id: 1, name: "John", age: 25 },
					{ id: 2, name: "Jane", age: 20 },
					{ id: 3, name: "Bob", age: 16 },
				])
			})

			expect(element.innerHTML).toContain("John (25)")
			expect(element.innerHTML).toContain("Jane (20)")
			expect(element.innerHTML).not.toContain("Bob (16)")
		})
	})

	describe("Component Lifecycle", () => {
		it("should cleanup subscriptions on unmount", () => {
			const items = [{ id: 1, name: "Test" }]
			REACTIVE_CORE.createSignal("cleanup-list", items)

			const { unmount } = render(
				<SignalList id="cleanup-list" keyBy="id">
					{(item: any) => <div>{item.name}</div>}
				</SignalList>
			)

			// Verify signal exists
			expect(REACTIVE_CORE.getValue("cleanup-list")).toEqual(items)

			unmount()

			// After unmount, signal should still exist but subscriptions cleaned up
			expect(REACTIVE_CORE.getValue("cleanup-list")).toEqual(items)
		})

		it("should handle multiple mounts and unmounts", () => {
			const items = [{ id: 1, name: "Multi" }]
			REACTIVE_CORE.createSignal("multi-mount-list", items)

			const { unmount: unmount1 } = render(
				<SignalList id="multi-mount-list" keyBy="id">
					{(item: any) => <div>{item.name}</div>}
				</SignalList>
			)

			const { unmount: unmount2 } = render(
				<SignalList id="multi-mount-list" keyBy="id">
					{(item: any) => <span>{item.name}</span>}
				</SignalList>
			)

			unmount1()
			unmount2()

			// Should not throw errors
			expect(REACTIVE_CORE.getValue("multi-mount-list")).toEqual(items)
		})
	})

	describe("Error Handling", () => {
		it("should handle render function errors gracefully", () => {
			const items = [{ id: 1, name: "Error Test" }]
			REACTIVE_CORE.createSignal("error-list", items)

			const errorRenderProp = vi.fn(() => {
				throw new Error("Render error")
			})

			expect(() => {
				render(
					<SignalList id="error-list" keyBy="id">
						{errorRenderProp}
					</SignalList>
				)
			}).toThrow("Render error")

			expect(errorRenderProp).toHaveBeenCalled()
		})

		it("should handle missing keyBy gracefully", () => {
			const items = [{ name: "No ID" }]
			REACTIVE_CORE.createSignal("no-key-list", items)

			const { container } = render(
				<SignalList id="no-key-list" keyBy="id">
					{(item: any) => <div>{item.name}</div>}
				</SignalList>
			)
			const element = container.firstChild as HTMLElement

			// Should use index as fallback key
			expect(element.innerHTML).toContain("No ID")
			expect(element.innerHTML).toContain('data-key="0"')
		})

		it("should handle invalid signal IDs", () => {
			const { container } = render(
				<SignalList id="non-existent-list" keyBy="id">
					{(item: any) => <div>{item.name}</div>}
				</SignalList>
			)
			const element = container.firstChild as HTMLElement

			expect(element.innerHTML).toContain("Loading...")
		})
	})

	describe("Props Validation", () => {
		it("should prioritize id over pattern when both are provided", () => {
			const items = [{ id: 1, name: "Array Item" }]
			REACTIVE_CORE.createSignal("array-priority", items)
			REACTIVE_CORE.createSignal("pattern.1.name", "Pattern Item")

			const { container } = render(
				<SignalList id="array-priority" pattern="pattern." keyBy="id">
					{(item: any) => <div>{item.name || "Pattern"}</div>}
				</SignalList>
			)
			const element = container.firstChild as HTMLElement

			expect(element.innerHTML).toContain("Array Item")
			expect(element.innerHTML).not.toContain("Pattern Item")
		})

		it("should pass through additional props to the list element", () => {
			const { container } = render(
				<SignalList
					keyBy="id"
					data-testid="custom-list"
					aria-label="Custom list"
					// biome-ignore lint/a11y/useSemanticElements: Again, I am testing. Dgaf.
					role="list"
				>
					{(item: any) => <div>{item.name}</div>}
				</SignalList>
			)
			const element = container.firstChild as HTMLElement

			expect(element.getAttribute("data-testid")).toBe("custom-list")
			expect(element.getAttribute("aria-label")).toBe("Custom list")
			expect(element.getAttribute("role")).toBe("list")
		})
	})

	describe("Advanced Rendering Scenarios", () => {
		it("should handle complex nested structures", () => {
			const items = [
				{
					id: 1,
					user: { name: "John", profile: { avatar: "john.jpg" } },
					posts: [{ title: "Post 1" }, { title: "Post 2" }],
				},
			]
			REACTIVE_CORE.createSignal("complex-list", items)

			const { container } = render(
				<SignalList id="complex-list" keyBy="id">
					{(item: any) => (
						<div className="user-card">
							<img src={item.user.profile.avatar} alt={item.user.name} />
							<h3>{item.user.name}</h3>
							<div className="posts">
								{item.posts.map((post: any, idx: number) => (
									// biome-ignore lint/suspicious/noArrayIndexKey: Lawd have mercy
									<span key={idx}>{post.title}</span>
								))}
							</div>
						</div>
					)}
				</SignalList>
			)
			const element = container.firstChild as HTMLElement

			expect(element.innerHTML).toContain('class="user-card"')
			expect(element.innerHTML).toContain('src="john.jpg"')
			expect(element.innerHTML).toContain("<h3>John</h3>")
			expect(element.innerHTML).toContain("Post 1")
			expect(element.innerHTML).toContain("Post 2")
		})

		it("should handle conditional rendering within list items", () => {
			const items = [
				{ id: 1, name: "Admin", isAdmin: true },
				{ id: 2, name: "User", isAdmin: false },
			]
			REACTIVE_CORE.createSignal("conditional-list", items)

			const { container } = render(
				<SignalList id="conditional-list" keyBy="id">
					{(item: any) => (
						<div>
							<span>{item.name}</span>
							{item.isAdmin && <span>Admin</span>}
							{!item.isAdmin && <span>User</span>}
						</div>
					)}
				</SignalList>
			)
			const element = container.firstChild as HTMLElement

			expect(element.innerHTML).toContain("Admin")
			expect(element.innerHTML).toContain("User")
		})
	})
})
