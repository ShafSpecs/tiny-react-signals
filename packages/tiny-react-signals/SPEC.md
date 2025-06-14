# Tiny Reactive React - Specification

## Overview

Tiny React Signals aims to provide **"true" atomic reactivity** that bypasses React's reconciliation cycle while maintaining familiar React patterns. The system acts as a "drop-in replacement" for React state management with zero-rerender signal components.

### Core Goals

- **Drop-in useState replacement**: `useSignal` works exactly like `useState` but with global signal access
- **Zero React re-renders**: Signal components update DOM directly, bypassing React reconciliation
- **Familiar React patterns**: Follows React's security model and component patterns
- **True atomic reactivity**: Individual DOM elements update independently
- **Seamless integration**: "Creeps in like malware" - works with existing React code

## Core Concepts

### Signals

- **Global reactive primitives** identified by string IDs
- Accessible from any component using the same ID
- Support computed signals with automatic dependency tracking
- Optional transformers for value processing

### Signal Components

- **Zero-rerender React components** that bind directly to signals
- Mount once, then all updates bypass React and go directly to DOM
- Support render props, templates, and auto-injection patterns
- Can act as "slots" (invisible wrappers) when `as={null}`

### Hooks

- **`useSignal(id, initialValue)`**: Drop-in replacement for `useState`
- **`useSignalRef(id, initialValue, options)`**: Access signal values without triggering React re-renders
- **`useSignalSelector(id, initialValue, selector, equalityFn, options)`**: Select part of a signal value with memoization
- **`useSignalEffect(fn, deps)`**: Effect hook that runs when signals change
- **`useSignalComputed(id, deps, computeFn)`**: Creates computed signals

## API Design

### Core Hooks

```jsx
// Drop-in useState replacement
const [count, setCount] = useSignal('counter', 0);
const [user, setUser] = useSignal('user', { name: 'John', age: 25 });

// Cross-component access (same signal ID = same signal)
function OtherComponent() {
  const [count] = useSignal('counter', 0); // Gets the same counter!
  return <div>Count elsewhere: {count}</div>;
}
```

### Read-Only Signal Access

```jsx
// Access signal value without triggering re-renders
const userRef = useSignalRef('user', { name: 'John', age: 25 });

function handleClick() {
  // Access current value without causing re-renders
  console.log('Current user:', userRef.current);

  // Perfect for event handlers, effects, or manual DOM updates
  if (userRef.current?.age > 18) {
    // Handle adult user logic
  }
}

// Use in effects or callbacks where you need current value
useEffect(() => {
  const interval = setInterval(() => {
    console.log('Current count:', countRef.current);
  }, 1000);
  return () => clearInterval(interval);
}, []);
```

### Selective Signal Subscriptions

```jsx
// Only re-render when user.name changes, not other user properties
const userName = useSignalSelector(
  'user',
  { name: '', age: 0, email: '' },
  user => user.name
);

// Custom equality for complex selections
const userProfile = useSignalSelector(
  'user',
  defaultUser,
  user => ({ name: user.name, avatar: user.avatar }),
  (a, b) => a.name === b.name && a.avatar === b.avatar
);

// Computed selections with performance optimization
const expensiveComputation = useSignalSelector(
  'largeDataset',
  [],
  data => data.filter(item => item.active).map(item => item.summary),
  (a, b) => a.length === b.length && a.every((item, i) => item === b[i])
);
```

### Signal Component

```jsx
<Signal
  id={string}           // Single signal ID
  ids={string[]}        // Multiple signal IDs
  as={Component|null}   // Render as component or slot
  keyBy={string}        // For list rendering
  children={function|ReactNode} // Render props or static content
/>
```

## Component Patterns

### 1. Simple Value Display

```jsx
// Auto-injection - simplest form
<Signal id="user.name" />

// With wrapper element
<Signal id="user.name" as="strong" />

// With styling
<Signal id="user.name" as="h1" className="title" />
```

### 2. Render Props Pattern

```jsx
// Single signal
<Signal id="user.name">
  {name => <strong>Hello {name}!</strong>}
</Signal>

// Multiple signals
<Signal ids={['user.name', 'user.age']}>
  {({name, age}) => (
    <div className={age > 18 ? 'adult' : 'minor'}>
      {name} ({age} years old)
    </div>
  )}
</Signal>
```

### 3. Conditional Rendering

```jsx
<Signal id="user.isLoggedIn">
  {isLoggedIn => isLoggedIn ? (
    <Signal id="user.name">
      {name => <div>Welcome, {name}!</div>}
    </Signal>
  ) : (
    <div>Please log in</div>
  )}
</Signal>
```

