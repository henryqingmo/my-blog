---
title: Leader Election Algorithms
date: 2026-04-11T00:00:00+11:00
tags:
  - distributed-systems
  - leader-election
---

# Election Problem

## Formal Definition

A correct election algorithm must guarantee:

| Property | Requirement |
|----------|------------|
| **Safety** | For all non-faulty processes p: p has elected (q: best non-faulty process) OR Null |
| **Liveness** | Election run terminates AND all non-faulty processes' elected ≠ Null |

> **Important — Election Attribute:**
> The process with the **best (highest) election attribute** wins.
> Common attributes: highest ID, highest IP, fastest CPU, most disk space.
> Ties broken by combining attribute with process ID.

## Performance Metrics
- **Bandwidth**: total number of messages sent
- **Turnaround time**: number of serialized message transmissions from initiation to termination

---

# Ring Election Algorithm (Chang & Roberts, 1979)

## Setup
Processes arranged in a **virtual ring**. Messages forwarded to ring successor.

## Protocol

```
When Pi starts election:
  Send (election, <attri, i>) to ring successor
  Set state = participating

When Pj receives (election, <attrx, x>) from predecessor:
  if (attrx, x) > (attrj, j):
    Forward (election, <attrx, x>) to successor
    state = participating

  if (attrx, x) < (attrj, j):
    if (not participating):
      Send (election, <attrj, j>) to successor
      state = participating
    // if already participating, discard (suppress weaker candidates)

  if (attrx, x) == (attrj, j):
    Pj IS the elected leader!  // message came full circle
    Send "elected" message containing Pj's id
    // "elected" message forwarded until it reaches leader
    Set state = not participating when elected message received
```

## Key Insight — Why (attrx, x) == (attrj, j) Means Elected?

```
  ┌────────────────────────────────────────────────────────┐
  │ If a message bearing your own ID returns to you,       │
  │ it means your message traveled the ENTIRE ring         │
  │ without being suppressed — you have the highest attr!  │
  └────────────────────────────────────────────────────────┘
```

## Performance

```
  Best case:  O(N) messages (one message per node)
  Worst case: O(N²) messages (N candidates, each travels far)
  Turnaround: O(N) message delays
```

> **Warning — Suppression of Weaker Candidates:**
> When a process sees a message with lower attribute than itself, it only sends its own message if it's `not participating`. This suppresses redundant lower-priority messages.

---

# Bully Algorithm

## Key Difference from Ring
- All processes know each other's IDs
- Only sends messages to **higher-ID** processes (not broadcast)
- "Bullies" lower-ID processes into accepting the highest alive process

## Three Message Types
- **Election** — "I want to be leader, any higher process object?"
- **Answer** — "I'm alive and higher than you, back off"
- **Coordinator** — "I am the new leader"

## Protocol

```
When process Pi wants to initiate election:
  if Pi knows it has the highest ID:
    Elect self as coordinator
    Send Coordinator to all lower-ID processes
    Done.

  else:
    Send Election to all HIGHER-ID processes
    if no Answer within timeout:
      // No higher process alive → Pi wins
      Elect self
      Send Coordinator to all lower-ID processes
      Done.
    if Answer received:
      // Higher process exists → wait
      Wait for Coordinator message
      if no Coordinator within timeout:
        Start a new election run

When Pi receives Election message:
  Send Answer (disagree) to sender
  Start own election protocol (unless already started)
```

## Flow Example

```
  IDs: P1 < P2 < P3 < P4 < P5 (P5 = highest, crashed)
  P1 notices P5 is down, starts election:

  P1 → Election → P2, P3, P4
  P2, P3, P4 reply Answer to P1
  P2 → Election → P3, P4
  P3, P4 reply Answer to P2
  P3 → Election → P4
  P4 replies Answer to P3
  P4 → Election → P5 (no reply, timeout)
  P4 declares self Coordinator
  P4 → Coordinator → P1, P2, P3
```

> **Tip — Why "Bully"?**
> Higher-ID processes "bully" lower-ID ones by replying "Answer" — essentially saying "I'm still here, step down." The highest alive process wins by default.

> **Warning — Multiple Simultaneous Elections:**
> When a process receives an Election message, it starts its OWN election. This can lead to many concurrent election runs, but they all converge on the highest alive process.

## Performance

```
  Best case:  O(1) messages — highest-ID process detects failure
  Worst case: O(N²) messages — lowest-ID process starts election
```

---

## Comparison: Ring vs Bully

| | Ring Election | Bully |
|---|---|---|
| **Knowledge needed** | Only know successor | Know all IDs |
| **Messages (worst)** | O(N²) | O(N²) |
| **Turnaround** | O(N) | O(N) |
| **Failures during** | Handled by continuing | Handled by timeout |
| **Elected process** | Highest attribute | Highest ID alive |
