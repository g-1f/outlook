# Forge v6.1 — Context Engineering Addendum

Companion to Forge v6 Final System Design. This document specifies the context engineering patterns, sub-agent context modes, main agent reasoning discipline, file format contracts, and attention management strategies that refine v6 into a production architecture.

---

## 3. Sub-Agent Context Modes (Design C)

### 3.1 The Principle

Sub-agents exist for **context quarantine** — keeping heavy analytical work out of the main Agent's context window. The primary value of dispatch/collect is not parallel intelligence. It is preventing thousands of tokens of intermediate reasoning, raw data cross-referencing, and procedural checklist execution from accumulating in the Agent's conversation. The sub-agent does the work in a fresh context, produces structured output, and only the summary enters the Agent's context via collect().

The main Agent is both strategist and reasoner. It reads data, holds it in context, and reasons directly when the reasoning is strategic (portfolio-level connections, cross-view tensions, capital allocation decisions). It delegates when the work is analytical depth — running through a full validation checklist, modeling scenario trees, synthesizing five sub-agent outputs into structured PM-facing deliverables.

### 3.2 Three Context Modes

Each skill declares a `context-mode` in its YAML frontmatter. This determines how the sub-agent receives context and whether it has tool access.

**Autonomous mode.** The sub-agent receives ctx_refs as orientation context and has full tool access per its `allowed-tools` declaration. It can read memory, fetch external data, and search independently. Use autonomous mode for skills where retrieval is part of the analytical process — where the sub-agent discovers what data it needs during execution, not before.

Skills: `view_validation`, `event_analysis`, `scenario_analysis`, `rv_analysis`.

The Agent provides orientation: which View to validate, what trigger prompted the analysis, what the Agent's current hypothesis is. The sub-agent independently checks invalidation conditions, fetches current market data, searches for contradicting evidence, and produces its assessment. The Agent does not need to pre-fetch everything because the sub-agent's retrieval is part of the analytical procedure encoded in the skill.

**Injected mode.** The sub-agent receives curated context injected directly into its user message. No tools. Single LLM call. Use injected mode for skills where the analytical work is pure reasoning over known inputs — where giving the sub-agent tools would add cost and non-determinism without improving output quality.

Skills: `portfolio_synthesis`, `expression_design`.

The Agent (or executor) assembles the complete context: integration brief, full sub-agent outputs, relevant View content, portfolio state. The sub-agent reasons over this curated input and produces structured output. It has no ability to retrieve additional context because by design it should not need to — the Agent has already ensured completeness.

**Hybrid mode.** The sub-agent receives injected base context and has selective tool access, typically read and search but not fetch. Use hybrid mode for skills that start from a known analytical frame but may need to explore memory for supporting evidence, historical precedents, or related observations.

Skills: `retrospective`, `attention_allocation`.

The Agent provides the starting frame (which outcomes to review, which counterfactuals resolved). The sub-agent can search memory for related PK entries or read observation history to deepen its analysis, but it operates from a curated starting point rather than discovering everything from scratch.

### 3.3 Skill Frontmatter Extension

```yaml
---
name: view_validation
description: >
  Reassess an existing View against new evidence.
context-mode: autonomous
allowed-tools: fetch, read, search
---
```

```yaml
---
name: portfolio_synthesis
description: >
  Synthesize sub-agent analyses into PM-facing output.
context-mode: injected
allowed-tools: read
---
```

The `allowed-tools` field for injected mode may include `read` for accessing injected ctx_ref paths, but the sub-agent has no independent retrieval capability. The executor resolves all context refs before the sub-agent call and injects them as content.

### 3.4 Context Ref Resolution and Injection

When the Agent dispatches a sub-agent, it provides context refs: View IDs, ctx_ref IDs, prior sub-agent task IDs. The executor resolves these to content at dispatch time.

For **autonomous** sub-agents, the resolved content is injected as orientation under a CONTEXT section in the user message. The sub-agent can read more if it needs to. The orientation content keeps the sub-agent from starting blind and guides its retrieval toward what the Agent considers relevant.

For **injected** sub-agents, the resolved content is the complete analytical input. The sub-agent has nothing else. If the content is insufficient, the output will reflect it — and the Agent or Reviewer will catch the gap. This is a feature, not a bug. It makes context failure visible rather than silently self-healed.

