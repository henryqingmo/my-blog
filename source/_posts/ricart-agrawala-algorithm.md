---
title: Ricart-Agrawala Algorithm
date: 2026-04-11T00:00:00+11:00
tags:
  - distributed-systems
  - mutual-exclusion
---

# Ricart-Agrawala (RA) Algorithm

## Key Idea
No central leader. Each process **multicasts** its request to all others and waits for **all** to reply.

## States
Each process Pi is in one of three states:
- **Released** — not interested in CS
- **Wanted** — waiting to enter CS
- **Held** — currently in CS

---

## Algorithm

### enter() at Pi

```
Set state = Wanted
Multicast "Request" <Ti, Pi> to ALL other processes
  where Ti = current Lamport timestamp at Pi
Wait until ALL other processes send "Reply"
Set state = Held, enter CS
```

### On receiving Request <Tj, j> at Pi (i ≠ j)

```
if (state == Held) OR (state == Wanted AND (Ti, i) < (Tj, j)):
  // Pi has higher priority (lower timestamp, or lower id as tiebreak)
  Add request to local queue
else:
  Send "Reply" to Pj
```

> **Important — Priority Rule:**
> **(Ti, i) < (Tj, j)** uses **lexicographic ordering**:
> - Compare Lamport timestamps first
> - Break ties by process ID
> - Smaller = higher priority = reply deferred

### exit() at Pi

```
Set state = Released
Send "Reply" to ALL requests queued at Pi
```

---

## Execution Flow

```
  P1 wants CS (T=5):          P2 wants CS (T=7):
  Broadcasts Request<5,1>     Broadcasts Request<7,2>

  P2 receives <5,1>:          P1 receives <7,2>:
  P2 state=Wanted, T=7        P1 state=Wanted, T=5
  (5,1) < (7,2) → defer       (5,1) < (7,2) → P1 higher priority
  Queue P1's request          Send Reply immediately

  P1 gets Reply from P2       P2 waits...
  P1 enters CS
  P1 exits → sends Reply to P2
  P2 enters CS
```

---

## Performance

```
  Bandwidth: 2(N-1) messages per entry
    - (N-1) Request messages
    - (N-1) Reply messages

  Client delay:    2(N-1) message delays (round trip to all)
  Sync delay:      1 message delay (exit queued → reply)
```

> **Tip — Optimal Sync Delay:**
> RA achieves **1 message delay** for synchronization — the fastest possible. The exiting process sends replies directly to the next waiter.

> **Warning — High Bandwidth:**
> 2(N-1) messages per CS entry is expensive at scale. Maekawa reduces this using voting sets.
