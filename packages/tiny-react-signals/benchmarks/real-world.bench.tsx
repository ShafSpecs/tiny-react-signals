import { cleanup, render } from "@testing-library/react"
// biome-ignore lint/correctness/noUnusedImports: benching...
import React from "react"
import { bench, describe } from "vitest"
import { Signal } from "../src/components"
import { REACTIVE_CORE } from "../src/core"

// ================================
// ▸ TODO APP SIMULATION
// ================================

interface Todo {
	id: number
	text: string
	completed: boolean
	priority: "low" | "medium" | "high"
	createdAt: Date
}

function TraditionalTodoApp() {
	const [todos, setTodos] = React.useState<Todo[]>([])
	const [filter, setFilter] = React.useState<"all" | "active" | "completed">("all")
	const [sortBy, setSortBy] = React.useState<"date" | "priority">("date")

	const filteredTodos = React.useMemo(() => {
		return todos
			.filter((todo) => {
				if (filter === "active") return !todo.completed
				if (filter === "completed") return todo.completed
				return true
			})
			.sort((a, b) => {
				if (sortBy === "priority") {
					const priorityOrder = { low: 0, medium: 1, high: 2 }
					return priorityOrder[b.priority] - priorityOrder[a.priority]
				}
				return b.createdAt.getTime() - a.createdAt.getTime()
			})
	}, [todos, filter, sortBy])

	React.useEffect(() => {
		// Simulate initial load
		const initialTodos: Todo[] = Array.from({ length: 100 }, (_, i) => ({
			id: i,
			text: `Todo item ${i}`,
			completed: Math.random() > 0.7,
			priority: ["low", "medium", "high"][Math.floor(Math.random() * 3)] as any,
			createdAt: new Date(Date.now() - Math.random() * 1000000000),
		}))
		setTodos(initialTodos)
	}, [])

	const toggleTodo = (id: number) => {
		setTodos((prev) => prev.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)))
	}

	return (
		<div className="todo-app">
			<header>
				<h1>Todo App ({filteredTodos.length} items)</h1>
				<div className="controls">
					<select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
						<option value="all">All</option>
						<option value="active">Active</option>
						<option value="completed">Completed</option>
					</select>
					<select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
						<option value="date">Sort by Date</option>
						<option value="priority">Sort by Priority</option>
					</select>
				</div>
			</header>
			<main>
				{filteredTodos.map((todo) => (
					<div key={todo.id} className={`todo-item ${todo.completed ? "completed" : ""}`}>
						<input type="checkbox" checked={todo.completed} onChange={() => toggleTodo(todo.id)} />
						<span className="text">{todo.text}</span>
						<span className={`priority priority-${todo.priority}`}>{todo.priority}</span>
						<span className="date">{todo.createdAt.toLocaleDateString()}</span>
					</div>
				))}
			</main>
		</div>
	)
}

function getFilteredTodos(todos: Todo[], filter: string, sortBy: string): Todo[] {
	return todos
		.filter((todo) => {
			if (filter === "active") return !todo.completed
			if (filter === "completed") return todo.completed
			return true
		})
		.sort((a, b) => {
			if (sortBy === "priority") {
				const priorityOrder = { low: 0, medium: 1, high: 2 }
				return priorityOrder[b.priority] - priorityOrder[a.priority]
			}
			return b.createdAt.getTime() - a.createdAt.getTime()
		})
}

function toggleSignalTodo(id: number): void {
	const todos = REACTIVE_CORE.getValue("todos") as Todo[]
	const updatedTodos = todos.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo))
	REACTIVE_CORE.updateSignal("todos", updatedTodos)
}