For **hybrid** sub-agents, the resolved content is the starting frame. The sub-agent can expand via read and search but starts from the Agent's curated position.

### 3.5 Dependency Output Depth

When a task depends on a prior task via `depends_on`, the executor injects the dependency's output into the dependent task's context. The Agent controls how much of the dependency output to inject via a depth suffix:

- `depends_on: ["sa_rates"]` — injects the summary from `/session/results/sa_rates.md` (default)
- `depends_on: ["sa_rates:full"]` — injects the complete output

Use `:full` when the dependent task needs the upstream analysis in detail (synthesis needs all raw analytical outputs). Use summary (default) when the dependent task only needs the upstream conclusion (credit check only needs to know whether the rates view was invalidated, not the full reasoning).

The executor also injects the path reference alongside the content so autonomous sub-agents can re-read at full depth if the summary proves insufficient:

```
PRIOR ANALYSIS:
[From sa_rates — full: /session/results/sa_rates.md]
{summary or full content depending on depth}
```

### 3.6 No Sub-Agent Nesting

Sub-agents are leaf nodes. They execute a skill, use their allowed tools, produce structured output, and return. They never dispatch further sub-agents. This constraint prevents runaway context fragmentation, keeps the execution graph flat and debuggable, and ensures the main Agent retains full strategic control over the analytical plan.

If a skill's analytical work is so complex that it would benefit from further decomposition, the correct response is for the Agent to decompose it at the Agent level — dispatching multiple sub-agents with dependencies rather than letting a sub-agent spawn children the Agent cannot observe or direct.

### 3.7 The Reviewer

The Reviewer always operates in autonomous mode with read and fetch access. This is non-negotiable because the Reviewer's value depends on independence. It must be able to discover evidence the Agent and sub-agents did not consider. If the Reviewer could only see what the Agent curated, it would be reviewing the Agent's context selection as much as the analytical output — conflating two different failure modes.

The Reviewer sees: the output to review, the review focus, current portfolio state, relevant calibration data, and relevant PK entries. It does not see the Agent's retrieval context or the sub-agent's intermediate reasoning. It starts fresh and investigates independently.

---

## 4. Main Agent Reasoning Flow

### 4.1 The Principle

The Agent's reasoning quality depends on two things: having the right information in context, and maintaining a coherent reasoning thread across turns. With a 1M token context window, the first is rarely a problem. The second is the real engineering challenge.

Every API call resets the model's internal state. The Agent rebuilds its understanding from the message history on every turn. Reasoning that was never externalized into tokens is lost. Extended thinking tokens help within a single turn but are removed from context on subsequent turns. The only reliable cross-turn memory is visible tokens in the conversation history.

This means the Agent's visible output serves two audiences: the PM (who reads the final synthesis) and the Agent's own future self (who needs to reconstruct strategic intent after 10 more turns of tool calls). Reasoning checkpoints are not overhead — they are the mechanism by which the Agent maintains coherence across a multi-turn session.

### 4.2 Stage-by-Stage Reasoning

#### Stage 1: Trigger Intake and Orientation

The Agent receives a trigger (PM query, scheduled review, alert). Before doing anything, it reads the landscape at the cheapest depth available.

Internal reasoning at this stage: What is being asked? What is the scope — single View, multi-View, portfolio-level? Which Views are potentially affected? Which are near critical thresholds? What is stale?

The Agent reads View headers, checks the portfolio state (already in system prompt), and scans for any alerts or staleness flags. This is triage. The Agent is deciding where to focus, not yet analyzing.

At header depth, each View costs approximately 80 tokens. Scanning 10 active Views costs 800 tokens and gives the Agent: scope, direction, confidence, status, invalidation proximity, staleness, expression count, and calibration category for every active position. This is enough to prioritize.

The Agent should resist reading any View at full depth during triage. Full reads are for the next stage, after the Agent knows what matters.

#### Stage 2: Targeted Retrieval with Reasoning Intent

The Agent now reads what it needs for its own reasoning. This may include full View content for the 1-3 Views that triage identified as requiring attention, relevant calibration data, recent observations that bear on the question, and external data fetches.

