---
title: Maekawa Algorithm
date: 2026-04-11T00:00:00+11:00
tags:
  - distributed-systems
  - mutual-exclusion
---

# Maekawa's Voting Sets

## Key Idea
Instead of requesting from ALL processes, each Pi only requests from its **voting set** Vi.

## Voting Set Properties

```
  ┌───────────────────────────────────────────────────┐
  │ 1. Each process Pi belongs to its own set: Pi ∈ Vi │
  │ 2. Any two voting sets MUST intersect: Vi ∩ Vj ≠ ∅ │
  └───────────────────────────────────────────────────┘
```

> **Important — Why Intersection Matters:**
> If two processes could both get all votes from their disjoint sets, they could both enter CS simultaneously — violating safety. Intersection ensures at least one process must vote for BOTH, preventing this.

## Optimal Voting Set Size
With N processes, optimal voting sets have size **~√N**, giving bandwidth **~3√N** (much better than 2(N-1) for RA).

---

## Key Difference from Ricart-Agrawala

|                     | Ricart-Agrawala    | Maekawa                   |
| ------------------- | ------------------ | ------------------------- |
| **Request sent to** | All N-1 processes  | Only \|Vi\| processes     |
| **Vote given to**   | All (reply always) | At most **one** at a time |

---

## Algorithm

### State Variables
```
state = Released
voted = false    // has this process given its vote?
```

### enter() at Pi

```
state = Wanted
Multicast Request to all processes in Vi
Wait for Reply (vote) from ALL processes in Vi (including self)
state = Held
```

### exit() at Pi

```
state = Released
Multicast Release to all processes in Vi
```

### On receiving Request from Pj at Pi

```
if (state == Held OR voted == true):
  Queue the request
else:
  Send Reply to Pj
  voted = true
```

### On receiving Release from Pj at Pi

```
if (queue is empty):
  voted = false
else:
  Dequeue head Pk
  Send Reply to Pk
  voted = true     // still voting (now for Pk)
```

---

## Execution Flow

```
  ┌──────────────────────────────────────────────────┐
  │ P1 and P2 both want CS simultaneously            │
  │                                                  │
  │ If V1 ∩ V2 = {P3}:                              │
  │   P3 can only vote for ONE (voted=true)          │
  │   → Only P1 OR P2 gets all votes                 │
  │   → Safety guaranteed                            │
  └──────────────────────────────────────────────────┘
```

> **Warning — Deadlock Possibility:**
> Maekawa can deadlock if processes queue requests in different orders. Requires additional deadlock detection/resolution (not covered in base algorithm).

---

## Performance

```
  Bandwidth: ~3√N messages per CS entry
    - √N Requests + √N Replies + √N Releases

  Client delay:   ~2√N message delays
  Sync delay:     2 message delays
```

> **Tip — Bandwidth vs RA:**
> Maekawa saves significant bandwidth vs RA for large N:
> - RA: O(N) messages
> - Maekawa: O(√N) messages
