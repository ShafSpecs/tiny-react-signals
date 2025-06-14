# Ultimate React Benchmarks

Comparison is the thief of joy.

> Still on the fence regarding signals? Check out the [Preact Signals](https://preactjs.com/blog/introducing-signals/) blog post.

## ⚠️ Important Context: Apples vs Oranges

These benchmarks compare **fundamentally different architectures** solving the same user problems. **Faster performance does not mean better technology.** This is an experimental "signals-in-React" implementation, not a React replacement.

### What We're Actually Comparing

❌ **NOT comparing**: Implementation quality or developer experience

❌ **NOT comparing**: Ecosystem maturity or production readiness

❌ **NOT comparing**: Which technology you should choose

✅ **ARE comparing**: Different architectural approaches to UI updates

✅ **ARE comparing**: Performance characteristics under specific scenarios

✅ **ARE comparing**: Trade-offs between reconciliation vs direct DOM manipulation

## The Fundamental Difference

### Traditional React

- **Philosophy**: Declarative UI with virtual DOM reconciliation
- **Update flow**: State change → Re-render → Virtual DOM diff → DOM update
- **Strengths**: Predictable, debuggable, mature ecosystem, excellent DX
- **Trade-offs**: Re-render overhead for frequent updates

### Signal Components (This Experiment)

- **Philosophy**: Reactive primitives with direct DOM updates
- **Update flow**: Signal change → Direct DOM update (bypasses React)
- **Strengths**: Zero re-render overhead, fine-grained reactivity
- **Trade-offs**: Breaks React's mental model. Experimental

## If You Want Production-Ready Signals

**Use [Preact](https://preactjs.com/) with [@preact/signals](https://github.com/preactjs/signals)** instead. It's:

- ✅ Production-tested and battle-hardened
- ✅ Designed from the ground up for signals
- ✅ Maintained by a dedicated team
- ✅ Has proper tooling and ecosystem support

This Ultimate React project is an **experimental exploration** of "what if we could add signals to React" - not a recommendation to abandon React.

## Benchmark Categories & Interpretation

### 1. Hook Performance (Expected: React Wins)

```
useState:         ~5,000 ops/sec
useSignal:        ~550 ops/sec   (10x slower - EXPECTED)
```

**Why React wins**: `useSignal` hooks still trigger React re-renders AND have signal overhead. This is the worst of both worlds - use regular React patterns here.

**Takeaway**: Don't use signal hooks for performance. Use them for global state access.

### 2. Signal Component Performance (Expected: Signals Win)

```
React re-renders:     ~20 ops/sec
Signal components:   ~60 ops/sec  (3x faster)
```

**Why Signals win**: Direct DOM updates bypass React's reconciliation entirely. This is the architectural advantage.

**Takeaway**: Signal components excel at frequent updates, but you lose React's benefits.

### 3. Real-World Scenarios (Mixed Results)

Results vary based on:

- **Update frequency**: More updates favor signals
- **Component complexity**: Complex components favor React's reconciliation
- **State patterns**: Batched updates favor React, individual updates favor signals

## Performance vs. Developer Experience

### When Signals Show Performance Benefits

- ✅ High-frequency updates (animations, real-time data)
- ✅ Independent UI elements that update separately
- ✅ Simple display components with minimal logic

### When React's Approach Is Better

- ✅ Complex component hierarchies
- ✅ Rich interactions with multiple state dependencies
- ✅ Team productivity and maintainability
- ✅ Debugging and development tools
- ✅ Ecosystem compatibility

## The Real Question

**It's not "Which is faster?"** - It's **"Which trade-offs make sense for your use case?"**

**Why bother with creating benchmarks in the first place?** - Because it was a quick way to get a **feel for the performance of the library** alongside passing tests. Plus, they helped me improve the perfomance by thinning the (unreliable) gap between the two.

**Why did I build this project?** - True reactivity is a dream, and I wanted to see if I could improve it in React. Plus, I had no idea Preact Signals existed (off to Preact I go 💨).

### Choose Traditional React When

- Building complex applications
- Team productivity matters more than micro-optimizations
- You need the full React ecosystem
- Debugging and development experience are priorities
- You're building for long-term maintainability
- You are not sure if you need this

### Consider Signal Experiments When

- You have specific performance bottlenecks with frequent updates
- You're building simple, update-heavy components
- You're experimenting with reactive patterns
- You understand the trade-offs and limitations

### Choose Preact + Signals When

- You want production-ready signals
- You're starting a new project
- You want signals designed into the core of the framework

## Benchmark Results Interpretation

### ✅ Meaningful Comparisons

- **Simple Counter**: Shows pure update performance difference
- **Button Clicks (Direct)**: Demonstrates zero-rerender advantage
- **Form Validation**: Real-world typing scenario

### ⚠️ Architectural Differences (Not Fair Comparisons)

- **Multi-Value Dashboard**: React batching vs individual signals
- **Hook Performance**: Signal hooks have React + Signal overhead
- **Complex Scenarios**: Different optimization strategies

### 🤔 Context-Dependent Results

- **Memory Usage**: Depends on usage patterns
- **Bundle Size**: React has mature optimizations
- **Real-World Apps**: Highly dependent on specific use cases

## Running Benchmarks

```bash
# Focused comparisons
npm run benchmark:fair

# Hook-level performance (shows signal hook overhead)
npm run benchmark:hooks

# Run all benchmarks
pnpm benchmark

# check package.json for more benchmarks scripts
```

## Key Takeaways

1. **Performance ≠ Better**: Faster benchmarks don't mean you should switch technologies
2. **Different Tools, Different Jobs**: React and signals solve different problems
3. **Experimental Nature**: This is a proof-of-concept, it's solved my very niche use case, so there's currently little incentive to improve it
4. **Preact Alternative**: For production signals, use Preact + @preact/signals
5. **Trade-offs Matter**: Consider developer experience, maintainability, and ecosystem

## Conclusion

These benchmarks demonstrate that **signals can be faster than React for specific scenarios**, but that doesn't make them better. React's strength lies in its predictable mental model, excellent developer experience, and mature ecosystem.

The goal isn't to make signals faster than React at everything - it's to make them **better** at the scenarios where they matter most:

- **Heavy real-time updates**
- **Global state**
- **Frequent DOM updates**
