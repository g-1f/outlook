# Skill Graph Architecture: From Flat Skills to Traversable Knowledge

## The Problem with Single Skill Files

The default approach to agent skills is one file, one capability. A SKILL.md that captures everything an agent needs to know about a domain in a single document. This works for simple, procedural tasks — a code review checklist, a summarization template, a formatting guide.

It breaks when the domain has depth.

Consider trade generation for an AWM portfolio manager. A single `trade-generation.md` starts reasonable: parse intent, check portfolio, size position, check risk, run compliance, format order. Eight steps, maybe 2,000 tokens. Then you encounter a Japan-to-Korea rotation where sizing depends on vol regime, which depends on correlation with existing book, which interacts with concentration limits that classify differently depending on benchmark provider, which affects whether currency hedging is mandatory. You add sections. The file hits 8,000 tokens, then 15,000. The agent burns context window on currency hedging instructions when the PM just wants to buy AAPL.

The deeper problem isn’t file size — it’s that **a flat file can’t express variable-depth reasoning**. Every request pays the cost of the most complex case. And when a novel combination arises that the author didn’t anticipate, the agent has no path to follow because the document didn’t connect the relevant concepts.

-----

## What a Skill Graph Is

A skill graph decomposes domain knowledge into atomic skill files connected by wikilinks embedded in prose. Each file captures one complete concept, technique, or procedure. The links between them tell the agent *when* and *why* to follow a connection.

```
trade-generation/
  index.md              ← workflow entry point
  intent-parsing.md     ← decompose PM request into legs
  portfolio-state.md    ← fetch and normalize holdings
  mandate-check.md      ← eligible instruments per IMA
  position-sizing.md    ← Kelly framework, regime adjustment
  vol-regime.md         ← regime detection, classification
  correlation-check.md  ← book-level correlation analysis
  risk-limits.md        ← all limit types, breach logic
  execution-routing.md  ← venue/algo selection
  compliance-check.md   ← restricted list, conflicts, reg checks
  currency-hedge.md     ← FX exposure, hedge ratio
  multi-leg.md          ← leg coordination, netting
  concentration.md      ← classification rules by provider
  order-format.md       ← OMS ticket generation
```

The critical distinction from a simple directory of files: **the wikilinks are embedded in reasoning prose, not in metadata headers.** A position-sizing skill doesn’t list dependencies in YAML frontmatter. Instead:

```markdown
# Position Sizing

Start with the Kelly-optimal fraction for the instrument.
This requires understanding the current [[vol-regime]] —
in risk-off environments, even a strong signal should be
sized conservatively.

Check [[correlation-check]] against existing book. If the
new position is highly correlated with your largest holding,
you're concentrating risk even if single-name limits pass.
In that case, the effective size is the sum of both positions,
and [[risk-limits]] should be evaluated on that combined basis.

For illiquid names where ADV is below $10M, sizing constraints
come from [[execution-routing]] — there's no point sizing at
200bps if you can't execute without moving the market. Work
backward from executable size.
```

The agent reads prose that tells it **how to think about sizing**, and the wikilinks appear exactly where the reasoning demands another concept. The “check correlation” sentence doesn’t just point to a file — it explains the reasoning for going there. The last paragraph introduces a conditional reasoning path: for illiquid names, sizing is constrained by execution, not by Kelly. In a linear recipe, this would require `IF illiquid: reorder steps`. In the prose model, the agent naturally follows the reasoning and pulls in execution-routing concerns when the text tells it that matters.

-----

## Skill Graph vs Single SKILL.md: Concrete Comparison

### Scenario 1: “Buy 100bps AAPL”

**Single SKILL.md:** Works perfectly. Linear flow, steps 1–8, done. The full file is in context but most of it is irrelevant — currency hedging, multi-leg coordination, concentration classification all sit unused.

