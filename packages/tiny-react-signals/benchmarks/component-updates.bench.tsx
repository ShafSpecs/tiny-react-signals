import { cleanup, render } from "@testing-library/react"
// biome-ignore lint/correctness/noUnusedImports: benching...
import React from "react"
import { bench, describe } from "vitest"
import { Signal } from "../src/components/signal"
import { REACTIVE_CORE } from "../src/core"

// ================================
// ▸ SINGLE VALUE UPDATE COMPONENTS
// ================================

function TraditionalSingleUpdateComponent({ trigger }: { trigger: number }) {
	const [count, setCount] = React.useState(0)

	React.useEffect(() => {
		setCount(trigger)
	}, [trigger])

	return <div>Count: {count}</div>
}

function SignalSingleUpdateComponent() {
	return <Signal id="update-single">{(value: number) => <div>Count: {value}</div>}</Signal>
}

// ================================
// ▸ FREQUENT UPDATES COMPONENTS
// ================================

function TraditionalFrequentUpdatesComponent({ updates }: { updates: number[] }) {
	const [count, setCount] = React.useState(0)

	React.useEffect(() => {
		if (updates.length > 0) {
			setCount(updates[updates.length - 1])
		}
	}, [updates])

	return <div>Count: {count}</div>
}

function SignalFrequentUpdatesComponent() {
	return <Signal id="update-frequent">{(value: number) => <div>Count: {value}</div>}</Signal>
}

// ================================
// ▸ CASCADE UPDATES COMPONENTS
// ================================

function TraditionalCascadeComponent({ values }: { values: [number, number, number] }) {
	const [value1, setValue1] = React.useState(0)
	const [value2, setValue2] = React.useState(0)
	const [value3, setValue3] = React.useState(0)

	React.useEffect(() => {
		setValue1(values[0])
		setValue2(values[1])
		setValue3(values[2])
	}, [values])

	return (
		<div>
			<div>Value 1: {value1}</div>
			<div>Value 2: {value2}</div>
			<div>Value 3: {value3}</div>
			<div>Sum: {value1 + value2 + value3}</div>
		</div>
	)
}

function SignalCascadeComponent() {
	return (
		<div>
			<Signal id="cascade-value1">{(value: number) => <div>Value 1: {value}</div>}</Signal>
			<Signal id="cascade-value2">{(value: number) => <div>Value 2: {value}</div>}</Signal>
			<Signal id="cascade-value3">{(value: number) => <div>Value 3: {value}</div>}</Signal>
			<Signal ids={["cascade-value1", "cascade-value2", "cascade-value3"]}>
				{(values: any) => {
					const { cascade_value1: v1, cascade_value2: v2, cascade_value3: v3 } = values
					return <div>Sum: {(v1 || 0) + (v2 || 0) + (v3 || 0)}</div>
				}}
			</Signal>
		</div>
	)
}

// ================================
// ▸ DEEP TREE COMPONENTS
// ================================

function TraditionalDeepTreeComponent({
	depth = 0,
	maxDepth = 5,
	updateTrigger = 0,
}: {
	depth?: number
	maxDepth?: number
	updateTrigger?: number
}) {
	const [value, setValue] = React.useState(depth)

	React.useEffect(() => {
		setValue(depth + 100 + updateTrigger)
	}, [depth, updateTrigger])

	if (depth >= maxDepth) {
		return <div>Leaf: {value}</div>
	}

	return (
		<div>
			<div>
				Level {depth}: {value}
			</div>
			<TraditionalDeepTreeComponent depth={depth + 1} maxDepth={maxDepth} updateTrigger={updateTrigger} />
			<TraditionalDeepTreeComponent depth={depth + 1} maxDepth={maxDepth} updateTrigger={updateTrigger} />
		</div>
	)
}

function SignalDeepTreeComponent({ depth = 0, maxDepth = 5 }: { depth?: number; maxDepth?: number }) {
	if (depth >= maxDepth) {
		return <Signal id={`deep-tree-leaf-${depth}`}>{(value: number) => <div>Leaf: {value}</div>}</Signal>
	}

	return (
		<div>
			<Signal id={`deep-tree-${depth}`}>
				{(value: number) => (
					<div>
						Level {depth}: {value}
					</div>
				)}
			</Signal>
			<SignalDeepTreeComponent depth={depth + 1} maxDepth={maxDepth} />
			<SignalDeepTreeComponent depth={depth + 1} maxDepth={maxDepth} />
		</div>
	)
}

