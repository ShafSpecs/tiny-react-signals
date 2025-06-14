import { type Mock, beforeEach, describe, expect, test, vi } from "vitest"
import { REACTIVE_CORE } from "../src/core"
import type {
	BindingFunction,
	CallbackFunction,
	ComputeFunction,
	ConditionFunction,
	TypedComputeFunction,
} from "../src/core"

describe("Ultimate React Core Test Suite", () => {
	beforeEach(() => {
		const activeSignals = REACTIVE_CORE.getActiveSignals()
		for (const id of activeSignals) {
			REACTIVE_CORE.cleanup(id)
		}
	})

	describe("Signal Creation & Management", () => {
		test("should create a signal with initial value", () => {
			const signal = REACTIVE_CORE.createSignal("test", "hello")

			expect(signal.value).toBe("hello")
			expect(signal.rawValue).toBe("hello")
			expect(signal.bindings).toBeInstanceOf(Map)
			expect(signal.callbacks).toBeInstanceOf(Map)
			expect(signal.computed).toBeInstanceOf(Set)
			expect(signal.hasTransformers).toBe(false)
			expect(signal.hasComputed).toBe(false)
		})

		test("should create signal with transformers", () => {
			const upperCaseTransform = (value: string) => value.toUpperCase()
			const signal = REACTIVE_CORE.createSignal("test-transform", "hello", {
				transform: upperCaseTransform,
			})

			expect(signal.value).toBe("HELLO")
			expect(signal.rawValue).toBe("hello")
			expect(signal.hasTransformers).toBe(true)
		})

		test("should create signal with transformer chain", () => {
			const upperCase = (value: string) => value.toUpperCase()
			const addExclamation = (value: string) => `${value}!`

			const signal = REACTIVE_CORE.createSignal("test-chain", "hello", {
				transform: [upperCase, addExclamation],
			})

			expect(signal.value).toBe("HELLO!")
			expect(signal.rawValue).toBe("hello")
		})

		test("should return existing signal if it already exists", () => {
			const signal1 = REACTIVE_CORE.createSignal("existing", "value1")
			const signal2 = REACTIVE_CORE.createSignal("existing", "value2")

			expect(signal1).toBe(signal2)
			expect(signal1.value).toBe("value1") // Should keep original value
		})

		test("should upsert signal (create new)", () => {
			const signal = REACTIVE_CORE.upsertSignal("new-signal", "initial")

			expect(signal.value).toBe("initial")
			expect(REACTIVE_CORE.getValue("new-signal")).toBe("initial")
		})

		test("should upsert signal (return existing)", () => {
			REACTIVE_CORE.createSignal("existing-upsert", "original")
			const signal = REACTIVE_CORE.upsertSignal("existing-upsert", "new")

			expect(signal.value).toBe("original") // Should keep original value
		})

		test("should merge transformers on upsert", () => {
			const upperCase = (value: string) => value.toUpperCase()
			const addExclamation = (value: string) => `${value}!`

			REACTIVE_CORE.createSignal("merge-transform", "hello", { transform: upperCase })
			const signal = REACTIVE_CORE.upsertSignal("merge-transform", "hello", { transform: addExclamation })

			// Should have both transformers
			expect(signal.hasTransformers).toBe(true)
			expect(signal.transformers).toHaveLength(2)
		})
	})

	describe("Signal Updates & Values", () => {
		test("should update signal value", () => {
			REACTIVE_CORE.createSignal("update-test", "initial")
			REACTIVE_CORE.updateSignal("update-test", "updated")

			expect(REACTIVE_CORE.getValue("update-test")).toBe("updated")
		})

		test("should apply transformers on update", () => {
			const upperCase = (value: string) => value.toUpperCase()
			REACTIVE_CORE.createSignal("transform-update", "hello", { transform: upperCase })

			REACTIVE_CORE.updateSignal("transform-update", "world")

			expect(REACTIVE_CORE.getValue("transform-update")).toBe("WORLD")
			expect(REACTIVE_CORE.getRawValue("transform-update")).toBe("world")
		})

		test("should not trigger updates if value is unchanged", () => {
			const callback = vi.fn()
			REACTIVE_CORE.createSignal("no-change", "value")
			REACTIVE_CORE.subscribe("no-change", callback)

			// Clear initial call
			callback.mockClear()

			REACTIVE_CORE.updateSignal("no-change", "value")

			expect(callback).not.toHaveBeenCalled()
		})

		test("should ignore updates to non-existent signals", () => {
			// Should not throw
			expect(() => {
				REACTIVE_CORE.updateSignal("non-existent", "value")
			}).not.toThrow()
		})

		test("should return undefined for non-existent signal values", () => {
			expect(REACTIVE_CORE.getValue("non-existent")).toBeUndefined()
			expect(REACTIVE_CORE.getRawValue("non-existent")).toBeUndefined()
		})
	})

	describe("Computed Signals", () => {
		test("should create computed signal", () => {
			REACTIVE_CORE.createSignal("dep1", 10)
			REACTIVE_CORE.createSignal("dep2", 20)

			const computeFn: TypedComputeFunction<number> = (a: number, b: number) => a + b
			const computed = REACTIVE_CORE.createComputed("sum", ["dep1", "dep2"], computeFn)

			expect(computed.value).toBe(30)
			expect(computed.computeFn).toBe(computeFn)
			expect(computed.dependencies).toEqual(["dep1", "dep2"])
		})

		test("should update computed signal when dependencies change", () => {
			REACTIVE_CORE.createSignal("a", 5)
			REACTIVE_CORE.createSignal("b", 3)

			const computeFn = (a: number, b: number) => a * b
			REACTIVE_CORE.createComputed("product", ["a", "b"], computeFn)

			expect(REACTIVE_CORE.getValue("product")).toBe(15)

			REACTIVE_CORE.updateSignal("a", 10)
			expect(REACTIVE_CORE.getValue("product")).toBe(30)

			REACTIVE_CORE.updateSignal("b", 4)
			expect(REACTIVE_CORE.getValue("product")).toBe(40)
		})

		test("should not create a new computed signal if upserted", () => {
			REACTIVE_CORE.createSignal("a", 5)
			REACTIVE_CORE.createSignal("b", 3)
			REACTIVE_CORE.createSignal("c", 4)

			REACTIVE_CORE.createComputed("product", ["a", "b"], (a: number, b: number) => a * b)
			const computed = REACTIVE_CORE.upsertComputed("product", ["a", "c"], (a: number, c: number) => a + c)

			expect(computed.value).toBe(15)
			expect(REACTIVE_CORE.getValue("product")).toBe(15)
		})

		test("should apply transformers to computed signals", () => {
			REACTIVE_CORE.createSignal("x", 2)
			REACTIVE_CORE.createSignal("y", 3)

			const multiply = (x: number, y: number) => x * y
			const double = (value: number) => value * 2

			REACTIVE_CORE.createComputed("computed-transform", ["x", "y"], multiply, {
				transform: double,
			})

			expect(REACTIVE_CORE.getValue("computed-transform")).toBe(12) // (2 * 3) * 2
			expect(REACTIVE_CORE.getRawValue("computed-transform")).toBe(6) // 2 * 3
		})

		test("should mark dependency signals as having computed", () => {
			REACTIVE_CORE.createSignal("dep", 5)
			const depSignal = REACTIVE_CORE.createSignal("dep", 5) // Get reference

			REACTIVE_CORE.createComputed("comp", ["dep"], (x: number) => x * 2)

			expect(depSignal.hasComputed).toBe(true)
			expect(depSignal.computed.has("comp")).toBe(true)
		})
	})

	describe("DOM Bindings", () => {
		let mockElement: HTMLElement

		beforeEach(() => {
			mockElement = {
				isConnected: true,
			} as HTMLElement
		})

		test("should bind element to signal", () => {
			REACTIVE_CORE.createSignal("bind-test", "hello")

			const bindingFn: BindingFunction<string> = vi.fn()
			const cleanup = REACTIVE_CORE.bindElement(mockElement, "bind-test", bindingFn)

			expect(bindingFn).toHaveBeenCalledWith(mockElement, "hello")
			expect(cleanup).toBeInstanceOf(Function)
		})

		test("should update bound element when signal changes", () => {
			REACTIVE_CORE.createSignal("element-update", "initial")

			const bindingFn: Mock<BindingFunction<string>> = vi.fn()
			REACTIVE_CORE.bindElement(mockElement, "element-update", bindingFn)

			bindingFn.mockClear()
			REACTIVE_CORE.updateSignal("element-update", "updated")

			expect(bindingFn).toHaveBeenCalledWith(mockElement, "updated")
		})

		test("should cleanup binding", () => {
			REACTIVE_CORE.createSignal("cleanup-test", "value")

			const bindingFn: Mock<BindingFunction<string>> = vi.fn()
			const cleanup = REACTIVE_CORE.bindElement(mockElement, "cleanup-test", bindingFn) ?? (() => {})

			cleanup()
			bindingFn.mockClear()

			REACTIVE_CORE.updateSignal("cleanup-test", "new-value")
			expect(bindingFn).not.toHaveBeenCalled()
		})

		test("should bind with condition", () => {
			REACTIVE_CORE.createSignal("conditional", 5)

			const condition: ConditionFunction<number> = (value: number) => value > 3
			const bindingFn: BindingFunction<number> = vi.fn()

			REACTIVE_CORE.bindWhen(mockElement, "conditional", condition, bindingFn)

			expect(bindingFn).toHaveBeenCalledWith(mockElement, 5)
		})

		test("should not bind when condition is false", () => {
			REACTIVE_CORE.createSignal("no-bind", 2)

			const condition: ConditionFunction<number> = (value: number) => value > 3
			const bindingFn: BindingFunction<number> = vi.fn()

			REACTIVE_CORE.bindWhen(mockElement, "no-bind", condition, bindingFn)

			expect(bindingFn).not.toHaveBeenCalled()
		})

		test("should handle disconnected elements", () => {
			const disconnectedElement = { isConnected: false } as HTMLElement
			REACTIVE_CORE.createSignal("disconnected", "value")

			const bindingFn: Mock<BindingFunction<string>> = vi.fn()
			REACTIVE_CORE.bindElement(disconnectedElement, "disconnected", bindingFn)

			bindingFn.mockClear()
			REACTIVE_CORE.updateSignal("disconnected", "new-value")

			// Should not call binding for disconnected elements
			expect(bindingFn).not.toHaveBeenCalled()
		})

		test("should return null for non-existent signal binding", () => {
			const bindingFn: Mock<BindingFunction<string>> = vi.fn()
			const cleanup = REACTIVE_CORE.bindElement(mockElement, "non-existent", bindingFn)

			expect(cleanup).toBeNull()
		})
	})

	describe("Subscriptions", () => {
		test("should subscribe to signal changes", () => {
			REACTIVE_CORE.createSignal("sub-test", "initial")

			const callback: Mock<CallbackFunction<string>> = vi.fn()
			const cleanup = REACTIVE_CORE.subscribe("sub-test", callback)

			expect(callback).not.toHaveBeenCalled()

			REACTIVE_CORE.updateSignal("sub-test", "updated")
			expect(callback).toHaveBeenCalledWith("updated")
			expect(callback).toHaveBeenCalledTimes(1)

			expect(cleanup).toBeInstanceOf(Function)
		})

		test("should call subscription callback on updates", () => {
			REACTIVE_CORE.createSignal("sub-update", "old")

			const callback: Mock<CallbackFunction<string>> = vi.fn()
			REACTIVE_CORE.subscribe("sub-update", callback)

			callback.mockClear()
			REACTIVE_CORE.updateSignal("sub-update", "new")

			expect(callback).toHaveBeenCalledWith("new")
		})

		test("should cleanup subscription", () => {
			REACTIVE_CORE.createSignal("sub-cleanup", "value")

			const callback: Mock<CallbackFunction<string>> = vi.fn()
			const cleanup = REACTIVE_CORE.subscribe("sub-cleanup", callback) ?? (() => {})

			cleanup()
			callback.mockClear()

			REACTIVE_CORE.updateSignal("sub-cleanup", "new-value")
			expect(callback).not.toHaveBeenCalled()
		})

		test("should return null for non-existent signal subscription", () => {
			const callback: Mock<CallbackFunction<string>> = vi.fn()
			const cleanup = REACTIVE_CORE.subscribe("non-existent", callback)

			expect(cleanup).toBeNull()
		})
	})

	describe("Batch Updates", () => {
		test("should batch multiple updates", () => {
			REACTIVE_CORE.createSignal("batch1", 0)
			REACTIVE_CORE.createSignal("batch2", 0)

			const callback1 = vi.fn()
			const callback2 = vi.fn()

			REACTIVE_CORE.subscribe("batch1", callback1)
			REACTIVE_CORE.subscribe("batch2", callback2)

			callback1.mockClear()
			callback2.mockClear()

			REACTIVE_CORE.batchUpdate(() => {
				REACTIVE_CORE.updateSignal("batch1", 1)
				REACTIVE_CORE.updateSignal("batch2", 2)

				// Callbacks should not be called yet
				expect(callback1).not.toHaveBeenCalled()
				expect(callback2).not.toHaveBeenCalled()
			})

			// Callbacks should be called after batch
			expect(callback1).toHaveBeenCalledWith(1)
			expect(callback2).toHaveBeenCalledWith(2)
		})

		test("should handle nested batch updates", () => {
			REACTIVE_CORE.createSignal("nested", 0)
			const callback = vi.fn()
			REACTIVE_CORE.subscribe("nested", callback)

			callback.mockClear()

			REACTIVE_CORE.batchUpdate(() => {
				REACTIVE_CORE.updateSignal("nested", 1)

				REACTIVE_CORE.batchUpdate(() => {
					REACTIVE_CORE.updateSignal("nested", 2)
				})

				REACTIVE_CORE.updateSignal("nested", 3)
			})

			expect(callback).toHaveBeenCalledTimes(1)
			expect(callback).toHaveBeenCalledWith(3)
		})

		test("should batch computed signal updates", () => {
			REACTIVE_CORE.createSignal("dep1", 1)
			REACTIVE_CORE.createSignal("dep2", 2)

			const computeFn = vi.fn((a: number, b: number) => a + b)
			REACTIVE_CORE.createComputed("batch-computed", ["dep1", "dep2"], computeFn)

			const callback = vi.fn()
			REACTIVE_CORE.subscribe("batch-computed", callback)

			computeFn.mockClear()
			callback.mockClear()

			REACTIVE_CORE.batchUpdate(() => {
				REACTIVE_CORE.updateSignal("dep1", 10)
				REACTIVE_CORE.updateSignal("dep2", 20)
			})

			expect(callback).toHaveBeenCalledWith(30)
		})
	})

	describe("Cleanup Operations", () => {
		test("should cleanup signal and its bindings", () => {
			REACTIVE_CORE.createSignal("cleanup-signal", "value")

			const bindingFn: BindingFunction<string> = vi.fn()
			const callback: CallbackFunction<string> = vi.fn()
			const mockElement = { isConnected: true } as HTMLElement

			REACTIVE_CORE.bindElement(mockElement, "cleanup-signal", bindingFn)
			REACTIVE_CORE.subscribe("cleanup-signal", callback)

			REACTIVE_CORE.cleanup("cleanup-signal")

			expect(REACTIVE_CORE.getValue("cleanup-signal")).toBeUndefined()
			expect(REACTIVE_CORE.getActiveSignals()).not.toContain("cleanup-signal")
		})

		test("should get active signals", () => {
			REACTIVE_CORE.createSignal("active1", "value1")
			REACTIVE_CORE.createSignal("active2", "value2")

			const activeSignals = REACTIVE_CORE.getActiveSignals()

			expect(activeSignals).toContain("active1")
			expect(activeSignals).toContain("active2")
		})

		test("should cleanup signals matching pattern", () => {
			REACTIVE_CORE.createSignal("user.name", "John")
			REACTIVE_CORE.createSignal("user.email", "john@example.com")
			REACTIVE_CORE.createSignal("app.theme", "dark")

			REACTIVE_CORE.cleanupMatching("user.")

			expect(REACTIVE_CORE.getValue("user.name")).toBeUndefined()
			expect(REACTIVE_CORE.getValue("user.email")).toBeUndefined()
			expect(REACTIVE_CORE.getValue("app.theme")).toBe("dark")
		})

		test("should handle cleanup of non-existent signals", () => {
			expect(() => {
				REACTIVE_CORE.cleanup("non-existent")
			}).not.toThrow()
		})
	})

	describe("Edge Cases & Error Handling", () => {
		test("should handle null/undefined elements in bindings", () => {
			REACTIVE_CORE.createSignal("null-element", "value")

			const bindingFn: BindingFunction<string> = vi.fn()
			const cleanup = REACTIVE_CORE.bindElement(null as any, "null-element", bindingFn)

			expect(cleanup).toBeNull()
		})

		test("should handle complex transformer chains", () => {
			const transform1 = (value: number) => value * 2
			const transform2 = (value: number) => value + 10
			const transform3 = (value: number) => value / 2

			REACTIVE_CORE.createSignal("complex-transform", 5, {
				transform: [transform1, transform2, transform3],
			})

			// (5 * 2 + 10) / 2 = 10
			expect(REACTIVE_CORE.getValue("complex-transform")).toBe(10)
		})

		test("should handle computed signals with no dependencies", () => {
			const computeFn: ComputeFunction<string> = () => "constant"
			const computed = REACTIVE_CORE.createComputed("no-deps", [], computeFn)

			expect(computed.value).toBe("constant")
		})

		test("should handle recomputation with missing dependencies", () => {
			REACTIVE_CORE.createSignal("temp-dep", 5)
			const computeFn: TypedComputeFunction<number> = (value: number) => value * 2
			REACTIVE_CORE.createComputed("temp-computed", ["temp-dep"], computeFn)

			// Remove dependency
			REACTIVE_CORE.cleanup("temp-dep")

			// Should not throw when recomputing
			expect(() => {
				REACTIVE_CORE.recomputeSignal("temp-computed")
			}).not.toThrow()
		})
	})
})
