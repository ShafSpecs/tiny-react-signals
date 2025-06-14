import { type Mock, beforeEach, describe, expect, it, vi } from "vitest"
import { REACTIVE_CORE } from "../src/core"
import type { BindingFunction, CallbackFunction, ComputeFunction, ConditionFunction } from "../src/core"
import { signal } from "../src/signal"

describe("Signal API Test Suite", () => {
	beforeEach(() => {
		const activeSignals = REACTIVE_CORE.getActiveSignals()
		for (const id of activeSignals) {
			REACTIVE_CORE.cleanup(id)
		}
	})

	describe("Signal Creation & Management", () => {
		it("should create a signal with initial value", () => {
			const signalInstance = signal.create("test-signal", "hello signal")

			expect(signalInstance.value).toBe("hello signal")
			expect(signalInstance.rawValue).toBe("hello signal")
			expect(signalInstance.bindings).toBeInstanceOf(Map)
			expect(signalInstance.callbacks).toBeInstanceOf(Map)
			expect(signalInstance.computed).toBeInstanceOf(Set)
		})

		it("should create signal with options", () => {
			const transform = (value: string) => value.toUpperCase()
			const signalInstance = signal.create("transform-signal", "hello", { transform })

			expect(signalInstance.value).toBe("HELLO")
			expect(signalInstance.rawValue).toBe("hello")
			expect(signalInstance.hasTransformers).toBe(true)
		})

		it("should upsert signal (create new)", () => {
			const signalInstance = signal.upsert("new-signal", "fresh")

			expect(signalInstance.value).toBe("fresh")
			expect(signal.get("new-signal")).toBe("fresh")
		})

		it("should upsert signal (return existing)", () => {
			signal.create("existing-signal", "original")
			const signalInstance = signal.upsert("existing-signal", "updated")

			expect(signalInstance.value).toBe("original") // Should keep original value
			expect(signal.get("existing-signal")).toBe("original")
		})

		it("should handle different data types", () => {
			signal.create("string-signal", "text")
			signal.create("number-signal", 42)
			signal.create("boolean-signal", true)
			signal.create("array-signal", [1, 2, 3])
			signal.create("object-signal", { name: "test" })

			expect(signal.get("string-signal")).toBe("text")
			expect(signal.get("number-signal")).toBe(42)
			expect(signal.get("boolean-signal")).toBe(true)
			expect(signal.get("array-signal")).toEqual([1, 2, 3])
			expect(signal.get("object-signal")).toEqual({ name: "test" })
		})
	})

	describe("Signal Values & Updates", () => {
		it("should set and get signal values", () => {
			signal.create("value-test", "initial")

			expect(signal.get("value-test")).toBe("initial")

			signal.set("value-test", "updated")
			expect(signal.get("value-test")).toBe("updated")
		})

		it("should get raw values with transformers", () => {
			const double = (value: number) => value * 2
			signal.create("raw-test", 5, { transform: double })

			expect(signal.get("raw-test")).toBe(10)
			expect(signal.getRawValue("raw-test")).toBe(5)
		})

		it("should return undefined for non-existent signals", () => {
			expect(signal.get("non-existent")).toBeUndefined()
			expect(signal.getRawValue("non-existent")).toBeUndefined()
		})

		it("should handle null and undefined values", () => {
			signal.create("null-signal", null)
			signal.create("undefined-signal", undefined)

			expect(signal.get("null-signal")).toBeNull()
			expect(signal.get("undefined-signal")).toBeUndefined()
		})

		it("should not throw on setting non-existent signals", () => {
			expect(() => {
				signal.set("ghost-signal", "phantom")
			}).not.toThrow()
		})
	})

	describe("Computed Signals", () => {
		it("should create computed signal", () => {
			signal.create("num1", 10)
			signal.create("num2", 20)

			const computeFn: ComputeFunction<number> = (...deps: unknown[]) => {
				const [a, b] = deps as [number, number]
				return a + b
			}
			signal.computed("sum", ["num1", "num2"], computeFn)

			expect(signal.get("sum")).toBe(30)
		})

		it("should update computed when dependencies change", () => {
			signal.create("x", 5)
			signal.create("y", 3)

			const multiply: ComputeFunction<number> = (...deps: unknown[]) => {
				const [a, b] = deps as [number, number]
				return a * b
			}
			signal.computed("product", ["x", "y"], multiply)

			expect(signal.get("product")).toBe(15)

			signal.set("x", 10)
			expect(signal.get("product")).toBe(30)

			signal.set("y", 4)
			expect(signal.get("product")).toBe(40)
		})

		it("should handle computed with transformers", () => {
			signal.create("base", 10)

			const square: ComputeFunction<number> = (...deps: unknown[]) => {
				const [x] = deps as [number]
				return x * x
			}
			const localToString = (value: number) => `Result: ${value}` as const

			// @ts-ignore -- Future lookback, should transform be forced to original type?
			signal.computed("squared", ["base"], square, { transform: localToString })

			expect(signal.get("squared")).toBe("Result: 100")
			expect(signal.getRawValue("squared")).toBe(100)
		})

		it("should handle computed chains", () => {
			signal.create("initial", 2)

			// First computed: double
			signal.computed("doubled", ["initial"], (...deps: unknown[]) => {
				const [x] = deps as [number]
				return x * 2
			})

			// Second computed: depends on first
			signal.computed("quadrupled", ["doubled"], (...deps: unknown[]) => {
				const [x] = deps as [number]
				return x * 2
			})

			expect(signal.get("doubled")).toBe(4)
			expect(signal.get("quadrupled")).toBe(8)

			signal.set("initial", 3)
			expect(signal.get("doubled")).toBe(6)
			expect(signal.get("quadrupled")).toBe(12)
		})
	})

	describe("DOM Bindings", () => {
		let mockElement: HTMLElement

		beforeEach(() => {
			mockElement = {
				isConnected: true,
				textContent: "",
				style: {},
				classList: { add: vi.fn(), remove: vi.fn() },
			} as any
		})

		it("should bind element to signal", () => {
			signal.create("bind-signal", "Hello Signal!")

			const bindingFn = vi.fn() as Mock<BindingFunction<string>>
			const cleanup = signal.bind(mockElement, "bind-signal", bindingFn)

			expect(bindingFn).toHaveBeenCalledWith(mockElement, "Hello Signal!")
			expect(cleanup).toBeInstanceOf(Function)
		})

		it("should update bound element when signal changes", () => {
			signal.create("dynamic-text", "Initial Text")

			const bindingFn = vi.fn() as Mock<BindingFunction<string>>
			signal.bind(mockElement, "dynamic-text", bindingFn)

			bindingFn.mockClear()
			signal.set("dynamic-text", "Updated Text")

			expect(bindingFn).toHaveBeenCalledWith(mockElement, "Updated Text")
		})

		it("should bind with condition", () => {
			signal.create("conditional-value", 100)

			const condition: ConditionFunction<number> = (value: number) => value >= 50
			const bindingFn = vi.fn() as Mock<BindingFunction<number>>

			signal.bindWhen(mockElement, "conditional-value", condition, bindingFn)

			expect(bindingFn).toHaveBeenCalledWith(mockElement, 100)
		})

		it("should not bind when condition fails", () => {
			signal.create("low-value", 25)

			const condition: ConditionFunction<number> = (value: number) => value >= 50
			const bindingFn = vi.fn() as Mock<BindingFunction<number>>

			signal.bindWhen(mockElement, "low-value", condition, bindingFn)

			expect(bindingFn).not.toHaveBeenCalled()
		})

		it("should cleanup bindings", () => {
			signal.create("cleanup-bind", "value")

			const bindingFn = vi.fn() as Mock<BindingFunction<string>>
			const cleanup = signal.bind(mockElement, "cleanup-bind", bindingFn) ?? (() => {})

			cleanup()
			bindingFn.mockClear()

			signal.set("cleanup-bind", "new-value")
			expect(bindingFn).not.toHaveBeenCalled()
		})

		it("should return null for invalid bindings", () => {
			const bindingFn = vi.fn() as Mock<BindingFunction<string>>
			const cleanup = signal.bind(mockElement, "non-existent", bindingFn)

			expect(cleanup).toBeNull()
		})
	})

	describe("Subscriptions", () => {
		it("should subscribe to signal changes", () => {
			signal.create("sub-signal", "initial")

			const callback = vi.fn() as Mock<CallbackFunction<string>>
			const cleanup = signal.subscribe("sub-signal", callback)

			expect(callback).not.toHaveBeenCalled()
			expect(cleanup).toBeInstanceOf(Function)

			signal.set("sub-signal", "updated")
			expect(callback).toHaveBeenCalledWith("updated")
			expect(callback).toHaveBeenCalledTimes(1)
		})

		it("should call subscription on updates", () => {
			signal.create("notification", "first")

			const callback = vi.fn() as Mock<CallbackFunction<string>>
			signal.subscribe("notification", callback)

			callback.mockClear()
			signal.set("notification", "second")

			expect(callback).toHaveBeenCalledWith("second")
		})

		it("should cleanup subscriptions", () => {
			signal.create("sub-cleanup", "value")

			const callback = vi.fn() as Mock<CallbackFunction<string>>
			const cleanup = signal.subscribe("sub-cleanup", callback) ?? (() => {})

			cleanup()
			callback.mockClear()

			signal.set("sub-cleanup", "new-value")
			expect(callback).not.toHaveBeenCalled()
		})

		it("should return null for non-existent signal subscription", () => {
			const callback = vi.fn() as Mock<CallbackFunction<string>>
			const cleanup = signal.subscribe("non-existent", callback)

			expect(cleanup).toBeNull()
		})

		it("should handle multiple subscribers", () => {
			signal.create("multi-sub", "shared")

			const callback1 = vi.fn() as Mock<CallbackFunction<string>>
			const callback2 = vi.fn() as Mock<CallbackFunction<string>>

			signal.subscribe("multi-sub", callback1)
			signal.subscribe("multi-sub", callback2)

			callback1.mockClear()
			callback2.mockClear()

			signal.set("multi-sub", "updated")

			expect(callback1).toHaveBeenCalledWith("updated")
			expect(callback2).toHaveBeenCalledWith("updated")
		})
	})

	describe("Batch Operations", () => {
		it("should batch multiple updates", () => {
			signal.create("batch1", "a")
			signal.create("batch2", "b")
			signal.create("batch3", "c")

			const callback1 = vi.fn() as Mock<CallbackFunction<string>>
			const callback2 = vi.fn() as Mock<CallbackFunction<string>>
			const callback3 = vi.fn() as Mock<CallbackFunction<string>>

			signal.subscribe("batch1", callback1)
			signal.subscribe("batch2", callback2)
			signal.subscribe("batch3", callback3)

			callback1.mockClear()
			callback2.mockClear()
			callback3.mockClear()

			signal.batch(() => {
				signal.set("batch1", "A")
				signal.set("batch2", "B")
				signal.set("batch3", "C")

				// Callbacks should not be called yet
				expect(callback1).not.toHaveBeenCalled()
				expect(callback2).not.toHaveBeenCalled()
				expect(callback3).not.toHaveBeenCalled()
			})

			// All callbacks should be called after batch
			expect(callback1).toHaveBeenCalledWith("A")
			expect(callback2).toHaveBeenCalledWith("B")
			expect(callback3).toHaveBeenCalledWith("C")
		})

		it("should handle nested batches", () => {
			signal.create("nested", 0)
			const callback = vi.fn() as Mock<CallbackFunction<number>>
			signal.subscribe("nested", callback)

			callback.mockClear()

			signal.batch(() => {
				signal.set("nested", 1)

				signal.batch(() => {
					signal.set("nested", 2)
					signal.set("nested", 3)
				})

				signal.set("nested", 4)
			})

			expect(callback).toHaveBeenCalledTimes(1)
			expect(callback).toHaveBeenCalledWith(4)
		})

		it("should batch computed updates", () => {
			signal.create("dep1", 1)
			signal.create("dep2", 2)

			const computeFn = vi.fn((...deps: unknown[]) => {
				const [a, b] = deps as [number, number]
				return a + b
			}) as Mock<ComputeFunction<number>>

			signal.computed("batch-sum", ["dep1", "dep2"], computeFn)

			const callback = vi.fn() as Mock<CallbackFunction<number>>
			signal.subscribe("batch-sum", callback)

			computeFn.mockClear()
			callback.mockClear()

			signal.batch(() => {
				signal.set("dep1", 10)
				signal.set("dep2", 20)
			})

			expect(callback).toHaveBeenCalledWith(30)
		})
	})

	describe("Cleanup & Management", () => {
		it("should remove individual signals", () => {
			signal.create("removable", "value")

			expect(signal.get("removable")).toBe("value")

			signal.remove("removable")

			expect(signal.get("removable")).toBeUndefined()
		})

		it("should get active signals", () => {
			signal.create("active1", "a")
			signal.create("active2", "b")
			signal.create("active3", "c")

			const activeSignals = signal.getActiveSignals()

			expect(activeSignals).toContain("active1")
			expect(activeSignals).toContain("active2")
			expect(activeSignals).toContain("active3")
		})

		it("should remove signals by prefix", () => {
			signal.create("user.name", "John")
			signal.create("user.email", "john@example.com")
			signal.create("user.age", 30)
			signal.create("app.theme", "dark")
			signal.create("app.lang", "en")

			signal.removeByPrefix("user.")

			expect(signal.get("user.name")).toBeUndefined()
			expect(signal.get("user.email")).toBeUndefined()
			expect(signal.get("user.age")).toBeUndefined()
			expect(signal.get("app.theme")).toBe("dark")
			expect(signal.get("app.lang")).toBe("en")
		})

		it("should handle removal of non-existent signals", () => {
			expect(() => {
				signal.remove("does-not-exist")
			}).not.toThrow()
		})

		it("should cleanup all bindings when signal is removed", () => {
			signal.create("multi-cleanup", "value")

			const callback1 = vi.fn() as Mock<CallbackFunction<string>>
			const callback2 = vi.fn() as Mock<CallbackFunction<string>>
			const bindingFn = vi.fn() as Mock<BindingFunction<string>>

			const mockElement = { isConnected: true } as HTMLElement

			signal.subscribe("multi-cleanup", callback1)
			signal.subscribe("multi-cleanup", callback2)
			signal.bind(mockElement, "multi-cleanup", bindingFn)

			signal.remove("multi-cleanup")

			callback1.mockClear()
			callback2.mockClear()
			bindingFn.mockClear()

			// Create new signal with same ID
			signal.create("multi-cleanup", "new-value")

			// Old subscriptions should not be called
			expect(callback1).not.toHaveBeenCalled()
			expect(callback2).not.toHaveBeenCalled()
			expect(bindingFn).not.toHaveBeenCalled()
		})
	})

	describe("Edge Cases & Error Handling", () => {
		it("should handle complex nested objects", () => {
			const complexObject = {
				user: {
					name: "John",
					preferences: {
						theme: "dark",
						notifications: {
							email: true,
							push: false,
						},
					},
				},
				data: [1, 2, { nested: "value" }],
			}

			signal.create("complex", complexObject)
			const retrieved = signal.get<typeof complexObject>("complex")

			expect(retrieved).toEqual(complexObject)
			expect(retrieved?.user.preferences.notifications.email).toBe(true)
		})

		it("should handle function values", () => {
			const testFunction = (x: number) => x * 2
			signal.create("func-signal", testFunction)

			const retrievedFn = signal.get<(x: number) => number>("func-signal")
			expect(retrievedFn?.(5)).toBe(10)
		})

		it("should handle WeakMap and WeakSet", () => {
			const weakMap = new WeakMap()
			const weakSet = new WeakSet()
			const obj = {}

			weakMap.set(obj, "test-value")
			weakSet.add(obj)

			signal.create("weak-map", weakMap)
			signal.create("weak-set", weakSet)

			const retrievedMap = signal.get<WeakMap<object, string>>("weak-map")
			const retrievedSet = signal.get<WeakSet<object>>("weak-set")

			expect(retrievedMap?.get(obj)).toBe("test-value")
			expect(retrievedSet?.has(obj)).toBe(true)
		})

		it("should handle Symbol values", () => {
			const testSymbol = Symbol("test")
			signal.create("symbol-signal", testSymbol)

			expect(signal.get("symbol-signal")).toBe(testSymbol)
		})

		it("should handle BigInt values", () => {
			const bigIntValue = BigInt("9007199254740991")
			signal.create("bigint-signal", bigIntValue)

			expect(signal.get("bigint-signal")).toBe(bigIntValue)
		})

		it("should handle RegExp values", () => {
			const regexValue = /test-pattern/gi
			signal.create("regex-signal", regexValue)

			const retrieved = signal.get<RegExp>("regex-signal")
			expect(retrieved?.test("TEST-PATTERN")).toBe(true)
		})

		it("should handle Buffer/TypedArray values (if available)", () => {
			if (typeof Buffer !== "undefined") {
				const buffer = Buffer.from("hello world", "utf8")
				signal.create("buffer-signal", buffer)

				const retrieved = signal.get<Buffer>("buffer-signal")
				expect(retrieved?.toString("utf8")).toBe("hello world")
			}

			const uint8Array = new Uint8Array([1, 2, 3, 4, 5])
			signal.create("typed-array", uint8Array)

			const retrieved = signal.get<Uint8Array>("typed-array")
			expect(Array.from(retrieved ?? [])).toEqual([1, 2, 3, 4, 5])
		})
	})
})