function SignalTodoApp() {
	return (
		<div className="todo-app">
			<header>
				<Signal ids={["todos", "todo-filter"]}>
					{(values: any) => {
						const { todos, "todo-filter": todoFilter } = values
						return <h1>Todo App ({getFilteredTodos(todos || [], todoFilter || "all", "date").length} items)</h1>
					}}
				</Signal>
				<div className="controls">
					<Signal id="todo-filter">
						{(filter: string) => (
							<select value={filter} onChange={(e) => REACTIVE_CORE.updateSignal("todo-filter", e.target.value)}>
								<option value="all">All</option>
								<option value="active">Active</option>
								<option value="completed">Completed</option>
							</select>
						)}
					</Signal>
					<Signal id="todo-sort">
						{(sortBy: string) => (
							<select value={sortBy} onChange={(e) => REACTIVE_CORE.updateSignal("todo-sort", e.target.value)}>
								<option value="date">Sort by Date</option>
								<option value="priority">Sort by Priority</option>
							</select>
						)}
					</Signal>
				</div>
			</header>
			<main>
				<Signal ids={["todos", "todo-filter", "todo-sort"]}>
					{(values: any) => {
						const { todos, "todo-filter": todoFilter, "todo-sort": todoSort } = values
						const filteredTodos = getFilteredTodos(todos || [], todoFilter || "all", todoSort || "date")
						return (
							<>
								{filteredTodos.map((todo) => (
									<div key={todo.id} className={`todo-item ${todo.completed ? "completed" : ""}`}>
										<input type="checkbox" checked={todo.completed} onChange={() => toggleSignalTodo(todo.id)} />
										<span className="text">{todo.text}</span>
										<span className={`priority priority-${todo.priority}`}>{todo.priority}</span>
										<span className="date">{todo.createdAt.toLocaleDateString()}</span>
									</div>
								))}
							</>
						)
					}}
				</Signal>
			</main>
		</div>
	)
}

// ================================
// ▸ REAL-TIME DASHBOARD SIMULATION
// ================================

interface DashboardData {
	users: number
	revenue: number
	orders: number
	conversion: number
	alerts: Array<{ id: string; message: string; severity: "info" | "warning" | "error" }>
}

function TraditionalDashboard({ updateTrigger }: { updateTrigger: number }) {
	const [users, setUsers] = React.useState(0)
	const [revenue, setRevenue] = React.useState(0)
	const [orders, setOrders] = React.useState(0)
	const [conversion, setConversion] = React.useState(0)
	const [alerts, setAlerts] = React.useState<
		Array<{ id: string; message: string; severity: "info" | "warning" | "error" }>
	>([])

	React.useEffect(() => {
		if (updateTrigger > 0) {
			setUsers((prev) => prev + Math.floor(Math.random() * 10))
			setRevenue((prev) => prev + Math.random() * 1000)
			setOrders((prev) => prev + Math.floor(Math.random() * 5))
			setConversion(Math.random() * 0.1 + 0.02)
			setAlerts((prev) => [
				...prev.slice(-4),
				{
					id: `alert-${Date.now()}-${updateTrigger}`,
					message: `Alert ${Date.now()}-${updateTrigger}`,
					severity: ["info", "warning", "error"][Math.floor(Math.random() * 3)] as any,
				},
			])
		}
	}, [updateTrigger])

	return (
		<div className="dashboard">
			<div className="metrics">
				<div className="metric">
					<h3>Active Users</h3>
					<div className="value">{users.toLocaleString()}</div>
				</div>
				<div className="metric">
					<h3>Revenue</h3>
					<div className="value">${revenue.toFixed(2)}</div>
				</div>
				<div className="metric">
					<h3>Orders</h3>
					<div className="value">{orders.toLocaleString()}</div>
				</div>
				<div className="metric">
					<h3>Conversion Rate</h3>
					<div className="value">{(conversion * 100).toFixed(2)}%</div>
				</div>
			</div>
			<div className="alerts">
				<h3>Recent Alerts</h3>
				{alerts.map((alert) => (
					<div key={alert.id} className={`alert alert-${alert.severity}`}>
						{alert.message}
					</div>
				))}
			</div>
		</div>
	)
}

function SignalDashboard() {
	return (
		<div className="dashboard">
			<div className="metrics">
				<div className="metric">
					<h3>Active Users</h3>
					<Signal id="dashboard-users">
						{(users: number) => <div className="value">{users.toLocaleString()}</div>}
					</Signal>
				</div>
				<div className="metric">
					<h3>Revenue</h3>
					<Signal id="dashboard-revenue">
						{(revenue: number) => <div className="value">${revenue.toFixed(2)}</div>}
					</Signal>
				</div>
				<div className="metric">
					<h3>Orders</h3>
					<Signal id="dashboard-orders">
						{(orders: number) => <div className="value">{orders.toLocaleString()}</div>}
					</Signal>
				</div>
				<div className="metric">
					<h3>Conversion Rate</h3>
					<Signal id="dashboard-conversion">
						{(conversion: number) => <div className="value">{(conversion * 100).toFixed(2)}%</div>}
					</Signal>
				</div>
			</div>
			<div className="alerts">
				<h3>Recent Alerts</h3>
				<Signal id="dashboard-alerts">
					{(alerts: any[]) => (
						<>
							{alerts.map((alert: any) => (
								<div key={alert.id} className={`alert alert-${alert.severity}`}>
									{alert.message}
								</div>
							))}
						</>
					)}
				</Signal>
			</div>
		</div>
	)
}

