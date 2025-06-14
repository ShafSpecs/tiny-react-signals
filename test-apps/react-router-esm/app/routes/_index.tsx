import type { MetaFunction } from "react-router";
import React, { useCallback } from 'react';
import { test } from "tiny-react-signals";
import { signal, useReactiveElement, Signal, SignalList, useSignal } from "tiny-react-signals";

// Type assertions to fix JSX compatibility with generic components
const SignalComponent = Signal as any;
const SignalListComponent = SignalList as any;

export const meta: MetaFunction = () => {
  return [{ title: "New Remix App" }, { name: "description", content: "Welcome to Remix!" }];
};

// Initialize signals outside of React
const initializeSignals = () => {
  signal.create('text-cell', 'Initial Text');
  signal.create('color-cell', 0);
  signal.create('size-cell', 50);
  signal.create('progress-cell', 25);
  signal.create('complex-cell', 10);

  // New Signal component demo signals
  signal.create('user.name', 'John Doe');
  signal.create('user.age', 25);
  signal.create('user.status', 'online');
  signal.create('theme.primaryColor', '#3b82f6');
  signal.create('counter', 0);

  signal.create('message', 'Hello, world!');
  signal.create('timestamp', new Date().toISOString());

  // List demo signals
  signal.create('todos', [
    { id: 1, text: 'Learn React', done: false },
    { id: 2, text: 'Build Signal Components', done: true },
    { id: 3, text: 'Create Awesome Apps', done: false }
  ]);

  // Pattern-based signals for individual todo items
  signal.create('todo.1.text', 'Learn React');
  signal.create('todo.1.done', false);
  signal.create('todo.2.text', 'Build Signal Components');
  signal.create('todo.2.done', true);
  signal.create('todo.3.text', 'Create Awesome Apps');
  signal.create('todo.3.done', false);

  // Computed signal
  signal.computed('sum-cell', ['color-cell', 'size-cell'], (...dependencies: unknown[]) => {
    const [a, b] = dependencies as [number, number];
    return (a || 0) + (b || 0);
  });

  // Computed user display
  signal.computed('user.display', ['user.name', 'user.age'], (...dependencies: unknown[]) => {
    const [name, age] = dependencies as [string, number];
    return `${name} (${age} years old)`;
  });
};

// Initialize once
initializeSignals();

