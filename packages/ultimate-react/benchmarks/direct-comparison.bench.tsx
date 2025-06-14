import { cleanup, render } from "@testing-library/react"
import React, { useState } from "react"
import { act } from "react"
import { bench, describe } from "vitest"
import { Signal } from "../src/components/signal"
import { REACTIVE_CORE } from "../src/core"
import { useSignal } from "../src/hooks/use-signal"
import { signal } from "../src/signal"

// =========================================
// ▸ REAL USER METRICS - WHERE SIGNALS SHINE
// =========================================
// These benchmarks measure what users actually experience:
// - Time from state change to DOM update
// - Responsiveness during frequent updates
// - Smooth interactions without stuttering

// ================================
// Simple Counter - Most Basic Case
// ================================
describe("Simple Counter Performance", () => {
	bench("React - Simple Counter (1000 updates)", () => {
		function SimpleCounter({ trigger }: { trigger: number }) {
			const [count, setCount] = useState(0)

			React.useEffect(() => {
				setCount(trigger)
			}, [trigger])

			return <div>Count: {count}</div>
		}

		// Simulate 1000 counter updates via props (realistic scenario)
		const { rerender } = render(<SimpleCounter trigger={0} />)
		for (let i = 1; i <= 1000; i++) {
			rerender(<SimpleCounter trigger={i} />)
		}
		cleanup()
	})

	bench(
		"Signal - Simple Counter (1000 updates)",
		() => {
			function SimpleCounter() {
				return <Signal id="simple-counter">{(count: number) => <div>Count: {count}</div>}</Signal>
			}

			render(<SimpleCounter />)

			// Direct signal updates - no React re-renders
			for (let i = 1; i <= 1000; i++) {
				REACTIVE_CORE.updateSignal("simple-counter", i)
			}

			cleanup()
		},
		{
			setup: () => {
				REACTIVE_CORE.upsertSignal("simple-counter", 0)
			},
		}
	)
})

// ================================
// Multiple Values - Dashboard Scenario
// ================================
describe("Multi-Value Dashboard Performance", () => {
	bench("React - Multi-Value Updates (200 cycles)", () => {
		function Dashboard({ values }: { values: number[] }) {
			const [v1, setV1] = useState(0)
			const [v2, setV2] = useState(0)
			const [v3, setV3] = useState(0)
			const [v4, setV4] = useState(0)
			const [v5, setV5] = useState(0)

			React.useEffect(() => {
				if (values.length >= 5) {
					setV1(values[0])
					setV2(values[1])
					setV3(values[2])
					setV4(values[3])
					setV5(values[4])
				}
			}, [values])

			return (
				<div>
					<div>V1: {v1}</div>
					<div>V2: {v2}</div>
					<div>V3: {v3}</div>
					<div>V4: {v4}</div>
					<div>V5: {v5}</div>
				</div>
			)
		}

		const { rerender } = render(<Dashboard values={[0, 0, 0, 0, 0]} />)

		// Simulate dashboard updates (realistic scenario)
		for (let i = 0; i < 200; i++) {
			const values = [i, i + 1, i + 2, i + 3, i + 4]
			rerender(<Dashboard values={values} />)
		}

		cleanup()
	})

	bench(
		"Signal - Multi-Value Updates (200 cycles)",
		() => {
			function Dashboard() {
				return (
					<div>
						<Signal id="dash-v1">{(v: number) => <div>V1: {v}</div>}</Signal>
						<Signal id="dash-v2">{(v: number) => <div>V2: {v}</div>}</Signal>
						<Signal id="dash-v3">{(v: number) => <div>V3: {v}</div>}</Signal>
						<Signal id="dash-v4">{(v: number) => <div>V4: {v}</div>}</Signal>
						<Signal id="dash-v5">{(v: number) => <div>V5: {v}</div>}</Signal>
					</div>
				)
			}

			render(<Dashboard />)

			// Individual signal updates - each value updates independently
			for (let i = 0; i < 200; i++) {
				REACTIVE_CORE.updateSignal("dash-v1", i)
				REACTIVE_CORE.updateSignal("dash-v2", i + 1)
				REACTIVE_CORE.updateSignal("dash-v3", i + 2)
				REACTIVE_CORE.updateSignal("dash-v4", i + 3)
				REACTIVE_CORE.updateSignal("dash-v5", i + 4)
			}

			cleanup()
		},
		{
			setup: () => {
				REACTIVE_CORE.upsertSignal("dash-v1", 0)
				REACTIVE_CORE.upsertSignal("dash-v2", 0)
				REACTIVE_CORE.upsertSignal("dash-v3", 0)
				REACTIVE_CORE.upsertSignal("dash-v4", 0)
				REACTIVE_CORE.upsertSignal("dash-v5", 0)
			},
		}
	)
})

