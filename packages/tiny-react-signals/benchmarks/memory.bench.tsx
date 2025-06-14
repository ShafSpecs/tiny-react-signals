import { cleanup, render } from "@testing-library/react"
import React, { useEffect, useState } from "react"
import { bench, describe } from "vitest"
import { Signal } from "../src/components/signal"
import { REACTIVE_CORE } from "../src/core"

describe("Component Lifecycle Performance", () => {
	bench("Traditional React - Component Creation/Cleanup", () => {
		function TestComponent({ id, trigger }: { id: string; trigger: number }) {
			const [data, setData] = useState<any[]>([])

			useEffect(() => {
				// Simulate memory allocation
				const largeArray = Array.from({ length: 1000 }, (_, i) => ({
					id: i + trigger,
					name: `Item ${i}`,
					data: new Array(100).fill(Math.random()),
				}))
				setData(largeArray)

				return () => {
					setData([])
				}
			}, [trigger])

			return (
				<div>
					<h3>Component {id}</h3>
					<div>Items: {data.length}</div>
				</div>
			)
		}

		// Create and destroy components rapidly
		for (let i = 0; i < 10; i++) {
			React.act(() => {
				const component = render(<TestComponent id={`traditional-${i}`} trigger={i} />)
				cleanup()
			})
		}
	})

	bench("Signal - Component Creation/Cleanup", () => {
		// Create and destroy signal components rapidly
		for (let i = 0; i < 10; i++) {
			const signalId = `signal-cleanup-${i}`

			// Set large data in signal
			const largeArray = Array.from({ length: 1000 }, (_, j) => ({
				id: j,
				name: `Item ${j}`,
				data: new Array(100).fill(Math.random()),
			}))

			REACTIVE_CORE.updateSignal(signalId, largeArray)

			const component = render(
				<Signal id={signalId}>
					{(data: any[]) => (
						<div>
							<h3>Component {i}</h3>
							<div>Items: {data?.length || 0}</div>
						</div>
					)}
				</Signal>
			)

			cleanup()
		}
	})
})

describe("Large State Management", () => {
	bench("Traditional React - Large State Objects", () => {
		function LargeStateComponent({ trigger }: { trigger: number }) {
			const [largeState, setLargeState] = useState<any>({})

			useEffect(() => {
				const buildLargeObject = () => {
					const obj: any = {}
					for (let i = 0; i < 500; i++) {
						obj[`key_${i}`] = {
							id: i + trigger,
							name: `Item ${i}`,
							description: `Description for item ${i}`.repeat(10),
							metadata: {
								created: new Date().toISOString(),
								tags: Array.from({ length: 20 }, (_, j) => `tag${j}`),
								scores: Array.from({ length: 50 }, () => Math.random()),
							},
						}
					}
					return obj
				}

				setLargeState(buildLargeObject())
			}, [trigger])

			return (
				<div>
					<h3>Large State Component</h3>
					<div>Keys: {Object.keys(largeState).length}</div>
				</div>
			)
		}

		const { rerender } = render(<LargeStateComponent trigger={0} />)

		React.act(() => {
			// Simulate state updates
			for (let i = 0; i < 5; i++) {
				rerender(<LargeStateComponent trigger={i} />)
			}
		})

		cleanup()
	})

	bench("Signal - Large State Objects", () => {
		const signalId = "large-state-signal"

		const buildLargeObject = () => {
			const obj: any = {}
			for (let i = 0; i < 500; i++) {
				obj[`key_${i}`] = {
					id: i,
					name: `Item ${i}`,
					description: `Description for item ${i}`.repeat(10),
					metadata: {
						created: new Date().toISOString(),
						tags: Array.from({ length: 20 }, (_, j) => `tag${j}`),
						scores: Array.from({ length: 50 }, () => Math.random()),
					},
				}
			}
			return obj
		}

		REACTIVE_CORE.updateSignal(signalId, buildLargeObject())

		const component = render(
			<Signal id={signalId}>
				{(largeState: any) => (
					<div>
						<h3>Large State Component</h3>
						<div>Keys: {Object.keys(largeState || {}).length}</div>
					</div>
				)}
			</Signal>
		)

		// Simulate signal updates
		for (let i = 0; i < 5; i++) {
			REACTIVE_CORE.updateSignal(signalId, buildLargeObject())
		}

		cleanup()
	})
})