**Skill graph:** Agent loads workflow entry point, follows the main reasoning path through intent-parsing → portfolio-state → mandate-check → position-sizing → vol-regime → risk-limits → compliance-check → order-format. Skips correlation-check (prose says “if highly correlated with largest holding” — it checks, JPM is the largest, low correlation with AAPL, moves on). Skips execution-routing (prose says “for illiquid names” — AAPL trades >$1B daily). Skips multi-leg, currency-hedge, concentration entirely — the prose never triggers them.

**Winner:** SKILL.md is simpler for this case. The skill graph loads 8 files instead of 1, with similar total token count but more retrieval operations. Marginal overhead, same result.

### Scenario 2: Japan-to-Korea Rotation, Asia Gross Flat

**Single SKILL.md:** The agent needs multi-leg coordination, Korea’s classification (MSCI says EM, FTSE says Developed), gross-flat netting, and JPY/KRW hedging implications. All of this might be in the 15,000-token file if someone anticipated it. The agent scans the entire document, and the interactions between concepts (classification affects concentration limits, which affects allowable sizing, which affects netting, which affects FX exposure) aren’t explicitly connected. The agent must infer these chains.

**Skill graph:** Intent-parsing produces two legs. The agent follows [[multi-leg]] which says “evaluate [[risk-limits]] on combined net position and check [[concentration]] for country-level limits.” These are independent — the agent dispatches them in parallel. Concentration.md explains that Korea’s classification differs by provider and tells the agent to check the mandate’s benchmark. The agent follows [[mandate-check]] output, confirms FTSE Global, Korea is DM, concentration flag doesn’t apply. Currency-hedge activates because currency exposure changed. Each file is ~500 tokens; the agent loads only what this specific trade demands. Total context: ~6,000 tokens of skill content, all relevant.

**Winner:** Skill graph. The composition of atomic concepts handles interactions that no single file anticipated in exactly this combination. The variable-depth traversal means the agent reached 3 levels deep on concentration classification but stayed at 1 level for execution routing (not needed for liquid names).

### Scenario 3: Cross-Workflow Reuse

A separate portfolio-rebalancing workflow needs position-sizing, risk-limits, and compliance-check — the same atomic skills trade-generation uses. A risk-reporting workflow needs portfolio-state, risk-limits, and concentration.

**Single SKILL.md:** Each workflow is its own monolithic file. Position-sizing logic is duplicated (or the agent is told “refer to trade-generation.md for sizing” — now you have implicit cross-file dependencies anyway).

**Skill graph:** The atomic skills are shared nodes. Multiple workflows reference the same `position-sizing.md`. Update the Kelly framework once, every workflow inherits the change. The graph structure emerges from reuse.

**Winner:** Skill graph. Shared nodes are the fundamental advantage at the system level.

### When Single SKILL.md Wins

When the domain is genuinely linear and self-contained. A compliance pre-trade check that always does restricted-list → conflict-check → reg-threshold → approve/reject. Each step isn’t reused elsewhere. The interaction between steps is trivial. Decomposing it into four files adds retrieval overhead and maintenance burden. Some skills are just recipes, and recipes should stay in one file.

**The heuristic:** If a skill is a *procedure* (fixed steps, one consumer, no branching), keep it as a single file. If it’s a *domain* (interacting concepts, multiple consumers, context-dependent depth), decompose it into a graph.

-----

## Architecture: One Agent, Continuous Traversal

### Core Principle

One main agent maintains a continuous reasoning thread through the skill graph. Subagents are used exclusively for parallel fan-out when the agent identifies independent branches. The main agent never loses its reasoning context. The subagents are ephemeral workers that load a skill, apply it to specific data, and return a condensed finding.

This differs fundamentally from the orchestrator-subagent pattern where each subagent gets a full task and independent reasoning autonomy. Here, the main agent is the sole reasoner. Subagents are parallel retrieval-with-light-inference.

### How Traversal Works