// ================================
// ▸ DATA GRID SIMULATION
// ================================

interface GridItem {
	id: number
	name: string
	value: number
	category: string
	status: "active" | "inactive" | "pending"
}

function TraditionalDataGrid() {
	const [data, setData] = React.useState<GridItem[]>([])
	const [filter, setFilter] = React.useState<string>("all")
	const [sortBy, setSortBy] = React.useState<"name" | "value" | "category">("name")

	React.useEffect(() => {
		const initialData: GridItem[] = Array.from({ length: 500 }, (_, i) => ({
			id: i,
			name: `Item ${i}`,
			value: Math.random() * 1000,
			category: ["Electronics", "Clothing", "Books", "Sports"][Math.floor(Math.random() * 4)],
			status: ["active", "inactive", "pending"][Math.floor(Math.random() * 3)] as any,
		}))
		setData(initialData)
	}, [])

	const filteredData = React.useMemo(() => {
		let filtered = data
		if (filter !== "all") {
			filtered = data.filter((item) => item.category === filter)
		}

		return filtered
			.sort((a, b) => {
				if (sortBy === "name") return a.name.localeCompare(b.name)
				if (sortBy === "value") return b.value - a.value
				return a.category.localeCompare(b.category)
			})
			.slice(0, 100) // Show first 100 items
	}, [data, filter, sortBy])

	return (
		<div className="data-grid">
			<div className="controls">
				<select value={filter} onChange={(e) => setFilter(e.target.value)}>
					<option value="all">All Categories</option>
					<option value="Electronics">Electronics</option>
					<option value="Clothing">Clothing</option>
					<option value="Books">Books</option>
					<option value="Sports">Sports</option>
				</select>
				<select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
					<option value="name">Sort by Name</option>
					<option value="value">Sort by Value</option>
					<option value="category">Sort by Category</option>
				</select>
			</div>
			<div className="grid-content">
				{filteredData.map((item) => (
					<div key={item.id} className="grid-row">
						<span className="name">{item.name}</span>
						<span className="value">${item.value.toFixed(2)}</span>
						<span className="category">{item.category}</span>
						<span className={`status status-${item.status}`}>{item.status}</span>
					</div>
				))}
			</div>
		</div>
	)
}

function SignalDataGrid() {
	return (
		<div className="data-grid">
			<div className="controls">
				<Signal id="grid-filter">
					{(filter: string) => (
						<select value={filter} onChange={(e) => REACTIVE_CORE.updateSignal("grid-filter", e.target.value)}>
							<option value="all">All Categories</option>
							<option value="Electronics">Electronics</option>
							<option value="Clothing">Clothing</option>
							<option value="Books">Books</option>
							<option value="Sports">Sports</option>
						</select>
					)}
				</Signal>
				<Signal id="grid-sort">
					{(sortBy: string) => (
						<select value={sortBy} onChange={(e) => REACTIVE_CORE.updateSignal("grid-sort", e.target.value)}>
							<option value="name">Sort by Name</option>
							<option value="value">Sort by Value</option>
							<option value="category">Sort by Category</option>
						</select>
					)}
				</Signal>
			</div>
			<div className="grid-content">
				<Signal ids={["grid-data", "grid-filter", "grid-sort"]}>
					{(values: any) => {
						const { "grid-data": data, "grid-filter": filter, "grid-sort": sortBy } = values
						if (!data) return null

						let filtered = data
						if (filter !== "all") {
							filtered = data.filter((item: GridItem) => item.category === filter)
						}

						const sorted = filtered
							.sort((a: GridItem, b: GridItem) => {
								if (sortBy === "name") return a.name.localeCompare(b.name)
								if (sortBy === "value") return b.value - a.value
								return a.category.localeCompare(b.category)
							})
							.slice(0, 100)

						return (
							<>
								{sorted.map((item: GridItem) => (
									<div key={item.id} className="grid-row">
										<span className="name">{item.name}</span>
										<span className="value">${item.value.toFixed(2)}</span>
										<span className="category">{item.category}</span>
										<span className={`status status-${item.status}`}>{item.status}</span>
									</div>
								))}
							</>
						)
					}}
				</Signal>
			</div>
		</div>
	)
}