// ================================
// Rapid Button Clicks - Interactive Scenario
// ================================
describe("Interactive Button Clicks Performance", () => {
	bench("React - Rapid Button Clicks (500 clicks)", () => {
		function ClickCounter() {
			const [count, setCount] = useState(0)

			return (
				<div>
					Count: {count}
					<button onClick={() => setCount((c) => c + 1)}>Increment</button>
				</div>
			)
		}

		const { container } = render(<ClickCounter />)
		const button = container.querySelector("button")!

		// Simulate rapid clicking (realistic user interaction)
		for (let i = 0; i < 500; i++) {
			act(() => {
				button.click()
			})
		}

		cleanup()
	})

	bench(
		"Signal Hook - Rapid Button Clicks (500 clicks)",
		() => {
			function ClickCounter() {
				const [, setCount] = useSignal("click-counter", 0)

				return (
					<div>
						<Signal id="click-counter">{(count: number) => `Count: ${count}`}</Signal>
						<button onClick={() => setCount((c) => c + 1)}>Increment</button>
					</div>
				)
			}

			const { container } = render(<ClickCounter />)
			const button = container.querySelector("button")!

			// Same rapid clicking scenario
			for (let i = 0; i < 500; i++) {
				act(() => {
					button.click()
				})
			}

			cleanup()
		},
		{
			setup: () => {
				REACTIVE_CORE.upsertSignal("click-counter", 0)
			},
		}
	)

	bench(
		"Signal Direct - Rapid Button Clicks (500 clicks)",
		() => {
			function ClickCounter() {
				return (
					<div>
						<Signal id="click-direct">{(count: number) => `Count: ${count}`}</Signal>
						<button onClick={() => signal.set("click-direct", (signal.get("click-direct") as number) + 1)}>
							Increment
						</button>
					</div>
				)
			}

			const { container } = render(<ClickCounter />)
			const button = container.querySelector("button")!

			// Same rapid clicking scenario - pure signal updates, no React re-renders
			for (let i = 0; i < 500; i++) {
				act(() => {
					button.click()
				})
			}

			cleanup()
		},
		{
			setup: () => {
				signal.upsert("click-direct", 0)
			},
		}
	)
})

// ================================
// Form Input Updates - Real-Time Validation
// ================================
describe("Live Form Validation Performance", () => {
	bench("React - Live Form Updates (typing simulation)", () => {
		function LiveForm({ email }: { email: string }) {
			const [isValid, setIsValid] = useState(false)

			React.useEffect(() => {
				setIsValid(email.includes("@") && email.includes("."))
			}, [email])

			return (
				<div>
					<input value={email} onChange={() => {}} placeholder="Email" />
					<div>Valid: {isValid ? "Yes" : "No"}</div>
				</div>
			)
		}

		// Simulate typing "user@example.com" character by character
		const email = "user@example.com"
		const { rerender } = render(<LiveForm email="" />)

		for (let i = 0; i <= email.length; i++) {
			const currentEmail = email.slice(0, i)
			rerender(<LiveForm email={currentEmail} />)
		}

		cleanup()
	})

	bench(
		"Signal - Live Form Updates (typing simulation)",
		() => {
			function LiveForm() {
				return (
					<div>
						<Signal id="form-email">
							{(email: string) => <input value={email} onChange={() => {}} placeholder="Email" />}
						</Signal>
						<Signal id="form-valid">{(valid: boolean) => <div>Valid: {valid ? "Yes" : "No"}</div>}</Signal>
					</div>
				)
			}

			render(<LiveForm />)

			// Simulate typing with signal updates
			const email = "user@example.com"
			for (let i = 0; i <= email.length; i++) {
				const currentEmail = email.slice(0, i)
				REACTIVE_CORE.updateSignal("form-email", currentEmail)
				REACTIVE_CORE.updateSignal("form-valid", currentEmail.includes("@") && currentEmail.includes("."))
			}

			cleanup()
		},
		{
			setup: () => {
				REACTIVE_CORE.upsertSignal("form-email", "")
				REACTIVE_CORE.upsertSignal("form-valid", false)
			},
		}
	)
})