```
PM request arrives
      │
      ▼
Main agent loads workflow skill (entry point)
      │
      ▼
Reads prose, encounters [[link]]
      │
      ├── Link is in main reasoning path
      │   → load_skill: pull content into main agent's context
      │   → Agent reasons through it, continues
      │
      ├── Two+ links are independent of each other
      │   → Spin parallel subagents, each loads one skill
      │   → Return condensed findings to main agent
      │   → Main agent incorporates results, continues
      │
      └── Link is peripheral (not core to current reasoning)
          → Spin single subagent to handle it
          → Return one-sentence conclusion
          → Main agent gets answer without full skill content
          → Context compression: conclusion, not the reasoning
```

The subagent serves double duty: **parallel execution** (when branches are independent) and **context compression** (when a skill is peripheral and the main agent only needs the conclusion, not the full reasoning).

### What a Subagent Invocation Looks Like

The main agent is reasoning about position sizing and needs correlation data and vol regime data independently:

```
Main agent (continuous context):
  "I'm sizing a 150bps AAPL position. Before finalizing,
   I need correlation with existing book and the current
   vol regime. These are independent."

Subagent A (ephemeral):
  Skill: correlation-check.md
  Data: {instrument: AAPL, portfolio: [current holdings]}
  Question: "What is the correlation profile against
   existing holdings? Is there concentration risk?"
  Returns: "AAPL has 0.82 correlation with existing MSFT
   position (200bps). Combined tech exposure 350bps.
   Recommend 50% size reduction."

Subagent B (ephemeral):
  Skill: vol-regime.md
  Data: {instrument: AAPL, market_data: [recent vol]}
  Question: "Current vol regime and sizing cap?"
  Returns: "Neutral regime. Cap at 100bps."
```

The main agent receives both, synthesizes: “correlation says reduce by 50%, regime caps at 100bps, effective cap is 75bps,” and continues sizing. One continuous thought process enriched by parallel lookups.

### The Two Types of Skill Files

**Workflow skills** are entry points that describe a domain process in prose with embedded links. They define the general sequence, mandatory checkpoints, and the reasoning narrative:

```markdown
# Trade Generation

When a PM submits a trade intent, first understand what
they're actually asking for through [[intent-parsing]].
A request like "add tech exposure" requires decomposition;
"buy 500 AAPL" does not.

With the intent clarified, check the current
[[portfolio-state]] and verify the proposed trade is
permissible under [[mandate-check]]. These two can be
evaluated independently.

Now size the position via [[position-sizing]], which
will pull in [[vol-regime]], [[correlation-check]],
and [[execution-routing]] as the specific situation
demands.

The sized trade must pass [[risk-limits]] on the
post-trade portfolio. For multi-leg rotations, evaluate
risk on the combined net position — [[multi-leg]]
handles this coordination.

Before any order leaves, [[compliance-check]] is
non-negotiable. Finally, format via [[order-format]]
for OMS submission.
```

This is neither a rigid step-list nor free-form wandering. It’s a guided reasoning narrative. The sequence is clear, but the prose carries nuance: “these two can be evaluated independently” signals parallelism. “As the specific situation demands” tells the agent not to preload everything. “Non-negotiable” marks a mandatory node.

**Atomic skills** are knowledge nodes containing domain expertise with links for depth:

```markdown
# Concentration Limits

<!-- tier: reference -->

Korea is classified differently across providers:
MSCI treats it as Emerging Market, FTSE Russell as
Developed Market, S&P as Emerging Market.

Check the mandate's stated benchmark to determine
which classification applies. If the mandate references
MSCI ACWI, Korea counts toward EM concentration limits.
If FTSE Global, it doesn't.

Single-country concentration: flag at 3% active weight
vs benchmark. Single-name: flag at 2% absolute.

When processing regional rotations via [[multi-leg]],
evaluate concentration on the net post-trade portfolio
across all legs simultaneously, not per-leg.
```

-----

## Depth Control

Unbounded traversal is the primary risk. If every skill links to others, and those link further, the agent could chase references indefinitely. Three mechanisms operate simultaneously to control this.

### 1. Prose-Driven Depth Gating

The skill content itself controls typical traversal depth through how links are framed:

```markdown
Classify the current environment using 20-day realized vol
vs its 1-year percentile. Above 75th percentile: risk-off.
Below 25th: risk-on. Between: neutral.

For more granular regime detection using HMM-based signals,
see [[regime-detection-advanced]]. This is rarely needed
for standard equity sizing.
```

The last sentence is a soft depth gate. “Rarely needed for standard equity sizing” tells the agent: this link exists, but you probably don’t need it. For 95% of trades, the agent doesn’t follow. For the edge case where the PM says “vol feels weird, be careful,” the agent has the contextual cue to go deeper.

This means **skill authoring quality directly determines system behavior**. A domain expert writes position-sizing.md and decides which concepts are core (always follow) vs peripheral (follow if relevant) through how they frame the link in prose. Human design-time judgment, encoded in natural language.

### 2. Purpose-Aware Traversal

The main agent maintains full context of the original request. At every potential link traversal, the implicit question is “does going deeper materially change my output for this specific request?” The system prompt encodes this:

```
When you encounter [[links]] in skill content:

- Follow links in the direct reasoning path for the
  current request
- For links described as edge cases, advanced topics,
  or rare scenarios, follow only if the current request
  matches those conditions
- If you've gathered enough information to produce a
  sound output for the current step, stop traversing
- Never traverse more than 3 levels deep from the
  workflow entry point without explicit justification
```

The hard depth cap (3 levels) is a safety net. The primary mechanism is the agent’s judgment informed by prose framing, which only works because the main agent has continuous context of the original request. A dispatched subagent without that context can’t judge when to stop.

### 3. Tier Annotations

Each skill declares a depth tier in minimal frontmatter:

```yaml
---
tier: core
---
```

Three tiers:

- **core** — always loaded immediately when the agent hits the link. These are skills in the main reasoning path: position-sizing, risk-limits, compliance-check.
- **reference** — loaded on demand when the agent follows the link. These are skills that provide depth: vol-regime, correlation-check, concentration.
- **deep** — loaded only if the agent explicitly states justification. These are specialized knowledge: regime-detection-advanced, market-microstructure, order-book-dynamics.

The `load_skill` mechanism respects tiers:

```python
def load_skill(name: str, justification: str = None):
    skill = graph.get(name)

    if skill.tier in ("core", "reference"):
        trace.record_load(name)
        return skill.content

    elif skill.tier == "deep":
        if justification:
            trace.record_load(name, justification=justification)
            return skill.content
        else:
            return f"[{name} is a deep-tier skill. "
                   f"State why you need it to load.]"
```

Deep-tier gating creates natural friction against unbounded traversal and generates an audit trail: when the agent did go deep, the justification is recorded and reviewable.

-----

## Runtime Validation

The skill graph enables a validation layer that doesn’t exist in the single-SKILL.md world: **code verifies that the agent’s traversal was sound.**

### What the Validator Checks

After the agent completes a workflow, the system has two artifacts: the workflow definition (which skills exist, which are mandatory, what the general flow is) and the execution trace (which skills the agent actually loaded and in what order). Validation diffs them:

```python
def validate_execution(
    workflow: Workflow,
    trace: ExecutionTrace
) -> ValidationResult:

    # All [[links]] reachable from the workflow
    reachable = workflow.get_all_linked_nodes()
    # Nodes marked mandatory ("non-negotiable" etc)
    mandatory = workflow.get_mandatory_nodes()
    # What the agent actually visited
    visited = set(trace.visited_nodes)

    errors = []

    # Must visit all mandatory nodes
    missed = mandatory - visited
    if missed:
        errors.append(f"Skipped mandatory: {missed}")

    # Cannot visit nodes outside the graph
    hallucinated = visited - reachable
    if hallucinated:
        errors.append(f"Out-of-graph nodes: {hallucinated}")

    # Terminal output must exist
    if not trace.has_terminal_output:
        errors.append("No terminal output produced")

    return ValidationResult(
        valid=len(errors) == 0,
        errors=errors,
        traversal_path=trace.ordered_path,
        depth_reached=trace.max_depth,
        skills_loaded=len(visited),
        skills_available=len(reachable),
    )
```