describe("Mass Component Rendering", () => {
	bench("Traditional React - Many Small Components (200)", () => {
		function SmallComponent({ id, value, updateTrigger }: { id: number; value: string; updateTrigger: number }) {
			const [localState, setLocalState] = useState(value)

			useEffect(() => {
				setLocalState(`Updated ${value} - ${updateTrigger}`)
			}, [value, updateTrigger])

			return (
				<div className="small-component">
					Component {id}: {localState}
				</div>
			)
		}

		const { rerender } = render(
			<div>
				{Array.from({ length: 200 }, (_, i) => (
					<SmallComponent key={i} id={i} value={`Value ${i}`} updateTrigger={0} />
				))}
			</div>
		)

		React.act(() => {
			// Force re-renders
			for (let i = 0; i < 3; i++) {
				rerender(
					<div>
						{Array.from({ length: 200 }, (_, j) => (
							<SmallComponent key={j} id={j} value={`Value ${j}`} updateTrigger={i} />
						))}
					</div>
				)
			}
		})

		cleanup()
	})

	bench("Signal - Many Small Components (200)", () => {
		// Pre-populate signals
		for (let i = 0; i < 200; i++) {
			REACTIVE_CORE.updateSignal(`many-component-${i}`, `Value ${i}`)
		}

		const components = Array.from({ length: 200 }, (_, i) => (
			<Signal key={i} id={`many-component-${i}`}>
				{(value: string) => (
					<div className="small-component">
						Component {i}: {value}
					</div>
				)}
			</Signal>
		))

		const component = render(<div>{components}</div>)

		// Trigger signal updates - only signal content updates, not components
		for (let update = 0; update < 3; update++) {
			for (let i = 0; i < 200; i++) {
				REACTIVE_CORE.updateSignal(`many-component-${i}`, `Updated Value ${i} - ${update}`)
			}
		}

		cleanup()
	})
})

describe("Event Handling Performance", () => {
	bench("Traditional React - Event Listeners (50 buttons)", () => {
		function EventListenerComponent({ clickCount, hoverCount }: { clickCount: number; hoverCount: number }) {
			const [localClickCount, setLocalClickCount] = useState(clickCount)
			const [localHoverCount, setLocalHoverCount] = useState(hoverCount)

			useEffect(() => {
				setLocalClickCount(clickCount)
				setLocalHoverCount(hoverCount)
			}, [clickCount, hoverCount])

			const handleClick = () => setLocalClickCount((prev) => prev + 1)
			const handleMouseEnter = () => setLocalHoverCount((prev) => prev + 1)
			const handleMouseLeave = () => setLocalHoverCount((prev) => prev - 1)

			return (
				<div>
					{Array.from({ length: 50 }, (_, i) => (
						<button key={i} onClick={handleClick} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
							Button {i} (Clicks: {localClickCount}, Hovers: {localHoverCount})
						</button>
					))}
				</div>
			)
		}

		const { rerender } = render(<EventListenerComponent clickCount={0} hoverCount={0} />)

		React.act(() => {
			// Simulate some interactions by updating props
			for (let i = 0; i < 10; i++) {
				rerender(<EventListenerComponent clickCount={i} hoverCount={i % 3} />)
			}
		})

		cleanup()
	})

	bench("Signal - Event Listeners (50 buttons)", () => {
		REACTIVE_CORE.updateSignal("event-click-count", 0)
		REACTIVE_CORE.updateSignal("event-hover-count", 0)

		const component = render(
			<div>
				<Signal ids={["event-click-count", "event-hover-count"]}>
					{(values: any) => {
						const { "event-click-count": clickCount, "event-hover-count": hoverCount } = values
						return (
							<>
								{Array.from({ length: 50 }, (_, i) => (
									<button
										key={i}
										onClick={() => {
											const current = REACTIVE_CORE.getValue("event-click-count") as number
											REACTIVE_CORE.updateSignal("event-click-count", current + 1)
										}}
										onMouseEnter={() => {
											const current = REACTIVE_CORE.getValue("event-hover-count") as number
											REACTIVE_CORE.updateSignal("event-hover-count", current + 1)
										}}
										onMouseLeave={() => {
											const current = REACTIVE_CORE.getValue("event-hover-count") as number
											REACTIVE_CORE.updateSignal("event-hover-count", current - 1)
										}}
									>
										Button {i} (Clicks: {clickCount || 0}, Hovers: {hoverCount || 0})
									</button>
								))}
							</>
						)
					}}
				</Signal>
			</div>
		)

		// Simulate some interactions
		for (let i = 0; i < 10; i++) {
			REACTIVE_CORE.updateSignal("event-click-count", i)
			REACTIVE_CORE.updateSignal("event-hover-count", i % 3)
		}

		cleanup()
	})
})