// ================================
// ▸ BATCHED UPDATES COMPONENTS
// ================================

function TraditionalBatchedComponent({ counts }: { counts: [number, number, number, number, number] }) {
	const [count1, setCount1] = React.useState(0)
	const [count2, setCount2] = React.useState(0)
	const [count3, setCount3] = React.useState(0)
	const [count4, setCount4] = React.useState(0)
	const [count5, setCount5] = React.useState(0)

	React.useEffect(() => {
		// React batches these automatically in React 18
		setCount1(counts[0])
		setCount2(counts[1])
		setCount3(counts[2])
		setCount4(counts[3])
		setCount5(counts[4])
	}, [counts])

	return (
		<div>
			<div>Count 1: {count1}</div>
			<div>Count 2: {count2}</div>
			<div>Count 3: {count3}</div>
			<div>Count 4: {count4}</div>
			<div>Count 5: {count5}</div>
		</div>
	)
}

function SignalBatchedComponent() {
	return (
		<div>
			<Signal id="batch-count1">{(value: number) => <div>Count 1: {value}</div>}</Signal>
			<Signal id="batch-count2">{(value: number) => <div>Count 2: {value}</div>}</Signal>
			<Signal id="batch-count3">{(value: number) => <div>Count 3: {value}</div>}</Signal>
			<Signal id="batch-count4">{(value: number) => <div>Count 4: {value}</div>}</Signal>
			<Signal id="batch-count5">{(value: number) => <div>Count 5: {value}</div>}</Signal>
		</div>
	)
}

// ================================
// ▸ BENCHMARK SUITES
// ================================

describe("Single Value Updates", () => {
	bench(
		"Traditional React - Single Update",
		() => {
			const { rerender } = render(<TraditionalSingleUpdateComponent trigger={0} />)

			React.act(() => {
				rerender(<TraditionalSingleUpdateComponent trigger={42} />)
			})

			cleanup()
		},
		{
			time: 500,
			iterations: 50,
			warmupTime: 100,
			warmupIterations: 10,
		}
	)

	bench(
		"Signal - Single Update",
		() => {
			render(<SignalSingleUpdateComponent />)
			// Simulate signal update
			REACTIVE_CORE.updateSignal("update-single", 42)
			cleanup()
		},
		{
			setup: () => {
				REACTIVE_CORE.upsertSignal("update-single", 0)
			},
			time: 500,
			iterations: 50,
			warmupTime: 100,
			warmupIterations: 10,
		}
	)
})

describe("Frequent Updates Performance", () => {
	bench(
		"Traditional React - Frequent Updates (50x)",
		() => {
			const updates: number[] = []
			const { rerender } = render(<TraditionalFrequentUpdatesComponent updates={updates} />)

			React.act(() => {
				for (let i = 0; i < 50; i++) {
					updates.push(i)
					rerender(<TraditionalFrequentUpdatesComponent updates={[...updates]} />)
				}
			})

			cleanup()
		},
		{
			time: 1000,
			iterations: 20,
			warmupTime: 200,
			warmupIterations: 5,
		}
	)

	bench(
		"Signal - Frequent Updates (50x)",
		() => {
			render(<SignalFrequentUpdatesComponent />)

			// Simulate frequent signal updates
			for (let i = 0; i < 50; i++) {
				REACTIVE_CORE.updateSignal("update-frequent", i)
			}

			cleanup()
		},
		{
			setup: () => {
				REACTIVE_CORE.upsertSignal("update-frequent", 0)
			},
			time: 1000,
			iterations: 20,
			warmupTime: 200,
			warmupIterations: 5,
		}
	)
})