### What This Catches

**Skipped mandatory nodes.** The agent sized a position and formatted an order but never ran compliance-check. The validator flags it before the order reaches the OMS. This is regulatory safety encoded as graph invariant.

**Hallucinated nodes.** The agent claimed to consult a skill called “liquidity-forecast” that doesn’t exist in the graph. It invented a source of authority. The validator catches fabricated traversal.

**Output sanity.** Domain-specific checks on the final output — notional is positive, lot count makes sense for the instrument, the rationale references concepts from skills the agent actually loaded.

### Desk-Specific Validation Rules

Different mandates impose different constraints without changing the skill files:

```python
DESK_CONSTRAINTS = {
    "long-only-equity": {
        "mandatory": {
            "compliance-check",
            "risk-limits",
            "mandate-check"
        },
        "forbidden": {
            "leverage-calc",
            "short-locate"
        },
    },
    "global-macro": {
        "mandatory": {
            "compliance-check",
            "risk-limits",
            "currency-hedge"
        },
        "forbidden": set(),
    },
}
```

Same graph, same skills, different validation rules. The desk’s mandate defines what paths are legal. This separates concerns: skills encode *how*, validation rules encode *what’s allowed*, and the agent decides *what to do* within those bounds.

### Corrective Validation

Validation can be more than pass/fail. When the agent tries to finalize without visiting a mandatory node, the system can intervene:

```python
def on_termination_attempt(trace, workflow, desk):
    constraints = DESK_CONSTRAINTS[desk]
    missed = constraints["mandatory"] - set(trace.visited_nodes)

    if missed:
        return InterventionResult(
            allow_termination=False,
            message=f"Cannot finalize: {missed} not yet visited. "
                    f"These are mandatory for {desk}.",
            inject_skills=missed,
        )

    return InterventionResult(allow_termination=True)
```

The agent is told to go back and consult the missing skills before it can produce a final output. The dynamism is preserved — the agent chose a path — but mandatory checkpoints are enforced by code.

-----

## General Skills Without Dependencies

Skills like red-teaming, self-critique, summarization, and tone adjustment don’t participate in the domain graph. They don’t have provides/requires contracts. They don’t have wikilinks to position-sizing or risk-limits. They operate on *whatever the current context is*.

These are **orchestrator-level policies**, not graph nodes:

```python
def execute_workflow(workflow, request, desk):
    # Main agent traverses the skill graph
    result = main_agent.execute(workflow, request)

    # Validate traversal
    validation = validate_execution(workflow, result.trace)

    # Apply cross-cutting policies (not in the graph)
    if result.notional > 10_000_000:
        result = apply_skill("red-team-review", result)

    if desk == "private-wealth":
        result = apply_skill("pm-tone-adjustment", result)

    return result
```

Clean separation: the graph handles domain workflows, policies handle cross-cutting concerns. Red-teaming doesn’t need graph connectivity because it’s not domain knowledge — it’s a reasoning pattern applied to domain outputs.

-----

## Context and Cache Efficiency

### Progressive Context Growth

The main agent’s context grows proportionally to request complexity:

|Request             |Skills loaded|Depth|Skill tokens|
|--------------------|-------------|-----|------------|
|Buy 100bps AAPL     |8 of 14      |2    |~3,500      |
|Japan-Korea rotation|12 of 14     |3    |~6,000      |
|Simple FX forward   |5 of 14      |2    |~2,000      |

The simple request doesn’t pay for the complex case’s context. This is the fundamental advantage over a monolithic SKILL.md where every request loads the full 15,000 tokens.

### KV Cache Behavior

The workflow skill and core atomic skills form a **stable prompt prefix** that’s identical across requests of the same type. What changes per request is which additional skills get loaded and the input data. This means the KV cache for the prefix is reusable across requests — you pay for the skill content once, and subsequent requests only recompute from the divergence point.

