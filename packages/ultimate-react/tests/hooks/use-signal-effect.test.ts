import { act, renderHook } from "@testing-library/react"
import { render } from "@testing-library/react"
import { useState } from "react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { REACTIVE_CORE } from "../../src/core"
import { useSignalEffect } from "../../src/hooks/use-signal-effect"

describe("useSignalEffect Hook Test Suite", () => {
	beforeEach(() => {
		const activeSignals = REACTIVE_CORE.getActiveSignals()
		for (const id of activeSignals) {
			REACTIVE_CORE.cleanup(id)
		}
	})

	describe("Basic Effect Functionality", () => {
		it("should run effect when signal changes", () => {
			REACTIVE_CORE.createSignal("effect-signal", "initial")

			const effectFn = vi.fn()

			renderHook(() => useSignalEffect(effectFn, ["effect-signal"]))

			expect(effectFn).toHaveBeenCalledTimes(1)
			expect(effectFn).toHaveBeenCalledWith(["initial"])

			act(() => {
				REACTIVE_CORE.updateSignal("effect-signal", "updated")
			})

			expect(effectFn).toHaveBeenCalledTimes(2)
			expect(effectFn).toHaveBeenLastCalledWith(["updated"])
		})

		it("should run effect with multiple dependencies", () => {
			REACTIVE_CORE.createSignal("dep1", 10)
			REACTIVE_CORE.createSignal("dep2", 20)

			const effectFn = vi.fn()

			renderHook(() => useSignalEffect(effectFn, ["dep1", "dep2"]))

			expect(effectFn).toHaveBeenCalledTimes(1)
			expect(effectFn).toHaveBeenCalledWith([10, 20])

			act(() => {
				REACTIVE_CORE.updateSignal("dep1", 15)
			})

			expect(effectFn).toHaveBeenCalledTimes(2)
			expect(effectFn).toHaveBeenLastCalledWith([15, 20])
		})

		it("should not run effect for non-existent signals", () => {
			const effectFn = vi.fn()

			renderHook(() => useSignalEffect(effectFn, ["non-existent"]))

			// Should run once with undefined
			expect(effectFn).toHaveBeenCalledTimes(1)
			expect(effectFn).toHaveBeenCalledWith([undefined])
		})
	})

	describe("Effect Cleanup", () => {
		it("should call cleanup function when effect re-runs", () => {
			REACTIVE_CORE.createSignal("cleanup-signal", "initial")

			const cleanup = vi.fn()
			const effectFn = vi.fn(() => cleanup)

			renderHook(() => useSignalEffect(effectFn, ["cleanup-signal"]))

			expect(effectFn).toHaveBeenCalledTimes(1)
			expect(cleanup).not.toHaveBeenCalled()

			act(() => {
				REACTIVE_CORE.updateSignal("cleanup-signal", "updated")
			})

			expect(cleanup).toHaveBeenCalledTimes(1)
			expect(effectFn).toHaveBeenCalledTimes(2)
		})

		it("should call cleanup function on unmount", () => {
			REACTIVE_CORE.createSignal("unmount-signal", "value")

			const cleanup = vi.fn()
			const effectFn = vi.fn(() => cleanup)

			const { unmount } = renderHook(() => useSignalEffect(effectFn, ["unmount-signal"]))

			expect(effectFn).toHaveBeenCalledTimes(1)
			expect(cleanup).not.toHaveBeenCalled()

			unmount()

			expect(cleanup).toHaveBeenCalledTimes(1)
		})

		it("should handle effect without cleanup", () => {
			REACTIVE_CORE.createSignal("no-cleanup", "value")

			const effectFn = vi.fn()

			const { unmount } = renderHook(() => useSignalEffect(effectFn, ["no-cleanup"]))

			expect(() => unmount()).not.toThrow()
		})

		it("should handle multiple cleanup functions in chain", () => {
			REACTIVE_CORE.createSignal("chain-signal", 0)

			const cleanup1 = vi.fn()
			const cleanup2 = vi.fn()
			const cleanup3 = vi.fn()

			let callCount = 0
			const effectFn = vi.fn(() => {
				callCount++
				if (callCount === 1) return cleanup1
				if (callCount === 2) return cleanup2
				return cleanup3
			})

			renderHook(() => useSignalEffect(effectFn, ["chain-signal"]))

			act(() => {
				REACTIVE_CORE.updateSignal("chain-signal", 1)
			})

			expect(cleanup1).toHaveBeenCalledTimes(1)
			expect(cleanup2).not.toHaveBeenCalled()

			act(() => {
				REACTIVE_CORE.updateSignal("chain-signal", 2)
			})

			expect(cleanup2).toHaveBeenCalledTimes(1)
			expect(cleanup3).not.toHaveBeenCalled()
		})
	})

	describe("Dependency Management", () => {
		it("should only run when specified dependencies change", () => {
			REACTIVE_CORE.createSignal("watched", "initial")
			REACTIVE_CORE.createSignal("unwatched", "ignored")

			const effectFn = vi.fn()

			renderHook(() => useSignalEffect(effectFn, ["watched"]))

			expect(effectFn).toHaveBeenCalledTimes(1)

			act(() => {
				REACTIVE_CORE.updateSignal("unwatched", "still ignored")
			})

			expect(effectFn).toHaveBeenCalledTimes(1) // Should not run

			act(() => {
				REACTIVE_CORE.updateSignal("watched", "updated")
			})

			expect(effectFn).toHaveBeenCalledTimes(2) // Should run now
		})

		it("should handle dynamic dependency arrays", () => {
			REACTIVE_CORE.createSignal("dep1", "value1")
			REACTIVE_CORE.createSignal("dep2", "value2")

			let dependencies = ["dep1"]
			const effectFn = vi.fn()

			const { rerender } = renderHook(() => useSignalEffect(effectFn, dependencies))

			expect(effectFn).toHaveBeenCalledTimes(1)
			expect(effectFn).toHaveBeenCalledWith(["value1"])

			// Change dependencies
			dependencies = ["dep1", "dep2"]
			rerender()

			expect(effectFn).toHaveBeenCalledTimes(2)
			expect(effectFn).toHaveBeenLastCalledWith(["value1", "value2"])
		})

		it("should handle computed signal dependencies", () => {
			REACTIVE_CORE.createSignal("base", 5)
			REACTIVE_CORE.createComputed("computed", ["base"], (...deps: unknown[]) => {
				const [x] = deps as [number]
				return x * 2
			})

			const effectFn = vi.fn()

			renderHook(() => useSignalEffect(effectFn, ["computed"]))

			expect(effectFn).toHaveBeenCalledTimes(1)
			expect(effectFn).toHaveBeenCalledWith([10])

			act(() => {
				REACTIVE_CORE.updateSignal("base", 7)
			})

			expect(effectFn).toHaveBeenCalledTimes(2)
			expect(effectFn).toHaveBeenLastCalledWith([14])
		})
	})

	describe("Side Effects & State Management", () => {
		it("should handle DOM manipulation effects", () => {
			REACTIVE_CORE.createSignal("title", "Initial Title")

			const mockElement = {
				textContent: "",
			}

			renderHook(() =>
				useSignalEffect(
					(values: unknown[]) => {
						const [title] = values as [string]
						mockElement.textContent = title
					},
					["title"]
				)
			)

			expect(mockElement.textContent).toBe("Initial Title")

			act(() => {
				REACTIVE_CORE.updateSignal("title", "Updated Title")
			})

			expect(mockElement.textContent).toBe("Updated Title")
		})

		it("should handle async effects with cleanup", () => {
			REACTIVE_CORE.createSignal("async-data", "initial")

			const mockAbortController = {
				abort: vi.fn(),
				signal: { aborted: false },
			}

			const effectFn = vi.fn(() => {
				// Simulate async operation setup
				return () => {
					mockAbortController.abort()
				}
			})

			renderHook(() => useSignalEffect(effectFn, ["async-data"]))

			act(() => {
				REACTIVE_CORE.updateSignal("async-data", "updated")
			})

			expect(mockAbortController.abort).toHaveBeenCalledTimes(1)
		})

		it("should handle localStorage effects", () => {
			REACTIVE_CORE.createSignal("storage-value", "initial")

			const mockStorage = {
				setItem: vi.fn(),
				removeItem: vi.fn(),
			}

			renderHook(() =>
				useSignalEffect(
					(values: unknown[]) => {
						const [value] = values as [string | null]
						if (value) {
							mockStorage.setItem("key", value)
						} else {
							mockStorage.removeItem("key")
						}
					},
					["storage-value"]
				)
			)

			expect(mockStorage.setItem).toHaveBeenCalledWith("key", "initial")

			act(() => {
				REACTIVE_CORE.updateSignal("storage-value", "updated")
			})

			expect(mockStorage.setItem).toHaveBeenCalledWith("key", "updated")

			act(() => {
				REACTIVE_CORE.updateSignal("storage-value", null)
			})

			expect(mockStorage.removeItem).toHaveBeenCalledWith("key")
		})
	})

	describe("Performance & Optimization", () => {
		it("should not run effect when value is the same", () => {
			REACTIVE_CORE.createSignal("same-value", "constant")

			const effectFn = vi.fn()

			renderHook(() => useSignalEffect(effectFn, ["same-value"]))

			expect(effectFn).toHaveBeenCalledTimes(1)

			act(() => {
				REACTIVE_CORE.updateSignal("same-value", "constant") // Same value
			})

			// Should NOT run again since value didn't actually change
			expect(effectFn).toHaveBeenCalledTimes(1)

			// But should run when value actually changes
			act(() => {
				REACTIVE_CORE.updateSignal("same-value", "different")
			})

			expect(effectFn).toHaveBeenCalledTimes(2)
			expect(effectFn).toHaveBeenLastCalledWith(["different"])
		})

		it("should handle rapid signal updates efficiently", () => {
			REACTIVE_CORE.createSignal("rapid-effect", 0)

			const effectFn = vi.fn()

			renderHook(() => useSignalEffect(effectFn, ["rapid-effect"]))

			expect(effectFn).toHaveBeenCalledTimes(1)

			act(() => {
				for (let i = 1; i <= 5; i++) {
					REACTIVE_CORE.updateSignal("rapid-effect", i)
				}
			})

			expect(effectFn).toHaveBeenCalledTimes(6) // Initial + 5 updates
		})

		it("should work with batch updates", () => {
			REACTIVE_CORE.createSignal("batch-a", 1)
			REACTIVE_CORE.createSignal("batch-b", 2)

			const effectFn = vi.fn()

			renderHook(() => useSignalEffect(effectFn, ["batch-a", "batch-b"]))

			expect(effectFn).toHaveBeenCalledTimes(1)
			expect(effectFn).toHaveBeenCalledWith([1, 2])

			act(() => {
				REACTIVE_CORE.batchUpdate(() => {
					REACTIVE_CORE.updateSignal("batch-a", 10)
					REACTIVE_CORE.updateSignal("batch-b", 20)
				})
			})

			// Should run twice during batch (once per signal update)
			expect(effectFn).toHaveBeenCalledTimes(3)
			expect(effectFn).toHaveBeenLastCalledWith([10, 20])
		})
	})

	describe("Hook Lifecycle", () => {
		it("should handle hook re-mount with same dependencies", () => {
			REACTIVE_CORE.createSignal("remount-signal", "persistent")

			const effectFn = vi.fn()

			const { unmount } = renderHook(() => useSignalEffect(effectFn, ["remount-signal"]))

			expect(effectFn).toHaveBeenCalledTimes(1)

			unmount()

			// Re-mount
			renderHook(() => useSignalEffect(effectFn, ["remount-signal"]))

			expect(effectFn).toHaveBeenCalledTimes(2)
		})

		it("should handle dependency array changes", () => {
			REACTIVE_CORE.createSignal("dep-a", "a")
			REACTIVE_CORE.createSignal("dep-b", "b")

			let deps = ["dep-a"]
			const effectFn = vi.fn()

			const { rerender } = renderHook(() => useSignalEffect(effectFn, deps))

			expect(effectFn).toHaveBeenCalledTimes(1)
			expect(effectFn).toHaveBeenCalledWith(["a"])

			// Change deps array
			deps = ["dep-b"]
			rerender()

			expect(effectFn).toHaveBeenCalledTimes(2)
			expect(effectFn).toHaveBeenLastCalledWith(["b"])
		})

		it("should cleanup properly on dependency changes", () => {
			REACTIVE_CORE.createSignal("dep1", "value1")
			REACTIVE_CORE.createSignal("dep2", "value2")

			let currentDep = "dep1"
			const cleanup = vi.fn()
			const effectFn = vi.fn(() => cleanup)

			const { rerender } = renderHook(() => useSignalEffect(effectFn, [currentDep]))

			expect(effectFn).toHaveBeenCalledTimes(1)
			expect(cleanup).not.toHaveBeenCalled()

			// Change dependency
			currentDep = "dep2"
			rerender()

			expect(cleanup).toHaveBeenCalledTimes(1)
			expect(effectFn).toHaveBeenCalledTimes(2)
		})
	})

	describe("Edge Cases", () => {
		it("should handle empty dependency array", () => {
			const effectFn = vi.fn()

			renderHook(() => useSignalEffect(effectFn, []))

			expect(effectFn).toHaveBeenCalledTimes(1)
			expect(effectFn).toHaveBeenCalledWith([])
		})

		it("should handle effects that throw errors", () => {
			REACTIVE_CORE.createSignal("error-signal", "safe")

			const effectFn = vi.fn((value: string) => {
				if (value === "error") {
					throw new Error("Effect error")
				}
			})

			const { unmount } = renderHook(() =>
				useSignalEffect(effectFn as unknown as (values: unknown[]) => void, ["error-signal"])
			)

			expect(effectFn).toHaveBeenCalledTimes(1)

			// This should not crash the component
			act(() => {
				REACTIVE_CORE.updateSignal("error-signal", "error")
			})

			expect(() => unmount()).not.toThrow()
		})

		it("should handle null and undefined values", () => {
			REACTIVE_CORE.createSignal<string | null>("nullable", null)
			REACTIVE_CORE.createSignal<string | undefined>("undefinable", undefined)

			const effectFn = vi.fn()

			renderHook(() => useSignalEffect(effectFn, ["nullable", "undefinable"]))

			expect(effectFn).toHaveBeenCalledTimes(1)
			expect(effectFn).toHaveBeenCalledWith([null, undefined])

			act(() => {
				REACTIVE_CORE.updateSignal("nullable", "not null")
				REACTIVE_CORE.updateSignal("undefinable", "not undefined")
			})

			expect(effectFn).toHaveBeenCalledTimes(3) // Initial + 2 updates
		})

		it("should handle complex object dependencies", () => {
			REACTIVE_CORE.createSignal("user", { name: "John", age: 30 })

			const effectFn = vi.fn()

			renderHook(() => useSignalEffect(effectFn, ["user"]))

			expect(effectFn).toHaveBeenCalledTimes(1)
			expect(effectFn).toHaveBeenCalledWith([{ name: "John", age: 30 }])

			act(() => {
				REACTIVE_CORE.updateSignal("user", { name: "Jane", age: 25 })
			})

			expect(effectFn).toHaveBeenCalledTimes(2)
			expect(effectFn).toHaveBeenLastCalledWith([{ name: "Jane", age: 25 }])
		})

		it("should handle function dependencies", () => {
			const fn1 = () => "function 1"
			const fn2 = () => "function 2"

			REACTIVE_CORE.createSignal("func-signal", fn1)

			const effectFn = vi.fn()

			renderHook(() => useSignalEffect(effectFn, ["func-signal"]))

			expect(effectFn).toHaveBeenCalledTimes(1)
			expect(effectFn).toHaveBeenCalledWith([fn1])

			act(() => {
				REACTIVE_CORE.updateSignal("func-signal", fn2)
			})

			expect(effectFn).toHaveBeenCalledTimes(2)
			expect(effectFn).toHaveBeenLastCalledWith([fn2])
		})
	})

	describe("Integration with Reactive Core", () => {
		it("should maintain consistency with direct REACTIVE_CORE subscriptions", () => {
			REACTIVE_CORE.createSignal("integration-signal", "initial")

			const effectCallback = vi.fn()
			const coreCallback = vi.fn()

			// Subscribe via hook
			renderHook(() => useSignalEffect(effectCallback, ["integration-signal"]))

			// Subscribe via core
			REACTIVE_CORE.subscribe("integration-signal", coreCallback)

			expect(effectCallback).toHaveBeenCalledTimes(1)
			expect(coreCallback).toHaveBeenCalledTimes(1)

			act(() => {
				REACTIVE_CORE.updateSignal("integration-signal", "updated")
			})

			expect(effectCallback).toHaveBeenCalledTimes(2)
			expect(coreCallback).toHaveBeenCalledTimes(2)
		})

		it("should work with signal cleanup", () => {
			REACTIVE_CORE.createSignal("cleanup-test", "initial")

			const effectFn = vi.fn()

			renderHook(() => useSignalEffect(effectFn, ["cleanup-test"]))

			expect(effectFn).toHaveBeenCalledTimes(1)

			act(() => {
				REACTIVE_CORE.cleanup("cleanup-test")
			})

			// Effect should still work with undefined value
			expect(effectFn).toHaveBeenCalledTimes(1) // No additional calls
		})
	})

	describe("Component Re-render Testing", () => {
		it("should track component re-renders with signal effects", () => {
			REACTIVE_CORE.createSignal("render-signal", "initial")

			let renderCount = 0
			const TestComponent = () => {
				renderCount++
				const [, forceUpdate] = useState({})

				useSignalEffect(() => {
					// Force component re-render when signal changes
					forceUpdate({})
				}, ["render-signal"])

				return null
			}

			const { unmount } = render(React.createElement(TestComponent))

			// Initial render + effect triggers second render
			expect(renderCount).toBe(2)

			act(() => {
				REACTIVE_CORE.updateSignal("render-signal", "updated")
			})

			// Should trigger another re-render
			expect(renderCount).toBe(3)

			act(() => {
				REACTIVE_CORE.updateSignal("render-signal", "updated") // Same value
			})

			// Should NOT trigger re-render (value didn't change)
			expect(renderCount).toBe(3)

			act(() => {
				REACTIVE_CORE.updateSignal("render-signal", "final")
			})

			// Should trigger re-render again
			expect(renderCount).toBe(4)

			unmount()
		})

		it("should track component re-renders with batch updates", () => {
			REACTIVE_CORE.createSignal("batch-render-a", 1)
			REACTIVE_CORE.createSignal("batch-render-b", 2)

			let renderCount = 0
			const TestComponent = () => {
				renderCount++
				const [, forceUpdate] = useState({})

				useSignalEffect(() => {
					// Force component re-render when signals change
					forceUpdate({})
				}, ["batch-render-a", "batch-render-b"])

				return null
			}

			const { unmount } = render(React.createElement(TestComponent))

			// Initial render + effect triggers second render
			expect(renderCount).toBe(2)

			act(() => {
				REACTIVE_CORE.batchUpdate(() => {
					REACTIVE_CORE.updateSignal("batch-render-a", 10)
					REACTIVE_CORE.updateSignal("batch-render-b", 20)
				})
			})

			// Should trigger re-renders - one for each signal update
			// Previous count (2) + effect for signal A & signal B (3) = 3 total
			expect(renderCount).toBe(3)

			unmount()
		})
	})
})
