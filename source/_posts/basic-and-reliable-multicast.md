---
title: Basic and Reliable Multicast
date: 2026-04-11T00:00:00+11:00
tags:
  - distributed-systems
  - multicast
---

# Basic Multicast (B-Multicast)

## Implementation

```
B-multicast(group g, message m):
  for each process p in g:
    send(p, m)
receive(m): B-deliver(m) at p
```

## Guarantees

Message is eventually delivered to the group **if**:
- Processes are non-faulty
- Unicast `send` is reliable
- **Sender does not crash**

> **Warning — B-Multicast Limitation:**
> B-Multicast does NOT guarantee delivery if the sender crashes mid-send. Some processes may receive the message while others don't.

---

# Reliable Multicast (R-Multicast)

## Three Required Properties

| Property      | Guarantee                                                                                                  | Type              |
| ------------- | ---------------------------------------------------------------------------------------------------------- | ----------------- |
| **Integrity** | A correct process delivers message `m` at most once                                                        | Safety            |
| **Validity**  | If a correct process multicasts `m`, it will eventually deliver `m` to itself                              | Liveness (sender) |
| **Agreement** | If a correct process delivers `m`, **all** other correct processes in group(m) will eventually deliver `m` | All-or-nothing    |

> **Important — Validity + Agreement = Overall Liveness:**
> If any correct process multicasts `m`, **all** correct processes deliver `m`.

> **Tip — Integrity Assumption:**
> Assumes no process sends the exact same message twice (to avoid false duplicates).

---

# Implementing R-Multicast

```
On initialization:
  Received := {}

For process p to R-multicast message m to group g:
  B-multicast(g, m)      // p ∈ g is included as destination

On B-deliver(m) at process q in g = group(m):
  if (m ∉ Received):
    Received := Received ∪ {m}
    if (q ≠ p):
      B-multicast(g, m)  // re-broadcast if not original sender
    R-deliver(m)
```

## Key Insight

```
              ┌─────────────────────────────────────────┐
              │  Why re-broadcast?                       │
              │                                          │
              │  If p (sender) crashes after sending to  │
              │  only some processes, those who received │
              │  it re-broadcast to ensure ALL-or-NONE.  │
              └─────────────────────────────────────────┘
```

> **Tip — Flood-to-Ensure-Agreement:**
> If any correct process receives `m`, it re-floods the message. This ensures the Agreement property even when the original sender crashes.