Subagent prompts are even more cache-friendly: each subagent type (correlation-check worker, vol-regime worker) has a fixed prompt structure with only the data payload varying.

### Subagents as Context Compressors

When a skill is peripheral to the main reasoning thread, the main agent dispatches a subagent not for parallelism but for **context efficiency**. The subagent loads the full skill, reasons through it, and returns a one-sentence conclusion. The main agent gets the answer without the full skill content:

```
Main agent dispatches: "Does Korea trip EM concentration?"
Subagent loads concentration.md (500 tokens), reasons, returns:
  "Under FTSE (mandate benchmark), Korea is DM. No EM flag."
Main agent incorporates the 15-token answer, not the 500-token skill.
```

This keeps the main agent’s context lean while allowing arbitrary depth in the graph. The subagent’s context is discarded after returning.

-----

## System Design Summary

```
┌──────────────────────────────────────────────┐
│                  Skill Graph                  │
│                                              │
│  Workflow skills     Atomic skills           │
│  (entry points)      (knowledge nodes)       │
│                                              │
│  trade-generation    position-sizing          │
│  portfolio-rebal     vol-regime              │
│  risk-report         risk-limits             │
│                      correlation-check       │
│  Prose with [[links]] connecting everything  │
│  Tier annotations: core / reference / deep   │
└──────────────┬───────────────────────────────┘
               │
               │ load_skill(name)
               ▼
┌──────────────────────────────────────────────┐
│              Main Agent                       │
│                                              │
│  Continuous reasoning thread                 │
│  Loads workflow, traverses [[links]]         │
│  Follows prose guidance for depth            │
│  Dispatches subagents for fan-out            │
│  Accumulates context progressively           │
│  Produces final output                       │
└───────┬──────────────────┬───────────────────┘
        │                  │
        │ parallel         │ peripheral
        │ branches         │ compression
        ▼                  ▼
┌──────────────┐   ┌──────────────┐
│  Subagent A  │   │  Subagent C  │
│  skill +     │   │  skill +     │
│  data +      │   │  data +      │
│  question    │   │  question    │
│  → finding   │   │  → finding   │
└──────────────┘   └──────────────┘
┌──────────────┐
│  Subagent B  │
│  (parallel)  │
│  → finding   │
└──────────────┘
        │
        ▼
┌──────────────────────────────────────────────┐
│              Validator                        │
│                                              │
│  ✓ Mandatory nodes visited                   │
│  ✓ No hallucinated out-of-graph nodes        │
│  ✓ Output sanity checks                      │
│  ✓ Desk-specific constraint enforcement      │
│  ✓ Depth justification audit trail           │
│                                              │
│  Records full traversal trace                │
└──────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────┐
│         Cross-Cutting Policies               │
│                                              │
│  Red-team review (if notional > threshold)   │
│  PM tone adjustment (if private wealth)      │
│  Audit logging                               │
└──────────────────────────────────────────────┘
```

### Design Principles

1. **One agent reasons, subagents assist.** The main agent owns the continuous reasoning thread. Subagents are parallel workers and context compressors, not independent reasoners.
1. **Prose carries routing logic.** Wikilinks embedded in reasoning prose tell the agent when and why to traverse. No metadata edge types, no YAML dependency declarations. The natural language *is* the routing mechanism.
1. **Depth is emergent, not configured.** The same entry point leads to shallow traversal for simple requests and deep traversal for complex ones. Depth is driven by request complexity interacting with skill prose, not by workflow branching logic.
1. **Validation is structural, not semantic.** Code checks that mandatory nodes were visited and no hallucinated nodes appeared. It doesn’t evaluate the quality of the agent’s reasoning — it verifies the reasoning happened within the graph’s bounds.
1. **Skills are authored by domain experts, not engineers.** A skill file reads as domain knowledge, not configuration. The quality of the prose directly determines system behavior. Skill authoring is a first-class discipline.
1. **Cross-cutting concerns stay out of the graph.** Red-teaming, tone adjustment, and other general skills are orchestrator policies, not graph nodes. The graph is purely domain knowledge.