### 4. Slot Pattern (as={null})

```jsx
// Acts as invisible wrapper, passes signals to children
<Signal id="theme.color" as={null}>
  {color => (
    <div style={{ backgroundColor: color }}>
      <h1>Themed Content</h1>
      <p>Background color from signal</p>
    </div>
  )}
</Signal>
```

### 5. List Rendering

```jsx
// Basic list with individual item signals
<SignalList id="todos" keyBy="id">
  {(todo, index) => (
    <div key={todo.id}>
      <Signal id={`todo.${todo.id}.text`} />
      <Signal id={`todo.${todo.id}.done`}>
        {done => <span>{done ? '✓' : '○'}</span>}
      </Signal>
    </div>
  )}
</SignalList>

// Pattern-based lists
<SignalList pattern="todo.*" keyBy="id">
  {(todoId, signals) => (
    <div key={todoId}>
      <Signal id={`todo.${todoId}.text`} />
      <Signal id={`todo.${todoId}.done`}>
        {done => <input type="checkbox" checked={done} />}
      </Signal>
    </div>
  )}
</SignalList>
```

## Advanced Patterns

### Performance Optimization Hooks

```jsx
function ExpensiveComponent() {
  const settingsRef = useSignalRef('app.settings', defaultSettings);

  const handleExpensiveOperation = useCallback(() => {
    // Access current settings without triggering re-renders
    const settings = settingsRef.current;
    performExpensiveTask(settings);
  }, []);

  // Component never re-renders when settings change
  return <button onClick={handleExpensiveOperation}>Process</button>;
}

function UserProfile() {
  // Only re-renders when name changes, ignoring other user properties
  const name = useSignalSelector('user', defaultUser, user => user.name);

  // Only re-renders when preferences change
  const theme = useSignalSelector(
    'user',
    defaultUser,
    user => user.preferences.theme
  );

  return (
    <div className={`theme-${theme}`}>
      <h1>Hello, {name}!</h1>
    </div>
  );
}

function ChatMessage({ messageId }) {
  // Read-only access to message data
  const messageRef = useSignalRef(`message.${messageId}`, null);

  // Only re-render when read status changes
  const isRead = useSignalSelector(
    `message.${messageId}`,
    { content: '', isRead: false, timestamp: 0 },
    msg => msg.isRead
  );

  const markAsRead = useCallback(() => {
    signal.set(`message.${messageId}.isRead`, true);
  }, [messageId]);

  return (
    <div className={isRead ? 'read' : 'unread'} onClick={markAsRead}>
      <Signal id={`message.${messageId}.content`} />
    </div>
  );
}
```

### Computed Signals

```jsx
// Create computed signal
const [sum] = useSignalComputed('math.sum', ['a', 'b'], (a, b) => a + b);

// Use in component
<Signal id="math.sum">
  {sum => <div>Sum: {sum}</div>}
</Signal>
```

### Batched Updates

```jsx
function updateUserData() {
  signal.batch(() => {
    signal.set('user.name', 'Jane');
    signal.set('user.age', 30);
    signal.set('user.status', 'active');
  });
}
```

### Signal Effects

```jsx
// Run effect when signals change
useSignalEffect(() => {
  console.log('User changed:', signal.get('user.name'));
}, ['user.name', 'user.age']);
```

## Security Model

Following React's security patterns:

```jsx
// Safe by default (textContent)
<Signal id="user.name" />

// Template interpolation (safe)
<Signal ids={['user.name', 'user.age']}>
  {({name, age}) => `Hello ${name}, age ${age}`}
</Signal>

// HTML content (explicit opt-in, like React)
<Signal id="user.bio" dangerouslySetInnerHTML />
```

## Performance Characteristics

### Zero React Re-renders

- Signal components mount once, then become "invisible" to React
- All updates happen directly to DOM via signal bindings
- React reconciliation is completely bypassed for signal updates

### Efficient Updates

- Only bound DOM elements update when signals change
- Batching support for multiple simultaneous updates
- Computed signals only recalculate when dependencies change

### Memory Management

- Automatic cleanup when components unmount
- Signal references are managed by the global reactive core
- WeakMap usage for element-signal binding tracking

## Implementation Notes

### Component Lifecycle

1. **Mount**: Signal component renders placeholder element
2. **Effect**: Binding established between signal and DOM element
3. **Updates**: All subsequent updates bypass React, go directly to DOM
4. **Unmount**: Bindings automatically cleaned up

