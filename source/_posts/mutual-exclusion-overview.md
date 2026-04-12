---
title: Mutual Exclusion Overview
date: 2026-04-11T00:00:00+11:00
tags:
  - distributed-systems
  - mutual-exclusion
---

# Problem Statement

**Critical Section Problem**: A piece of code at all processes for which at most one process can execute at any point in time.

```
Each process can call:
  enter()          → request to enter critical section (CS)
  AccessResource() → execute CS code
  exit()           → leave CS
```

---

# Three Required Properties

| Property     | Description                                      | Essential? |
| ------------ | ------------------------------------------------ | ---------- |
| **Safety**   | At most one process executes in CS at any time   | Essential  |
| **Liveness** | Every request for CS is eventually granted       | Essential  |
| **Ordering** | Requests are granted in the order they were made | Desirable  |

> **Warning — Ordering is NOT Essential:**
> Safety and Liveness are essential. Ordering (fairness) is desirable but not required for correctness.

---

# Performance Metrics

## Three Metrics

```
  ┌─────────────────────────────────────────────────────────┐
  │ 1. BANDWIDTH                                            │
  │    Total number of messages sent per enter/exit.        │
  │                                                         │
  │ 2. CLIENT DELAY                                         │
  │    Delay at each enter/exit when no other process       │
  │    is in CS or waiting. (Focus on enter delay.)         │
  │                                                         │
  │ 3. SYNCHRONIZATION DELAY                                │
  │    Time between one process EXITING CS and the          │
  │    NEXT process ENTERING CS (with 1 process waiting).   │
  │    Measures throughput.                                 │
  └─────────────────────────────────────────────────────────┘
```

> **Tip — Synchronization Delay vs Client Delay:**
> - **Client delay**: latency when you're the only one requesting (no contention)
> - **Synchronization delay**: latency between handoffs (measures throughput under contention)

---

# System Model Assumptions

- Each pair of processes connected by **reliable channels** (TCP)
- Messages delivered **eventually** and in **FIFO order**
- **Processes do not fail** (fault-tolerant variants exist)

---

# Algorithm Comparison

| Algorithm | Bandwidth (enter+exit) | Client Delay | Sync Delay |
|-----------|----------------------|--------------|------------|
| **Central Server** | 3 messages | 2 msg delays | 2 msg delays |
| **Ring-based** | 1 msg/enter (circulate) | 0 to N-1 msg delays | 1 msg delay |
| **Ricart-Agrawala** | 2(N-1) messages | 2(N-1) msg delays | 1 msg delay |
| **Maekawa** | ~3√N messages | 2√N msg delays | 2 msg delays |

> **Important — Tradeoffs:**
> - Central Server: simple, but leader is bottleneck
> - Ring: constant bandwidth, but variable latency
> - RA: high bandwidth, optimal sync delay
> - Maekawa: reduces bandwidth vs RA using voting sets
