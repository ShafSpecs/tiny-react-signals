import { type Mock, beforeEach, describe, expect, it, vi } from "vitest"
import { REACTIVE_CORE } from "../src/core"
import type { BindingFunction, ComputeFunction, TypedComputeFunction } from "../src/core"
import { reactive } from "../src/reactive"

describe("Reactive API Test Suite", () => {
	beforeEach(() => {
		const activeSignals = REACTIVE_CORE.getActiveSignals()
		for (const id of activeSignals) {
			REACTIVE_CORE.cleanup(id)
		}
	})

	describe("Signal Creation & Management", () => {
		it("should create a signal with initial value", () => {
			const signal = reactive.createSignal("test-signal", "hello world")

			expect(signal.value).toBe("hello world")
			expect(signal.rawValue).toBe("hello world")
			expect(signal.bindings).toBeInstanceOf(Map)
			expect(signal.callbacks).toBeInstanceOf(Map)
			expect(signal.computed).toBeInstanceOf(Set)
		})

		it("should create signal with complex initial value", () => {
			const complexValue = { name: "John", age: 30, hobbies: ["reading", "coding"] }
			const signal = reactive.createSignal("complex-signal", complexValue)

			expect(signal.value).toEqual(complexValue)
			expect(signal.value).toBe(complexValue) // Same reference
		})

		it("should upsert signal (create new)", () => {
			const signal = reactive.upsertSignal("new-reactive", "fresh")

			expect(signal.value).toBe("fresh")
			expect(reactive.getValue("new-reactive")).toBe("fresh")
		})

		it("should upsert signal (return existing)", () => {
			reactive.createSignal("existing-reactive", "original")
			const signal = reactive.upsertSignal("existing-reactive", "updated")

			expect(signal.value).toBe("original") // Should keep original value
			expect(reactive.getValue("existing-reactive")).toBe("original")
		})

		it("should handle numeric signals", () => {
			reactive.createSignal("counter", 0)

			expect(reactive.getValue("counter")).toBe(0)

			reactive.updateSignal("counter", 42)
			expect(reactive.getValue("counter")).toBe(42)
		})

		it("should handle boolean signals", () => {
			reactive.createSignal("isActive", false)

			expect(reactive.getValue("isActive")).toBe(false)

			reactive.updateSignal("isActive", true)
			expect(reactive.getValue("isActive")).toBe(true)
		})

		it("should handle array signals", () => {
			const initialArray = [1, 2, 3]
			reactive.createSignal("numbers", initialArray)

			expect(reactive.getValue("numbers")).toEqual([1, 2, 3])

			const newArray = [4, 5, 6]
			reactive.updateSignal("numbers", newArray)
			expect(reactive.getValue("numbers")).toEqual([4, 5, 6])
		})
	})

	describe("Signal Updates & Values", () => {
		it("should update signal value", () => {
			reactive.createSignal("update-test", "initial")
			reactive.updateSignal("update-test", "updated")

			expect(reactive.getValue("update-test")).toBe("updated")
		})

		it("should handle multiple rapid updates", () => {
			reactive.createSignal("rapid-update", 0)

			for (let i = 1; i <= 10; i++) {
				reactive.updateSignal("rapid-update", i)
			}

			expect(reactive.getValue("rapid-update")).toBe(10)
		})

		it("should return undefined for non-existent signals", () => {
			expect(reactive.getValue("does-not-exist")).toBeUndefined()
		})

		it("should handle null and undefined values", () => {
			reactive.createSignal("null-value", null)
			reactive.createSignal("undefined-value", undefined)

			expect(reactive.getValue("null-value")).toBeNull()
			expect(reactive.getValue("undefined-value")).toBeUndefined()
		})

		it("should not throw on updating non-existent signals", () => {
			expect(() => {
				reactive.updateSignal("ghost-signal", "phantom-value")
			}).not.toThrow()
		})
	})

	describe("Computed Signals", () => {
		it("should create simple computed signal", () => {
			reactive.createSignal("firstName", "John")
			reactive.createSignal("lastName", "Doe")

			const computeFullName: ComputeFunction<string> = (...deps: unknown[]) => {
				const [first, last] = deps as [string, string]
				return `${first} ${last}`
			}
			reactive.createComputed("fullName", ["firstName", "lastName"], computeFullName)

			expect(reactive.getValue("fullName")).toBe("John Doe")
		})

		it("should update computed when dependencies change", () => {
			reactive.createSignal("price", 100)
			reactive.createSignal("taxRate", 0.1)

			const computeTotal: ComputeFunction<number> = (...deps: unknown[]) => {
				const [price, rate] = deps as [number, number]
				return price * (1 + rate)
			}
			reactive.createComputed("totalPrice", ["price", "taxRate"], computeTotal)

			// According to JS, the value is 110.00000000000001 🙄
			expect(reactive.getValue("totalPrice")).toBeCloseTo(110, 10)

			reactive.updateSignal("price", 200)
			expect(reactive.getValue("totalPrice")).toBeCloseTo(220, 10)

			reactive.updateSignal("taxRate", 0.2)
			expect(reactive.getValue("totalPrice")).toBeCloseTo(240, 10)
		})

		it("should handle computed with single dependency", () => {
			reactive.createSignal("radius", 5)

			const computeArea: TypedComputeFunction<number> = (r: number) => Math.PI * r * r
			reactive.createComputed("area", ["radius"], computeArea)

			expect(reactive.getValue("area")).toBeCloseTo(78.54, 2)

			reactive.updateSignal("radius", 10)
			expect(reactive.getValue("area")).toBeCloseTo(314.16, 2)
		})

		it("should handle complex computed chains", () => {
			reactive.createSignal("base", 10)

			// First computed: double the base
			reactive.createComputed("doubled", ["base"], (x: number) => x * 2)

			// Second computed: depends on first computed
			reactive.createComputed("quadrupled", ["doubled"], (x: number) => x * 2)

			expect(reactive.getValue("doubled")).toBe(20)
			expect(reactive.getValue("quadrupled")).toBe(40)

			reactive.updateSignal("base", 5)
			expect(reactive.getValue("doubled")).toBe(10)
			expect(reactive.getValue("quadrupled")).toBe(20)
		})

		it("should handle computed with array dependencies", () => {
			reactive.createSignal("numbers", [1, 2, 3, 4, 5])

			const computeSum: TypedComputeFunction<number> = (numbers: number[]) => numbers.reduce((sum, num) => sum + num, 0)
			reactive.createComputed("sum", ["numbers"], computeSum)

			expect(reactive.getValue("sum")).toBe(15)

			reactive.updateSignal("numbers", [10, 20, 30])
			expect(reactive.getValue("sum")).toBe(60)
		})
	})

	describe("DOM Bindings", () => {
		let mockElement: HTMLElement

		beforeEach(() => {
			mockElement = {
				isConnected: true,
				textContent: "",
				style: {},
			} as HTMLElement
		})

		it("should bind element to signal", () => {
			reactive.createSignal("bind-test", "Hello Reactive!")

			const bindingFn: Mock<BindingFunction<string>> = vi.fn((el, value) => {
				el.textContent = value
			})

			const cleanup = reactive.bindElement(mockElement, "bind-test", bindingFn as any)

			expect(bindingFn).toHaveBeenCalledWith(mockElement, "Hello Reactive!")
			expect(cleanup).toBeInstanceOf(Function)
		})

		it("should update bound element when signal changes", () => {
			reactive.createSignal("text-content", "Initial Text")

			const bindingFn: Mock<BindingFunction<string>> = vi.fn((el, value) => {
				el.textContent = value
			})

			reactive.bindElement(mockElement, "text-content", bindingFn as any)
			bindingFn.mockClear()

			reactive.updateSignal("text-content", "Updated Text")

			expect(bindingFn).toHaveBeenCalledWith(mockElement, "Updated Text")
		})

		it("should bind with condition", () => {
			reactive.createSignal("score", 85)

			const condition = (score: number) => score >= 80
			const bindingFn: Mock<BindingFunction<number>> = vi.fn((el, value) => {
				el.textContent = `Passed: ${value}`
			})

			reactive.bindWhen(mockElement, "score", condition, bindingFn)

			expect(bindingFn).toHaveBeenCalledWith(mockElement, 85)
		})

		it("should not bind when condition fails", () => {
			reactive.createSignal("score", 65)

			const condition = (score: number) => score >= 80
			const bindingFn: Mock<BindingFunction<number>> = vi.fn()

			reactive.bindWhen(mockElement, "score", condition, bindingFn)

			expect(bindingFn).not.toHaveBeenCalled()
		})

		it("should cleanup binding properly", () => {
			reactive.createSignal("cleanup-binding", "value")

			const bindingFn: Mock<BindingFunction<string>> = vi.fn()
			const cleanup = reactive.bindElement(mockElement, "cleanup-binding", bindingFn as any) ?? (() => {})

			cleanup()
			bindingFn.mockClear()

			reactive.updateSignal("cleanup-binding", "new-value")
			expect(bindingFn).not.toHaveBeenCalled()
		})

		it("should return null for invalid binding", () => {
			const bindingFn: Mock<BindingFunction<string>> = vi.fn()
			const cleanup = reactive.bindElement(mockElement, "non-existent", bindingFn as any)

			expect(cleanup).toBeNull()
		})
	})

	describe("Batch Updates", () => {
		let mockElement: HTMLElement

		beforeEach(() => {
			mockElement = {
				isConnected: true,
				textContent: "",
				style: {},
			} as HTMLElement
		})

		it("should batch multiple signal updates", () => {
			reactive.createSignal("user.name", "John")
			reactive.createSignal("user.email", "john@old.com")
			reactive.createSignal("user.age", 25)

			const nameBinding: Mock<BindingFunction<string>> = vi.fn()
			const emailBinding: Mock<BindingFunction<string>> = vi.fn()
			const ageBinding: Mock<BindingFunction<number>> = vi.fn()

			reactive.bindElement(mockElement, "user.name", nameBinding as any)
			reactive.bindElement(mockElement, "user.email", emailBinding as any)
			reactive.bindElement(mockElement, "user.age", ageBinding as any)

			nameBinding.mockClear()
			emailBinding.mockClear()
			ageBinding.mockClear()

			reactive.batchUpdate(() => {
				reactive.updateSignal("user.name", "Jane")
				reactive.updateSignal("user.email", "jane@new.com")
				reactive.updateSignal("user.age", 30)

				// Bindings should not be called yet during batch
				expect(nameBinding).not.toHaveBeenCalled()
				expect(emailBinding).not.toHaveBeenCalled()
				expect(ageBinding).not.toHaveBeenCalled()
			})

			// All bindings should be called after batch
			expect(nameBinding).toHaveBeenCalledWith(mockElement, "Jane")
			expect(emailBinding).toHaveBeenCalledWith(mockElement, "jane@new.com")
			expect(ageBinding).toHaveBeenCalledWith(mockElement, 30)
		})

		it("should handle nested batch updates", () => {
			reactive.createSignal("nested-counter", 0)
			const binding: Mock<BindingFunction<number>> = vi.fn()
			reactive.bindElement(mockElement, "nested-counter", binding as any)

			binding.mockClear()

			reactive.batchUpdate(() => {
				reactive.updateSignal("nested-counter", 1)

				reactive.batchUpdate(() => {
					reactive.updateSignal("nested-counter", 2)
					reactive.updateSignal("nested-counter", 3)
				})

				reactive.updateSignal("nested-counter", 4)
			})

			expect(binding).toHaveBeenCalledTimes(1)
			expect(binding).toHaveBeenCalledWith(mockElement, 4)
		})

		it("should batch computed signal updates", () => {
			reactive.createSignal("x", 1)
			reactive.createSignal("y", 2)

			const computeFn = vi.fn((x: number, y: number) => x + y)
			reactive.createComputed("sum", ["x", "y"], computeFn)

			const binding: Mock<BindingFunction<number>> = vi.fn()
			reactive.bindElement(mockElement, "sum", binding as any)

			computeFn.mockClear()
			binding.mockClear()

			reactive.batchUpdate(() => {
				reactive.updateSignal("x", 10)
				reactive.updateSignal("y", 20)
			})

			expect(binding).toHaveBeenCalledWith(mockElement, 30)
		})
	})

	describe("Cleanup Operations", () => {
		let mockElement: HTMLElement

		beforeEach(() => {
			mockElement = {
				isConnected: true,
				textContent: "",
				style: {},
			} as HTMLElement
		})

		it("should cleanup individual signal", () => {
			reactive.createSignal("cleanup-me", "value")

			const binding: Mock<BindingFunction<string>> = vi.fn()
			reactive.bindElement(mockElement, "cleanup-me", binding as any)

			expect(reactive.getValue("cleanup-me")).toBe("value")

			reactive.cleanup("cleanup-me")

			expect(reactive.getValue("cleanup-me")).toBeUndefined()
		})

		it("should handle cleanup of non-existent signals", () => {
			expect(() => {
				reactive.cleanup("does-not-exist")
			}).not.toThrow()
		})

		it("should cleanup all bindings when signal is removed", () => {
			reactive.createSignal("multi-bind", "value")

			const binding1: Mock<BindingFunction<string>> = vi.fn()
			const binding2: Mock<BindingFunction<string>> = vi.fn()

			const mockElement2 = { isConnected: true } as HTMLElement

			reactive.bindElement(mockElement, "multi-bind", binding1 as any)
			reactive.bindElement(mockElement2, "multi-bind", binding2 as any)

			reactive.cleanup("multi-bind")

			binding1.mockClear()
			binding2.mockClear()

			// Create new signal with same ID
			reactive.createSignal("multi-bind", "new-value")

			// Old bindings should not be called
			expect(binding1).not.toHaveBeenCalled()
			expect(binding2).not.toHaveBeenCalled()
		})
	})

	describe("Edge Cases & Error Handling", () => {
		it("should handle empty string signal IDs", () => {
			reactive.createSignal("", "empty-id")
			expect(reactive.getValue("")).toBe("empty-id")
		})

		it("should handle special character signal IDs", () => {
			const specialId = "special!@#$%^&*()_+-=[]{}|;:,.<>?"
			reactive.createSignal(specialId, "special-value")
			expect(reactive.getValue(specialId)).toBe("special-value")
		})

		it("should handle very long signal IDs", () => {
			const longId = "a".repeat(1000)
			reactive.createSignal(longId, "long-id-value")
			expect(reactive.getValue(longId)).toBe("long-id-value")
		})

		it("should handle circular references in objects", () => {
			const obj: any = { name: "circular" }
			obj.self = obj

			reactive.createSignal("circular", obj)
			const retrieved = reactive.getValue<any>("circular")

			expect(retrieved.name).toBe("circular")
			expect(retrieved.self).toBe(retrieved)
		})

		it("should handle function values", () => {
			const testFunction = () => "I am a function"
			reactive.createSignal("function-signal", testFunction)

			const retrievedFunction = reactive.getValue<() => string>("function-signal")
			expect(retrievedFunction?.()).toBe("I am a function")
		})

		it("should handle Date objects", () => {
			const testDate = new Date("2024-01-01")
			reactive.createSignal("date-signal", testDate)

			const retrievedDate = reactive.getValue<Date>("date-signal")
			expect(retrievedDate?.getTime()).toBe(testDate.getTime())
		})

		it("should handle Map and Set objects", () => {
			const testMap = new Map([
				["key1", "value1"],
				["key2", "value2"],
			])
			const testSet = new Set([1, 2, 3, 4, 5])

			reactive.createSignal("map-signal", testMap)
			reactive.createSignal("set-signal", testSet)

			const retrievedMap = reactive.getValue<Map<string, string>>("map-signal")
			const retrievedSet = reactive.getValue<Set<number>>("set-signal")

			expect(retrievedMap?.get("key1")).toBe("value1")
			expect(retrievedSet?.has(3)).toBe(true)
		})
	})
})
