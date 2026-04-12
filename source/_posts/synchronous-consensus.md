---
title: Synchronous Consensus
date: 2026-04-11T00:00:00+11:00
tags:
  - distributed-systems
  - consensus
---

# Consensus Problem

## Setup
- System of N processes: P1, P2, ..., Pn
- Each process Pi:
  - Begins in **undecided** state
  - Proposes value `vi`
  - Eventually sets decision variable `di` → enters **decided** state

---

# Required Properties

| Property | Definition |
|----------|-----------|
| **Termination** | Eventually, every process sets its decision variable |
| **Agreement** | All correct processes decide the same value: if Pi and Pj correct → di = dj |
| **Integrity** | If ALL correct processes proposed the same value, any correct decided process chose that value |

> **Important — Why Integrity?**
> Without integrity, a trivial algorithm could always decide a fixed constant (e.g., 0) and satisfy termination + agreement — but be useless. Integrity prevents this by linking the decision to the proposals.

> **Warning — Integrity Definition Varies:**
> "The specific definition of integrity may vary across sources and systems." Know the version used in your course.

---

# Round-Based Synchronous Consensus

## Assumption
- At most **f** processes can crash
- All processes are **synchronized** — operate in rounds
- One round = ε + T time units
  - T = max message transmission time
  - ε = max clock drift between processes
- Algorithm runs **f + 1 rounds**
- Channels are reliable

## Why f + 1 rounds?

```
  ┌─────────────────────────────────────────────────────┐
  │ Each round can "mask" one crash.                    │
  │ With f crashes possible, we need f+1 rounds         │
  │ to guarantee all processes share the same value set.│
  └─────────────────────────────────────────────────────┘
```

## Algorithm

```
Valuesᵣᵢ = set of proposed values known to Pi at start of round r

Initially: Values¹ᵢ = {vᵢ}

for r = 1 to f+1:
  B-multicast(Valuesᵣᵢ - Valuesʳ⁻¹ᵢ)   // send only NEW values this round
  Valuesʳ⁺¹ᵢ = Valuesᵣᵢ
  wait until round ends
  for each vj received in this round:
    Valuesʳ⁺¹ᵢ = Valuesʳ⁺¹ᵢ ∪ {vj}

dᵢ = minimum(Valuesᶠ⁺²ᵢ)
```

## Execution Trace

```
  Round 1:  Each Pi broadcasts its own value
  Round 2:  Each Pi broadcasts values learned in round 1
  ...
  Round f+1: Final broadcast

  Decide: minimum of all known values after f+1 rounds
```

> **Tip — Only Broadcast New Values:**
> Each round, Pi only sends values it **newly learned** (not previously sent). This limits message size growth.

> **Tip — Minimum as Decision:**
> Using `minimum()` ensures all correct processes who survive all rounds decide the same value — satisfying agreement and integrity.

## Performance

```
  Rounds: f + 1
  Messages per round: O(N²) in worst case
  Total messages: O(N² * f)
```

> **Warning — f + 1 Round Lower Bound:**
> It can be proven that f + 1 rounds is the minimum required for synchronous consensus with f possible crashes. This algorithm is optimal.