Internal reasoning at this stage: What specific information do I need to answer this question or make this decision? Why am I reading this — what am I looking for? What data would change my view?

The Agent should approach retrieval with a hypothesis. Not "let me read everything about rates" but "V-012 is 2bp from invalidation — I need to read its invalidation conditions and fetch current 10Y yield to assess whether validation is warranted." The retrieval is purposeful.

For external data, the Agent fetches directly when it needs 1-2 data points for its own reasoning. The fetch summary enters the conversation (100-150 tokens), the full content is stashed at `/session/context/ctx_NNN.md` for potential sub-agent injection.

For expensive reads — broker research reports, large analytical documents, multi-page data sets — the read tool stashes the full content to a ctx_ref automatically. The Agent sees the content for its reasoning AND has a reference ID for sub-agent injection. The stashing decision is based on cost-to-reacquire: if the content is at a stable path in /memory/, it doesn't need stashing because the executor can re-read it. If it's from an external source or an expensive computation, stash it.

Stashing heuristic: external fetches always stash (current v6 behavior). Reads from `/memory/` do not stash — the executor resolves these from canonical paths. Reads of large external documents (broker research loaded into session context, multi-page reports) stash because they may need to be injected into sub-agents without repeating the expensive read.

#### Stage 3: Reasoning Checkpoint Before Dispatch

If the query requires sub-agent delegation, the Agent pauses to externalize its strategic reasoning before dispatching.

Internal reasoning at this stage: What are the analytical questions? What depends on what? What do I expect to learn from each sub-agent? What would change my plan? What's the simplest decomposition that answers the question?

The Agent writes a reasoning frame in its visible output. This is not a rigid plan — it is externalized working memory that gives the Agent's future self (5+ turns later, after dispatch confirmations and collect results) the ability to reconstruct strategic intent.

The reasoning frame should capture:
- The 2-4 analytical questions that matter
- Dependencies between them (what must complete before what)
- What the Agent already knows from its own retrieval
- What the Agent expects each sub-agent to resolve
- What would cause the Agent to change the plan

This frame lives in the conversation. It does not need to be written to disk unless the session is complex enough that compact() might be needed before integration, in which case the Agent also writes it to `/session/tasks.md` for durability.

The dispatch calls that follow should be self-documenting. Because extended thinking tokens are ephemeral (removed on subsequent turns), the dispatch spec — particularly the `objective` and `notes` fields — must carry enough intent for the Agent to understand why it dispatched this task when it reads the collect results 5 turns later. The `notes` field is critical infrastructure, not an optional annotation.

#### Stage 4: Interleaved Work During Sub-Agent Execution

While sub-agents run in the background, the Agent can do lightweight work: reading PK entries relevant to the analysis, checking calibration data, writing gaps.md, preparing the integration brief outline.

Internal reasoning at this stage: What can I do now that doesn't depend on sub-agent results? What context should I prepare for integration? Are there gaps I can identify before results arrive?

The Agent should call `collect('ready')` periodically to absorb partial results. If an early result changes the analytical picture, the Agent adapts: dispatching additional sub-agents, canceling planned dispatches, or adjusting the integration frame.

This is the "dispatch → think → collect('ready') → adapt" loop. The Agent is not idle between dispatches. It is building the contextual foundation for integration.

#### Stage 5: Post-Collect Reasoning Checkpoint

When the Agent has collected results from 2 or more sub-agents, it pauses to synthesize before proceeding.

Internal reasoning at this stage: What did the sub-agents find? Does it confirm or surprise me? Where do analyses agree? Where do they conflict? What gaps survived — what wasn't analyzed that should have been? How does this change my prior understanding?

The Agent writes a brief reasoning checkpoint: what changed, what's in tension, what's still open. This checkpoint serves three purposes:
1. It forces the Agent to actually reason about the results rather than mechanically proceeding to the next step.
2. It creates a high-attention anchor in the conversation that the Agent will attend to strongly on subsequent turns.
3. It becomes the raw material for the integration brief if synthesis sub-agent delegation follows.

