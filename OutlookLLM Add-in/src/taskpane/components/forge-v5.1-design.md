# Forge — Architecture Overview

## The Core Idea

Forge is a graph of autonomous agent nodes, where each node is a specialized macro analyst maintaining deep expertise in one domain. The nodes communicate through typed signals over edges that represent real macro relationships. The graph structure mirrors the structure of the global macro market itself.

v6 is the specification for what runs inside each node.

-----

## Two Layers of Design

```
SYSTEM LAYER (the graph):
  How nodes connect, how signals flow, how the portfolio
  aggregates, how the PM interfaces with the swarm.

NODE LAYER (v6):
  What runs inside each node. Tools, skills, memory,
  context engineering, evolution cycle. One Forge instance
  maintaining deep expertise in one domain.
```

Everything designed in v6 — the 8 tools, the skill system, the memory structure, the retrieval strategies, the retrospective cycle, clean-room synthesis — operates within a single node. The graph layer connects nodes into a system.

-----

## The Node (v6)

Each node is a complete Forge instance scoped to one domain. For the POC, this is one EM country.

**What a node owns:**

- Its domain’s views, expressions, observations, PK
- Its domain’s data feeds and retrieval strategies
- Its domain’s skills (context packages, not procedures)
- Its own evolution cycle (retrospective → PK → skill refinement)
- Deep context in its area — the equivalent of a specialist analyst who knows everything about Brazilian rates

**What a node does:**

- Monitors its domain’s data feeds
- Maintains and validates views within its domain
- Proposes expressions within its domain
- Responds to signals from connected nodes
- Emits signals when its state changes
- Responds to direct PM queries about its domain

**What a node doesn’t do:**

- Reason about domains it doesn’t own
- Make portfolio-level decisions
- Override other nodes’ views
- Manage cross-domain risk

The POC builds and validates one node. If one node works well — produces good analysis, evolves its skills, manages its context effectively — then connecting nodes is an infrastructure problem, not an intelligence problem.

-----

## The Graph

Nodes connect through typed, weighted edges that represent real macro relationships. The graph isn’t metadata about the world — the graph IS the world model.

### Nodes

Each node is a Forge instance specialized in one domain. Examples:

```
brazil         — BCB policy, BRL, local rates, fiscal dynamics
mexico         — Banxico, MXN, nearshoring, energy policy  
us_rates       — Fed, UST curve, duration, inflation
us_credit      — IG/HY, default cycle, CDX, consumer credit
japan          — BOJ, JGB, JPY, carry dynamics
europe         — ECB, Bunds, EUR, fragmentation
china          — PBoC, CNY, stimulus, growth trajectory
commodities    — oil, metals, agricultural, energy transition
vol            — cross-asset vol, correlation, tail risk, skew
portfolio      — aggregation, risk, P&L, position management
```

Not every domain needs a node from day one. Domains start as areas of coverage within an existing node and separate when the complexity justifies it. The question is always: does a dedicated node produce better analysis than a general node covering this domain as a side interest?

### Edges

Edges are typed relationships with weights, conditions, and directionality. They represent channels through which macro forces propagate.

```
Edge types:

  rate_differential  — interest rate gaps driving capital flows
  carry_channel      — funding cost relationships
  terms_of_trade     — commodity price impact on trade balances
  risk_sentiment     — risk-on/risk-off propagation
  contagion          — stress transmission between markets
  policy_divergence  — central bank policy gap dynamics
  supply_chain       — real economy linkages
  repatriation       — capital flow reversals
  correlation        — statistical co-movement
```

Edge properties:

```
source:      brazil
target:      us_rates
type:        rate_differential
weight:      0.6      (how strongly signals propagate)
direction:   bidirectional
condition:   "active when spread > 500bp"
latency:     "hours to days"
last_active: 2025-02-14
```

Edges are proposed by nodes (they notice connections), reviewed by the PM for structural additions, and weights update based on observed signal value. The graph evolves as the market evolves.

### Signals

Nodes communicate by emitting signals through edges. A signal is a structured message that says “my state changed in a way that might matter to you.”

```
Signal:
  from:        brazil
  to:          us_rates
  edge_type:   rate_differential
  urgency:     medium
  payload:
    event:     "BCB cut 50bp, dovish forward guidance"
    view:      V-052 updated, confidence 0.70 → 0.80
    implication: "Brazil real rate still high but narrowing,
                  may reduce relative UST demand at margin"
  timestamp:   2025-02-16T14:30:00Z
```

The receiving node decides what to do with the signal. It might update its own views, ignore it, or propagate a derived signal to its own connections. No central coordinator makes this decision.

**Signal urgency levels:**

```
critical  — systemic event, all connected nodes activate immediately
high      — significant state change, process within the hour
medium    — meaningful update, batch with other signals
low       — informational, include in next periodic review
```

