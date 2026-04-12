---
title: Paxos Algorithm
date: 2026-04-11T00:00:00+11:00
tags:
  - distributed-systems
  - consensus
---

# Paxos Algorithm

## Three Roles

| Role | Description | Who |
|------|------------|-----|
| **Proposer** | Proposes values to acceptors | All or subset of processes |
| **Acceptor** | Accepts proposed values under certain conditions | All or subset of processes |
| **Learner** | Learns the decided value | All processes |

> **Important — Single Proposer (Leader) Advantage:**
> Having a single proposer may allow faster termination (no competing proposals). But any process can be a proposer.

> **Important — Majority = Absolute Majority:**
> Majority includes crashed processes. A crashed process can recover. This ensures at most one value can be decided.

---

# Phase 1: Prepare

## Proposer → Acceptors

```
Proposer selects proposal number n
Sends PREPARE(n) to majority of acceptors

Requesting two promises:
  1. "Don't reply to any prepare request with lower number"
  2. "Don't accept any proposal with lower number"
```

## Acceptor → Proposer (response)

```
If n > any prepare request seen so far:
  Reply with PROMISE:
    "I promise to reject any future request < n"
    + (if applicable) "I already accepted value v from proposal m < n"
      (m is the highest-numbered proposal I've accepted)
```

> **Warning — Acceptor May Have Already Accepted:**
> If the acceptor has already accepted a value, it reports the **highest-numbered** accepted proposal. This is crucial for Phase 2.

---

# Phase 2: Accept

## Proposer → Acceptors

```
If proposer receives PROMISE from majority:
  Choose value to propose:
    - If any acceptor reported prior accepted value:
        Use value v from the HIGHEST-NUMBERED prior proposal
    - Else:
        Use ANY value (proposer's choice)
  Send ACCEPT(n, value) to each of those majority acceptors
```

> **Important — Why Use the Highest Prior Value?**
> Paxos must preserve any value that might have been decided in a previous round. If a majority already accepted value v in proposal m, another round could have decided v. The new proposer MUST propose v to avoid inconsistency.

## Acceptor → (decides to accept)

```
If acceptor receives ACCEPT(n, value):
  If it has NOT responded to any PREPARE with number > n:
    Accept the proposal
  Else:
    Reject (already promised to a higher number)
```

---

# Decision and Learning

```
A value v is DECIDED when:
  A majority of acceptors accept a single proposal with value v
```

## How Learners Learn

```
Option 1 (Simple):
  Every time acceptor accepts, send (value, proposal#) to distinguished learner
  Distinguished learner: check if majority accepted → notify all learners

Option 2 (Fault-tolerant):
  Use a SET of distinguished learners (handles learner failures)
```

> **Warning — Lost Messages / Learner Failure:**
> If messages are lost or all distinguished learners fail:
> - Decision may not be known
> - A proposer issues a NEW request
> - Same value will be reproposed (Paxos safety preserved)
> - Acceptors re-notify learner

---

# Full Flow Diagram

```
  ┌───────────────────────────────────────────────────────────────┐
  │                        PAXOS FLOW                             │
  │                                                               │
  │  Proposer        Acceptor 1    Acceptor 2    Acceptor 3       │
  │     │                │              │              │          │
  │     │──PREPARE(n)───>│──────────────>──────────────>          │
  │     │<──PROMISE──────│<────────────<────────────              │
  │     │  (majority)                                             │
  │     │                                                         │
  │     │──ACCEPT(n,v)──>│──────────────>──────────────>          │
  │     │                │ accepts      │ accepts      │ accepts  │
  │     │                                                         │
  │                   MAJORITY ACCEPTED v → v is DECIDED          │
  └───────────────────────────────────────────────────────────────┘
```

---

# What If Proposer Doesn't Hear from Majority?

```
Wait for some time → issue NEW request with HIGHER number n'
```

> **Tip — Liveness Issue:**
> Two proposers can indefinitely block each other by repeatedly issuing higher-numbered prepares. This is why having a **single distinguished proposer** (leader) is preferred for liveness.