This checkpoint should be opinionated. Not "sa_rates found X and sa_equity found Y" but "Rates view survived validation but barely — the margin of safety is thin. Equity vol is mispriced in the direction that would hurt us if the rates view fails. These two findings are in tension and the portfolio is exposed to the scenario where both move against us simultaneously."

#### Stage 6: Pre-Integration Editorial Direction

For complex queries where a synthesis sub-agent will produce the PM-facing output, the Agent writes an integration brief before dispatching synthesis.

Internal reasoning at this stage: What matters most? What is the editorial direction — what should the synthesis emphasize? Where should the synthesis be conservative vs. bold? What gaps must be flagged? What does the PM need to decide?

The integration brief is written to `/session/integration_brief.md`. It contains the Agent's editorial guidance: what matters, what disagrees, what gaps survived, calibration awareness, output direction. The synthesis sub-agent receives this brief plus the raw sub-agent outputs and produces clean-room structured output.

The integration brief is where the Agent's accumulated context and strategic reasoning compress into direction for the synthesizer. It is arguably the most important artifact the Agent produces because it determines the quality of the final output without the synthesis sub-agent needing access to the Agent's full conversation history.

#### Stage 7: Synthesis or Direct Answer

For simple queries, the Agent answers directly from its own reasoning. No sub-agents, no synthesis — just read, think, respond.

For complex queries, the Agent dispatches portfolio_synthesis (injected mode) with the integration brief and full sub-agent outputs. The synthesis sub-agent produces structured PM-facing output following the synthesis output template.

The Agent collects the synthesis result, reviews it (review() is mandatory for Expression-level outputs), and presents the final output.

### 4.3 When to Write Reasoning to Disk vs. Conversation

**Conversation only** (default): Reasoning checkpoints before dispatch, post-collect assessments, interpretive notes. These provide turn-to-turn coherence and high-attention anchoring. They do not need to survive context compaction for most sessions.

**Disk + conversation**: The reasoning frame and integration brief for complex sessions where 15+ turns are expected, where compact() may fire before integration, or where the reasoning frame is needed by the synthesis sub-agent. Write to `/session/tasks.md` (living task log) and `/session/integration_brief.md`.

**Disk only**: Gaps assessment (`/session/context/gaps.md`). This is a working document the Agent updates as retrieval reveals what's missing. It does not need to be in the conversation as a visible block — the Agent reads it when needed.

### 4.4 Queries That Don't Need This Machinery

Most queries are simple. "What's the current portfolio state?" "What's V-012's confidence?" "Show me recent observations about credit." These require a read or two and a direct answer. No dispatch, no reasoning checkpoints, no integration brief.

The Agent should match its process to the query's complexity:
- **Simple lookup**: read → answer. No ceremony.
- **Focused analysis**: read fully, maybe fetch a data point, reason in context, answer directly. One reasoning checkpoint if the analysis has multiple considerations.
- **Complex / multi-view / portfolio-level**: Full staged reasoning flow with dispatch, checkpoints, integration brief, and synthesis.

The system prompt should make clear that the staged flow is for complex queries. Using it for simple queries is wasteful and degrades the experience.

---

## 5. Progressive Disclosure File Format

### 5.1 The Principle

Every memory file follows a standardized structure: fixed metadata header → narrative summary → full content. This structure exists to make the Agent a better retriever — enabling cheap triage reads and purposeful full reads — not to protect the context window from information.

The read tool's depth parameter maps to this structure:
- `header` (default for /memory/): lines 1-8, approximately 80 tokens. Machine-parseable key-value metadata. Enough for triage.
- `summary`: header + SUMMARY section, approximately 150 tokens. Narrative context for strategic reasoning.
- `full`: everything. Detailed evidence, scenarios, conditions, history.

### 5.2 Universal Structure

Every memory file follows this layout:

```
Line 1:      # {ID}
Lines 2-8:   key: value metadata (category-specific required fields)
Line 9:      blank
Lines 10-14: SUMMARY: 2-5 sentence narrative assessment
Line 15:     ---
Line 16+:    Full content (evidence, scenarios, conditions, history)
```

The metadata header is designed for machine parsing and Agent triage. Each field should be actionable at header depth — the Agent should be able to make prioritization decisions without reading further.