// Demo Grid Component
const ReactiveGrid = () => {
  // Text binding
  const textRef = useReactiveElement<string, HTMLDivElement>('text-cell', (el: HTMLElement, value: string) => {
    el.textContent = value;
  });

  // Color binding
  const colorRef = useReactiveElement<number, HTMLDivElement>('color-cell', (el: HTMLElement, value: number) => {
    const hue = (value * 36) % 360;
    el.style.backgroundColor = `hsl(${hue}, 70%, 60%)`;
    el.textContent = `Hue: ${Math.round(hue)}°`;
  });

  // Size binding
  const sizeRef = useReactiveElement<number, HTMLDivElement>('size-cell', (el: HTMLElement, value: number) => {
    const scale = 0.5 + (value / 100);
    el.style.transform = `scale(${scale})`;
    el.textContent = `Scale: ${scale.toFixed(2)}`;
  });

  // Progress binding
  const progressRef = useReactiveElement<number, HTMLDivElement>('progress-cell', (el: HTMLElement, value: number) => {
    el.style.width = `${value}%`;
    el.style.backgroundColor = value > 50 ? '#4CAF50' : '#FF9800';
    el.textContent = `${value}%`;
  });

  // Complex binding
  const complexRef = useReactiveElement<number, HTMLDivElement>('complex-cell', (el: HTMLElement, value: number) => {
    el.innerHTML = `
      <div style="font-size: ${8 + value}px; color: hsl(${value * 10}, 60%, 40%)">
        <strong>Value: ${value}</strong><br>
        <small>Time: ${new Date().toLocaleTimeString()}</small>
      </div>
    `;
    el.style.border = `${Math.max(1, value / 10)}px solid hsl(${value * 10}, 60%, 40%)`;
  });

  // Computed binding
  const sumRef = useReactiveElement<number, HTMLDivElement>('sum-cell', (el: HTMLElement, value: number) => {
    el.textContent = `Sum: ${value}`;
    el.style.fontWeight = value > 75 ? 'bold' : 'normal';
    el.style.color = value > 75 ? '#e91e63' : '#333';
  });

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '15px',
      padding: '20px',
      maxWidth: '800px'
    }}>
      <div ref={textRef} style={cellStyle}>Loading...</div>
      <div ref={colorRef} style={cellStyle}>Loading...</div>
      <div ref={sizeRef} style={{...cellStyle, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>Loading...</div>

      <div ref={progressRef} style={{
        ...cellStyle,
        height: '30px',
        position: 'relative',
        backgroundColor: '#f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>0%</div>

      <div ref={complexRef} style={cellStyle}>Loading...</div>
      <div ref={sumRef} style={{...cellStyle, backgroundColor: '#f8f9fa'}}>Loading...</div>
    </div>
  );
};

const cellStyle: React.CSSProperties = {
  padding: '15px',
  border: '2px solid #ddd',
  borderRadius: '8px',
  minHeight: '60px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  transition: 'all 0.1s ease'
};

// Control Panel
const ControlPanel = () => {
  // Performance test state
  const [isStressing, setIsStressing] = React.useState(false);
  const [updateCount, setUpdateCount] = React.useState(0);

  const updateSignal = useCallback((signalId: string, value: any) => {
    signal.set(signalId, value);
  }, []);

  const randomText = () => Math.random().toString(36).substring(2, 8);
  const randomNumber = (max = 100) => Math.floor(Math.random() * max);

  const stressTest = useCallback(() => {
    if (isStressing) return;

    setIsStressing(true);
    setUpdateCount(0);

    let count = 0;
    const interval = setInterval(() => {
      // Rapid fire updates using our optimized signal system
      updateSignal('color-cell', randomNumber(10));
      updateSignal('size-cell', randomNumber(100));
      updateSignal('progress-cell', randomNumber(100));
      updateSignal('complex-cell', randomNumber(50));

      count += 4; // 4 updates per iteration
      setUpdateCount(count);

      if (count >= 1000) {
        clearInterval(interval);
        setIsStressing(false);
      }
    }, 5); // 200 updates per second
  }, [isStressing, updateSignal]);

  return (
    <div style={{ padding: '20px', borderTop: '2px solid #eee' }}>
      <h3>Optimized Signal Control (Zero React Re-renders)</h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => updateSignal('text-cell', randomText())}
          style={buttonStyle}
        >
          Update Text
        </button>

        <button
          onClick={() => updateSignal('color-cell', randomNumber(10))}
          style={buttonStyle}
        >
          Update Color
        </button>

        <button
          onClick={() => updateSignal('size-cell', randomNumber(100))}
          style={buttonStyle}
        >
          Update Size
        </button>

        <button
          onClick={() => updateSignal('progress-cell', randomNumber(100))}
          style={buttonStyle}
        >
          Update Progress
        </button>

        <button
          onClick={() => updateSignal('complex-cell', randomNumber(50))}
          style={buttonStyle}
        >
          Update Complex
        </button>

        <button
          onClick={stressTest}
          disabled={isStressing}
          style={{...buttonStyle, backgroundColor: isStressing ? '#ccc' : '#e91e63'}}
        >
          {isStressing ? `Stressing... ${updateCount}` : 'Stress Test (1000 updates)'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={() => {
            const activeSignals = signal.getActiveSignals();
            console.log('Active signals:', activeSignals);
            activeSignals.forEach(id => {
              console.log(`${id}:`, signal.get(id));
            });
          }}
          style={{...buttonStyle, backgroundColor: '#607d8b'}}
        >
          Debug Signals
        </button>

        <button
          onClick={() => {
            // Simultaneous updates using batch
            signal.batch(() => {
              updateSignal('text-cell', 'SYNC UPDATE');
              updateSignal('color-cell', 5);
              updateSignal('size-cell', 75);
            });
          }}
          style={{...buttonStyle, backgroundColor: '#795548'}}
        >
          Batched Updates
        </button>

        <button
          onClick={() => {
            // Test scoping cleanup
            signal.create('temp.test1', 'test1');
            signal.create('temp.test2', 'test2');
            signal.create('temp.test3', 'test3');
            console.log('Created temp signals:', signal.getActiveSignals().filter(id => id.startsWith('temp.')));
            console.log('Active signals:', signal.getActiveSignals());

            setTimeout(() => {
              signal.removeByPrefix('temp.');
              console.log('Cleaned up temp signals. Remaining:', signal.getActiveSignals());
            }, 1000);
          }}
          style={{...buttonStyle, backgroundColor: '#ff9800'}}
        >
          Test Scoping
        </button>
      </div>

      <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px', fontSize: '14px' }}>
        <strong>Performance Notes:</strong>
        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
          <li>Optimized class-based reactive core</li>
          <li>Zero overhead for simple signals</li>
          <li>Fast paths for transformers and computed signals</li>
          <li>Efficient batching and DOM updates</li>
          <li>Scoping utilities for cleanup</li>
        </ul>
      </div>
    </div>
  );
};

const buttonStyle: React.CSSProperties = {
  padding: '10px 15px',
  border: 'none',
  borderRadius: '4px',
  backgroundColor: '#2196F3',
  color: 'white',
  cursor: 'pointer',
  fontSize: '14px',
  transition: 'background-color 0.2s'
};

const exampleBoxStyle: React.CSSProperties = {
  padding: '15px',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  backgroundColor: '#f9fafb'
};

const demoAreaStyle: React.CSSProperties = {
  padding: '10px',
  backgroundColor: 'white',
  borderRadius: '4px',
  border: '1px solid #d1d5db'
};

// Actual Signal Component Examples (using the components we built)
const ActualSignalComponentExamples = () => {
  return (
    <div style={{ padding: '20px', borderTop: '2px solid #eee' }}>
      <h2>⚡ ACTUAL Signal & SignalList Components in Action!</h2>
      <p>These examples use the actual Signal and SignalList components we built - zero React re-renders!</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>

        {/* Simple Signal Usage */}
        <div style={exampleBoxStyle}>
          <h3>Simple Signal Components</h3>
          <p>Direct value injection with zero re-renders:</p>
          <div style={demoAreaStyle}>
            <div>
              User Name: <SignalComponent id="user.name" as="strong" style={{color: '#3b82f6'}} />
            </div>
            <div>
              Counter: <SignalComponent id="counter" as="span" style={{fontSize: '20px', color: '#ef4444'}} />
            </div>
            <div>
              Computed: <SignalComponent id="user.display" as="em" style={{color: '#22c55e'}} />
            </div>
          </div>
        </div>

        {/* Signal with Render Props */}
        <div style={exampleBoxStyle}>
          <h3>Signal Render Props</h3>
          <p>Custom rendering logic:</p>
          <div style={demoAreaStyle}>
            <SignalComponent id="user.status">
              {(status: string) => (
                <div style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  backgroundColor: status === 'online' ? '#22c55e' : '#ef4444',
                  color: 'white',
                  display: 'inline-block',
                  fontSize: '14px'
                }}>
                  {status === 'online' ? '🟢 Online' : '🔴 Offline'}
                </div>
              )}
            </SignalComponent>
          </div>
        </div>

        {/* Multiple Signals */}
        <div style={exampleBoxStyle}>
          <h3>Multiple Signals</h3>
          <p>Combine multiple signal values:</p>
          <div style={demoAreaStyle}>
            <SignalComponent ids={['user.name', 'user.age']}>
              {(values: {name: string, age: number}) => (
                <div style={{
                  padding: '12px',
                  border: '2px solid #8b5cf6',
                  borderRadius: '8px',
                  backgroundColor: '#f3e8ff'
                }}>
                  👤 {values.name} is {values.age} years old
                </div>
              )}
            </SignalComponent>
          </div>
        </div>

        {/* SignalList - Array Based */}
        <div style={exampleBoxStyle}>
          <h3>SignalList - Array</h3>
          <p>List from array signal:</p>
          <div style={demoAreaStyle}>
            <SignalListComponent id="todos" keyBy="id" type="ul" style={{margin: 0, paddingLeft: '20px'}}>
              {(todo: any) => (
                <li key={todo.id} style={{
                  padding: '4px 0',
                  color: todo.done ? '#22c55e' : '#f59e0b'
                }}>
                  {todo.done ? '✅' : '⏳'} {todo.text}
                </li>
              )}
            </SignalListComponent>
          </div>
        </div>

        {/* SignalList - Slot Type */}
        <div style={exampleBoxStyle}>
          <h3>SignalList - Slot</h3>
          <p>No wrapper element:</p>
          <div style={demoAreaStyle}>
            <div style={{border: '1px dashed #ccc', padding: '10px', borderRadius: '4px'}}>
              <SignalListComponent id="todos" keyBy="id" type="slot">
                {(todo: any) => (
                  <span key={todo.id} style={{
                    padding: '4px 8px',
                    margin: '2px',
                    backgroundColor: todo.done ? '#c084fc' : '#60a5fa',
                    color: 'white',
                    borderRadius: '12px',
                    display: 'inline-block',
                    fontSize: '12px'
                  }}>
                    {todo.text}
                  </span>
                )}
              </SignalListComponent>
            </div>
          </div>
        </div>

        {/* Slot Behavior */}
        <div style={exampleBoxStyle}>
          <h3>Signal Slot (as=null)</h3>
          <p>Invisible wrapper:</p>
          <div style={demoAreaStyle}>
            <SignalComponent id="theme.primaryColor" as={null}>
              {(color: string) => (
                <div style={{
                  padding: '15px',
                  backgroundColor: color,
                  color: 'white',
                  borderRadius: '8px',
                  textAlign: 'center',
                  fontWeight: 'bold'
                }}>
                  Theme Color: {color}
                </div>
              )}
            </SignalComponent>
          </div>
        </div>

        <div style={exampleBoxStyle}>
          <h3>Click Counter</h3>
          <p>Click to increment:</p>
          <div style={demoAreaStyle}>
            <SignalComponent
              id="counter"
              as="button"
              onClick={() => {
                const current = signal.get('counter') as number;
                signal.set('counter', current + 1);
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              {(count: number) => `Clicked ${count} times`}
            </SignalComponent>
          </div>
        </div>

        <div style={exampleBoxStyle}>
        <button
  onClick={() => {
    signal.set('message', 'Button was clicked! ' + Date.now());
    signal.set('timestamp', Date.now());
  }}
  style={buttonStyle}
>
  Update Message
</button>

            <br />
            {/* Signal displays the content */}
            <SignalComponent id="message"  />
            <br />
            <SignalComponent id="timestamp" />
        </div>
      </div>

      <div style={{marginTop: '20px', padding: '15px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '2px solid #3b82f6'}}>
        <h4 style={{margin: '0 0 10px 0', color: '#1e40af'}}>🎉 SUCCESS: Signal Components Working!</h4>
        <p style={{margin: 0}}>
          All examples above use the actual <code>Signal</code> and <code>SignalList</code> components we built.
          They provide zero React re-renders through direct DOM manipulation while maintaining full React integration!
        </p>
      </div>
    </div>
  );
};

// New Signal Component Examples
const SignalComponentExamples = () => {
  // Signal bindings using refs
  const userNameRef = useReactiveElement<string>('user.name', (el: HTMLElement, value: string) => {
    el.textContent = value || 'No name';
  });

  const counterRef = useReactiveElement<number>('counter', (el: HTMLElement, value: number) => {
    el.textContent = (value || 0).toString();
  });

  const statusRef = useReactiveElement<string, HTMLDivElement>('user.status', (el: HTMLElement, value: string) => {
    el.textContent = value === 'online' ? '🟢 Online' : '🔴 Offline';
    el.style.backgroundColor = value === 'online' ? '#22c55e' : '#ef4444';
  });

  const themeRef = useReactiveElement<string, HTMLDivElement>('theme.primaryColor', (el: HTMLElement, value: string) => {
    el.style.backgroundColor = value || '#3b82f6';
    el.textContent = `Dynamic Background: ${value || '#3b82f6'}`;
  });

  const interactiveCounterRef = useReactiveElement<number>('counter', (el: HTMLElement, value: number) => {
    el.textContent = `🎯 Count: ${value || 0} (Click me!)`;
  });

  return (
    <div style={{ padding: '20px', borderTop: '2px solid #eee' }}>
      <h2>🚀 Signal Components - Zero React Re-renders</h2>
      <p>These examples use direct DOM signal bindings for zero-overhead updates.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>

        {/* Simple Value Display */}
        <div style={exampleBoxStyle}>
          <h3>Simple Value Display</h3>
          <p>Auto-injection of signal values - no React re-renders!</p>
          <div style={demoAreaStyle}>
            <div>Name: <span ref={userNameRef} style={{fontWeight: 'bold'}}>Loading...</span></div>
            <div>Counter: <span ref={counterRef} style={{fontSize: '24px', color: '#3b82f6'}}>0</span></div>
          </div>
        </div>

        {/* Status Display */}
        <div style={exampleBoxStyle}>
          <h3>Dynamic Status</h3>
          <p>Signal-driven styling updates:</p>
          <div style={demoAreaStyle}>
            <div ref={statusRef} style={{
              padding: '8px 16px',
              borderRadius: '20px',
              display: 'inline-block',
              color: 'white',
              minWidth: '100px',
              textAlign: 'center'
            }}>
              Loading...
            </div>
          </div>
        </div>

        {/* Theme Example */}
        <div style={exampleBoxStyle}>
          <h3>Dynamic Theming</h3>
          <p>Background color from signal:</p>
          <div style={demoAreaStyle}>
            <div ref={themeRef} style={{
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center',
              color: 'white',
              fontWeight: 'bold'
            }}>
              Dynamic Background
            </div>
          </div>
        </div>

        {/* Interactive Counter */}
        <div style={exampleBoxStyle}>
          <h3>Interactive Counter</h3>
          <p>Click to increment - signals handle the updates:</p>
          <div style={demoAreaStyle}>
            <div
              onClick={() => {
                const current = signal.get('counter') as number || 0;
                signal.set('counter', current + 1);
              }}
              style={{
                cursor: 'pointer',
                padding: '15px',
                border: '2px solid #f59e0b',
                borderRadius: '8px',
                backgroundColor: '#fef3c7',
                textAlign: 'center',
                userSelect: 'none'
              }}
            >
              <span ref={interactiveCounterRef}>🎯 Count: 0 (Click me!)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Todo List Examples
const TodoListExamples = () => {
  // Todo list signal binding
  const todosListRef = useReactiveElement<any[], HTMLUListElement>('todos', (el: HTMLElement, todos: any[]) => {
    el.innerHTML = '';
    (todos || []).forEach((todo, index) => {
      const li = document.createElement('li');
      li.style.cssText = `
        padding: 8px;
        margin: 4px 0;
        background-color: ${todo.done ? '#dcfce7' : '#fef3c7'};
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 8px;
      `;
      li.innerHTML = `
        <span>${todo.done ? '✅' : '⏳'}</span>
        <span style="text-decoration: ${todo.done ? 'line-through' : 'none'}">${todo.text}</span>
      `;
      el.appendChild(li);
    });
  });

  // Individual todo signal bindings
  const todo1TextRef = useReactiveElement<string>('todo.1.text', (el: HTMLElement, value: string) => {
    el.textContent = value || 'No text';
  });

  const todo1StatusRef = useReactiveElement<boolean>('todo.1.done', (el: HTMLElement, value: boolean) => {
    el.textContent = value ? '✅ Done' : '⏳ Pending';
    el.style.color = value ? '#22c55e' : '#f59e0b';
  });

  const todo2TextRef = useReactiveElement<string>('todo.2.text', (el: HTMLElement, value: string) => {
    el.textContent = value || 'No text';
  });

  const todo2StatusRef = useReactiveElement<boolean>('todo.2.done', (el: HTMLElement, value: boolean) => {
    el.textContent = value ? '✅ Done' : '⏳ Pending';
    el.style.color = value ? '#22c55e' : '#f59e0b';
  });

  const todo3TextRef = useReactiveElement<string>('todo.3.text', (el: HTMLElement, value: string) => {
    el.textContent = value || 'No text';
  });

  const todo3StatusRef = useReactiveElement<boolean>('todo.3.done', (el: HTMLElement, value: boolean) => {
    el.textContent = value ? '✅ Done' : '⏳ Pending';
    el.style.color = value ? '#22c55e' : '#f59e0b';
  });

  // Tags display
  const todosTagsRef = useReactiveElement<any[], HTMLDivElement>('todos', (el: HTMLElement, todos: any[]) => {
    el.innerHTML = '';
    (todos || []).forEach((todo) => {
      const tag = document.createElement('div');
      tag.style.cssText = `
        padding: 6px 12px;
        margin: 2px;
        background-color: ${todo.done ? '#c084fc' : '#60a5fa'};
        color: white;
        border-radius: 20px;
        display: inline-block;
        font-size: 14px;
      `;
      tag.textContent = `${todo.text} ${todo.done ? '✨' : '⚡'}`;
      el.appendChild(tag);
    });
  });

  return (
    <div style={{ padding: '20px', borderTop: '2px solid #eee' }}>
      <h2>📋 Dynamic Todo List - Signal-Based</h2>
      <p>Todo items update individually via signals - no full re-renders!</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>

        {/* Simple Todo List */}
        <div style={exampleBoxStyle}>
          <h3>Dynamic Todo List</h3>
          <p>Each item updates independently:</p>
          <div style={demoAreaStyle}>
            <ul ref={todosListRef} style={{margin: 0, paddingLeft: '20px', listStyle: 'none'}}>
              {/* Items will be populated by signals */}
            </ul>
          </div>
        </div>

        {/* Pattern-based Todo Display */}
        <div style={exampleBoxStyle}>
          <h3>Individual Todo Signals</h3>
          <p>Direct signal bindings:</p>
          <div style={demoAreaStyle}>
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
              <div style={{padding: '8px', backgroundColor: '#f0f0f0', borderRadius: '4px'}}>
                Todo 1: <span ref={todo1TextRef} style={{fontWeight: 'bold'}}>Loading...</span>
                <span ref={todo1StatusRef} style={{marginLeft: '10px'}}>Loading...</span>
              </div>
              <div style={{padding: '8px', backgroundColor: '#f0f0f0', borderRadius: '4px'}}>
                Todo 2: <span ref={todo2TextRef} style={{fontWeight: 'bold'}}>Loading...</span>
                <span ref={todo2StatusRef} style={{marginLeft: '10px'}}>Loading...</span>
              </div>
              <div style={{padding: '8px', backgroundColor: '#f0f0f0', borderRadius: '4px'}}>
                Todo 3: <span ref={todo3TextRef} style={{fontWeight: 'bold'}}>Loading...</span>
                <span ref={todo3StatusRef} style={{marginLeft: '10px'}}>Loading...</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tag-style display */}
        <div style={exampleBoxStyle}>
          <h3>Tag Style Display</h3>
          <p>Compact todo representation:</p>
          <div style={demoAreaStyle}>
            <div ref={todosTagsRef} style={{display: 'flex', flexWrap: 'wrap', gap: '5px'}}>
              {/* Tags will be populated by signals */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Controls for Signal Examples
const SignalControls = () => {
  const [userName] = useSignal('user.name', 'John Doe');

  return (
    <div style={{ padding: '20px', borderTop: '2px solid #eee' }}>
      <h3>🎮 Signal Controls</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>

        <button
          onClick={() => signal.set('user.name', userName === 'John Doe' ? 'Jane Smith' : 'John Doe')}
          style={buttonStyle}
        >
          Toggle Name
        </button>

        <button
          onClick={() => signal.set('user.age', Math.floor(Math.random() * 50) + 20)}
          style={buttonStyle}
        >
          Random Age
        </button>

        <button
          onClick={() => signal.set('user.status', signal.get('user.status') === 'online' ? 'offline' : 'online')}
          style={buttonStyle}
        >
          Toggle Status
        </button>

        <button
          onClick={() => {
            const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'];
            signal.set('theme.primaryColor', colors[Math.floor(Math.random() * colors.length)]);
          }}
          style={buttonStyle}
        >
          Random Color
        </button>

        <button
          onClick={() => signal.set('counter', 0)}
          style={{...buttonStyle, backgroundColor: '#ef4444'}}
        >
          Reset Counter
        </button>

        <button
          onClick={() => {
            const currentTodos = signal.get('todos') as any[] || [];
            const newTodo = {
              id: Date.now(),
              text: `New Task ${currentTodos.length + 1}`,
              done: false
            };
            signal.set('todos', [...currentTodos, newTodo]);
          }}
          style={{...buttonStyle, backgroundColor: '#22c55e'}}
        >
          Add Todo
        </button>

        <button
          onClick={() => {
            // Toggle first todo status
            const currentDone = signal.get('todo.1.done') as boolean || false;
            signal.set('todo.1.done', !currentDone);
          }}
          style={{...buttonStyle, backgroundColor: '#8b5cf6'}}
        >
          Toggle Todo 1
        </button>

        <button
          onClick={() => {
            // Update todo text
            const texts = ['Learn React', 'Master Signals', 'Build Apps', 'Ship Products'];
            const randomText = texts[Math.floor(Math.random() * texts.length)];
            signal.set('todo.2.text', randomText);
          }}
          style={{...buttonStyle, backgroundColor: '#ec4899'}}
        >
          Random Todo 2 Text
        </button>
      </div>
    </div>
  );
};

// Main App
const App = () => {
  const [mounted, setMounted] = React.useState(true);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <h1>🔥 Ultimate React - Signal Components Demo</h1>
      <p>Blazing fast signal updates with zero React re-renders</p>

      {/* Quick Signal Component Demo */}
      <div style={{
        padding: '15px',
        margin: '20px 0',
        backgroundColor: '#f0f9ff',
        border: '2px solid #3b82f6',
        borderRadius: '8px'
      }}>
        <h3 style={{margin: '0 0 10px 0'}}>🚀 Live Signal Components:</h3>
        <div style={{display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap'}}>
          <div>Name: <SignalComponent id="user.name" as="strong" style={{color: '#3b82f6'}} /></div>
          <div>Counter: <SignalComponent id="counter" as="span" style={{fontSize: '18px', color: '#ef4444'}} /></div>
          <div>Status: <SignalComponent id="user.status" as="em" style={{color: '#22c55e'}} /></div>
        </div>
        <p style={{margin: '10px 0 0 0', fontSize: '14px', color: '#6b7280'}}>
          ↑ These update instantly via direct DOM manipulation - zero React re-renders!
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setMounted(!mounted)}
          style={{...buttonStyle, backgroundColor: mounted ? '#f44336' : '#4CAF50'}}
        >
          {mounted ? 'Unmount Demo' : 'Mount Demo'} (Test Singleton Persistence)
        </button>
      </div>

      {mounted && (
        <>
          <ActualSignalComponentExamples />
          <SignalComponentExamples />
          <TodoListExamples />
          <SignalControls />
          <ReactiveGrid />
        </>
      )}
      <ControlPanel />
    </div>
  );
};

export default function Index() {
  test();
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>
      <h1>Welcome to Remix</h1>
      <ul>
        <li>
          <a target="_blank" href="https://remix.run/tutorials/blog" rel="noreferrer">
            15m Quickstart Blog Tutorial
          </a>
        </li>
        <li>
          <a target="_blank" href="https://remix.run/tutorials/jokes" rel="noreferrer">
            Deep Dive Jokes App Tutorial
          </a>
        </li>
        <li>
          <a target="_blank" href="https://remix.run/docs" rel="noreferrer">
            Remix Docs
          </a>
        </li>
      </ul>
      <App />
    </div>
  );
}