// ================================
// ▸ BENCHMARK SUITES
// ================================

describe("Todo App Performance", () => {
	const setupTraditionalTodos = () => {
		// Clear any existing state
		cleanup()
	}

	const setupSignalTodos = () => {
		// Clear any existing state
		cleanup()

		const initialTodos: Todo[] = Array.from({ length: 100 }, (_, i) => ({
			id: i,
			text: `Todo item ${i}`,
			completed: Math.random() > 0.7,
			priority: ["low", "medium", "high"][Math.floor(Math.random() * 3)] as any,
			createdAt: new Date(Date.now() - Math.random() * 1000000000),
		}))

		// Setup signals
		REACTIVE_CORE.upsertSignal("todos", initialTodos)
		REACTIVE_CORE.upsertSignal("todo-filter", "all")
		REACTIVE_CORE.upsertSignal("todo-sort", "date")
	}

	bench(
		"Traditional Todo App - Render & Interactions",
		() => {
			const component = render(<TraditionalTodoApp />)

			// Wait for component to initialize with useEffect
			React.act(() => {
				// Small delay to ensure useEffect has run
				setTimeout(() => {
					const checkboxes = component.container.querySelectorAll('input[type="checkbox"]')
					if (checkboxes.length > 0) {
						// Simulate user interactions
						for (let i = 0; i < Math.min(10, checkboxes.length); i++) {
							const checkbox = checkboxes[i] as HTMLInputElement
							if (checkbox) {
								checkbox.click()
							}
						}

						// Simulate filter changes
						const filterSelect = component.container.querySelector("select") as HTMLSelectElement
						if (filterSelect) {
							filterSelect.value = "active"
							filterSelect.dispatchEvent(new Event("change", { bubbles: true }))
						}
					}
				}, 10)
			})

			cleanup()
		},
		{
			setup: setupTraditionalTodos,
			time: 1000,
			iterations: 10,
			warmupTime: 200,
			warmupIterations: 3,
		}
	)

	bench(
		"Signal Todo App - Render & Interactions",
		() => {
			const component = render(<SignalTodoApp />)

			React.act(() => {
				// Signal components render immediately, so we can interact right away
				const checkboxes = component.container.querySelectorAll('input[type="checkbox"]')
				for (let i = 0; i < Math.min(10, checkboxes.length); i++) {
					const checkbox = checkboxes[i] as HTMLInputElement
					if (checkbox) {
						checkbox.click()
					}
				}

				// Simulate filter changes via signals
				REACTIVE_CORE.updateSignal("todo-filter", "active")
				REACTIVE_CORE.updateSignal("todo-filter", "completed")
			})

			cleanup()
		},
		{
			setup: setupSignalTodos,
			time: 1000,
			iterations: 10,
			warmupTime: 200,
			warmupIterations: 3,
		}
	)
})

