---
title: Central Server and Ring-Based Mutual Exclusion
date: 2026-04-11T00:00:00+11:00
tags:
  - distributed-systems
  - mutual-exclusion
---

# Central Server Algorithm

## Concept
Elect a central server (leader) that manages a **queue** of waiting requests and a **token**.

```
  ┌──────────────────────────────────────────────────────┐
  │               Central Server State                   │
  │   - Queue of waiting processes                       │
  │   - Token (allows holder to access CS)               │
  └──────────────────────────────────────────────────────┘
```

## Any Process

```
enter():
  Send REQUEST to leader
  Wait for TOKEN from leader

exit():
  Send TOKEN back to leader
```

## Leader Actions

```
On receiving REQUEST from Pi:
  if (leader has token):
    Send token to Pi
  else:
    Add Pi to queue

On receiving TOKEN from Pi (i.e., Pi has exited CS):
  if (queue not empty):
    Dequeue head Pj
    Send token to Pj
  else:
    Retain token
```

## Performance

```
  enter(): 2 messages (request + token)
  exit():  1 message  (return token)
  Total bandwidth: 3 messages

  Client delay:  2 message delays (req → token)
  Sync delay:    2 message delays (exit token → new token)
```

> **Tip — Central Server Simplicity:**
> Simple to implement and reason about. The leader serializes all requests naturally.

> **Warning — Single Point of Failure:**
> If the leader crashes, the entire system stalls. Need leader election to recover.

---

# Ring-Based Mutual Exclusion

## Concept
N processes arranged in a **virtual ring**. Exactly **1 token** circulates around the ring.

```
  P1 → P2 → P3 → ... → PN → P1
         (token circulates)
```

## Actions

```
enter():
  Wait until you receive the token

exit():  // you already hold the token
  Pass token to ring successor

On receiving token (not in enter()):
  Pass token to ring successor immediately
```

## Performance

```
  enter():  0 to N-1 message delays (wait for token to arrive)
  exit():   1 message (pass token to successor)

  Bandwidth per "rotation": N messages (always circulating)
  Sync delay: 1 to N-1 message delays
```

> **Important — Ring Token Always Circulates:**
> The token passes around the ring even when no process wants CS. This wastes bandwidth but ensures low sync delay once token arrives.

> **Warning — Token Loss:**
> If a process crashes while holding the token, the token is lost. Need a detection and regeneration mechanism.

---

## Comparison

| | Central Server | Ring-Based |
|---|---|---|
| **enter bandwidth** | 2 messages | 0 messages (just wait) |
| **exit bandwidth** | 1 message | 1 message |
| **Client delay** | 2 msg delays | 0 to N-1 msg delays |
| **Sync delay** | 2 msg delays | 1 msg delay |
| **Failure point** | Leader crash | Token loss |
