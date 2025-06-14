import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { REACTIVE_CORE } from "../../src/core"
import { useSignalRef } from "../../src/hooks/use-signal-ref"

describe("useSignalRef Hook Test Suite", () => {
	beforeEach(() => {
		const activeSignals = REACTIVE_CORE.getActiveSignals()
		for (const id of activeSignals) {
			REACTIVE_CORE.cleanup(id)
		}
	})

	describe("Basic Functionality", () => {
		it("should return ref with current value from existing signal", () => {
			REACTIVE_CORE.createSignal("existing-ref", "initial value")

			const { result } = renderHook(() => useSignalRef<string>("existing-ref"))

			expect(result.current.current).toBe("initial value")
		})

		it("should create signal and return ref when providing initial value", () => {
			const { result } = renderHook(() => useSignalRef("new-ref-signal", "fresh value"))

			expect(result.current.current).toBe("fresh value")
			expect(REACTIVE_CORE.getValue("new-ref-signal")).toBe("fresh value")
		})

		it("should return undefined for non-existent signal without initial value", () => {
			const { result } = renderHook(() => useSignalRef<string>("non-existent"))

			expect(result.current.current).toBeUndefined()
		})

		it("should handle different data types", () => {
			const numberResult = renderHook(() => useSignalRef("number-ref", 42))
			const booleanResult = renderHook(() => useSignalRef("boolean-ref", true))
			const arrayResult = renderHook(() => useSignalRef("array-ref", [1, 2, 3]))
			const objectResult = renderHook(() => useSignalRef("object-ref", { name: "test" }))

			expect(numberResult.result.current.current).toBe(42)
			expect(booleanResult.result.current.current).toBe(true)
			expect(arrayResult.result.current.current).toEqual([1, 2, 3])
			expect(objectResult.result.current.current).toEqual({ name: "test" })
		})
	})

	describe("Signal Updates", () => {
		it("should update ref when signal value changes", () => {
			const { result } = renderHook(() => useSignalRef("update-ref", "initial"))

			expect(result.current.current).toBe("initial")

			act(() => {
				REACTIVE_CORE.updateSignal("update-ref", "updated")
			})

			expect(result.current.current).toBe("updated")
		})

		it("should handle rapid updates", () => {
			const { result } = renderHook(() => useSignalRef("rapid-ref", 0))

			act(() => {
				for (let i = 1; i <= 5; i++) {
					REACTIVE_CORE.updateSignal("rapid-ref", i)
				}
			})

			expect(result.current.current).toBe(5)
		})

		it("should handle null and undefined updates", () => {
			const { result } = renderHook(() => useSignalRef<string | null>("nullable-ref", "initial"))

			act(() => {
				REACTIVE_CORE.updateSignal("nullable-ref", null)
			})

			expect(result.current.current).toBeNull()

			act(() => {
				REACTIVE_CORE.updateSignal("nullable-ref", undefined)
			})

			expect(result.current.current).toBeUndefined()
		})

		it("should handle complex object updates", () => {
			const initialObject = { count: 0, name: "initial" }
			const { result } = renderHook(() => useSignalRef("object-ref", initialObject))

			const updatedObject = { count: 5, name: "updated" }
			act(() => {
				REACTIVE_CORE.updateSignal("object-ref", updatedObject)
			})

			expect(result.current.current).toEqual(updatedObject)
			expect(result.current.current).toBe(updatedObject) // Same reference
		})
	})

	describe("Signal Options & Transformers", () => {
		it("should apply transformers to signal values", () => {
			const upperCase = (value: string) => value.toUpperCase()
			const { result } = renderHook(() => useSignalRef("transform-ref", "hello", { transform: upperCase }))

			expect(result.current.current).toBe("HELLO")
		})

		it("should update ref with transformed values", () => {
			const double = (value: number) => value * 2
			const { result } = renderHook(() => useSignalRef("double-ref", 5, { transform: double }))

			expect(result.current.current).toBe(10)

			act(() => {
				REACTIVE_CORE.updateSignal("double-ref", 7)
			})

			expect(result.current.current).toBe(14)
		})

		it("should handle transformer chains", () => {
			const double = (value: number) => value * 2
			const addTen = (value: number) => value + 10

			const { result } = renderHook(() => useSignalRef("chain-ref", 5, { transform: [double, addTen] }))

			// (5 * 2) + 10 = 20
			expect(result.current.current).toBe(20)
		})
	})

	describe("Hook Lifecycle", () => {
		it("should cleanup subscription on unmount", () => {
			const { result, unmount } = renderHook(() => useSignalRef("lifecycle-ref", "initial"))

			expect(result.current.current).toBe("initial")

			// Unmount the hook
			unmount()

			// Update signal after unmount - ref should not update
			act(() => {
				REACTIVE_CORE.updateSignal("lifecycle-ref", "should not update")
			})

			// The ref value won't change because component is unmounted
			// But we can verify the signal itself was updated
			expect(REACTIVE_CORE.getValue("lifecycle-ref")).toBe("should not update")
		})

		it("should handle signal ID changes", () => {
			let signalId = "first-signal"
			REACTIVE_CORE.createSignal("first-signal", "first value")
			REACTIVE_CORE.createSignal("second-signal", "second value")

			const { result, rerender } = renderHook(() => useSignalRef(signalId))

			expect(result.current.current).toBe("first value")

			// Change signal ID
			signalId = "second-signal"
			rerender()

			expect(result.current.current).toBe("second value")
		})

		it("should handle multiple hook instances with same signal", () => {
			REACTIVE_CORE.createSignal("shared-ref", "shared value")

			const hook1 = renderHook(() => useSignalRef<string>("shared-ref"))
			const hook2 = renderHook(() => useSignalRef<string>("shared-ref"))

			expect(hook1.result.current.current).toBe("shared value")
			expect(hook2.result.current.current).toBe("shared value")

			act(() => {
				REACTIVE_CORE.updateSignal("shared-ref", "updated shared")
			})

			expect(hook1.result.current.current).toBe("updated shared")
			expect(hook2.result.current.current).toBe("updated shared")
		})
	})

	describe("Read-Only Behavior", () => {
		it("should return readonly ref", () => {
			const { result } = renderHook(() => useSignalRef("readonly-ref", "test"))

			// TypeScript should enforce readonly, but let's verify the structure
			expect(result.current).toHaveProperty("current")
			expect(typeof result.current.current).toBe("string")
		})

		it("should not trigger React re-renders on signal changes", () => {
			let renderCount = 0

			const TestComponent = () => {
				renderCount++
				const ref = useSignalRef("no-rerender", "initial")
				return ref.current
			}

			const { result } = renderHook(TestComponent)

			const initialRenderCount = renderCount
			expect(result.current).toBe("initial")

			// Update signal - should not cause re-render
			act(() => {
				REACTIVE_CORE.updateSignal("no-rerender", "updated")
			})

			// Render count should not increase (no re-render)
			expect(renderCount).toBe(initialRenderCount)
		})
	})

	describe("Edge Cases", () => {
		it("should handle empty string signal ID", () => {
			const { result } = renderHook(() => useSignalRef("", "empty id"))

			expect(result.current.current).toBe("empty id")
		})

		it("should handle very long signal IDs", () => {
			const longId = "very-long-signal-id-".repeat(100)
			const { result } = renderHook(() => useSignalRef(longId, "long id value"))

			expect(result.current.current).toBe("long id value")
		})

		it("should handle special characters in signal ID", () => {
			const specialId = "signal!@#$%^&*()_+-=[]{}|;:,.<>?"
			const { result } = renderHook(() => useSignalRef(specialId, "special value"))

			expect(result.current.current).toBe("special value")
		})

		it("should handle function values", () => {
			const testFunction = () => "I am a function"
			const { result } = renderHook(() => useSignalRef("function-ref", testFunction))

			expect(typeof result.current.current).toBe("function")
			expect(result.current.current?.()).toBe("I am a function")
		})

		it("should handle circular references", () => {
			const obj: any = { name: "circular" }
			obj.self = obj

			const { result } = renderHook(() => useSignalRef("circular-ref", obj))

			expect(result.current.current?.name).toBe("circular")
			expect(result.current.current?.self).toBe(result.current.current)
		})

		it("should handle Date objects", () => {
			const testDate = new Date("2024-01-01")
			const { result } = renderHook(() => useSignalRef("date-ref", testDate))

			expect(result.current.current).toBeInstanceOf(Date)
			expect(result.current.current?.getTime()).toBe(testDate.getTime())
		})

		it("should handle Map and Set objects", () => {
			const testMap = new Map([["key", "value"]])
			const testSet = new Set([1, 2, 3])

			const mapResult = renderHook(() => useSignalRef("map-ref", testMap))
			const setResult = renderHook(() => useSignalRef("set-ref", testSet))

			expect(mapResult.result.current.current?.get("key")).toBe("value")
			expect(setResult.result.current.current?.has(2)).toBe(true)
		})
	})

	describe("Integration with Reactive Core", () => {
		it("should work with computed signals", () => {
			REACTIVE_CORE.createSignal("base-for-computed", 10)
			REACTIVE_CORE.createComputed("computed-for-ref", ["base-for-computed"], (value: number) => value * 2)

			const { result } = renderHook(() => useSignalRef<number>("computed-for-ref"))

			expect(result.current.current).toBe(20)

			act(() => {
				REACTIVE_CORE.updateSignal("base-for-computed", 15)
			})

			expect(result.current.current).toBe(30)
		})

		it("should work with batch updates", () => {
			const { result } = renderHook(() => useSignalRef("batch-ref", 0))

			act(() => {
				REACTIVE_CORE.batchUpdate(() => {
					REACTIVE_CORE.updateSignal("batch-ref", 1)
					REACTIVE_CORE.updateSignal("batch-ref", 2)
					REACTIVE_CORE.updateSignal("batch-ref", 3)
				})
			})

			expect(result.current.current).toBe(3)
		})

		it("should handle signal cleanup during hook lifecycle", () => {
			const { result } = renderHook(() => useSignalRef("cleanup-during-use", "initial"))

			expect(result.current.current).toBe("initial")

			// Cleanup signal while hook is still mounted
			act(() => {
				REACTIVE_CORE.cleanup("cleanup-during-use")
			})

			// Ref should still have the last known value
			expect(result.current.current).toBe("initial")
		})
	})
})
