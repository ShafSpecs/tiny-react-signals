import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { REACTIVE_CORE } from "../../src/core"
import { useSignalComputed } from "../../src/hooks/use-signal-computed"

describe("useSignalComputed Hook Test Suite", () => {
	beforeEach(() => {
		const activeSignals = REACTIVE_CORE.getActiveSignals()
		for (const id of activeSignals) {
			REACTIVE_CORE.cleanup(id)
		}
	})

	describe("Basic Computed Functionality", () => {
		it("should create computed signal and return current value", () => {
			REACTIVE_CORE.createSignal("dep1", 10)
			REACTIVE_CORE.createSignal("dep2", 20)

			const { result } = renderHook(() =>
				useSignalComputed("sum", ["dep1", "dep2"], (...deps: unknown[]) => {
					const [a, b] = deps as [number, number]
					return a + b
				})
			)

			expect(result.current[0]).toBe(30)
		})

		it("should return computed value from existing computed signal", () => {
			REACTIVE_CORE.createSignal("base", 5)
			REACTIVE_CORE.createComputed("existing-computed", ["base"], (...deps: unknown[]) => {
				const [x] = deps as [number]
				return x * 2
			})

			const { result } = renderHook(() =>
				useSignalComputed("existing-computed", ["base"], (...deps: unknown[]) => {
					const [x] = deps as [number]
					return x * 3 // This should be ignored
				})
			)

			expect(result.current[0]).toBe(10) // Should use existing computation (5 * 2)
		})

		it("should handle different data types in computation", () => {
			REACTIVE_CORE.createSignal("name", "John")
			REACTIVE_CORE.createSignal("age", 30)

			const { result } = renderHook(() =>
				useSignalComputed("profile", ["name", "age"], (...deps: unknown[]) => {
					const [name, age] = deps as [string, number]
					return { name, age, isAdult: age >= 18 }
				})
			)

			expect(result.current[0]).toEqual({ name: "John", age: 30, isAdult: true })
		})
	})

	describe("Dependency Updates", () => {
		it("should update when dependencies change", () => {
			REACTIVE_CORE.createSignal("x", 5)
			REACTIVE_CORE.createSignal("y", 3)

			const { result } = renderHook(() =>
				useSignalComputed("product", ["x", "y"], (...deps: unknown[]) => {
					const [a, b] = deps as [number, number]
					return a * b
				})
			)

			expect(result.current[0]).toBe(15)

			act(() => {
				REACTIVE_CORE.updateSignal("x", 10)
			})

			expect(result.current[0]).toBe(30)

			act(() => {
				REACTIVE_CORE.updateSignal("y", 4)
			})

			expect(result.current[0]).toBe(40)
		})

		it("should handle single dependency", () => {
			REACTIVE_CORE.createSignal("radius", 5)

			const { result } = renderHook(() =>
				useSignalComputed("area", ["radius"], (...deps: unknown[]) => {
					const [r] = deps as [number]
					return Math.PI * r * r
				})
			)

			expect(result.current[0]).toBeCloseTo(78.54, 2)

			act(() => {
				REACTIVE_CORE.updateSignal("radius", 10)
			})

			expect(result.current[0]).toBeCloseTo(314.16, 2)
		})

		it("should handle many dependencies", () => {
			for (let i = 1; i <= 5; i++) {
				REACTIVE_CORE.createSignal(`num${i}`, i)
			}

			const { result } = renderHook(() =>
				useSignalComputed("sum", ["num1", "num2", "num3", "num4", "num5"], (...deps: unknown[]) => {
					return (deps as number[]).reduce((sum, num) => sum + num, 0)
				})
			)

			expect(result.current[0]).toBe(15) // 1+2+3+4+5

			act(() => {
				REACTIVE_CORE.updateSignal("num3", 10)
			})

			expect(result.current[0]).toBe(22) // 1+2+10+4+5
		})

		it("should handle non-existent dependencies gracefully", () => {
			REACTIVE_CORE.createSignal("existing", 10)

			const { result } = renderHook(() =>
				useSignalComputed("mixed", ["existing", "non-existent"], (...deps: unknown[]) => {
					const [existing, nonExistent] = deps as [number, any]
					return existing + (nonExistent || 0)
				})
			)

			expect(result.current[0]).toBe(10)
		})
	})

	describe("Computed Chains", () => {
		it("should handle computed depending on other computed signals", () => {
			REACTIVE_CORE.createSignal("base", 10)

			// First computed: double
			const { result: doubled } = renderHook(() =>
				useSignalComputed("doubled", ["base"], (...deps: unknown[]) => {
					const [x] = deps as [number]
					return x * 2
				})
			)

			// Second computed: depends on first computed
			const { result: quadrupled } = renderHook(() =>
				useSignalComputed("quadrupled", ["doubled"], (...deps: unknown[]) => {
					const [x] = deps as [number]
					return x * 2
				})
			)

			expect(doubled.current[0]).toBe(20)
			expect(quadrupled.current[0]).toBe(40)

			act(() => {
				REACTIVE_CORE.updateSignal("base", 5)
			})

			expect(doubled.current[0]).toBe(10)
			expect(quadrupled.current[0]).toBe(20)
		})

		it("should handle complex dependency graphs", () => {
			REACTIVE_CORE.createSignal("a", 1)
			REACTIVE_CORE.createSignal("b", 2)

			const { result: sum } = renderHook(() =>
				useSignalComputed("sum", ["a", "b"], (...deps: unknown[]) => {
					const [x, y] = deps as [number, number]
					return x + y
				})
			)

			const { result: product } = renderHook(() =>
				useSignalComputed("product", ["a", "b"], (...deps: unknown[]) => {
					const [x, y] = deps as [number, number]
					return x * y
				})
			)

			const { result: combined } = renderHook(() =>
				useSignalComputed("combined", ["sum", "product"], (...deps: unknown[]) => {
					const [s, p] = deps as [number, number]
					return s + p
				})
			)

			expect(sum.current[0]).toBe(3) // 1 + 2
			expect(product.current[0]).toBe(2) // 1 * 2
			expect(combined.current[0]).toBe(5) // 3 + 2

			act(() => {
				REACTIVE_CORE.updateSignal("a", 3)
			})

			expect(sum.current[0]).toBe(5) // 3 + 2
			expect(product.current[0]).toBe(6) // 3 * 2
			expect(combined.current[0]).toBe(11) // 5 + 6
		})
	})

	describe("Signal Options & Transformers", () => {
		it("should apply transformers to computed values", () => {
			REACTIVE_CORE.createSignal("input", 5)

			const double = (value: number) => value * 2
			const { result } = renderHook(() =>
				useSignalComputed(
					"transformed",
					["input"],
					(...deps: unknown[]) => {
						const [x] = deps as [number]
						return x + 10 // 5 + 10 = 15
					},
					{ transform: double }
				)
			)

			expect(result.current[0]).toBe(30) // (5 + 10) * 2
		})

		it("should handle transformer chains", () => {
			REACTIVE_CORE.createSignal("value", 3)

			const addOne = (x: number) => x + 1
			const double = (x: number) => x * 2

			const { result } = renderHook(() =>
				useSignalComputed(
					"chained",
					["value"],
					(...deps: unknown[]) => {
						const [x] = deps as [number]
						return x * 3 // 3 * 3 = 9
					},
					{ transform: [addOne, double] }
				)
			)

			expect(result.current[0]).toBe(20) // ((3 * 3) + 1) * 2 = (9 + 1) * 2 = 20
		})
	})

	describe("React Re-render Behavior", () => {
		it("should trigger re-render when computed value changes", () => {
			REACTIVE_CORE.createSignal("counter", 0)

			let renderCount = 0
			const TestComponent = () => {
				renderCount++
				return useSignalComputed("doubled", ["counter"], (...deps: unknown[]) => {
					const [x] = deps as [number]
					return x * 2
				})
			}

			const { result } = renderHook(TestComponent)

			const initialRenderCount = renderCount
			expect(result.current[0]).toBe(0)

			act(() => {
				REACTIVE_CORE.updateSignal("counter", 5)
			})

			expect(renderCount).toBe(initialRenderCount + 1)
			expect(result.current[0]).toBe(10)
		})

		it("should not re-render when computed value is unchanged", () => {
			REACTIVE_CORE.createSignal("input", 5)

			let renderCount = 0
			const TestComponent = () => {
				renderCount++
				return useSignalComputed("constant", ["input"], () => "always same")
			}

			const { result } = renderHook(TestComponent)

			const initialRenderCount = renderCount
			expect(result.current[0]).toBe("always same")

			act(() => {
				REACTIVE_CORE.updateSignal("input", 10)
			})

			// Should not re-render since computed value didn't change
			expect(renderCount).toBe(initialRenderCount)
			expect(result.current[0]).toBe("always same")
		})
	})

	describe("Hook Lifecycle", () => {
		it("should cleanup subscription on unmount", () => {
			REACTIVE_CORE.createSignal("lifecycle-dep", 10)

			const { result, unmount } = renderHook(() =>
				useSignalComputed("lifecycle-computed", ["lifecycle-dep"], (...deps: unknown[]) => {
					const [x] = deps as [number]
					return x * 2
				})
			)

			expect(result.current[0]).toBe(20)

			// Unmount the hook
			unmount()

			// Computed signal should still exist in REACTIVE_CORE
			expect(REACTIVE_CORE.getValue("lifecycle-computed")).toBe(20)
		})

		it("should handle dependency changes", () => {
			REACTIVE_CORE.createSignal("dep1", 10)
			REACTIVE_CORE.createSignal("dep2", 20)

			let dependencies = ["dep1"]

			const { result, rerender } = renderHook(
				({ deps }) =>
					useSignalComputed("dynamic-deps", deps, (...deps: unknown[]) => {
						return deps.reduce((sum: number, dep) => sum + (dep as number), 0)
					}),
				{
					initialProps: { deps: dependencies },
				}
			)
			expect(result.current[0]).toBe(10)

			act(() => {
				dependencies = ["dep1", "dep2"]
				rerender({ deps: dependencies })
			})

			expect(result.current[0]).toBe(30) // 10 + 20
		})
	})

	describe("Performance & Memoization", () => {
		it("should not recompute unless dependencies change", () => {
			REACTIVE_CORE.createSignal("expensive-dep", 5)
			REACTIVE_CORE.createSignal("other-signal", 100)

			const expensiveCompute = vi.fn((...deps: unknown[]) => {
				const [x] = deps as [number]
				return x * x
			})

			const { result } = renderHook(() => useSignalComputed("expensive", ["expensive-dep"], expensiveCompute))

			expect(result.current[0]).toBe(25)
			expect(expensiveCompute).toHaveBeenCalledTimes(1)

			// Update unrelated signal
			act(() => {
				REACTIVE_CORE.updateSignal("other-signal", 200)
			})

			// Should not recompute
			expect(expensiveCompute).toHaveBeenCalledTimes(1)

			// Update dependency
			act(() => {
				REACTIVE_CORE.updateSignal("expensive-dep", 7)
			})

			// Should recompute now
			expect(expensiveCompute).toHaveBeenCalledTimes(2)
			expect(result.current[0]).toBe(49)
		})

		it("should handle multiple hooks with same computed signal efficiently", () => {
			REACTIVE_CORE.createSignal("shared-dep", 10)

			const computeFn = vi.fn((...deps: unknown[]) => {
				const [x] = deps as [number]
				return x * 2
			})

			const hook1 = renderHook(() => useSignalComputed("shared-computed", ["shared-dep"], computeFn))

			const hook2 = renderHook(() => useSignalComputed("shared-computed", ["shared-dep"], computeFn))

			expect(hook1.result.current[0]).toBe(20)
			expect(hook2.result.current[0]).toBe(20)

			// Should only compute once despite multiple hooks
			expect(computeFn).toHaveBeenCalledTimes(1)
		})
	})

	describe("Edge Cases", () => {
		it("should handle empty dependencies array", () => {
			const { result } = renderHook(() => useSignalComputed("no-deps", [], () => "constant value"))

			expect(result.current[0]).toBe("constant value")
		})

		it("should handle complex object computations", () => {
			REACTIVE_CORE.createSignal("user", { name: "John", age: 25 })
			REACTIVE_CORE.createSignal("multiplier", 2)

			const { result } = renderHook(() =>
				useSignalComputed("user-profile", ["user", "multiplier"], (...deps: unknown[]) => {
					const [user, mult] = deps as [{ name: string; age: number }, number]
					return {
						...user,
						ageInDogYears: user.age * mult,
						isAdult: user.age >= 18,
					}
				})
			)

			expect(result.current[0]).toEqual({
				name: "John",
				age: 25,
				ageInDogYears: 50,
				isAdult: true,
			})
		})

		it("should handle array dependencies and computations", () => {
			REACTIVE_CORE.createSignal("numbers", [1, 2, 3, 4, 5])

			const { result } = renderHook(() =>
				useSignalComputed("stats", ["numbers"], (...deps: unknown[]) => {
					const [numbers] = deps as [number[]]
					const sum = numbers.reduce((a, b) => a + b, 0)
					const avg = sum / numbers.length
					return { sum, avg, count: numbers.length }
				})
			)

			expect(result.current[0]).toEqual({ sum: 15, avg: 3, count: 5 })

			act(() => {
				REACTIVE_CORE.updateSignal("numbers", [2, 4, 6])
			})

			expect(result.current[0]).toEqual({ sum: 12, avg: 4, count: 3 })
		})

		it("should handle null and undefined in computations", () => {
			REACTIVE_CORE.createSignal("nullable", null)
			REACTIVE_CORE.createSignal("undefinable", undefined)

			const { result } = renderHook(() =>
				useSignalComputed("safe-compute", ["nullable", "undefinable"], (...deps: unknown[]) => {
					const [a, b] = deps as [any, any]
					return `${a || "default-a"}-${b || "default-b"}`
				})
			)

			expect(result.current[0]).toBe("default-a-default-b")
		})

		it("should handle function values in computations", () => {
			const fn1 = (x: number) => x * 2
			const fn2 = (x: number) => x + 10

			REACTIVE_CORE.createSignal("func1", fn1)
			REACTIVE_CORE.createSignal("func2", fn2)
			REACTIVE_CORE.createSignal("input", 5)

			const { result } = renderHook(() =>
				useSignalComputed("composed", ["func1", "func2", "input"], (...deps: unknown[]) => {
					const [f1, f2, input] = deps as [typeof fn1, typeof fn2, number]
					return f2(f1(input))
				})
			)

			expect(result.current[0]).toBe(20) // f2(f1(5)) = f2(10) = 20
		})
	})

	describe("Integration with Reactive Core", () => {
		it("should work with batch updates", () => {
			REACTIVE_CORE.createSignal("a", 1)
			REACTIVE_CORE.createSignal("b", 2)

			const computeFn = vi.fn((...deps: unknown[]) => {
				const [x, y] = deps as [number, number]
				return x + y
			})

			const { result } = renderHook(() => useSignalComputed("batched-sum", ["a", "b"], computeFn))

			expect(result.current[0]).toBe(3)
			expect(computeFn).toHaveBeenCalledTimes(1)

			act(() => {
				REACTIVE_CORE.batchUpdate(() => {
					REACTIVE_CORE.updateSignal("a", 10)
					REACTIVE_CORE.updateSignal("b", 20)
				})
			})

			expect(result.current[0]).toBe(30)
			// Should only compute once despite multiple dependency updates
			expect(computeFn).toHaveBeenCalledTimes(2)
		})

		it("should maintain consistency with direct REACTIVE_CORE usage", () => {
			REACTIVE_CORE.createSignal("core-dep", 5)

			const { result } = renderHook(() =>
				useSignalComputed("core-computed", ["core-dep"], (...deps: unknown[]) => {
					const [x] = deps as [number]
					return x * 3
				})
			)

			expect(result.current[0]).toBe(15)
			expect(REACTIVE_CORE.getValue("core-computed")).toBe(15)

			act(() => {
				REACTIVE_CORE.updateSignal("core-dep", 10)
			})

			expect(result.current[0]).toBe(30)
			expect(REACTIVE_CORE.getValue("core-computed")).toBe(30)
		})
	})
})