### 5.3 Computed Fields

Certain header fields are computed at write time (or by a periodic background job) so the Agent doesn't have to perform the computation during retrieval:

**Views:**
- `invalidation_proximity`: distance between current market state and nearest invalidation trigger, expressed in the natural unit (basis points, percentage, standard deviations). Requires a background job that checks market data against invalidation conditions and updates this field.
- `staleness`: days since last validation. Computed from `last_validated` field.
- `expression_count`: number of active Expressions linked to this View. Updated when Expressions are created, closed, or linked.
- `calibration_bias`: the worst calibration bias for this View's category. Pulled from `/memory/calibration/` at write time.

**Expressions:**
- `days_to_expiry`: computed from instrument details. Updated daily.
- `current_pnl`: requires market data feed. Updated at least at session start.
- `urgency`: derived from days_to_expiry, PnL, and View status. A computed triage field.

**Observations:**
- `relevance`: list of View IDs this observation bears on. Set at creation time based on topic overlap.
- `direction`: whether the observation confirms, contradicts, or is neutral relative to referenced Views. Set at creation time by the creating Agent or sub-agent.

These computed fields are the progressive disclosure system's highest-value feature. They make header reads genuinely useful for decision-making rather than just showing metadata.

### 5.4 Category-Specific Required Fields

**Views:** scope, direction, confidence, status, created, last_validated, staleness, invalidation_proximity, expression_count, calibration_category, calibration_bias

**Expressions:** view_id, instrument, direction, size, entry_date, current_pnl, max_loss_pct, status, urgency, days_to_expiry

**Observations:** category, relevance (View IDs), confidence, timestamp, source, signal_strength, direction

**Process Knowledge:** weight, category, skill, created, corroborations, contradictions

**Counterfactuals:** decision_type, expression or view reference, reason, reference_date, status

### 5.5 Write-Time Validation

The write tool validates that every memory file conforms to the progressive disclosure format before accepting the write. If required header fields are missing, the write returns an error describing what's needed. If the SUMMARY section is absent, the write is rejected.

This validation enforces a contract: every file in /memory/ is guaranteed to be readable at header depth with meaningful decision-relevant metadata, and at summary depth with narrative context. Sub-agents that produce memory writes (validation results, observations, PK entries) must also conform.

### 5.6 External Content and Stashing

Not all content the Agent reads originates from /memory/. Broker research reports, large analytical documents, and external data sets may be loaded into the session via fetch or read from external-backed paths.

**Stashing heuristic:**

Content at stable `/memory/` paths does not need stashing. The executor resolves these paths directly when building sub-agent context.

Content from external sources (fetch results, broker research, web search results) is stashed to `/session/context/ctx_NNN.md` automatically by the fetch tool. This is the current v6 behavior and remains correct.

Large documents read via the read tool from non-memory paths (e.g., broker research loaded into the session, uploaded documents) should be stashed if they may need to be injected into sub-agents. The read tool returns the content to the Agent's conversation for reasoning AND produces a ctx_ref for future injection.

The stash decision is based on **cost-to-reacquire**: if re-reading is cheap (stable memory path), don't stash. If re-reading is expensive (external fetch, large document parse), stash.

---

## 6. Context Hygiene

### 6.1 The Principle

With a 1M token context window, the constraint is not space — it is attention coherence across many turns. The Agent's reasoning quality degrades not from having too much data, but from accumulated process noise that dilutes the signal: dispatch confirmations, collect metadata, stale intermediate results from early turns that are no longer relevant.

Compact() targets process noise, not data. The Agent should compact when mechanical artifacts are drowning out the data and reasoning it needs for its current analytical step. It should not compact to "make room" — there is almost certainly room. It should compact to improve attention quality.

### 6.2 What Counts as Process Noise

- Dispatch confirmations ("Dispatched: sa_rates | skill: view_validation | waits for: none"). These are useful for one turn (confirming the dispatch worked) and then become noise.
- Collect metadata ("3 tasks still running"). Useful when the Agent is deciding whether to wait or proceed. Noise once all tasks are collected.
- Stale tool results from early turns that the Agent has already incorporated into its reasoning checkpoints. If the Agent wrote "rates data shows 10Y at 4.73%, approaching invalidation" in a reasoning checkpoint, the raw fetch result from 8 turns ago is redundant.
- Skill content read early in the session. Once the Agent has internalized the retrieval discipline from context_retrieval, the 500 tokens of skill text are noise for the remainder of the session.

