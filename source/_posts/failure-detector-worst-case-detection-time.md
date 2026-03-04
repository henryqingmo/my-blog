---
title: Failure Detector Worst-Case Detection Time
date: 2026-03-03T00:00:00+11:00
tags:
  - distributed-systems
---

## Setup

Worst-case failure detection time is measured from the instant a monitored process crashes to the instant the detector declares it failed. Under bounded one-way delay ($d \in [d_{\min}, d_{\max}]$), the worst case occurs when the failure happens **right after** the last successful message is sent — this gives the detector the least evidence and maximises waiting time.

---

## Case 1: Heartbeats (sender $q$ → monitor $p$, every $T$ seconds)

Process $q$ sends a heartbeat every $T$ seconds. Any heartbeat sent at time $t$ arrives at $p$ in $[t + d_{\min},\ t + d_{\max}]$.

**What timeout should $p$ use?**

The largest possible gap between two *consecutive arrivals* at $p$ occurs when one heartbeat arrives as early as possible (delay $d_{\min}$) and the next arrives as late as possible (delay $d_{\max}$):

$$
(t + T + d_{\max}) - (t + d_{\min}) = T + (d_{\max} - d_{\min})
$$

So $p$ can safely wait at most $T + \Delta$ (where $\Delta = d_{\max} - d_{\min}$) after the last arrival before declaring $q$ crashed.

**Worst-case crash timing:**

$q$ crashes immediately *after* sending a heartbeat at time $t$. That last heartbeat may take the maximum delay, arriving at $t + d_{\max}$. After receiving it, $p$ waits $T + \Delta$ and then times out.

Total delay from crash to detection:

$$
d_{\max} + (T + \Delta) = d_{\max} + T + (d_{\max} - d_{\min}) = \boxed{T + 2d_{\max} - d_{\min}}
$$

---

## Case 2: Ping–Ack (monitor $p$ pings server $q$ every $T$ seconds)

Here $p$ is the monitor: it sends a ping every $T$ seconds and expects an ack back. A round trip has worst-case time $2d_{\max}$.

**Worst-case crash timing:**

$q$ crashes immediately *after* sending an ack. To maximise detection time, this crash should happen as early as possible within the $T$-second period — which occurs when the ping reaches $q$ with the minimum delay $d_{\min}$, so $q$ replies (and then crashes) quickly.

- Crash occurs ~$d_{\min}$ after $p$ sent the last successful ping.
- The next ping isn't sent until the next period, so the gap from crash to next ping is $T - d_{\min}$.
- After sending the next ping, $p$ waits up to $2d_{\max}$ for an ack; none arrives.

Total delay from crash to detection:

$$
(T - d_{\min}) + 2d_{\max} = \boxed{T + 2d_{\max} - d_{\min}}
$$

---

## Conclusion

Under periodic sends every $T$ and bounded one-way delay, both heartbeat and ping–ack schemes yield the **same worst-case detection time**:

$$
\boxed{T + 2d_{\max} - d_{\min}}
$$

This is a nice result — it shows that the choice between push (heartbeat) and pull (ping–ack) doesn't affect worst-case guarantees. The bound is driven entirely by the period $T$ and the delay uncertainty $\Delta = d_{\max} - d_{\min}$, not by which side initiates.