**Signal budgets:** Each node has a maximum emission rate per urgency level. This prevents signal storms during volatile periods. If a node hits its budget, lower-urgency signals queue until the next window. Critical signals always propagate.

### The Portfolio Node

The portfolio node is special. It doesn’t generate macro views — it aggregates.

```
Portfolio node responsibilities:
  - Aggregate views across all domain nodes
  - Translate views into position proposals
  - Manage portfolio-level risk (gross, net, concentration, correlation)
  - Detect conflicts between nodes (us_rates bearish vs us_equity bullish)
  - Surface disagreements to the PM as a feature, not a bug
  - Execute the PM's allocation decisions
  - Track portfolio-level P&L and attribution
  - Run portfolio-level retrospectives
```

The portfolio node connects to every other node via exposure edges. It sees every signal but doesn’t need to deeply understand every domain. It reasons about positions, risk, and allocation — not about whether the BCB will cut again.

The PM’s primary interface is through the portfolio node. But the PM can query any domain node directly for deep analysis.

-----

## How Context Flows Through the Graph

This is the critical design question. Each node maintains deep context in its domain. When a trigger fires, context needs to flow to the right places at the right depth.

### Within a Node

v6 context engineering applies: context retrieval sub-agent gathers domain context, produces a Context Brief, the node’s Agent reasons from clean organized context, dispatches analytical sub-agents within its domain, synthesizes. All the v6 machinery works here because the scope is narrow — one domain, one country, manageable context.

### Between Nodes: Signals, Not Context Dumps

When the brazil node updates V-052, it doesn’t send V-052’s full document to the us_rates node. It sends a signal — a compressed, typed message through the rate_differential edge. The us_rates node decides how much it cares and how deep it needs to go.

If the us_rates node wants more detail, it can **query** the brazil node:

```
Query:
  from:     us_rates
  to:       brazil
  request:  "Full V-052 with supporting observations.
             What's the path for real rates?"
  context:  "I'm reassessing UST demand from EM
             central banks"
```

The brazil node responds with depth appropriate to the question, from its own deep domain context. This is qualitatively better than the v6 approach where a central Agent dispatches a Sonnet sub-agent to briefly look at Brazil — the brazil node IS the Brazil expert.

### Graph Traversal for Context Retrieval

When a trigger fires, the affected node’s context retrieval sub-agent traverses the graph to determine blast radius:

```
Trigger: BCB cuts 50bp
  ↓
brazil node activates, gathers local context
  ↓
Graph traversal from brazil:
  1 hop:  us_rates (rate_differential, 0.6)
          em_latam (regional_contagion, 0.5)
          commodities (terms_of_trade, 0.4)
  2 hops: japan (via us_rates → yield_differential)
          europe (via us_rates → policy_divergence)
  3 hops: em_asia (via japan → carry_channel)
  ↓
Signal emission:
  us_rates:     high urgency (direct rate differential impact)
  em_latam:     medium (regional read-across)
  commodities:  low (marginal terms of trade effect)
  
  2-hop and 3-hop nodes: no direct signal, but the
  receiving 1-hop nodes may propagate if warranted
```

The graph structure determines who gets signaled. The node intelligence determines signal content and urgency. The receiving nodes determine how to respond. No central planner.

-----

## The World Model Emerges

The most interesting property of this architecture: the world model isn’t written by anyone. It emerges from the graph structure and the accumulated state of all nodes.

```
The world model at any point in time is:

  - The set of all active views across all nodes
  - The confidence levels and supporting evidence for each
  - The edge weights between nodes (which channels are active)
  - The signal history (how shocks propagated recently)
  - The portfolio state (how views are expressed as positions)
  - The PK accumulated in each domain (institutional memory)
  - The calibration data per domain (where each node is biased)
  - The counterfactual history (what was considered but not acted on)
```

No single node holds the full world model. The portfolio node sees the broadest view but at lower depth. Each domain node sees the deepest view but only in its area. The PM sees whatever they ask for.

This mirrors how real macro funds work. The CIO doesn’t hold every detail — the specialist PMs do. The CIO holds the portfolio-level view and makes allocation decisions. The research team maintains the web of connections. The graph architecture is the digital version of this organizational structure.

-----

## Evolution at Two Levels

### Node-Level Evolution (v6 cycle)

Each node runs its own retrospective → PK → skill refinement cycle. The brazil node accumulates PK about Brazilian rate analysis. Its retrieval strategies evolve based on what worked for BCB decisions. Its calibration tracks bias in its Brazil-specific views.

This works well because the scope is narrow. The evidence bar (5+ corroborating PK entries) is reachable when you’re focused on one domain. A node that covers Brazil will see enough BCB decisions, inflation prints, and fiscal announcements to learn from its mistakes within quarters, not years.

### Graph-Level Evolution

The graph itself evolves:

**Edge weight updates.** When the japan node signals the em_asia node about carry unwind, and the em_asia node finds the signal valuable (it led to a correct view update), the carry_channel edge weight increases. When signals are consistently ignored or wrong, edge weights decay. The graph learns which connections matter.

