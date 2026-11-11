# Performance Measurement Guide and Historical Web Results

**Scope:** This report contains historical browser/Web build measurements only. They do not certify current Web performance, Qt desktop performance, Android performance, memory use, or a release budget.

## Current Web Commands

Run these from the repository root:

\`\`\`bash
npm run benchmark
npm run check:budgets
npm run benchmark:scroll
\`\`\`

Record the exact commit, operating system, browser/runtime, hardware, command, warm-up policy, iteration count, and raw result when publishing new measurements. Do not copy historical values as current results without re-running the benchmark.

## Historical Snapshot

Earlier copies of this report listed bundle, serialization, search, typing, and CPU-throttling measurements from a specific Linux browser environment. Those numbers are retained in repository history, not as a current performance guarantee. The current app status is described in the [documentation status index](./documentation-status.md); native parity and gaps are listed in the [Qt parity matrix](./native-desktop-parity.md).
