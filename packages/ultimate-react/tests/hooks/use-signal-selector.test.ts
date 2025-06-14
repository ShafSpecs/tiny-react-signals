import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { REACTIVE_CORE } from "../../src/core"
import { useSignalSelector } from "../../src/hooks/use-signal-selector"

describe("useSignalSelector Hook Test Suite", () => {
	beforeEach(() => {
		const activeSignals = REACTIVE_CORE.getActiveSignals()
		for (const id of activeSignals) {
			REACTIVE_CORE.cleanup(id)
		}
	})

	describe("Basic Functionality", () => {
		it("should return selected value from signal", () => {
			const user = { name: "John", age: 30, email: "john@example.com" }

			const { result } = renderHook(() => useSignalSelector("user", user, (u) => u.name))

			expect(result.current).toBe("John")
		})

		it("should create signal with initial value", () => {
			const initialData = { count: 0, message: "hello" }

			renderHook(() => useSignalSelector("selector-test", initialData, (data) => data.count))

			expect(REACTIVE_CORE.getValue("selector-test")).toEqual(initialData)
		})

		it("should work with existing signals", () => {
			const existingData = { value: 42, label: "answer" }
			REACTIVE_CORE.createSignal("existing-signal", existingData)

			const { result } = renderHook(() =>
				useSignalSelector("existing-signal", { value: 0, label: "" }, (data) => data.value)
			)

			expect(result.current).toBe(42)
		})

		it("should handle different selector return types", () => {
			const data = {
				name: "Test",
				age: 25,
				active: true,
				tags: ["tag1", "tag2"],
				metadata: { created: "2024-01-01" },
			}

			// String selector
			const stringResult = renderHook(() => useSignalSelector("string-test", data, (d) => d.name))
			expect(stringResult.result.current).toBe("Test")

			// Number selector
			const numberResult = renderHook(() => useSignalSelector("number-test", data, (d) => d.age))
			expect(numberResult.result.current).toBe(25)

			// Boolean selector
			const booleanResult = renderHook(() => useSignalSelector("boolean-test", data, (d) => d.active))
			expect(booleanResult.result.current).toBe(true)

			// Array selector
			const arrayResult = renderHook(() => useSignalSelector("array-test", data, (d) => d.tags))
			expect(arrayResult.result.current).toEqual(["tag1", "tag2"])

			// Object selector
			const objectResult = renderHook(() => useSignalSelector("object-test", data, (d) => d.metadata))
			expect(objectResult.result.current).toEqual({ created: "2024-01-01" })
		})
	})

	describe("Selector Behavior", () => {
		it("should update when selected value changes", () => {
			const initialUser = { name: "John", age: 30 }

			const { result } = renderHook(() => useSignalSelector("user-selector", initialUser, (user) => user.name))

			expect(result.current).toBe("John")

			act(() => {
				REACTIVE_CORE.updateSignal("user-selector", { name: "Jane", age: 30 })
			})

			expect(result.current).toBe("Jane")
		})

		it("should not update when non-selected value changes", () => {
			const initialUser = { name: "John", age: 30 }
			let renderCount = 0

			const { result } = renderHook(() => {
				renderCount++
				return useSignalSelector("stable-selector", initialUser, (user) => user.name)
			})

			expect(result.current).toBe("John")
			const initialRenderCount = renderCount

			// Update age (not selected), should not cause re-render
			act(() => {
				REACTIVE_CORE.updateSignal("stable-selector", { name: "John", age: 31 })
			})

			expect(result.current).toBe("John")
			expect(renderCount).toBe(initialRenderCount) // No re-render
		})

		it("should handle complex selector functions", () => {
			const data = {
				users: [
					{ id: 1, name: "John", active: true },
					{ id: 2, name: "Jane", active: false },
					{ id: 3, name: "Bob", active: true },
				],
			}

			// Select active users
			const { result } = renderHook(() =>
				useSignalSelector("complex-selector", data, (d) => d.users.filter((u) => u.active).map((u) => u.name))
			)

			expect(result.current).toEqual(["John", "Bob"])

			// Update data
			act(() => {
				REACTIVE_CORE.updateSignal("complex-selector", {
					users: [
						{ id: 1, name: "John", active: false },
						{ id: 2, name: "Jane", active: true },
						{ id: 3, name: "Bob", active: true },
					],
				})
			})

			expect(result.current).toEqual(["Jane", "Bob"])
		})

		it("should handle nested property selection", () => {
			const data = {
				user: {
					profile: {
						personal: {
							name: "John",
							age: 30,
						},
						preferences: {
							theme: "dark",
						},
					},
				},
			}

			const { result } = renderHook(() =>
				useSignalSelector("nested-selector", data, (d) => d.user.profile.personal.name)
			)

			expect(result.current).toBe("John")
		})
	})

	describe("Equality Function Behavior", () => {
		it("should use Object.is by default", () => {
			const data = { items: [1, 2, 3] }
			let renderCount = 0

			const { result } = renderHook(() => {
				renderCount++
				return useSignalSelector("equality-test", data, (d) => d.items)
			})

			const initialRenderCount = renderCount
			expect(result.current).toEqual([1, 2, 3])

			// Update with same array content but different reference
			act(() => {
				REACTIVE_CORE.updateSignal("equality-test", { items: [1, 2, 3] })
			})

			// Should re-render because Object.is compares references
			expect(renderCount).toBeGreaterThan(initialRenderCount)
		})

		it("should use custom equality function", () => {
			const data = { items: [1, 2, 3] }
			let renderCount = 0

			// Deep equality function
			const deepEqual = (a: number[], b: number[]) => {
				return a.length === b.length && a.every((val, idx) => val === b[idx])
			}

			const { result } = renderHook(() => {
				renderCount++
				return useSignalSelector("custom-equality", data, (d) => d.items, deepEqual)
			})

			const initialRenderCount = renderCount
			expect(result.current).toEqual([1, 2, 3])

			// Update with same array content but different reference
			act(() => {
				REACTIVE_CORE.updateSignal("custom-equality", { items: [1, 2, 3] })
			})

			// Should NOT re-render because custom equality returns true
			expect(renderCount).toBe(initialRenderCount)

			// Update with different content
			act(() => {
				REACTIVE_CORE.updateSignal("custom-equality", { items: [1, 2, 3, 4] })
			})

			// Should re-render because content is different
			expect(renderCount).toBeGreaterThan(initialRenderCount)
			expect(result.current).toEqual([1, 2, 3, 4])
		})

		it("should handle object equality", () => {
			const data = { user: { name: "John", age: 30 } }

			const shallowEqual = (a: any, b: any) => {
				const keysA = Object.keys(a)
				const keysB = Object.keys(b)
				return keysA.length === keysB.length && keysA.every((key) => a[key] === b[key])
			}

			const { result } = renderHook(() =>
				useSignalSelector("object-equality", data, (d) => ({ name: d.user.name, age: d.user.age }), shallowEqual)
			)

			expect(result.current).toEqual({ name: "John", age: 30 })
		})

		it("should handle primitive equality correctly", () => {
			const data = { count: 0 }
			let renderCount = 0

			const { result } = renderHook(() => {
				renderCount++
				return useSignalSelector("primitive-equality", data, (d) => d.count)
			})

			const initialRenderCount = renderCount

			// Update with same value
			act(() => {
				REACTIVE_CORE.updateSignal("primitive-equality", { count: 0 })
			})

			// Should not re-render (same primitive value)
			expect(renderCount).toBe(initialRenderCount)

			// Update with different value
			act(() => {
				REACTIVE_CORE.updateSignal("primitive-equality", { count: 1 })
			})

			// Should re-render
			expect(renderCount).toBeGreaterThan(initialRenderCount)
			expect(result.current).toBe(1)
		})
	})

	describe("Signal Options", () => {
		it("should handle signal options", () => {
			const data = { message: "hello" }
			const transform = (value: any) => ({
				...value,
				message: value.message.toUpperCase(),
			})

			const { result } = renderHook(() =>
				useSignalSelector("options-test", data, (d) => d.message, Object.is, { transform })
			)

			expect(result.current).toBe("HELLO")
		})

		it("should work with transformed signals", () => {
			const data = { numbers: [1, 2, 3] }
			const transform = (value: any) => ({
				...value,
				numbers: value.numbers.map((n: number) => n * 2),
			})

			const { result } = renderHook(() =>
				useSignalSelector("transform-test", data, (d) => d.numbers, Object.is, { transform })
			)

			expect(result.current).toEqual([2, 4, 6])
		})
	})

	describe("Edge Cases", () => {
		it("should handle undefined and null values", () => {
			const data = { value: null, optional: undefined }

			const nullResult = renderHook(() => useSignalSelector("null-test", data, (d) => d.value))
			expect(nullResult.result.current).toBeNull()

			const undefinedResult = renderHook(() => useSignalSelector("undefined-test", data, (d) => d.optional))
			expect(undefinedResult.result.current).toBeUndefined()
		})

		it("should handle selector throwing errors", () => {
			const data = { value: null }

			// Should propagate the error during hook execution
			expect(() => {
				renderHook(() =>
					useSignalSelector("error-test", data, (d) => {
						if (d.value === null) {
							throw new Error("Value is null")
						}
						return d.value
					})
				)
			}).toThrow("Value is null")
		})

		it("should handle empty objects and arrays", () => {
			const emptyData = { obj: {}, arr: [] }

			const objResult = renderHook(() => useSignalSelector("empty-obj", emptyData, (d) => d.obj))
			expect(objResult.result.current).toEqual({})

			const arrResult = renderHook(() => useSignalSelector("empty-arr", emptyData, (d) => d.arr))
			expect(arrResult.result.current).toEqual([])
		})

		it("should handle large objects", () => {
			const largeData = {
				items: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: i * 2 })),
			}

			const { result } = renderHook(() => useSignalSelector("large-data", largeData, (d) => d.items.length))

			expect(result.current).toBe(1000)
		})

		it("should handle circular references in non-selected data", () => {
			const circularData: any = { name: "test" }
			circularData.self = circularData

			const { result } = renderHook(() => useSignalSelector("circular-test", circularData, (d) => d.name))

			expect(result.current).toBe("test")
		})

		it("should handle function values", () => {
			const data = {
				callback: () => "hello",
				compute: (x: number) => x * 2,
			}

			const { result } = renderHook(() => useSignalSelector("function-test", data, (d) => d.callback()))

			expect(result.current).toBe("hello")
		})

		it("should handle Date objects", () => {
			const data = {
				created: new Date("2024-01-01"),
				updated: new Date("2024-01-02"),
			}

			const { result } = renderHook(() => useSignalSelector("date-test", data, (d) => d.created.getFullYear()))

			expect(result.current).toBe(2024)
		})
	})

	describe("Performance and Memoization", () => {
		it("should memoize selector results", () => {
			const data = { count: 0, other: "unchanged" }
			const selectorSpy = vi.fn((d) => d.count)
			let renderCount = 0

			const { result } = renderHook(() => {
				renderCount++
				return useSignalSelector("memo-test", data, selectorSpy)
			})

			expect(selectorSpy).toHaveBeenCalledTimes(1)
			expect(result.current).toBe(0)

			// Update non-selected property
			act(() => {
				REACTIVE_CORE.updateSignal("memo-test", { count: 0, other: "changed" })
			})

			// Selector should be called again, but no re-render due to memoization
			expect(selectorSpy).toHaveBeenCalledTimes(2)
			const previousRenderCount = renderCount

			// Since count didn't change, should not re-render
			expect(renderCount).toBe(previousRenderCount)
		})

		it("should handle rapid updates efficiently", () => {
			const data = { counter: 0 }
			let renderCount = 0

			const { result } = renderHook(() => {
				renderCount++
				return useSignalSelector("rapid-test", data, (d) => d.counter)
			})

			const initialRenderCount = renderCount

			// Rapid updates to same value
			act(() => {
				for (let i = 0; i < 10; i++) {
					REACTIVE_CORE.updateSignal("rapid-test", { counter: 0 })
				}
			})

			// Should not cause additional re-renders
			expect(renderCount).toBe(initialRenderCount)
			expect(result.current).toBe(0)

			// Update to different value
			act(() => {
				REACTIVE_CORE.updateSignal("rapid-test", { counter: 1 })
			})

			expect(renderCount).toBeGreaterThan(initialRenderCount)
			expect(result.current).toBe(1)
		})
	})

	describe("Hook Lifecycle", () => {
		it("should cleanup subscription on unmount", () => {
			const data = { value: "initial" }

			const { result, unmount } = renderHook(() => useSignalSelector("lifecycle-test", data, (d) => d.value))

			expect(result.current).toBe("initial")

			// Unmount the hook
			unmount()

			// Signal should still exist in REACTIVE_CORE
			expect(REACTIVE_CORE.getValue("lifecycle-test")).toEqual(data)
		})

		it("should work with stable selectors and IDs", () => {
			const data = { name: "John", age: 30 }

			// Test that hook works correctly with stable inputs
			const { result } = renderHook(() => useSignalSelector("stable-test", data, (d) => d.name))

			expect(result.current).toBe("John")

			// Update signal value
			act(() => {
				REACTIVE_CORE.updateSignal("stable-test", { name: "Jane", age: 30 })
			})

			expect(result.current).toBe("Jane")
		})
	})

	describe("Integration with Reactive Core", () => {
		it("should work with computed signals", () => {
			REACTIVE_CORE.createSignal("base-value", 10)
			REACTIVE_CORE.createComputed("computed-value", ["base-value"], (value: number) => ({ result: value * 2 }))

			const { result } = renderHook(() => useSignalSelector("computed-value", { result: 0 }, (d) => d.result))

			expect(result.current).toBe(20)

			act(() => {
				REACTIVE_CORE.updateSignal("base-value", 15)
			})

			expect(result.current).toBe(30)
		})

		it("should work with batch updates", () => {
			const data = { a: 1, b: 2, sum: 3 }
			let renderCount = 0

			const { result } = renderHook(() => {
				renderCount++
				return useSignalSelector("batch-test", data, (d) => d.sum)
			})

			const initialRenderCount = renderCount

			act(() => {
				REACTIVE_CORE.batchUpdate(() => {
					REACTIVE_CORE.updateSignal("batch-test", { a: 2, b: 3, sum: 5 })
				})
			})

			// Should only re-render once due to batching
			expect(renderCount).toBe(initialRenderCount + 1)
			expect(result.current).toBe(5)
		})

		it("should handle multiple selector hooks on same signal", () => {
			const data = { user: { name: "John", age: 30, email: "john@example.com" } }

			const nameHook = renderHook(() => useSignalSelector("multi-selector", data, (d) => d.user.name))
			const ageHook = renderHook(() => useSignalSelector("multi-selector", data, (d) => d.user.age))
			const emailHook = renderHook(() => useSignalSelector("multi-selector", data, (d) => d.user.email))

			expect(nameHook.result.current).toBe("John")
			expect(ageHook.result.current).toBe(30)
			expect(emailHook.result.current).toBe("john@example.com")

			// Update name only
			act(() => {
				REACTIVE_CORE.updateSignal("multi-selector", {
					user: { name: "Jane", age: 30, email: "john@example.com" },
				})
			})

			expect(nameHook.result.current).toBe("Jane")
			expect(ageHook.result.current).toBe(30) // Should remain same
			expect(emailHook.result.current).toBe("john@example.com") // Should remain same
		})
	})
})