### Signal ID Patterns

- **Scoped IDs**: `user.profile.name`, `cart.items.0.price`
- **Namespaced**: `auth.currentUser`, `theme.colors.primary`
- **Temporary**: `temp.formData`, `session.cache` (can be bulk-cleaned)

### Type Safety

```typescript
// Type-safe signal IDs (future enhancement)
type SignalId =
  | `user.${string}`
  | `cart.${string}`
  | `theme.${string}`;

const [userName] = useSignal<string>('user.name', 'John');
```

## Migration Path

### From useState

```jsx
// Before
const [count, setCount] = useState(0);

// After ([not exactly] drop-in replacement)
const [count, setCount] = useSignal('count', 0);
```

### From useRef for current values

```jsx
// Before: useRef to avoid re-renders
const countRef = useRef(0);
const [, forceUpdate] = useReducer(x => x + 1, 0);

// After: useSignalRef for reactive current values
const countRef = useSignalRef('count', 0);
// countRef.current always has the latest value, no forceUpdate needed
```

### From useMemo with complex dependencies

```jsx
// Before: Complex memoization with many dependencies
const expensiveValue = useMemo(() => {
  return processLargeData(data, filter, sort, options);
}, [data, filter, sort, options]);

// After: Selective subscription with custom equality
const expensiveValue = useSignalSelector(
  'appState',
  defaultState,
  state => processLargeData(state.data, state.filter, state.sort, state.options),
  (a, b) => deepEqual(a, b) // Only re-compute when result actually changes
);
```

> Do note that these aren't exactly drop-in replacements.

### From Context

```jsx
// Before
const user = useContext(UserContext);

// After
const [user] = useSignal('user', { name: 'John' });
```

### From prop drilling

```jsx
// Before: Pass props through multiple levels
<Child user={user} count={count} />

// After: Components access signals directly
function Child() {
  const [user] = useSignal('user', {});
  const [count] = useSignal('count', 0);
  return <div>{user.name}: {count}</div>;
}
```

## Future Enhancements

- **Form binding**: Two-way binding for inputs
- **Style binding**: Dynamic CSS properties
- **Event handler binding**: Signal-driven event handlers
- **Animation binding**: Signal-driven animations
- **DevTools integration**: Signal debugging and visualization
- **SSR support**: Server-side signal hydration

## Examples

### Complete Todo App

```jsx
function TodoApp() {
  const [todos, setTodos] = useSignal('todos', []);
  const [filter, setFilter] = useSignal('filter', 'all');

  return (
    <div>
      <h1>
        <Signal id="todos" as={null}>
          {todos => `Todos (${todos.length})`}
        </Signal>
      </h1>

      <SignalList id="todos" keyBy="id">
        {todo => (
          <div key={todo.id}>
            <Signal id={`todo.${todo.id}.text`} />
            <Signal id={`todo.${todo.id}.completed`}>
              {completed => (
                <button onClick={() => toggleTodo(todo.id)}>
                  {completed ? '✓' : '○'}
                </button>
              )}
            </Signal>
          </div>
        )}
      </SignalList>

      <Signal id="filter">
        {filter => (
          <div>
            Showing: {filter}
            <button onClick={() => setFilter('all')}>All</button>
            <button onClick={() => setFilter('active')}>Active</button>
            <button onClick={() => setFilter('completed')}>Completed</button>
          </div>
        )}
      </Signal>
    </div>
  );
}
```

### Dashboard with Real-time Updates

```jsx
function Dashboard() {
  // Signals can be updated from anywhere (WebSocket, polling, etc.)
  useSignalEffect(() => {
    const ws = new WebSocket('ws://api.example.com');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      signal.batch(() => {
        signal.set('dashboard.users', data.users);
        signal.set('dashboard.revenue', data.revenue);
        signal.set('dashboard.alerts', data.alerts);
      });
    };
  }, []);

  return (
    <div className="dashboard">
      <Signal id="dashboard.users">
        {users => <UserCard count={users.length} />}
      </Signal>

      <Signal id="dashboard.revenue">
        {revenue => <RevenueChart value={revenue} />}
      </Signal>

      <Signal id="dashboard.alerts">
        {alerts => alerts.map(alert => (
          <Alert key={alert.id} {...alert} />
        ))}
      </Signal>
    </div>
  );
}
```

This specification provides the foundation for implementing a truly reactive React system that maintains familiar patterns while delivering atomic, zero-overhead updates.