### 6.3 What Is Not Process Noise

- Raw data the Agent is still reasoning about or has not yet incorporated into a checkpoint.
- Reasoning checkpoints themselves — these are the high-attention anchors the Agent needs.
- Sub-agent result summaries that inform ongoing integration.
- The reasoning frame from Stage 3, which the Agent needs for the entire dispatch/collect/integrate cycle.

### 6.4 Compact Strategy

The Agent should compact:
- Before high-stakes integration, when 10+ turns of dispatch/collect machinery sit between the current position and the data the Agent needs.
- When the Agent notices it is re-reading information it already has in context (a sign that the context is too noisy to attend to effectively).
- When explicitly nudged by the context pressure monitor.

The Agent should not compact:
- In the middle of an analytical flow where it's actively using the data in context.
- Before it has written reasoning checkpoints that capture the signal from the data it's about to compress away.
- Aggressively — compact() is a Haiku call that costs latency. Use it when it improves the next reasoning step, not prophylactically.

### 6.5 Automatic Context Pressure Nudge

The system injects a soft advisory note when the Agent's conversation exceeds a configurable threshold (suggested: 50% of available context for the Agent model). The note says: consider compact() if process noise is accumulating, or delegate remaining work to sub-agents if analytically heavy.

This is a nudge, not a gate. The Agent is free to ignore it. At 50% of 1M tokens (500K), the Agent has enormous room remaining. The nudge exists for sessions that run long through many analytical cycles.

### 6.6 Extended Thinking and Dispatch Specs

Extended thinking (chain-of-thought) tokens are generated during a single API call and help the model reason more carefully about that turn's output. However, thinking tokens are removed from context on subsequent turns — they do not persist.

This has a specific implication for dispatch: the model may use extended thinking to carefully reason about what sub-agents to create, what context they need, and what dependencies exist. But when the dispatch confirmation comes back on the next turn, the reasoning that led to the dispatch is gone. Only the dispatch spec (id, skill, objective, context, notes, depends_on) persists.

Therefore, dispatch specs must be self-documenting. The `objective` field should state what the sub-agent is being asked to determine, not just what skill to run. The `notes` field should carry strategic intent: why this analysis matters, what the Agent expects to learn, and what would change the plan. These fields are the Agent's externalized reasoning that survives the loss of thinking tokens.

---

## 7. Context Retrieval Skill

### 7.1 Role

The context_retrieval skill teaches the Agent how to retrieve well for its own reasoning. It is not a data preparation protocol for sub-agents. It encodes domain-specific retrieval patterns that improve over time through retrospective analysis and MetaOptimizer proposals.

### 7.2 When to Load

The skill is loaded on demand for complex queries that require multi-source retrieval or portfolio-level analysis. For simple queries (single View lookup, portfolio state check, specific data point), the Agent retrieves directly without loading the skill.

The system prompt contains a gate:

```
Simple queries → read/search/fetch directly. No ceremony.
Complex queries requiring multi-view or multi-source retrieval → 
  load context_retrieval skill first. Follow its protocol.
```

The Agent decides based on query complexity. Loading the skill costs one read tool call and adds approximately 500-1000 tokens of skill content to the conversation. This is justified for complex queries where retrieval quality directly determines analytical quality. It is overhead for simple queries.

### 7.3 What the Skill Contains

The skill encodes retrieval protocols accumulated from process knowledge:

- For rates-related analysis, always check TIP breakevens alongside nominal yields (PK-041).
- For any View validation, read the calibration file for that View's category.
- Search for contradicting observations from the last 30 days for any View under analysis.
- For relative value analysis, check both the z-score history and the macro regime classification.
- After all retrieval, write `/session/context/gaps.md` — what data is missing, stale, or unavailable, and whether the gaps are material to the analysis.

