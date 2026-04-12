---
title: Ordered Multicast
date: 2026-04-11T00:00:00+11:00
tags:
  - distributed-systems
  - multicast
---

# Ordered Multicast Overview

| Ordering   | Definition                                               | Strength  |
| ---------- | -------------------------------------------------------- | --------- |
| **FIFO**   | Messages from the same sender delivered in send order    | Weakest   |
| **Causal** | If m → m' (happened-before), m delivered before m'       | Medium    |
| **Total**  | All correct processes deliver messages in the same order | Strongest |

> **Important — Causal vs FIFO:**
> Causal ordering is stronger than FIFO. Causal tracks `→` (happened-before) across ALL senders; FIFO only tracks order per sender.
> **Causal ⊃ FIFO** (causal implies FIFO, but not vice versa).

> **Warning — Causal → Counts App-Delivered Messages:**
> The `→` relation counts messages **delivered to the application**, not all network messages.

---

# FIFO Ordering Implementation

```
FO-multicast(g, m) at Pj:
  Pj[j] = Pj[j] + 1
  piggyback Pj[j] with m as sequence number
  B-multicast(g, {m, Pj[j]})

On B-deliver({m, S}) at Pi from Pj:
  if (S == Pi[j] + 1):
    FO-deliver(m)
    Pi[j] = Pi[j] + 1
  else:
    buffer this multicast until above condition is true
```

## Key Data Structures
- **`Pj[j]`**: Per-process sequence counter (scalar, tracks messages sent by Pj)
- **`Pi[j]`**: Per-process receive counter at Pi (how many messages from Pj Pi has delivered)

```
              Pj sends: m1(S=1) → m2(S=2) → m3(S=3)
              Pi buffers m3 until m2 is delivered.
```

---

# Causal Ordering Implementation

```
CO-multicast(g, m) at Pj:
  Pj[j] = Pj[j] + 1
  piggyback entire vector Pj[1…N] with m
  B-multicast(g, {m, Pj[1…N]})

On B-deliver({m, V[1..N]}) at Pi from Pj:
  Buffer until BOTH conditions satisfied:
    1. V[j] == Pi[j] + 1        // next expected from Pj
    2. ∀k ≠ j: V[k] ≤ Pi[k]    // all causally preceding messages received
  CO-deliver(m)
  Pi[j] = V[j]
```

## Two Delivery Conditions Explained

```
  Condition 1: V[j] = Pi[j] + 1
  ┌────────────────────────────────────────────────────┐
  │ This is the NEXT message expected from Pj.         │
  │ Ensures no gaps in Pj's message stream.            │
  └────────────────────────────────────────────────────┘

  Condition 2: ∀k ≠ j: V[k] ≤ Pi[k]
  ┌────────────────────────────────────────────────────┐
  │ All messages from other processes that causally    │
  │ preceded m have already been received by Pi.       │
  └────────────────────────────────────────────────────┘
```

> **Tip — Scalar vs Vector Clock:**
> FIFO uses a **scalar** per-sender counter. Causal uses a **full vector clock** (N entries) to track causality across all senders.

---

# Total Ordering: Sequencer-Based

```
TO-multicast(g, m) at Pi:
  Send m to group g AND to sequencer

Sequencer (maintains global seq S, initially 0):
  On B-deliver(m):
    S = S + 1
    B-multicast(g, {"order", m, S})

At process Pi (maintains local Si, initially 0):
  Buffer until BOTH:
    1. B-deliver({"order", m, S}) received from sequencer
    2. Si + 1 = S
  TO-deliver(m)
  Si = Si + 1
```

> **Warning — Single Point of Failure:**
> Sequencer-based total ordering relies on a single sequencer — a potential bottleneck and single point of failure.

---

# ISIS Algorithm for Total Ordering

A **decentralized** total ordering protocol (no single sequencer).

```
  ┌─────────────────────────────────────────────────────────┐
  │                    ISIS Protocol Flow                    │
  │                                                         │
  │  1. Sender multicasts message m to all                  │
  │                                                         │
  │  2. Each receiver Pi proposes a priority:               │
  │     - larger than all observed agreed priorities        │
  │     - larger than any previously proposed by self       │
  │     - stores m in priority queue (marked undeliverable) │
  │                                                         │
  │  3. Sender collects all proposed priorities             │
  │     - picks agreed priority = max of all proposed       │
  │     - re-multicasts m with agreed priority              │
  │                                                         │
  │  4. Each receiver upon getting agreed priority:         │
  │     - reorders message in priority queue                │
  │     - marks m as deliverable                            │
  │     - delivers any deliverable messages at front        │
  └─────────────────────────────────────────────────────────┘
```

> **Important — ISIS vs Sequencer:**
> ISIS is decentralized — no single leader assigns priorities. The **sender** collects proposals and picks the max. This avoids the sequencer bottleneck but requires more message rounds.