**New edge discovery.** Nodes sometimes notice connections that aren’t in the graph. The vol node might observe that Brazilian real rates predict vol regime shifts with a 2-week lead. It proposes a new edge. The PM reviews and approves if it makes structural sense.

**Node addition.** A domain currently covered as part of a broader node is carved out when the complexity justifies it. The em_latam node might start as “all of LatAm” and later split into brazil and mexico as the portfolio’s exposure grows.

**Node retirement.** If a domain becomes irrelevant to the portfolio, its node is deactivated. Views are archived. Edges are pruned. The graph contracts.

-----

## Model Allocation

Not every node needs Opus. The model choice per node depends on the complexity of its domain and the PM’s exposure:

```
Opus:     portfolio (cross-domain reasoning, capital decisions)
          vol (cross-asset, requires broad pattern recognition)

Sonnet:   domain specialists with deep but narrow scope
          us_rates, japan, brazil, europe, etc.
          (deep context + domain skills compensate for
           model capability difference)

Haiku:    utility tasks within nodes
          context compression, signal formatting, monitoring
```

The insight: a Sonnet instance with deep persistent context in Brazilian rates probably outperforms an Opus instance that’s trying to reason about Brazil while also juggling Japan, credit, vol, and portfolio risk. Specialization plus context beats raw capability for domain-specific tasks.

-----

## The PM Interface

The PM interacts with the system at multiple levels:

```
Portfolio level:
  "How are we positioned for a risk-off event?"
  "What's our biggest single risk?"
  "Show me the signal cascade from the BOJ decision"
  → Answered by the portfolio node

Domain level:
  "Walk me through the Brazil rate view"
  "What's the bear case for JPY shorts?"
  "What did the last 3 ECB meetings tell us?"
  → Answered by the domain specialist node

Graph level:
  "What connections are most active right now?"
  "Where are the strongest disagreements between nodes?"
  "What would break if China devalues?"
  → Answered by graph traversal + portfolio synthesis

Capital decisions:
  "Execute E-063 (JPY put spread)"
  "Take profit on E-045"
  → Portfolio node processes, PM approves
```

The PM never needs to understand the graph architecture. They talk to specialist analysts (nodes) and their portfolio manager (portfolio node), just like on a real trading floor.

-----

## Implementation Path

### Phase 1: Single Node POC (v6)

Build one complete Forge node for one EM country. Validate:

- Does the node produce good analysis?
- Does the evolution cycle work? (PK accumulates, skills improve)
- Does context retrieval as a sub-agent keep context clean?
- Can the PM interact naturally?
- Is the decision trace sufficient for debugging?

Deliverable: One working node that the PM trusts for one domain.

### Phase 2: Graph Foundation

Add graph database as the state layer under the existing node. Entities become graph nodes, relationships become edges. Context retrieval uses graph traversal. Still one Forge agent, but reasoning over graph structure instead of flat filesystem.

Validate:

- Does graph traversal produce better context than keyword search?
- Are entity relationships captured correctly?
- Can the PM query by graph structure (“what’s connected to V-019”)?

Deliverable: Single node with graph-structured state.

### Phase 3: Second Node

Carve out one additional domain (e.g. us_rates if the POC is an EM country that trades against US rates). Implement the signal protocol between two nodes. The portfolio aggregation function can initially live in either node or be extracted as a third node.

Validate:

- Does the signal protocol work? Do signals arrive, get processed, propagate?
- Does the specialist node produce deeper analysis than a sub-agent dispatch?
- Can two nodes disagree productively?
- Is the PM experience coherent when talking to two specialists?

Deliverable: Two connected nodes with working signal flow.

### Phase 4: Swarm Expansion

Add nodes incrementally as the portfolio expands. Each new node follows the same v6 spec. Connect via appropriate edges. The graph grows organically.

Validate at each addition:

- Does the new node produce better analysis than coverage from an existing node?
- Do signals from the new node improve connected nodes’ analysis?
- Does the portfolio node handle the additional complexity?

### Phase 5: Emergent Behavior

With 5+ nodes operating, observe:

- Do signal cascades mirror real macro shock propagation?
- Do nodes discover edges that weren’t pre-defined?
- Does the graph-level evolution (edge weight updates) track reality?
- Does the system surface macro regimes that no single node identified?
- Does disagreement between nodes generate alpha?

-----

## What the POC Needs to Prove

The entire graph architecture rests on one bet: **a single Forge node, operating with deep context in a narrow domain, produces genuinely good macro analysis that a PM trusts enough to allocate capital to.**

If one node works, the graph is an infrastructure problem. If one node doesn’t work — if the analysis is shallow, if the evolution cycle doesn’t compound, if the PM doesn’t trust it — then connecting 10 nodes just multiplies the problem.

Phase 1 is the only phase that matters right now. Everything else follows from it or doesn’t happen.