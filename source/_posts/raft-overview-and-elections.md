---
title: Raft Overview and Leader Elections
date: 2026-04-11T00:00:00+11:00
tags:
  - distributed-systems
  - consensus
  - raft
---

# Goal: Replicated Log → Replicated State Machine

```
  Clients
    │
    ▼
  ┌─────────────────────────────────────────────────┐
  │  Server 1: [Consensus Module] → [State Machine] │
  │  Server 2: [Consensus Module] → [State Machine] │
  │  Server 3: [Consensus Module] → [State Machine] │
  │  Log: add | jmp | mov | shl   (same on all)     │
  └─────────────────────────────────────────────────┘
```

- **Replicated log** ensures all servers execute **same commands in same order**
- System makes progress as long as **any majority** of servers are up
- Failure model: **fail-stop** (not Byzantine), delayed/lost messages OK

---

# Raft Overview — 4 Components

| Component | Purpose |
|-----------|---------|
| **Leader Election** | Select one server as leader; detect crashes, choose new leader |
| **Neutralizing Old Leaders** | Prevent deposed leaders from corrupting the log |
| **Normal Operation** | Log replication under a single leader |
| **Safety** | Consistency after leader changes |

---

# Terms

```
  Term 1    │  Term 2  │  Term 3  │  Term 4  │ Term 5
  ──────────┼──────────┼──────────┼──────────┼────────
  Election  │  Normal  │ Election │ SplitVote│  Normal
            │ (leader) │          │(no leader)│
```

- Time divided into **terms** (logical clock)
- Each term: starts with election, then (if successful) normal operation
- **At most 1 leader per term**
- Some terms have **no leader** (failed/split election)
- **Key role of terms**: identify obsolete/stale information

> **Important — Terms as a Logical Clock:**
> Terms are monotonically increasing. Every RPC contains the sender's term. If receiver sees a higher term, it updates and steps down. If sender has lower term, RPC is rejected.

---

# Election Basics

## Roles
- **Follower**: passive, responds to RPCs
- **Candidate**: running for leader
- **Leader**: handles client requests, sends heartbeats

## Election Trigger
Follower converts to candidate if **election timeout** elapses without:
- Receiving valid AppendEntries RPC (heartbeat), OR
- Granting vote to candidate

## Candidate Actions

```
Increment currentTerm
Vote for self
Reset election timeout
Send RequestVote RPCs to ALL other servers
Wait for:
  - Majority votes → become leader
  - AppendEntries from new leader → step down
  - Timeout without resolution → increment term, retry
  - Higher term discovered → step down
```

---

# RequestVote RPC

## Arguments

| Field | Meaning |
|-------|---------|
| `candidateId` | Who is requesting |
| `term` | Candidate's term |
| `lastLogIndex` | Index of candidate's last log entry |
| `lastLogTerm` | Term of candidate's last log entry |

## Results

| Field | Meaning |
|-------|---------|
| `term` | Receiver's current term (for candidate to update itself) |
| `voteGranted` | true if vote given |

## Implementation

```
1. If term > currentTerm:
     currentTerm ← term (step down if leader or candidate)

2. If term == currentTerm
     AND (votedFor is null OR votedFor == candidateId)
     AND candidate's log is at least as up-to-date as local log:
       Grant vote, reset election timeout
```

> **Important — "At Least As Up-To-Date" Rule:**
> Server V denies vote to candidate C if V's log is more up-to-date:
> ```
> (lastTermV > lastTermC) ||
> (lastTermV == lastTermC && lastIndexV > lastIndexC)
> ```
> This ensures the elected leader has all committed entries.

---

# Safety and Liveness of Elections

```
  ┌──────────────────────────────────────────────────────┐
  │ SAFETY: At most one winner per term                  │
  │   Each server votes for at most one candidate/term   │
  │   Two candidates can't both get majority → safe      │
  │                                                      │
  │ LIVENESS: Some candidate must eventually win         │
  │   Choose election timeouts randomly in [T, kT]       │
  │   One server usually times out first → wins          │
  │   Works well if T >> broadcast time                  │
  └──────────────────────────────────────────────────────┘
```

> **Warning — Liveness Not Guaranteed:**
> Safety IS guaranteed. Liveness is NOT guaranteed in theory (split votes can repeat), but randomized timeouts make it work in practice.
