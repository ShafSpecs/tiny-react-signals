import type { MetaFunction } from "react-router";
import React, { useCallback } from 'react';
import { test } from "ultimate-react";
import { signal, useReactiveElement } from "ultimate-react";

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

  // Computed signal
  signal.computed('sum-cell', ['color-cell', 'size-cell'], (...dependencies: unknown[]) => {
    const [a, b] = dependencies as [number, number];
    return (a || 0) + (b || 0);
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

// Main App
const App = () => {
  const [mounted, setMounted] = React.useState(true);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <h1>Optimized Reactive System - Class-Based Implementation</h1>
      <p>Blazing fast signal updates with zero overhead design</p>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setMounted(!mounted)}
          style={{...buttonStyle, backgroundColor: mounted ? '#f44336' : '#4CAF50'}}
        >
          {mounted ? 'Unmount Grid' : 'Mount Grid'} (Test Singleton Persistence)
        </button>
      </div>

      {mounted && <ReactiveGrid />}
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
