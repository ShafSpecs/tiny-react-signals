import { act, renderHook } from "@testing-library/react"
import { useState } from "react"
import { bench, describe } from "vitest"
import { useSignal } from "../src/hooks/use-signal"
import { useSignalSelector } from "../src/hooks/use-signal-selector"
import { signal } from "../src/signal"

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

	bench("useSignalSelector - Basic Updates", () => {
		const { result } = renderHook(() => {
			return useSignalSelector("bench-selector-basic", 0, (state) => state)
		})

		act(() => {
			signal.set("bench-selector-basic", result.current + 1)
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

	bench("useSignalSelector - Rapid Updates (10x)", () => {
		const { result } = renderHook(() => {
			return useSignalSelector("bench-selector-rapid", 0, (state) => state)
		})

		act(() => {
			for (let i = 0; i < 10; i++) {
				signal.set("bench-selector-rapid", result.current + 1)
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

	bench("useSignalSelector - Object Updates", () => {
		const { result } = renderHook(() => {
			return useSignalSelector("bench-selector-object", { count: 0, name: "test" }, (state) => state)
		})

		act(() => {
			signal.set("bench-selector-object", { ...result.current, count: result.current.count + 1 })
		})
	})
})

describe("Multiple Hooks Performance", () => {
	bench("useState - Multiple Hooks (3x)", () => {
		const { result } = renderHook(() => {
			const [count1, setCount1] = useState(0)
			const [count2, setCount2] = useState(0)
			const [count3, setCount3] = useState(0)
			return { count1, count2, count3, setCount1, setCount2, setCount3 }
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
			const [count1, setCount1] = useSignal("bench-multi-1", 0)
			const [count2, setCount2] = useSignal("bench-multi-2", 0)
			const [count3, setCount3] = useSignal("bench-multi-3", 0)
			return { count1, count2, count3, setCount1, setCount2, setCount3 }
		})

		const { setCount1, setCount2, setCount3 } = result.current

		act(() => {
			setCount1((prev) => prev + 1)
			setCount2((prev) => prev + 1)
			setCount3((prev) => prev + 1)
		})
	})

	bench("useSignalSelector - Multiple Hooks (3x)", () => {
		const { result } = renderHook(() => {
			const count1 = useSignalSelector("bench-selector-multi-1", 0, (state) => state)
			const count2 = useSignalSelector("bench-selector-multi-2", 0, (state) => state)
			const count3 = useSignalSelector("bench-selector-multi-3", 0, (state) => state)
			return { count1, count2, count3 }
		})

		act(() => {
			signal.set("bench-selector-multi-1", result.current.count1 + 1)
			signal.set("bench-selector-multi-2", result.current.count2 + 1)
			signal.set("bench-selector-multi-3", result.current.count3 + 1)
		})
	})
})

describe("Array State Operations", () => {
	bench("useState - Array Updates", () => {
		const { result } = renderHook(() => useState([1, 2, 3, 4, 5]))
		const [value, setValue] = result.current

		act(() => {
			setValue((prev) => [...prev, prev.length + 1])
		})
	})

	bench("useSignal - Array Updates", () => {
		const { result } = renderHook(() => useSignal("bench-array", [1, 2, 3, 4, 5]))
		const [value, setValue] = result.current

		act(() => {
			setValue((prev) => [...prev, prev.length + 1])
		})
	})

	bench("useSignalSelector - Array Updates", () => {
		const { result } = renderHook(() => {
			return useSignalSelector("bench-selector-array", [1, 2, 3, 4, 5], (state) => state)
		})

		act(() => {
			signal.set("bench-selector-array", [...result.current, result.current.length + 1])
		})
	})
})

describe("Large Data Operations", () => {
	bench("useState - Large Array Operations (100 items)", () => {
		const { result } = renderHook(() => useState(Array.from({ length: 100 }, (_, i) => i)))
		const [value, setValue] = result.current

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
		const [value, setValue] = result.current

		act(() => {
			setValue((prev) => [...prev.slice(0, 50), 999, ...prev.slice(50)])
		})
	})

	bench("useSignalSelector - Large Array Operations (100 items)", () => {
		const { result } = renderHook(() => {
			return useSignalSelector(
				"bench-selector-large",
				Array.from({ length: 100 }, (_, i) => i),
				(state) => state
			)
		})

		act(() => {
			signal.set("bench-selector-large", [...result.current.slice(0, 50), 999, ...result.current.slice(50)])
		})
	})
})

describe("Complex Object Operations", () => {
	const complexObject = {
		user: { id: 1, name: "John", email: "john@example.com" },
		settings: { theme: "dark", notifications: true },
		data: Array.from({ length: 50 }, (_, i) => ({ id: i, value: i * 2 })),
	}

	bench("useState - Complex Object Updates", () => {
		const { result } = renderHook(() => useState(complexObject))
		const [value, setValue] = result.current

		act(() => {
			setValue((prev) => ({
				...prev,
				user: { ...prev.user, name: "Jane" },
			}))
		})
	})

	bench("useSignal - Complex Object Updates", () => {
		const { result } = renderHook(() => useSignal("bench-complex", complexObject))
		const [value, setValue] = result.current

		act(() => {
			setValue((prev) => ({
				...prev,
				user: { ...prev.user, name: "Jane" },
			}))
		})
	})

	bench("useSignalSelector - Complex Object Updates", () => {
		const { result } = renderHook(() => {
			return useSignalSelector("bench-selector-complex", complexObject, (state) => state)
		})

		act(() => {
			signal.set("bench-selector-complex", {
				...result.current,
				user: { ...result.current.user, name: "Jane" },
			})
		})
	})
})