These protocols evolve. When a retrospective reveals that the Agent consistently missed a type of context (e.g., failed to check flow data before making relative value assessments), a PK entry is created. When 5+ PK entries corroborate the same retrieval gap with no contradictions, MetaOptimizer proposes a skill edit to add the missing protocol. PM approves. The skill improves.

### 7.4 Retrieval Discipline in Practice

The skill does not tell the Agent what to do — it tells the Agent what to check. The Agent still makes all retrieval decisions. The skill's value is in preventing systematic omissions: the Agent might not think to check calibration data if it's not prompted to, but the skill encodes "always check calibration for the View's category" as a protocol.

After retrieval, the Agent writes gaps.md. This is a working document: what was searched for but not found, what data sources were unavailable, what time periods are uncovered, and whether these gaps are material to the current analysis. The Agent reads gaps.md before reasoning or dispatching to ensure it accounts for what it does not know.

---

## 8. Prefix Cache Optimization

### 8.1 Cache Order

Anthropic's API processes cache prefixes in order: tools → system → messages. Each level builds on the previous. A cache hit requires 100% identical content up to the cache breakpoint.

### 8.2 Main Agent Cache Strategy

**Tool definitions** (8 tools) are identical across all turns within a session. They are always cached after the first turn. This is approximately 800-1000 tokens of free cache hits on every turn.

**System prompt** (~1,200 tokens) is stable within a session. Portfolio state may change between sessions but not within one. The prompt is ordered stable-first: invariant instructions and behavioral guidance first, then skill catalog, then portfolio state, then session-specific content (prior turn summary). The invariant prefix is cacheable even across sessions.

Cache breakpoint placement: one breakpoint after the system prompt ensures the tools + system prefix is always cached. A second breakpoint can be placed after the first few stable messages if the session has a predictable opening structure (e.g., the trigger message and the Agent's initial triage read results are stable for many turns).

### 8.3 Sub-Agent Cache Strategy

**Injected-mode sub-agents** (no tools) have ideal cache properties. The skill prompt serves as the system message and is identical for every invocation of that skill within a session. The only non-cached content is the user message containing the injected context. Total: 1 API call, skill system cached, only the injected context is fresh computation.

**Autonomous sub-agents** (with tools) have worse cache properties. Tool definitions are cached (same tools per skill), and the skill prompt is cached. But each tool loop turn introduces new content (tool results) that breaks the prefix cache for subsequent turns within that sub-agent's execution. A sub-agent making 3 tool calls pays fresh computation on the tool result turns.

This is an additional reason to prefer injected mode where possible — the cost difference compounds across multiple sub-agent invocations per session.

### 8.4 Extended Cache TTL

Anthropic offers a 1-hour extended cache TTL (beta). For Forge sessions that may span 30+ minutes with pauses between PM interactions, the extended TTL ensures the system prompt and tool definition caches survive between turns. Configure cache_control with `ttl: "3600"` on the system prompt breakpoint.

### 8.5 What Breaks the Cache

Any change to content before a cache breakpoint invalidates the cache from that point forward. In practice:
- Changing tool definitions (adding/removing tools) invalidates everything.
- Changing the system prompt (portfolio state updated mid-session) invalidates system + messages caches.
- The message history naturally grows, but only the new tail content requires fresh computation.

For Forge, tool definitions and system prompt should never change within a session. The only growing content is the message history, which gets incremental cache hits on the stable prefix of earlier turns.

---

## Summary: Design C with Reasoning Discipline

The main Agent reads data, reasons with it directly, and uses sub-agents for analytical depth work that would otherwise pollute its context with thousands of tokens of intermediate reasoning. Sub-agents operate in one of three context modes (autonomous, injected, hybrid) declared by the skill. Progressive disclosure file formats make the Agent a better retriever through cheap header triage and purposeful full reads. Reasoning checkpoints at dispatch and post-collect moments maintain coherence across turns. Context hygiene targets process noise, not data. The context retrieval skill teaches domain-specific retrieval discipline and evolves through retrospective. Prefix cache optimization favors injected-mode sub-agents and stable-first system prompt ordering.

The architecture respects two realities simultaneously: the 1M token context window means the Agent should have the data it needs for coherent reasoning, and the model's internal state resets on every API call mean cross-turn coherence requires explicit externalization of reasoning intent.
