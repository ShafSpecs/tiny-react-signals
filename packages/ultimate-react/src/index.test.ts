import { reactive, signal, test } from "."

describe("ultimate-react", () => {
	it("should work", () => {
		expect(test()).toBeUndefined()
	})

	it("should create and update signals", () => {
		// Create a signal
		const testSignal = reactive.createSignal("test-signal", "initial value")
		expect(testSignal).toBeDefined()
		expect(testSignal.value).toBe("initial value")

		// Update the signal
		reactive.updateSignal("test-signal", "updated value")
		expect(reactive.getValue("test-signal")).toBe("updated value")

		// Cleanup
		reactive.cleanup("test-signal")
	})

	it("should create computed signals", () => {
		// Create base signals
		reactive.createSignal("a", 5)
		reactive.createSignal("b", 10)

		// Create computed signal
		//@ts-ignore
		reactive.createComputed("sum", ["a", "b"], (a, b) => a + b)
		expect(reactive.getValue("sum")).toBe(15)

		// Update dependency and check computed updates
		reactive.updateSignal("a", 20)
		expect(reactive.getValue("sum")).toBe(30)

		// Cleanup
		reactive.cleanup("a")
		reactive.cleanup("b")
		reactive.cleanup("sum")
	})

	it("should work with the direct signal API", () => {
		// Create signal using direct API
		signal.create("test-direct", "hello")
		expect(signal.get("test-direct")).toBe("hello")

		// Update signal
		signal.set("test-direct", "world")
		expect(signal.get("test-direct")).toBe("world")

		// Create computed using direct API
		signal.create("x", 10)
		signal.create("y", 20)
		//@ts-ignore
		signal.computed("product", ["x", "y"], (x, y) => x * y)
		expect(signal.get("product")).toBe(200)

		// Update and verify computed
		signal.set("x", 5)
		expect(signal.get("product")).toBe(100)

		// Cleanup
		signal.remove("test-direct")
		signal.remove("x")
		signal.remove("y")
		signal.remove("product")
	})
})