// This fails to run for some reason, gotta figure out why
describe("Real-time Dashboard Performance", () => {
	const setupTraditionalDashboard = () => {
		cleanup()
	}

	const setupSignalDashboard = () => {
		cleanup()
		REACTIVE_CORE.upsertSignal("dashboard-users", 0)
		REACTIVE_CORE.upsertSignal("dashboard-revenue", 0)
		REACTIVE_CORE.upsertSignal("dashboard-orders", 0)
		REACTIVE_CORE.upsertSignal("dashboard-conversion", 0)
		REACTIVE_CORE.upsertSignal("dashboard-alerts", [])
	}

	bench(
		"Traditional Dashboard - Real-time Updates",
		() => {
			// Simple approach: just render multiple times with different props
			for (let i = 0; i <= 10; i++) {
				const _ = render(<TraditionalDashboard updateTrigger={i} />)
				cleanup()
			}
		},
		{
			setup: setupTraditionalDashboard,
			time: 1500,
			iterations: 10,
			warmupTime: 300,
			warmupIterations: 3,
		}
	)

	bench(
		"Signal Dashboard - Real-time Updates",
		() => {
			const component = render(<SignalDashboard />)

			React.act(() => {
				// Simulate real-time updates
				for (let i = 0; i < 10; i++) {
					const currentUsers = (REACTIVE_CORE.getValue("dashboard-users") as number) || 0
					const currentRevenue = (REACTIVE_CORE.getValue("dashboard-revenue") as number) || 0
					const currentOrders = (REACTIVE_CORE.getValue("dashboard-orders") as number) || 0
					const currentAlerts = (REACTIVE_CORE.getValue("dashboard-alerts") as any[]) || []

					REACTIVE_CORE.batchUpdate(() => {
						REACTIVE_CORE.updateSignal("dashboard-users", currentUsers + Math.floor(Math.random() * 10))
						REACTIVE_CORE.updateSignal("dashboard-revenue", currentRevenue + Math.random() * 1000)
						REACTIVE_CORE.updateSignal("dashboard-orders", currentOrders + Math.floor(Math.random() * 5))
						REACTIVE_CORE.updateSignal("dashboard-conversion", Math.random() * 0.1 + 0.02)
						REACTIVE_CORE.updateSignal("dashboard-alerts", [
							...currentAlerts.slice(-4),
							{
								id: `alert-${Date.now()}-${i}`,
								message: `Alert ${Date.now()}-${i}`,
								severity: ["info", "warning", "error"][Math.floor(Math.random() * 3)],
							},
						])
					})
				}
			})

			cleanup()
		},
		{
			setup: setupSignalDashboard,
			time: 1500,
			iterations: 10,
			warmupTime: 300,
			warmupIterations: 3,
		}
	)
})

describe("Data Grid Performance", () => {
	const setupTraditionalGrid = () => {
		cleanup()
	}

	const setupSignalGrid = () => {
		cleanup()
		const initialData: GridItem[] = Array.from({ length: 500 }, (_, i) => ({
			id: i,
			name: `Item ${i}`,
			value: Math.random() * 1000,
			category: ["Electronics", "Clothing", "Books", "Sports"][Math.floor(Math.random() * 4)],
			status: ["active", "inactive", "pending"][Math.floor(Math.random() * 3)] as any,
		}))

		REACTIVE_CORE.upsertSignal("grid-data", initialData)
		REACTIVE_CORE.upsertSignal("grid-filter", "all")
		REACTIVE_CORE.upsertSignal("grid-sort", "name")
	}

	bench(
		"Traditional Data Grid - Filtering & Sorting",
		() => {
			const component = render(<TraditionalDataGrid />)

			React.act(() => {
				// Wait for component to initialize
				setTimeout(() => {
					// Simulate filter changes
					const filterSelect = component.container.querySelector("select") as HTMLSelectElement
					if (filterSelect) {
						filterSelect.value = "Electronics"
						filterSelect.dispatchEvent(new Event("change", { bubbles: true }))

						filterSelect.value = "Clothing"
						filterSelect.dispatchEvent(new Event("change", { bubbles: true }))
					}

					// Simulate sort changes
					const sortSelect = component.container.querySelectorAll("select")[1] as HTMLSelectElement
					if (sortSelect) {
						sortSelect.value = "value"
						sortSelect.dispatchEvent(new Event("change", { bubbles: true }))
					}
				}, 10)
			})

			cleanup()
		},
		{
			setup: setupTraditionalGrid,
			time: 800,
			iterations: 10,
			warmupTime: 150,
			warmupIterations: 3,
		}
	)

	bench(
		"Signal Data Grid - Filtering & Sorting",
		() => {
			const component = render(<SignalDataGrid />)

			React.act(() => {
				// Simulate filter changes
				REACTIVE_CORE.updateSignal("grid-filter", "Electronics")
				REACTIVE_CORE.updateSignal("grid-filter", "Clothing")

				// Simulate sort changes
				REACTIVE_CORE.updateSignal("grid-sort", "value")
				REACTIVE_CORE.updateSignal("grid-sort", "category")
			})

			cleanup()
		},
		{
			setup: setupSignalGrid,
			time: 800,
			iterations: 10,
			warmupTime: 150,
			warmupIterations: 3,
		}
	)
})
