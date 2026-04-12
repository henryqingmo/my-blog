---
title: Raft Log Replication and Safety
date: 2026-04-11T00:00:00+11:00
tags:
  - distributed-systems
  - consensus
  - raft
---

# Neutralizing Old Leaders

## Problem
Deposed leader may not be dead — just temporarily disconnected. When it reconnects, it may try to commit stale log entries.

## Solution: Terms

```
Every RPC contains sender's term.

If sender's term is OLDER than receiver's:
  → RPC is REJECTED
  → Sender reverts to follower, updates term

If receiver's term is OLDER than sender's:
  → Receiver reverts to follower, updates term
  → Then processes RPC normally
```

> **Important — Election Updates Majority:**
> New election updates terms of majority of servers → deposed leader can't commit new entries (its term is stale, rejected by majority).

---

# Normal Operation (Log Replication)

```
  1. Client sends command to leader
  2. Leader appends command to log (NOT yet committed)
  3. Leader sends AppendEntries RPCs to all followers
  4. Once entry committed*:
       Leader: pass command to state machine, return result to client
       Leader: notify followers of committed entries in next AppendEntries
       Followers: pass committed commands to their state machines

  * Crashed/slow followers: leader retries until they succeed
  * Performance: optimal with one successful RPC to any majority
```

## AppendEntries RPC Arguments

| Field | Meaning |
|-------|---------|
| `term` | Leader's term |
| `leaderId` | So follower can redirect clients |
| `prevLogIndex` | Index of entry preceding new ones |
| `prevLogTerm` | Term of prevLogIndex entry |
| `entries[]` | Log entries to store (empty = heartbeat) |
| `commitIndex` | Last entry known to be committed |

## AppendEntries Implementation

```
1. Return failure if term < currentTerm
2. If term > currentTerm: currentTerm ← term
3. If candidate or leader: step down
4. Reset election timeout
5. Return failure if log doesn't contain entry at prevLogIndex with prevLogTerm
6. If existing entries conflict with new entries:
     Delete all existing entries starting with first conflict
7. Append any new entries not already in log
8. Advance state machine with newly committed entries
```

---

# Log Consistency

## Raft's Log Guarantees

```
  ┌──────────────────────────────────────────────────────┐
  │ If two log entries have the SAME index AND term:     │
  │   1. They store the SAME command                     │
  │   2. The logs are IDENTICAL in all preceding entries │
  └──────────────────────────────────────────────────────┘

  If an entry is committed → ALL preceding entries are committed
```

## AppendEntries Consistency Check

```
  Leader sends: prevLogIndex, prevLogTerm with each RPC
  Follower checks: does my log contain an entry at prevLogIndex with prevLogTerm?
    Yes → append entries (consistency check passes)
    No  → reject (inconsistency found)
```

```
  leader:   [1:add] [1:cmp] [1:ret] [2:mov] [3:jmp]
  follower: [1:add] [1:cmp] [1:ret] [2:mov]
              ✓       ✓       ✓       ✓
              AppendEntries succeeds (matching prev entry)

  follower: [1:add] [1:cmp] [1:ret]
              ✓       ✓       ✓       ✗ (missing index 4)
              AppendEntries fails (mismatch at prevLogIndex)
```

---

# Repairing Follower Logs

## Problem
After a leader change, followers may have:
- **Extra entries** (from old leader, never committed)
- **Missing entries** (fell behind)

## Solution: nextIndex

```
Leader maintains nextIndex[i] for each follower i:
  = index of next log entry to send to follower i
  = initialized to (leader's last log index + 1)

When AppendEntries consistency check FAILS:
  decrement nextIndex[i]
  retry AppendEntries

When follower overwrites an inconsistent entry:
  DELETE all subsequent entries
```

> **Tip — Efficient Repair:**
> The leader backs up one index at a time until it finds where follower's log matches. Then it sends all missing entries in one RPC. Some implementations use binary search for speed.

---

# Safety: Committed Entries Survive Leader Changes

## Raft Safety Property

> **If a leader has decided that a log entry is committed, that entry will be present in the logs of all future leaders.**

## How This Is Enforced

```
  ┌─────────────────────────────────────────────────────────┐
  │ RESTRICTIONS ON COMMITMENT                              │
  │   Leaders never overwrite their own log entries         │
  │   Only entries in leader's log can be committed         │
  │   Entries must be committed before applying to SM       │
  │                                                         │
  │ RESTRICTIONS ON LEADER ELECTION                         │
  │   Candidate must have log at least as up-to-date        │
  │   as majority → winner has all committed entries        │
  └─────────────────────────────────────────────────────────┘
```

## New Commitment Rules

An entry is committed when:
1. Stored on a **majority** of servers
2. **At least one new entry from leader's CURRENT term** is also stored on majority

> **Warning — Why Current-Term Requirement?**
> A leader cannot safely commit entries from previous terms based on majority count alone (due to log repair edge cases). It must commit at least one current-term entry to "anchor" the previous ones. This prevents a subtle safety violation.

---

# Persistent State

Each server persists to **stable storage** before responding to RPCs:

| State | Description |
|-------|------------|
| `currentTerm` | Latest term server has seen (init: 0) |
| `votedFor` | CandidateId that received vote this term (or null) |
| `log[]` | Log entries: `{term, index, command}` |

> **Important — Why Persist These Three?**
> - `currentTerm`: prevents voting for two candidates in same term after crash
> - `votedFor`: prevents voting twice in same term after crash
> - `log[]`: the actual replicated data

---

# Raft Protocol Summary

## Followers
- Respond to RPCs from candidates and leaders
- Convert to candidate if election timeout expires without heartbeat/vote-grant

## Candidates
- Increment term, vote for self, reset timeout
- Send RequestVote to all, wait for:
  - Majority votes → become leader
  - AppendEntries from new leader → step down
  - Timeout → increment term, retry

## Leaders
- Initialize nextIndex[i] = last log index + 1 for each follower
- Send empty AppendEntries heartbeats periodically
- Accept client commands, append to local log
- When lastLogIndex ≥ nextIndex[i]: send AppendEntries to follower i
- On failure: decrement nextIndex[i], retry
- Commit entries stored on majority with current-term anchor
- Step down if currentTerm changes
