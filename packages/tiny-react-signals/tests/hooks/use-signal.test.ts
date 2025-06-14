import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { REACTIVE_CORE } from "../../src/core"
import { useSignal } from "../../src/hooks/use-signal"

describe("useSignal Hook Test Suite", () => {
	beforeEach(() => {
		const activeSignals = REACTIVE_CORE.getActiveSignals()
		for (const id of activeSignals) {
			REACTIVE_CORE.cleanup(id)
		}
	})

	describe("Basic useState-like Functionality", () => {
		it("should return value and setter like useState", () => {
			const { result } = renderHook(() => useSignal("basic-signal", "initial"))

			const [value, setValue] = result.current
			expect(value).toBe("initial")
			expect(typeof setValue).toBe("function")
		})

		it("should update value when setter is called", () => {
			const { result } = renderHook(() => useSignal("update-signal", 0))

			expect(result.current[0]).toBe(0)

			act(() => {
				result.current[1](42)
			})

			expect(result.current[0]).toBe(42)
		})

		it("should support updater function like useState", () => {
			const { result } = renderHook(() => useSignal("updater-signal", 5))

			act(() => {
				result.current[1]((prev) => prev * 2)
			})

			expect(result.current[0]).toBe(10)
		})

		it("should handle different data types", () => {
			const stringHook = renderHook(() => useSignal("string-signal", "text"))
			const numberHook = renderHook(() => useSignal("number-signal", 42))
			const booleanHook = renderHook(() => useSignal("boolean-signal", true))
			const arrayHook = renderHook(() => useSignal("array-signal", [1, 2, 3]))
			const objectHook = renderHook(() => useSignal("object-signal", { name: "test" }))

			expect(stringHook.result.current[0]).toBe("text")
			expect(numberHook.result.current[0]).toBe(42)
			expect(booleanHook.result.current[0]).toBe(true)
			expect(arrayHook.result.current[0]).toEqual([1, 2, 3])
			expect(objectHook.result.current[0]).toEqual({ name: "test" })
		})
	})

	describe("Global Signal Behavior", () => {
		it("should create global signal accessible via REACTIVE_CORE", () => {
			const { result } = renderHook(() => useSignal("global-signal", "global value"))

			expect(result.current[0]).toBe("global value")
			expect(REACTIVE_CORE.getValue("global-signal")).toBe("global value")
		})

		it("should sync with existing signal if already exists", () => {
			REACTIVE_CORE.createSignal("existing-global", "existing value")

			const { result } = renderHook(() => useSignal("existing-global", "ignored initial"))

			expect(result.current[0]).toBe("existing value")
		})

		it("should sync multiple hook instances with same signal ID", () => {
			const hook1 = renderHook(() => useSignal("shared-signal", "initial"))
			const hook2 = renderHook(() => useSignal("shared-signal", "ignored"))

			expect(hook1.result.current[0]).toBe("initial")
			expect(hook2.result.current[0]).toBe("initial")

			act(() => {
				hook1.result.current[1]("updated from hook1")
			})

			expect(hook1.result.current[0]).toBe("updated from hook1")
			expect(hook2.result.current[0]).toBe("updated from hook1")
		})

		it("should sync when signal is updated externally", () => {
			const { result } = renderHook(() => useSignal("external-update", "initial"))

			expect(result.current[0]).toBe("initial")

			act(() => {
				REACTIVE_CORE.updateSignal("external-update", "updated externally")
			})

			expect(result.current[0]).toBe("updated externally")
		})
	})

	describe("Signal Options & Transformers", () => {
		it("should apply transformers to signal values", () => {
			const upperCase = (value: string) => value.toUpperCase()
			const { result } = renderHook(() => useSignal("transform-signal", "hello", { transform: upperCase }))

			expect(result.current[0]).toBe("HELLO")
		})

		it("should apply transformers to setter updates", () => {
			const double = (value: number) => value * 2
			const { result } = renderHook(() => useSignal("double-signal", 5, { transform: double }))

			expect(result.current[0]).toBe(10) // 5 * 2

			act(() => {
				result.current[1](7)
			})

			expect(result.current[0]).toBe(14) // 7 * 2
		})

		it("should handle transformer chains", () => {
			const addOne = (value: number) => value + 1
			const double = (value: number) => value * 2

			const { result } = renderHook(() => useSignal("chain-signal", 5, { transform: [addOne, double] }))

			// (5 + 1) * 2 = 12
			expect(result.current[0]).toBe(12)
		})

		it("should apply transformers to updater functions", () => {
			const addPrefix = (value: string) => `prefix-${value}`
			const { result } = renderHook(() => useSignal("prefix-signal", "test", { transform: addPrefix }))

			expect(result.current[0]).toBe("prefix-test")

			act(() => {
				result.current[1]((prev) => `${prev.replace("prefix-", "")}-suffix`)
			})

			// Should be: 'prefix-test-suffix' (transformer applied to final result)
			expect(result.current[0]).toBe("prefix-test-suffix")
		})
	})

	describe("React Re-render Behavior", () => {
		it("should trigger re-render when signal value changes", () => {
			let renderCount = 0

			const TestComponent = () => {
				renderCount++
				return useSignal("rerender-signal", "initial")
			}

			const { result } = renderHook(TestComponent)

			const initialRenderCount = renderCount

			act(() => {
				result.current[1]("updated")
			})

			expect(renderCount).toBe(initialRenderCount + 1)
			expect(result.current[0]).toBe("updated")
		})

		it("should not re-render when value is the same", () => {
			let renderCount = 0

			const TestComponent = () => {
				renderCount++
				return useSignal("same-value-signal", "constant")
			}

			const { result } = renderHook(TestComponent)

			const initialRenderCount = renderCount

			act(() => {
				result.current[1]("constant") // Same value
			})

			// Should not trigger additional render
			expect(renderCount).toBe(initialRenderCount)
		})

		it("should handle rapid updates efficiently", () => {
			const { result } = renderHook(() => useSignal("rapid-signal", 0))

			act(() => {
				for (let i = 1; i <= 10; i++) {
					result.current[1](i)
				}
			})

			expect(result.current[0]).toBe(10)
		})
	})

	describe("Hook Lifecycle", () => {
		it("should cleanup subscription on unmount", () => {
			const { result, unmount } = renderHook(() => useSignal("lifecycle-signal", "initial"))

			expect(result.current[0]).toBe("initial")

			// Unmount the hook
			unmount()

			// Signal should still exist in REACTIVE_CORE
			expect(REACTIVE_CORE.getValue("lifecycle-signal")).toBe("initial")
		})

		it("should handle signal ID changes", () => {
			let signalId = "first-signal"

			const { result, rerender } = renderHook(() => useSignal(signalId, "default"))

			expect(result.current[0]).toBe("default")

			// Update first signal
			act(() => {
				result.current[1]("first updated")
			})

			expect(result.current[0]).toBe("first updated")

			// Change signal ID
			signalId = "second-signal"
			rerender()

			// Should now use second signal with default value
			expect(result.current[0]).toBe("default")
		})

		it("should maintain signal state across re-mounts", () => {
			const { result, unmount } = renderHook(() => useSignal("persistent-signal", "initial"))

			act(() => {
				result.current[1]("updated")
			})

			expect(result.current[0]).toBe("updated")

			// Unmount
			unmount()

			// Re-mount with same signal ID
			const { result: result2 } = renderHook(() => useSignal("persistent-signal", "ignored"))

			// Should retain previous value
			expect(result2.current[0]).toBe("updated")
		})
	})

	describe("Edge Cases", () => {
		it("should handle null and undefined values", () => {
			const nullHook = renderHook(() => useSignal<string | null>("null-signal", null))
			const undefinedHook = renderHook(() => useSignal<string | undefined>("undefined-signal", undefined))

			expect(nullHook.result.current[0]).toBeNull()
			expect(undefinedHook.result.current[0]).toBeUndefined()

			act(() => {
				nullHook.result.current[1]("not null anymore")
				undefinedHook.result.current[1]("not undefined anymore")
			})

			expect(nullHook.result.current[0]).toBe("not null anymore")
			expect(undefinedHook.result.current[0]).toBe("not undefined anymore")
		})

		it("should handle complex object updates", () => {
			const { result } = renderHook(() => useSignal("object-signal", { count: 0, name: "initial" }))

			act(() => {
				result.current[1]((prev) => ({ ...prev, count: prev.count + 1 }))
			})

			expect(result.current[0]).toEqual({ count: 1, name: "initial" })
		})

		it("should handle array updates", () => {
			const { result } = renderHook(() => useSignal("array-signal", [1, 2, 3]))

			act(() => {
				result.current[1]((prev) => [...prev, 4])
			})

			expect(result.current[0]).toEqual([1, 2, 3, 4])
		})

		it("should handle function values", () => {
			const testFunction = () => "I am a function"
			const { result } = renderHook(() => useSignal("function-signal", testFunction))

			expect(typeof result.current[0]).toBe("function")
			expect(result.current[0]()).toBe("I am a function")
		})

		it("should handle Date objects", () => {
			const initialDate = new Date("2024-01-01")
			const { result } = renderHook(() => useSignal("date-signal", initialDate))

			expect(result.current[0]).toBeInstanceOf(Date)
			expect(result.current[0].getTime()).toBe(initialDate.getTime())

			const newDate = new Date("2024-12-31")
			act(() => {
				result.current[1](newDate)
			})

			expect(result.current[0].getTime()).toBe(newDate.getTime())
		})

		it("should handle Map and Set objects", () => {
			const initialMap = new Map([["key", "value"]])
			const initialSet = new Set([1, 2, 3])

			const mapHook = renderHook(() => useSignal("map-signal", initialMap))
			const setHook = renderHook(() => useSignal("set-signal", initialSet))

			expect(mapHook.result.current[0].get("key")).toBe("value")
			expect(setHook.result.current[0].has(2)).toBe(true)
		})
	})

	describe("Performance & Memory", () => {
		it("should not create duplicate signals for same ID", () => {
			const hook1 = renderHook(() => useSignal("performance-signal", "value1"))
			const hook2 = renderHook(() => useSignal("performance-signal", "value2"))

			// Both should use the same signal (first one wins)
			expect(hook1.result.current[0]).toBe("value1")
			expect(hook2.result.current[0]).toBe("value1")

			// Get initial count of signals
			const initialSignalCount = REACTIVE_CORE.getActiveSignals().filter((id) => id === "performance-signal").length

			// Should be only 1 signal despite 2 hooks
			expect(initialSignalCount).toBe(1)
		})

		it("should handle many simultaneous hooks efficiently", () => {
			const hooks: ReturnType<typeof renderHook>[] = []

			for (let i = 0; i < 100; i++) {
				hooks.push(renderHook(() => useSignal(`signal-${i}`, i)))
			}

			// All hooks should work correctly
			hooks.forEach((hook, index) => {
				expect((hook.result.current as [number, (value: number) => void])[0]).toBe(index)
			})

			// Update all signals
			act(() => {
				hooks.forEach((hook, index) => {
					;(hook.result.current as [number, (value: number) => void])[1]((index * 2) as number)
				})
			})

			// All should be updated
			hooks.forEach((hook, index) => {
				expect((hook.result.current as [number, (value: number) => void])[0]).toBe(index * 2)
			})
		})
	})

	describe("Integration with Reactive Core", () => {
		it("should work with computed signals", () => {
			const { result } = renderHook(() => useSignal("base-signal", 10))

			// Create computed signal that depends on our hook's signal
			REACTIVE_CORE.createComputed("computed-signal", ["base-signal"], (value: number) => value * 2)

			act(() => {
				result.current[1](20)
			})

			expect(REACTIVE_CORE.getValue("computed-signal")).toBe(40)
		})

		it("should work with batch updates", () => {
			const hook1 = renderHook(() => useSignal("batch-signal-1", 0))
			const hook2 = renderHook(() => useSignal("batch-signal-2", 0))

			act(() => {
				REACTIVE_CORE.batchUpdate(() => {
					hook1.result.current[1](10)
					hook2.result.current[1](20)
				})
			})

			expect(hook1.result.current[0]).toBe(10)
			expect(hook2.result.current[0]).toBe(20)
		})

		it("should maintain consistency with direct REACTIVE_CORE usage", () => {
			const { result } = renderHook(() => useSignal("consistency-signal", "hook value"))

			// Update via REACTIVE_CORE
			act(() => {
				REACTIVE_CORE.updateSignal("consistency-signal", "core value")
			})

			expect(result.current[0]).toBe("core value")

			// Update via hook
			act(() => {
				result.current[1]("hook updated")
			})

			expect(REACTIVE_CORE.getValue("consistency-signal")).toBe("hook updated")
		})
	})
})