describe("Cascade Updates Performance", () => {
	const cascadeSetup = () => {
		REACTIVE_CORE.upsertSignal("cascade-value1", 0)
		REACTIVE_CORE.upsertSignal("cascade-value2", 0)
		REACTIVE_CORE.upsertSignal("cascade-value3", 0)
	}

	bench(
		"Traditional React - Cascade Updates",
		() => {
			const { rerender } = render(<TraditionalCascadeComponent values={[0, 0, 0]} />)

			React.act(() => {
				// Multiple re-renders to simulate cascading updates
				for (let i = 0; i < 10; i++) {
					rerender(<TraditionalCascadeComponent values={[i * 10, i * 20, i * 30]} />)
				}
			})

			cleanup()
		},
		{
			time: 800,
			iterations: 25,
			warmupTime: 150,
			warmupIterations: 5,
		}
	)

	bench(
		"Signal - Cascade Updates",
		() => {
			render(<SignalCascadeComponent />)

			// Simulate cascading updates
			for (let i = 0; i < 10; i++) {
				REACTIVE_CORE.updateSignal("cascade-value1", i * 10)
				REACTIVE_CORE.updateSignal("cascade-value2", i * 20)
				REACTIVE_CORE.updateSignal("cascade-value3", i * 30)
			}

			cleanup()
		},
		{
			setup: cascadeSetup,
			time: 800,
			iterations: 25,
			warmupTime: 150,
			warmupIterations: 5,
		}
	)
})

describe("Deep Component Tree Updates", () => {
	const deepTreeSetup = () => {
		for (let depth = 0; depth < 5; depth++) {
			REACTIVE_CORE.upsertSignal(`deep-tree-${depth}`, depth)
			REACTIVE_CORE.upsertSignal(`deep-tree-leaf-${depth}`, depth + 100)
		}
	}

	bench(
		"Traditional React - Deep Tree Updates",
		() => {
			const { rerender } = render(<TraditionalDeepTreeComponent updateTrigger={0} />)

			React.act(() => {
				// Force re-renders throughout the tree
				for (let i = 0; i < 20; i++) {
					rerender(<TraditionalDeepTreeComponent updateTrigger={i} />)
				}
			})

			cleanup()
		},
		{
			time: 1200,
			iterations: 15,
			warmupTime: 250,
			warmupIterations: 3,
		}
	)

	bench(
		"Signal - Deep Tree Updates",
		() => {
			render(<SignalDeepTreeComponent />)

			// Update signals throughout the tree
			for (let i = 0; i < 20; i++) {
				for (let depth = 0; depth < 5; depth++) {
					REACTIVE_CORE.updateSignal(`deep-tree-${depth}`, depth + 100 + i)
					REACTIVE_CORE.updateSignal(`deep-tree-leaf-${depth}`, depth + 200 + i)
				}
			}

			cleanup()
		},
		{
			setup: deepTreeSetup,
			time: 1200,
			iterations: 15,
			warmupTime: 250,
			warmupIterations: 3,
		}
	)
})

describe("Batched Updates Performance", () => {
	const batchSetup = () => {
		REACTIVE_CORE.upsertSignal("batch-count1", 0)
		REACTIVE_CORE.upsertSignal("batch-count2", 0)
		REACTIVE_CORE.upsertSignal("batch-count3", 0)
		REACTIVE_CORE.upsertSignal("batch-count4", 0)
		REACTIVE_CORE.upsertSignal("batch-count5", 0)
	}

	bench(
		"Traditional React - Batched Updates",
		() => {
			const { rerender } = render(<TraditionalBatchedComponent counts={[0, 0, 0, 0, 0]} />)

			React.act(() => {
				// Simulate batch updates
				for (let i = 0; i < 30; i++) {
					rerender(<TraditionalBatchedComponent counts={[i + 1, i + 2, i + 3, i + 4, i + 5]} />)
				}
			})

			cleanup()
		},
		{
			time: 1000,
			iterations: 20,
			warmupTime: 200,
			warmupIterations: 5,
		}
	)

	bench(
		"Signal - Batched Updates",
		() => {
			render(<SignalBatchedComponent />)

			// Simulate batch updates using signal batching
			for (let i = 0; i < 30; i++) {
				REACTIVE_CORE.batchUpdate(() => {
					REACTIVE_CORE.updateSignal("batch-count1", i + 1)
					REACTIVE_CORE.updateSignal("batch-count2", i + 2)
					REACTIVE_CORE.updateSignal("batch-count3", i + 3)
					REACTIVE_CORE.updateSignal("batch-count4", i + 4)
					REACTIVE_CORE.updateSignal("batch-count5", i + 5)
				})
			}

			cleanup()
		},
		{
			setup: batchSetup,
			time: 1000,
			iterations: 20,
			warmupTime: 200,
			warmupIterations: 5,
		}
	)
})
