import { act, renderHook } from "@testing-library/react"
import { useState } from "react"
import { bench, describe } from "vitest"
import { useSignal } from "../src/hooks/use-signal"

describe("Basic State Updates", () => {
	bench("useState - Basic Updates", () => {
		const { result } = renderHook(() => useState(0))
		const [, setValue] = result.current

		act(() => {
			setValue((prev) => prev + 1)
		})
	})

	bench("useSignal - Basic Updates", () => {
		const { result } = renderHook(() => useSignal("bench-basic", 0))
		const [, setValue] = result.current

		act(() => {
			setValue((prev) => prev + 1)
		})
	})
})

describe("Rapid State Updates", () => {
	bench("useState - Rapid Updates (10x)", () => {
		const { result } = renderHook(() => useState(0))
		const [, setValue] = result.current

		act(() => {
			for (let i = 0; i < 10; i++) {
				setValue((prev) => prev + 1)
			}
		})
	})

	bench("useSignal - Rapid Updates (10x)", () => {
		const { result } = renderHook(() => useSignal("bench-rapid", 0))
		const [, setValue] = result.current

		act(() => {
			for (let i = 0; i < 10; i++) {
				setValue((prev) => prev + 1)
			}
		})
	})
})

describe("Object State Updates", () => {
	bench("useState - Object Updates", () => {
		const { result } = renderHook(() => useState({ count: 0, name: "test" }))
		const [, setValue] = result.current

		act(() => {
			setValue((prev) => ({ ...prev, count: prev.count + 1 }))
		})
	})

	bench("useSignal - Object Updates", () => {
		const { result } = renderHook(() => useSignal("bench-object", { count: 0, name: "test" }))
		const [, setValue] = result.current

		act(() => {
			setValue((prev) => ({ ...prev, count: prev.count + 1 }))
		})
	})
})

describe("Multiple Hooks Performance", () => {
	bench("useState - Multiple Hooks (3x)", () => {
		const { result } = renderHook(() => {
			const [count1, setCount1] = useState(0)
			const [count2, setCount2] = useState(0)
			const [count3, setCount3] = useState(0)
			return { setCount1, setCount2, setCount3 }
		})

		const { setCount1, setCount2, setCount3 } = result.current

		act(() => {
			setCount1((prev) => prev + 1)
			setCount2((prev) => prev + 1)
			setCount3((prev) => prev + 1)
		})
	})

	bench("useSignal - Multiple Hooks (3x)", () => {
		const { result } = renderHook(() => {
			const [, setCount1] = useSignal("bench-multi-1", 0)
			const [, setCount2] = useSignal("bench-multi-2", 0)
			const [, setCount3] = useSignal("bench-multi-3", 0)
			return { setCount1, setCount2, setCount3 }
		})

		const { setCount1, setCount2, setCount3 } = result.current

		act(() => {
			setCount1((prev) => prev + 1)
			setCount2((prev) => prev + 1)
			setCount3((prev) => prev + 1)
		})
	})
})

describe("Array State Operations", () => {
	bench("useState - Array Updates", () => {
		const { result } = renderHook(() => useState([1, 2, 3, 4, 5]))
		const [, setValue] = result.current

		act(() => {
			setValue((prev) => [...prev, prev.length + 1])
		})
	})

	bench("useSignal - Array Updates", () => {
		const { result } = renderHook(() => useSignal("bench-array", [1, 2, 3, 4, 5]))
		const [, setValue] = result.current

		act(() => {
			setValue((prev) => [...prev, prev.length + 1])
		})
	})
})

describe("Large Data Operations", () => {
	bench("useState - Large Array Operations (100 items)", () => {
		const { result } = renderHook(() => useState(Array.from({ length: 100 }, (_, i) => i)))
		const [, setValue] = result.current

		act(() => {
			setValue((prev) => [...prev.slice(0, 50), 999, ...prev.slice(50)])
		})
	})

	bench("useSignal - Large Array Operations (100 items)", () => {
		const { result } = renderHook(() =>
			useSignal(
				"bench-large-array",
				Array.from({ length: 100 }, (_, i) => i)
			)
		)
		const [, setValue] = result.current

		act(() => {
			setValue((prev) => [...prev.slice(0, 50), 999, ...prev.slice(50)])
		})
	})
})
