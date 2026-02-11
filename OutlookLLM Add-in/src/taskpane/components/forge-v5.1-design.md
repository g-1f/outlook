# Forge v5.1 — Comprehensive System Design

## A Multi-Agent System for Discretionary Macro Portfolio Management

---

## 0. Design Evolution

v4.0 built an elaborate pipeline: Context Assembler → Planner → Orchestrator → Subagent → Evaluator → Synthesizer → Reflection → Validator. Each component compensated for a specific model limitation.

v5.0 collapsed this into a single-agent-first architecture with optional decomposition. It invested complexity in memory, skills, and output types rather than pipeline machinery. But it was under-specified on context engineering, sub-agent quality control, and the mechanics of planning and execution.

v5.1 is the convergence: **v5's agent-first philosophy with v4's structural rigor where it matters.** The guiding principle is the bitter lesson applied honestly: code handles data management, the LLM handles thinking. Nothing steals analytical jurisdiction from the model.

---

## 1. Design Principles

### 1.1 The Permanent Layer

These exist regardless of model capability:

```
Memory           Persistent state across sessions. Views, Expressions,
                 Observations, Linkages, ProcessKnowledge, Outcomes,
                 Calibration. The system's accumulated edge.

Tools            External data access and computation. Market data,
                 portfolio state, news, research, analytics. The
                 system's interface with the world.

Skills           The PM's investment process encoded as behavioral
                 prompts. The one thing the PM directly controls.
                 Evolves through experience via the meta optimizer.

Output           Contracts with downstream consumers. Dashboard,
Contracts        risk system, trade log, retrospective analysis.
                 Stable schemas for things that persist.

Guardrails       Mechanical risk limits. Position sizing, exposure
                 caps, concentration rules. Code, not intelligence.

Audit Trail      Full decision lineage. What context informed what
                 decision, when, by which component.
```

### 1.2 The Scaffolding Layer

These compensate for current model limitations and are designed to dissolve:

```
Decomposition    Breaking complex queries into sub-tasks. As models
                 handle larger scope in single passes, fewer queries
                 need decomposition.

Validation       Lightweight quality annotation on sub-agent outputs.
Middleware       As model self-consistency improves, less external
                 checking needed.

Progressive      Manifest-based context disclosure. As context windows
Disclosure       grow and attention improves, pass everything directly.
```

### 1.3 Core Invariants

- **Code handles data management. The LLM handles thinking.** No code draws connections between data, identifies gaps, or assesses relevance. No LLM manages concurrency, computes token counts, or enforces risk limits.
- **Skills encode process. Code encodes plumbing.** If the PM's investment philosophy changes, skills change. If the execution mechanics change, code changes. These never cross.
- **The architecture gains value from model improvements.** Better models → better retrieval decisions, better plans, better analysis, better integration. The system improves without architectural changes.
- **Memory writes are deliberate acts.** The Agent decides what's worth remembering. Certain writes are structurally guaranteed (Views, Expressions, Outcomes). Everything else is the Agent's judgment.

---

## 2. Architecture Overview

### 2.1 Core Flow

```
 Trigger
 (query, schedule, alert)
 │
 ▼
┌──────────────────────────────────────────────────────────────────┐
│                         THE AGENT                                │
│                                                                  │
│  An LLM with:                                                    │
│  ├── Memory access (read tools + write tools)                    │
│  ├── Data tools (market data, portfolio state, news, research)   │
│  ├── Analytical tools (compute, backtest, curve analytics)       │
│  ├── Skill library (behavioral prompts, loaded on demand)        │
│  ├── Context manifest (data structure, built during retrieval)   │
│  ├── Plan creation (tool call to spawn sub-agents)               │
│  └── Session state (multi-turn conversation context)             │
│                                                                  │
│  Phase 1: RETRIEVAL                                              │
│  ├── Agent retrieves context via tools                           │
│  ├── Guided by context_retrieval skill                           │
│  ├── Manifest builds automatically as tools return results       │
│  └── Agent decides when it has enough context                    │
│                                                                  │
│  Phase 2: DECISION                                               │
│  ├── Direct answer? → Respond (Tier 0-1)                        │
│  ├── Single skill? → Load skill, execute, respond (Tier 1-2)    │
│  └── Complex? → Generate Plan via create_plan() tool (Tier 2-4) │
│                                                                  │
│  Phase 3: INTEGRATION (if planned)                               │
│  ├── Receive sub-agent outputs + validation verdicts             │
│  ├── Address gaps (fill via own tools or note limitations)       │
│  ├── Synthesize coherent response                                │
│  ├── Apply quality tier (self-review / adversarial / independent)│
│  └── Write to memory (structured outputs + discretionary)        │
│                                                                  │
└────────────────────────────┬─────────────────────────────────────┘
                             │ (if planned decomposition)
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                      ORCHESTRATOR (Code)                          │
│                                                                  │
│  ├── Resolves context assignments from manifest (IDs → content)  │
│  ├── Builds execution waves from dependency graph                │
│  ├── Runs sub-agents in parallel within each wave                │
│  ├── Mechanical retries (timeouts, tool errors)                  │
│  ├── Runs validation middleware when requested                   │
│  └── Returns all outputs + metadata to Agent                     │
│                                                                  │
│  For each sub-agent:                                             │
│  ┌────────────────────────────────────────────────────┐          │
│  │ SUB-AGENT (skill prompt + assigned context + tools) │          │
│  │ Produces structured output matching skill's type    │          │
│  └──────────────────────┬─────────────────────────────┘          │
│                         │ (if validation requested)              │
│  ┌──────────────────────▼─────────────────────────────┐          │
│  │ VALIDATION MIDDLEWARE (fast LLM call, no tools)     │          │
│  │ Different model. Accept/reject + feedback.          │          │
│  │ Annotation only — does not retry or block.          │          │
│  └────────────────────────────────────────────────────┘          │
│                                                                  │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼ (if Tier 3: Expression output)
┌──────────────────────────────────────────────────────────────────┐
│                   INDEPENDENT REVIEW (Optional)                   │
│  Fresh context, adversarial. Capital-commitment outputs only.     │
│  Approve / Revise / Human Review                                  │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                      GUARDRAILS (Code)                            │
│  Mechanical constraints on every capital-relevant output.         │
│  Position limits, exposure caps, required fields, consistency.    │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
                          Output
```

### 2.2 What Happened to v4's Pipeline

```
v4.x Component          │ v5.1 Equivalent
────────────────────────┼──────────────────────────────────────────
Context Assembler        │ Agent's retrieval phase + manifest
                         │ (data structure, not analytical layer)
                         │
Planner                  │ Agent's planning reasoning, expressed
                         │ as Plan via create_plan() tool call
                         │
Orchestrator             │ Survives as pure code. Resolves context,
                         │ manages execution, runs validation.
                         │
Sub-agent                │ Same concept. Spawned by Agent when
                         │ planning, receives assigned context.
                         │
Evaluator                │ Replaced by validation middleware.
                         │ Lightweight annotation, not a retry loop.
                         │ Agent decides what to do with rejections.
                         │
Synthesizer              │ Agent's integration phase.
                         │
Reflection               │ Independent review, only for Tier 3
                         │ (capital-commitment outputs).
                         │
Validator                │ Guardrails (code). Unchanged.
```

---

## 3. The Context Manifest

### 3.1 What It Is

The manifest is a **data structure** — a progressive disclosure mechanism that lets the Agent see what it has at a glance and drill into full content when needed. It is NOT an analytical layer. It does not draw connections, identify gaps, or assess relevance. Those are the Agent's job.

The manifest is built automatically by code as tools return results. No LLM call is involved in manifest construction.

### 3.2 Structure

```
ContextManifest:
  trigger: str                       # the original query/trigger
  
  items: dict[str, ManifestItem]     # id → item, built incrementally
  
  retrieval_log: [                   # what the Agent searched for
    { 
      query: str,                    # the search/tool call
      tool: str,                     # which tool was called
      returned: int,                 # number of items returned
      returned_nothing: bool         # true if search found nothing
    }
  ]
  
  total_tokens: int                  # sum of all item token counts

ManifestItem:
  id: str                            # "ret_001", "ret_002", etc.
  type: str                          # time_series | view | observation |
                                     # linkage | process_knowledge |
                                     # market_data | news | broker_research |
                                     # web_result | portfolio_state
  source: str                        # "fred", "memory", "reuters", etc.
  retrieved_at: datetime
  as_of: datetime                    # when the data itself is from
  preview: str                       # first ~100 tokens, auto-extracted
  token_count: int                   # measured, not estimated
  content: str                       # full content, stored by ID
```

### 3.3 Progressive Disclosure

Three levels of detail, all code-managed:

```
Level 1 — Manifest Summary (always visible to Agent)
  One-line per item: ID, type, source, freshness, preview, token count.
  ~30-50 tokens per item. For 15 items: ~500-750 tokens.
  
  Example:
  "ret_007: broker_research | GS | 3 days old | 
   'Consumer balance sheets deteriorating, spending...' | 2,400 tok"

Level 2 — Key Extract (on demand via get_item_extract(id))
  ~200-400 tokens. Key conclusions, data points, headline findings.
  Extracted by code: first N tokens of each section, or for structured
  data: abstract + key findings.

Level 3 — Full Content (on demand via get_item_full(id))
  Complete content. Full token count.
```

The Agent decides when it needs Level 2 vs Level 3. For planning decomposition, Level 1 suffices. For actual analysis, the Agent or sub-agent pulls Level 2 or 3.

**Future-proofing**: When context windows are 2M tokens and attention doesn't degrade, skip progressive disclosure and inject everything directly. The manifest becomes a simple registry for audit. The architecture doesn't break.

### 3.4 Type-Specific Metadata

Different data types get different mechanical metadata, computed by code when tool results arrive:

```
time_series:
  frequency, latest_value, prior_value, change
  consensus (if applicable), surprise (actual - consensus)

economic_indicator (extends time_series):
  release_date, next_release_date
  revision (was prior period revised?)

market_data:
  as_of timestamp
  change vs relevant reference (prior close, pre-event)

view (from memory):
  confidence, last_validated
  number of active expressions
  review_triggers status

broker_research:
  author, firm, publication_date

web_result:
  source_domain, publication_time

linkage (from memory):
  confidence, corroboration count

process_knowledge (from memory):
  weight, corroborations vs contradictions count
```

### 3.5 What the Manifest Does NOT Do

- Draw connections between items (Agent's job)
- Rate relevance of items (Agent's job)
- Identify analytical gaps (Agent's job — it sees the retrieval_log and reasons about what's missing)
- Compute indicator relationships (retrieval skill's guidance, not hardcoded mappings)
- Filter or rank items (Agent decides what matters)

### 3.6 How the Agent Uses the Manifest

**For direct responses:** Manifest builds in the background. Agent reasons from retrieved data directly. May never consult the manifest explicitly.

**For planning decomposition:** Agent consults manifest summary to see the shape of what it has. Uses manifest item IDs to assign specific context to specific sub-agents. The manifest is an addressing scheme — it lets the Agent say "give sub-agent 1 items ret_001, ret_005, ret_008" and the Orchestrator resolves those to actual content.

---

## 4. Retrieval and Planning

### 4.1 The Retrieval Phase

Retrieval is the Agent's tool-use loop, guided by the `context_retrieval` skill. The Agent follows the skill's guidance about what to look for, assesses what it has, and decides when it has enough.

The retrieval skill is not hardcoded guidance — it's a behavioral prompt that evolves through the retrospective loop (see Section 9). It starts with general principles and accumulates the PM's experiential knowledge about what context matters.

```
Skill: context_retrieval

  summary: "How to gather context for analytical tasks."
  
  prompt: |
    When gathering context for analysis, think like a research
    analyst preparing a briefing:
    
    START BROAD, THEN FOCUS:
    - What directly relates to this trigger?
    - What's adjacent? (same macro factor, same asset class,
      same time horizon)
    - What might contradict the obvious interpretation?
    - What does our own history say? (Views, Process Knowledge)
    
    ASSESS WHAT YOU HAVE:
    After initial retrieval, look at your manifest summary.
    - Do you have multiple perspectives, or just one narrative?
    - Is there a major data category completely absent?
    - Did any searches return nothing? Is that absence meaningful?
    - Is the data fresh enough for the question being asked?
    
    KNOW WHEN TO STOP:
    You don't need everything. You need enough to reason well.
    If you're past 10-12 items and the picture isn't getting
    clearer with each new retrieval, you have enough.
    
    KNOW WHEN TO KEEP GOING:
    If you notice you only have confirming evidence and no
    disconfirming evidence, you haven't looked hard enough.
```

The PM can add domain-specific retrieval guidance:

```
PM addition to context_retrieval skill:

  "For macro data releases, I always want to see:
   - The data itself with consensus and surprise
   - 2-3 related indicators that contextualize it
   - How the market reacted
   - Whether any of our active Views are directly affected
   - Our process knowledge about interpreting this type of data
   
   For rates-specific triggers, also pull:
   - Fed funds futures pricing
   - The curve shape (2s5s10s30s)
   - Credit spreads (IG and HY)"
```

This guidance evolves through retrospectives. When the system discovers it consistently missed supply dynamics in rate analyses, the retrieval skill gets updated (see Section 9.4).

### 4.2 The Decision Point

After retrieval, the Agent is in one of three modes:

```
Mode 1: DIRECT ANSWER
  Query is straightforward, context is sufficient,
  no special analytical framework needed.
  Agent reasons and responds. No plan generated.
  
  Examples:
  - "What's the current macro regime?"
  - "When is the next FOMC?"
  - "Summarize our active views on rates"

Mode 2: SINGLE-SKILL EXECUTION
  Agent needs to apply a specific skill with depth,
  but doesn't need multiple parallel analyses.
  Agent loads the skill and executes within its own reasoning.
  No sub-agents, no orchestrator.
  
  Examples:
  - "Validate our growth view against the latest data"
  - "What's the relative value picture on 2s10s?"

Mode 3: PLANNED DECOMPOSITION
  The query requires multiple distinct analytical threads,
  or the stakes demand independent parallel analysis.
  Agent generates a Plan via create_plan() tool call.
  Orchestrator executes. Agent integrates results.
  
  Examples:
  - "Should we put on a curve steepener?"
  - "Full impact assessment of weak retail sales"
  - "Weekly portfolio review"
  - Any Expression generation
```

System prompt guidance for mode selection:

```
EXECUTION MODE:

Most queries don't need a plan. Answer directly when you can.

Load a single skill when the query maps cleanly to one
analytical task and you can handle it in one reasoning pass.

Generate a plan and decompose when:
- The query involves 2+ distinct analytical dimensions
  that benefit from focused, parallel attention
- The output is high-stakes (Expression, View generation)
  and you want independent analytical threads
- The total analytical scope exceeds what you'd do well
  in a single pass
- Parallel execution would significantly reduce latency

When you plan, produce a Plan via the create_plan() tool.
Be deliberate about what each sub-agent needs and why
the decomposition adds value over doing it yourself.
```

### 4.3 The Plan Structure

The Agent creates a Plan via tool call, which enforces structure while allowing free-form reasoning before the call.

```
Plan:
  id: str                            # auto-generated
  trigger: str                       # the original query/trigger
  rationale: str                     # why decompose (1-2 sentences)
  
  subagents: [SubAgentSpec]          # the work to be done
  
  integration_notes: str             # Agent's notes to its future self
                                     # about how to integrate results
  
  quality_tier: int                  # 0-4, determines post-integration
                                     # quality treatment
```

```
SubAgentSpec:
  id: str                            # "sa_1", "sa_2", etc.
  skill: str                         # skill to load
  objective: str                     # WHAT to achieve (not HOW)
  
  # Context assignment
  context_items: [manifest_item_id]  # items from manifest to inject
  notes: str | null                  # additional Agent guidance
  
  # Execution
  tool_access: [str] | null          # tools beyond skill defaults
  depends_on: [subagent_id] | null   # sequential dependencies
  
  # Validation
  validation: ValidationSpec | null  # optional quality annotation
```

```
ValidationSpec:
  criteria: str                      # what to check (from the Agent)
  model: str | null                  # model override for validator
                                     # e.g. "reasoning" for high-stakes
```

### 4.4 Concrete Plan Example

Trigger: "Should we initiate a curve steepener to express our rate view?"

```
Agent retrieval phase:
  → Pulls: active rate views, curve data, macro indicators,
    portfolio state, positioning, process knowledge on curve trades
  → Manifest: 16 items, ~9,500 tokens

Agent reasoning:
  "This is an Expression generation request. High stakes.
   I need macro validation, curve analysis, expression design,
   and portfolio fit. Decomposing."

Plan:
  id: "plan_steepener_20260211"
  trigger: "Should we initiate a curve steepener?"
  rationale: "Expression generation requires independent macro
              validation, curve analysis, expression design,
              and portfolio fit assessment."
  quality_tier: 3  # Expression → independent review

  subagents:
    - id: "sa_macro"
      skill: "view_validation"
      objective: "Validate our rate view that the Fed is behind
                  the curve. Is the view still supported?"
      context_items: ["ret_002", "ret_005", "ret_009", "ret_014"]
      notes: "Focus on whether recent data strengthens or weakens
              the case for fewer cuts than priced."
      depends_on: null
      validation:
        criteria: "Must reference specific data points. Must
                   update confidence with explicit reasoning."

    - id: "sa_curve"
      skill: "relative_value_analysis"
      objective: "Analyze 2s10s. Current spread vs history,
                  carry/roll profile, mean-reversion dynamics."
      context_items: ["ret_003", "ret_004", "ret_007", "ret_012"]
      tool_access: ["curve_analytics", "historical_spread_data"]
      depends_on: null
      validation:
        criteria: "Must include carry/roll analysis and historical
                   spread distribution in comparable regimes."

    - id: "sa_expression"
      skill: "expression_design"
      objective: "Design the steepener. Instruments, sizing,
                  exit framework. Consider futures vs cash vs options."
      context_items: ["ret_010", "ret_015"]
      notes: "Consider whether optionality is worth the premium
              given our conviction level."
      depends_on: ["sa_macro", "sa_curve"]
      validation:
        criteria: "Must justify instrument choice vs alternatives.
                   Must have explicit exit framework."
        model: "reasoning"  # high-stakes, strongest validator

    - id: "sa_portfolio"
      skill: "portfolio_review"
      objective: "How does this steepener interact with our book?
                  Duration impact, correlation, risk budget."
      context_items: ["ret_010"]
      depends_on: ["sa_expression"]
      validation: null  # Agent assesses during integration

  integration_notes: "Key question: do macro and curve converge?
                      If macro says view weakening but curve says
                      entry attractive, address that tension.
                      Portfolio fit should inform sizing."
```

### 4.5 Speed/Rigor Scaling

```
Direct answer:
  1-3 LLM calls, ~3-6 seconds, ~$0.01-0.03

Single skill (no plan):
  1-5 LLM calls, ~5-10 seconds, ~$0.02-0.05

Planned, moderate (2 sub-agents, no validation):
  ~6-8 LLM calls, ~10-18 seconds, ~$0.05-0.10

Planned, high stakes (4 sub-agents, validation, review):
  ~10-12 LLM calls, ~25-40 seconds, ~$0.10-0.20
```

---

## 5. The Orchestrator

### 5.1 Purpose

The Orchestrator exists because of a real engineering constraint: when the Agent decomposes into sub-agents, code must manage concurrent execution. The Agent can't literally run three LLM calls simultaneously within its own reasoning loop.

The Orchestrator does three things:
1. Execute the Agent's plan faithfully
2. Give sub-agents the best possible context
3. Return results to the Agent with enough information to judge quality

The Orchestrator does NOT judge quality, decide what to retry, route, or filter. It runs things and reports back.

### 5.2 Execution

```python
class Orchestrator:
    """
    Manages sub-agent execution. Pure coordination.
    No intelligence, no quality judgment.
    """

    async def execute(self, plan: Plan,
                      manifest: ContextManifest) -> ExecutionResult:

        # 1. Resolve the plan into execution waves
        waves = self.topological_sort(plan.subagents)

        # 2. Execute wave by wave
        outputs = {}
        for wave in waves:
            wave_results = await asyncio.gather(*[
                self.run_subagent(spec, manifest, outputs)
                for spec in wave
            ])
            for spec, result in zip(wave, wave_results):
                outputs[spec.id] = result

        # 3. Return everything to the Agent
        return ExecutionResult(
            outputs=outputs,
            execution_metadata=self.collect_metadata(outputs),
        )
```

### 5.3 Context Building for Sub-Agents

The Orchestrator resolves the Agent's context assignments (manifest item IDs) into actual content. It doesn't decide what context to give — the Agent already decided that in the SubAgentSpec.

```python
def build_context(self, spec, manifest, prior_outputs):
    sections = []

    # The objective
    sections.append(f"OBJECTIVE:\n{spec.objective}")

    # Resolved manifest items
    if spec.context_items:
        sections.append("CONTEXT:")
        for item_id in spec.context_items:
            item = manifest.get_full(item_id)
            sections.append(
                f"[{item.type} | {item.source} | "
                f"as of {item.as_of}]\n{item.content}"
            )

    # Dependency outputs
    if spec.depends_on:
        sections.append("PRIOR ANALYSIS:")
        for dep_id in spec.depends_on:
            dep = prior_outputs[dep_id]
            sections.append(
                f"[{dep.skill} — {dep.objective}]\n{dep.output}"
            )

    # Agent's additional notes
    if spec.notes:
        sections.append(f"ADDITIONAL NOTES:\n{spec.notes}")

    return "\n\n---\n\n".join(sections)
```

### 5.4 Mechanical Retries

The Orchestrator handles mechanical failures only — timeouts, malformed responses, tool errors. These are infrastructure problems, not intelligence problems.

```python
async def call_with_retry(self, system, user, tools,
                           max_mechanical_retries=2):
    for attempt in range(1 + max_mechanical_retries):
        try:
            result = await self.llm_call(
                system=system, user=user,
                tools=tools, timeout=self.timeout,
            )
            if result.is_empty and attempt < max_mechanical_retries:
                continue
            return result
        except (TimeoutError, ToolError):
            if attempt < max_mechanical_retries:
                continue
            return SubAgentResult(status="mechanical_failure")

    return SubAgentResult(status="mechanical_failure")
```

The Orchestrator does NOT retry because output is shallow, wrong, or poorly reasoned. That judgment belongs to the Agent when it receives results.

### 5.5 What the Agent Receives

```
ExecutionResult:
  outputs: dict[str, SubAgentResult]
  execution_metadata: ExecutionMetadata

SubAgentResult:
  spec_id: str
  status: str              # success | mechanical_failure | timeout
  output: str | null       # the sub-agent's content
  validation: ValidationResult | null  # if validation was requested
  tool_calls_made: [ToolCallLog]
  tokens_used: int

ExecutionMetadata:
  total_time: float
  total_tokens: int
  total_llm_calls: int
  per_wave_breakdown: [WaveMetadata]
```

---

## 6. Validation Middleware

### 6.1 Design

Validation is a lightweight, fast, inline check that **annotates** sub-agent output. It does not retry, re-run, or block. It produces a verdict and feedback that flows to the Agent, who decides what to do.

```
Sub-agent produces output
         │
         ▼
┌────────────────────────────────────┐
│  VALIDATION MIDDLEWARE              │
│                                    │
│  Single fast LLM call.             │
│  Different model than sub-agent.   │
│  No tools. No retry.              │
│  Just: output + criteria → verdict │
│                                    │
│  Produces:                         │
│  - verdict: accept | reject        │
│  - feedback: str (if reject)       │
│                                    │
│  Adds ~1-2 seconds, minimal cost  │
└─────────────────┬──────────────────┘
                  │
                  ▼
          SubAgentResult
          (output + validation verdict)
          flows to Agent for integration
```

### 6.2 Implementation

```python
async def validate(self, spec, skill, result):
    model = spec.validation.model or self.default_validation_model

    response = await self.llm_call(
        model=model,
        system=VALIDATION_PROMPT,
        user=build_validation_input(
            objective=spec.objective,
            agent_criteria=spec.validation.criteria,
            skill_guidance=skill.evaluation_guidance,
            output=result.content,
        ),
        tools=None,       # no tools — pure judgment
        max_tokens=500,   # short response
    )

    return ValidationResult(
        verdict=response.verdict,     # accept | reject
        feedback=response.feedback,   # specific, actionable
        model_used=model,
    )
```

### 6.3 The Validation Prompt

```
VALIDATION_PROMPT:

Read the sub-agent output below. Assess it against the
objective and criteria provided.

Produce exactly:
1. verdict: "accept" or "reject"
2. feedback: If rejecting, state specifically what is
   missing, wrong, or insufficient. Be concrete enough
   that someone reading this feedback could address the
   gap without re-reading the full output.

Accept if the output substantively addresses the objective
and meets the stated criteria, even if imperfect.

Reject if the output misses the objective, ignores key
criteria, or contains reasoning that undermines its
own conclusions.
```

This is a skill (`subagent_review`) that evolves through retrospectives.

### 6.4 Model Selection for Validation

```
Quick validation (moderate stakes):
  model: haiku or sonnet
  Cost: ~$0.001-0.005
  Latency: ~0.5-1 second

Rigorous validation (capital commitment):
  model: reasoning model or opus
  Cost: ~$0.02-0.05
  Latency: ~2-4 seconds
```

The Agent chooses in the ValidationSpec per sub-agent.

### 6.5 How the Agent Handles Rejections

The Agent receives all outputs — accepted and rejected — with full context. For rejections, the Agent has options:

1. **Fill the gap itself** (most common — one tool call is cheaper than re-running a sub-agent)
2. **Note the limitation** in its synthesis ("our curve analysis didn't fully address carry")
3. **Re-plan that specific sub-agent** (rare — only when the failure is fundamental)

The Agent, with full context of the overall query, is the right entity to make this call.

---

## 7. Quality Tiers

### 7.1 Proportional Quality Investment

Quality effort scales with stakes. Not every output needs adversarial review.

```
Tier 0: DIRECT RESPONSE
  When: Simple informational queries, no capital implications
  Quality: Agent's own reasoning. No additional checks.
  Examples: "What's the current 2s10s spread?"

Tier 1: SELF-REVIEW
  When: Analytical outputs, moderate complexity
  Quality: Agent applies the skill's evaluation_guidance
           to its own output before delivering.
  Examples: "How does employment data affect our rate view?"

Tier 2: ADVERSARIAL SELF-REVIEW
  When: View generation or modification
  Quality: Agent generates output, then explicitly constructs
           the strongest counterargument and addresses it.
  Examples: "Should we initiate a steepener?"

Tier 3: INDEPENDENT REVIEW
  When: Expressions with capital commitment
  Quality: Separate review step with fresh context and
           independent tool access.
           Approve / Revise / Human Review
  Examples: "Design a curve steepener expression."

Tier 4: HUMAN-IN-THE-LOOP
  When: System-configured thresholds
  Quality: Output held pending PM approval.
  Examples: New Expression above $X notional,
            View invalidation triggering Expression exits
```

### 7.2 Tier Configuration

```yaml
quality:
  tier_minimums:
    View: 2             # always adversarial self-review
    Expression: 3       # always independent review
    Finding: 0          # direct response
    Observation: 0
    Report: 1           # self-review
    RiskAssessment: 2   # adversarial self-review

  independent_review:
    model: "opus"
    tool_access: true   # reviewer can pull its own data

  human_in_the_loop:
    new_expression_above: 50000   # $ notional threshold
    view_invalidation_with_active_expressions: true
    portfolio_var_breach: true
```

---

## 8. The Memory System

### 8.1 Memory Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        VIEWS                                  │
│  The system's current macro and market views.                │
│  A View is a belief about a macro state, regime, or          │
│  relationship that may be expressed through zero or more      │
│  trade expressions.                                          │
└──────────────────────┬───────────────────────────────────────┘
              expressed through
┌──────────────────────▼───────────────────────────────────────┐
│                     EXPRESSIONS                               │
│  How a View is implemented in the portfolio. A View can       │
│  have zero expressions (conviction too low) or multiple       │
│  (macro view expressed across rates, FX, and equities).      │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    OBSERVATIONS                               │
│  Things worth remembering for future context. Market          │
│  patterns, data relationships, qualitative notes.            │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                      LINKAGES                                 │
│  Cause-effect patterns in markets. Trigger → effect with     │
│  confidence, evidence, and corroboration tracking.           │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                      OUTCOMES                                 │
│  What happened with past Views and Expressions.              │
│  Includes taken trades, untaken decisions (counterfactuals), │
│  and abandoned views.                                        │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                  PROCESS KNOWLEDGE                             │
│  What the system has learned about its own process.          │
│  Lessons, calibration data, behavioral insights.             │
│  Each entry has a continuous weight (0.0-1.0) reflecting     │
│  trustworthiness, updated as evidence accumulates.           │
└──────────────────────────────────────────────────────────────┘
```

### 8.2 The View

The central object. Designed for macro PM thinking.

```
View:
  # Identity
  id: str
  created_at: datetime
  last_validated: datetime
  version: int                     # increments on each update

  # The View itself
  category: ViewCategory           # macro_regime | relative_value |
                                   # fundamental_equity | vol_surface |
                                   # event_driven | flow_driven | thematic

  scope: str                       # what this view is ABOUT
                                   # "US monetary policy trajectory"
                                   # "2s10s term premium"

  direction: str                   # the actual view, stated clearly
                                   # "Fed will cut fewer times than priced"

  summary: str                     # 2-3 sentence synthesis
  confidence: float                # 0.0-1.0, calibrated

  # Evidence structure
  key_drivers: [str]
  key_risks: [str]
  scenarios: [
    {
      name: str,                   # "base case", "bull case", "tail risk"
      probability: float,
      description: str,
      portfolio_impact: str,
    }
  ]

  # Discipline
  invalidation_conditions: [str]   # falsifiable conditions
  review_triggers: [str]           # events triggering re-evaluation
  time_horizon: str                # "tactical" | "medium" | "strategic"

  # Relationships
  expressions: [expression_id]
  related_views: [view_id]
  supporting_observations: [obs_id]

  # Lifecycle
  status: str                      # active | monitoring | invalidated | expired
  outcome: Outcome | null

  # Metadata (for audit and retrospective)
  metadata: OutputMetadata
```

Key differences from v4's Thesis:
- **No `ticker` field.** A macro view has scope, not a ticker.
- **Scenarios are first-class.** Probability-weighted outcomes.
- **`review_triggers` replace time-based staleness.** Event-driven review.
- **Views can exist without expressions.** Intellectual conviction separated from trade implementation.

### 8.3 The Expression

```
Expression:
  id: str
  view_id: str                     # MUST link to a View

  # What the trade IS
  instrument_type: str             # equity | bond | future | option |
                                   # spread | swap | fx | etf | custom
  instruments: [                   # can be multi-leg
    {
      ticker: str,
      direction: str,              # long | short
      weight: float,
      instrument_details: dict,    # type-specific
    }
  ]

  # Sizing
  conviction: float
  size_rationale: str
  risk_budget: float               # portfolio risk consumed

  # Execution
  entry_conditions: str            # condition, not just price level
  exit_framework: {
    target_condition: str,
    stop_condition: str,
    time_exit: str | null,
    reassessment_triggers: [str],
  }

  # Portfolio context
  hedging_interaction: str | null
  correlation_note: str | null

  # Lifecycle
  status: str                      # proposed | active | closed | expired
  entry_date: datetime | null
  entry_details: dict | null
  exit_date: datetime | null
  exit_details: dict | null
  outcome: ExpressionOutcome | null

  # Metadata
  metadata: OutputMetadata
```

Key differences from v4's TradeSignal:
- **Multi-instrument.** A curve steepener is one Expression with two legs.
- **Condition-based entry/exit.** "Enter on next VIX spike >20", not "entry zone $885-895."
- **Explicit portfolio context.** Every Expression states how it interacts with the book.
- **Hard-linked to a View.** View invalidated → Expressions automatically flagged.

### 8.4 Supporting Types

```
Observation:
  id: str
  text: str
  category: str
  confidence: float
  related_view_ids: [str] | null
  ticker: str | null
  expiry: datetime | null          # some observations have shelf life
  metadata: OutputMetadata

Linkage:
  id: str
  trigger: str
  effect: str
  confidence: float
  evidence: str
  typical_lag: str | null
  instance_count: int
  corroborations: [{ outcome_id, date, description }]
  contradictions: [{ outcome_id, date, description }]

Outcome:
  id: str
  view_id: str
  expression_id: str | null        # null for untaken/abandoned
  result: str
  # For traded:
  entry: dict, exit: dict, pnl: float, holding_period: str
  what_went_right: str, what_went_wrong: str
  # For untaken:
  reference_level: dict, actual_level_after_horizon: dict
  counterfactual_pnl: float
  # For abandoned:
  reason_abandoned: str, what_actually_happened: str

ProcessKnowledge:
  id: str
  created_at: datetime
  lesson: str
  evidence: str
  category: str                    # calibration | blind_spot | edge |
                                   # timing | expression_choice | sizing |
                                   # regime_recognition
  weight: float                    # 0.0-1.0, continuous
  corroborations: [{ outcome_id, date, description }]
  contradictions: [{ outcome_id, date, description }]
  relevant_skills: [str]
  suggested_skill_change: str | null
  applied: bool
  applied_date: datetime | null

Finding:
  claim: str
  evidence: str
  confidence: float
  topic: str

Report:
  title: str
  summary: str
  sections: [dict]
  key_findings: [Finding]
  confidence: float

RiskAssessment:
  scenarios: [{ name, probability, portfolio_pnl, description }]
  risk_factors: [str]
  overall_risk_level: str
  duration_impact: str | null
  curve_exposure: str | null
  factor_decomposition: dict | null

Counterfactual:
  decision_type: str               # not_expressed | abandoned_view |
                                   # rejected_expression
  reference_levels: dict
  track_for_days: int
  outcome: dict | null             # filled when tracking completes
```

### 8.5 Output Metadata

Every structured output carries metadata that enables retrospective analysis:

```
OutputMetadata:
  created_at: datetime
  created_by: str                  # "agent" | "subagent:{skill}" |
                                   # "pm_override"
  trigger: str                     # what prompted this output
  context_manifest_id: str         # link to the manifest
  plan_id: str | null              # if created via planned decomposition
  confidence_at_creation: float

  # For retrospective analysis
  key_inputs: [str]                # manifest item IDs that influenced this
  reasoning_summary: str           # 2-3 sentence summary of why
  known_gaps: [str]                # what the Agent knew it didn't know
```

### 8.6 When, Where, and How Memory Writes Happen

**Guaranteed writes** — code-enforced because downstream processes depend on them:

```
View created/updated/invalidated → automatic persistence
Expression created/closed → automatic persistence
Outcome recorded → automatic when Expression closes
ProcessKnowledge from retrospective → automatic persistence
```

Implementation: The `create_view()`, `update_view()`, `create_expression()`, `close_expression()` tools automatically persist. The Agent calls the tool, the write happens.

**Discretionary writes** — the Agent decides:

```
Observations → Agent decides what's worth remembering
Linkages → Agent codifies patterns it discovers
Linkage updates → Agent notes corroborations/contradictions
Context notes → Agent records PM preferences or context
```

**Where in the flow memory writes occur:**

```
During retrieval:      NO WRITES. Read-only.
During direct response: Discretionary (observations, linkages)
During sub-agent execution: Sub-agents do NOT write. Read-only.
During Agent integration: PRIMARY write point.
  - Guaranteed writes (View, Expression via tools)
  - Discretionary writes (observations, linkages)
During scheduled cycles: Heavy write moments (EOD, retrospective)
```

**Sub-agents can read memory but never write.** They have partial context. The Agent, with full context, makes all memory decisions.

### 8.7 Memory Write Guidance

In the Agent's system prompt:

```
MEMORY DISCIPLINE:

Writing to memory shapes your future self. Be deliberate.

ALWAYS write when:
- You form, update, or invalidate a View
- You design or close an Expression
- A retrospective produces ProcessKnowledge
- You observe a pattern matching or contradicting a Linkage

WRITE when genuinely useful:
- An observation valuable for future queries on this topic
- A pattern you noticed that might recur
- A data relationship you discovered during analysis
- Market behavior that surprised you

DON'T write:
- Routine data (we can always re-fetch)
- Observations duplicating existing Views or Observations
- Extremely short-lived context (intraday noise)
- Internal reasoning steps (those belong in output metadata)

Test: "Would my future self, working on a related query
in 2-3 weeks, benefit from seeing this?" If yes, write it.
```

This guidance evolves through retrospectives.

### 8.8 Memory Read Tools

```
read_active_views(
  category: ViewCategory | null,
  scope_keywords: [str] | null,
  min_confidence: float | null,
)

read_expressions(
  view_id: str | null,
  status: str | null,
  instrument_type: str | null,
)

read_observations(
  keywords: [str] | null,
  category: str | null,
  since: datetime | null,
  related_view: str | null,
)

read_linkages(
  trigger_keywords: [str] | null,
  min_confidence: float | null,
)

read_outcomes(
  view_category: ViewCategory | null,
  since: datetime | null,
  include_counterfactuals: bool,
)

read_process_knowledge(
  category: str | null,
  relevant_to: str | null,
)

read_portfolio_state()

read_calibration(
  view_category: ViewCategory,
)
```

### 8.9 Memory Write Tools

```
# Guaranteed write tools (structured output, always persisted)
create_view(view: View) → view_id
update_view(view_id, changes, reasoning) → updated View
invalidate_view(view_id, reason, evidence) → archived View
create_expression(expression: Expression) → expression_id
update_expression(expression_id, changes) → updated Expression
close_expression(expression_id, exit_details, outcome_notes) → Outcome
record_outcome(outcome: Outcome) → outcome_id

# Discretionary write tools
write_observation(observation: Observation) → observation_id
write_linkage(linkage: Linkage) → linkage_id
update_linkage(linkage_id, corroboration | contradiction) → updated Linkage
write_process_knowledge(pk: ProcessKnowledge) → pk_id
```

---

## 9. The Meta Optimizer: Skill Evolution

### 9.1 The Loop

```
Agent produces output (View, Expression, etc.)
  │ Persisted with full metadata:
  │ context manifest, skill used, confidence, known gaps
  │
  ▼ (time passes)

Outcome occurs
  │ View validated/invalidated, Expression closes,
  │ counterfactual tracking completes
  │
  ▼

Outcome recorded in memory
  │ Linked to original output and metadata
  │
  ▼ (weekly retrospective cycle)

RETROSPECTIVE runs (Agent + retrospective skill)
  │ For each Outcome:
  │ Reads: original output, metadata, actual outcome,
  │        existing ProcessKnowledge, calibration data
  │
  │ Produces:
  │ ├── ProcessKnowledge entries (lessons)
  │ ├── Calibration updates
  │ ├── Linkage updates (confirmed/contradicted)
  │ └── SkillEditProposals
  │
  ▼

PM reviews SkillEditProposals
  │ Approves / modifies / rejects
  │ Approved edits applied to skill prompts
  │
  ▼

Future executions use improved skills
  └── feeds back into the loop (compounding)
```

### 9.2 The Retrospective Skill

```
Skill: retrospective

  summary: "Analyze outcomes to extract lessons, calibrate
            confidence, and propose skill improvements."

  prompt: |
    You are conducting a retrospective on recent outcomes.
    For each outcome, your job is honest assessment — not
    rationalization.

    For each outcome, work through:

    1. WHAT HAPPENED vs WHAT WE EXPECTED
       Compare original View/Expression with actual outcome.
       Be specific about the delta.

    2. WHY
       Was the core view right or wrong?
       If right: right for the right reasons, or lucky?
       If wrong: logic flawed, data insufficient, timing off,
       or expression poorly designed?
       Distinguish: view wrong vs timing wrong vs expression wrong.

    3. WHAT WE MISSED
       Look at the original output's metadata:
       - known_gaps: Did any turn out to matter?
       - key_inputs: Were any misleading?
       - context_manifest: Was important context available
         but not retrieved? Retrieved but underweighted?

    4. CONFIDENCE CALIBRATION
       What confidence did we assign? What was the outcome?
       Update calibration for this View category.

    5. GENERALIZABLE LESSONS
       Is there a pattern across 2+ outcomes?
       Write ProcessKnowledge only when the lesson is:
       - Supported by specific evidence
       - Actionable
       - Not already captured in existing ProcessKnowledge

    6. SKILL ASSESSMENT
       Which skill produced this output?
       Did the skill guide the analysis well?
       Is there a specific prompt change that would have
       helped? Only propose edits with clear evidence and
       specific improvement.

    FOR COUNTERFACTUALS:
    - Would the expression have been profitable?
    - What held us back?
    - Is there a pattern in what we're avoiding?

  evaluation_guidance: |
    A good retrospective:
    - Is honest about failures
    - Distinguishes luck from skill
    - Produces specific, actionable ProcessKnowledge
    - Only proposes skill edits with clear evidence
    - Updates calibration with actual numbers
```

### 9.3 ProcessKnowledge: Continuous Weight

```
ProcessKnowledge:
  lesson: str
  evidence: str
  category: str
  weight: float                    # 0.0-1.0, continuous

  # Weight evolution:
  # New lesson from single retrospective: ~0.3
  # Corroborated by second outcome: → ~0.5
  # Corroborated by third: → ~0.65
  # Contradicted by new evidence: decreases
  # Contradictions outweigh corroborations: drops below 0.2

  corroborations: [{ outcome_id, date, description }]
  contradictions: [{ outcome_id, date, description }]

When retrieved by the Agent:
  "Process note (weight: 0.6, 3 corroborations, 0 contradictions):
   Our rate views tend to underweight supply dynamics."
```

The Agent calibrates its attention based on weight naturally. No thresholds needed.

### 9.4 Skill Edit Proposals

```
SkillEditProposal:
  id: str
  created_at: datetime

  # What to change
  target_skill: str
  edit_type: str                   # add_guidance | modify_guidance |
                                   # add_evaluation_criteria |
                                   # modify_evaluation_criteria |
                                   # add_retrieval_guidance |
                                   # modify_retrieval_guidance

  # The change
  current_text: str | null         # for modify
  proposed_text: str

  # Evidence
  supporting_outcomes: [outcome_id]
  supporting_pk: [process_knowledge_id]
  evidence_summary: str
  evidence_strength: str           # strong | moderate | suggestive

  # PM review
  status: str                      # proposed | approved | modified | rejected
  pm_notes: str | null
```

### 9.5 What Can Be Edited

Every skill in the system is editable, including meta-skills:

```
context_retrieval     — what to look for, how to assess completeness
view_generation       — how to form views
view_validation       — how to reassess views
expression_design     — how to design trades
portfolio_review      — how to assess portfolio
scenario_analysis     — how to structure scenarios
relative_value        — how to analyze RV
event_analysis        — how to assess events
retrospective         — how to analyze outcomes (meta-meta!)
subagent_review       — how to validate sub-agent outputs
attention_allocation  — how to decide what to focus on
+ any PM-created custom skills
```

### 9.6 Concrete Evolution Example

```
MONTH 1: Agent generates a rate view
  View: "Fed will cut fewer times than priced"
  Confidence: 0.78
  Skill: view_generation
  Known gaps: ["No supply-side analysis"]

MONTH 2: View partially plays out
  Outcome: Fed cut 3 times (we expected 1-2, market priced 4)
  Expression P&L: +15bp (positive but less than expected)
  close_expression() → Outcome recorded

WEEK 8: Retrospective runs
  Agent analyzes outcome:
  "Core logic sound but we underweighted supply dynamics.
   Steepener worked partly because of supply effects, not
   purely our Fed call. Known gap 'no supply-side analysis'
   turned out to matter."

  Agent produces:
  
  ProcessKnowledge:
    lesson: "Rate view analysis should explicitly model
             supply dynamics — auction calendar, issuance
             projections, dealer positioning."
    evidence: "Outcomes OUT-042 and OUT-031"
    category: "blind_spot"
    weight: 0.5
    relevant_skills: ["view_generation", "context_retrieval"]

  SkillEditProposal #1:
    target_skill: "view_generation"
    edit_type: "add_guidance"
    proposed_text: "For rate and curve views, explicitly
                    analyze supply dynamics: Treasury auction
                    calendar, net issuance projections, dealer
                    positioning. Our retrospectives show this
                    is a consistent blind spot."
    supporting_outcomes: ["OUT-042", "OUT-031"]
    evidence_strength: "moderate"

  SkillEditProposal #2:
    target_skill: "context_retrieval"
    edit_type: "add_retrieval_guidance"
    proposed_text: "For rate and curve triggers, retrieve
                    supply-side data: upcoming auctions,
                    issuance estimates, dealer inventory."
    supporting_outcomes: ["OUT-042", "OUT-031"]
    evidence_strength: "moderate"

  Calibration update:
    category: macro_regime, band: 0.7-0.8
    running_accuracy: 0.57 (4/7)
    bias: +0.15 (overconfident)

PM REVIEWS:
  Proposal #1: Approved (modified — adds QT runoff schedule)
  Proposal #2: Approved

MONTH 3: Next rate analysis benefits from improved skills
  - context_retrieval skill now prompts for supply data
  - view_generation skill now includes supply analysis guidance
  - ProcessKnowledge retrieved as additional context
  - Calibration data naturally adjusts confidence
```

### 9.7 Confidence Calibration

```
CalibrationRecord:
  category: ViewCategory
  entries: [
    {
      view_id: str,
      stated_confidence: float,
      actual_outcome: str,          # correct | partially_correct | wrong
      date: datetime,
    }
  ]

  current_calibration: {
    confidence_band: str,           # e.g., "0.7-0.8"
    stated_avg: float,
    actual_accuracy: float,
    bias: float,                    # positive = overconfident
    sample_size: int,
    note: str,
  }

When retrieved:
  "Calibration note for macro_regime views: In the 0.7-0.8
   band, our historical accuracy is 0.58 (n=12). We are
   overconfident by ~0.15 in this category."
```

### 9.8 Counterfactual Tracking

```
When a View exists but has no Expression (conviction too low),
or an Expression is proposed but rejected by the PM:

1. Record the decision and current market levels
2. Code-based monitoring: after time_horizon expires,
   record what happened (no LLM calls during tracking)
3. Feed into weekly retrospective

This eliminates survivorship bias. Learning from what
we didn't do reveals systematic avoidance patterns.
```

### 9.9 Safety Rails on Self-Modification

```
1. PM APPROVAL REQUIRED
   No skill edit takes effect without PM review.

2. EVIDENCE THRESHOLD
   Proposals must cite specific outcomes and/or
   ProcessKnowledge entries.

3. CHANGE TRACKING
   Every edit versioned: what, when, why, who approved.
   Rollback supported with full history.

4. SKILL INTEGRITY
   Edits are additive or modifying. Cannot delete core
   structural elements (output_type, evaluation_guidance).

5. CONFLICT DETECTION
   Before applying, check for contradictions with existing
   guidance. Flag conflicts for PM resolution.
```

---

## 10. The Skill System

### 10.1 Skill Structure

```
Skill:
  name: str
  summary: str                     # ~100 tokens, for Agent's skill selection
  prompt: str                      # ~500-1500 tokens, behavioral instruction
  output_type: str                 # references the output library
  available_tools: [str]
  evaluation_guidance: str         # what "good" looks like
  decision_framework: str | null   # for PM decision support skills
```

### 10.2 Core Skill Library

```
ANALYTICAL SKILLS:

  macro_regime_assessment
    Output: Finding
    Key: Identify regime, cycle position, transition probabilities,
         what data would change assessment

  view_generation
    Output: View
    Key: Start from evidence not narrative, build scenarios,
         define invalidation BEFORE confidence, stress-test,
         check historical parallels, reference calibration

  view_validation
    Output: View (updated) or Finding (invalidation)
    Key: Review each invalidation condition, assess new evidence,
         check consensus convergence, update confidence from evidence

  expression_design
    Output: Expression
    Key: Cleanest implementation, evaluate alternatives,
         portfolio interaction, size from conviction + risk budget,
         define exit framework before entry

  portfolio_review
    Output: Report
    Key: Implicit macro bets, unintended concentrations,
         missing exposures, scenario behavior, from-scratch test

  scenario_analysis
    Output: RiskAssessment
    Key: 3-5 scenarios with probabilities, portfolio P&L per scenario,
         max drawdown scenario, existing vs needed hedges

  relative_value_analysis
    Output: Finding or View
    Key: Current vs history, fundamental drivers, mean-reverting
         vs structural, carry/roll, convergence catalysts

  event_analysis
    Output: Finding or View
    Key: Possible outcomes with probabilities, what's priced in,
         asymmetry, affected Views and Expressions

META SKILLS:

  context_retrieval
    Guides the Agent's retrieval phase. Evolves through retrospectives.

  attention_allocation
    Guides scheduled cycle focus. Budget allocation, exploitation
    vs exploration balance.

  retrospective
    Guides outcome analysis. Produces ProcessKnowledge and
    SkillEditProposals.

  subagent_review (validation prompt)
    Guides the validation middleware. Evolves based on
    validation effectiveness.
```

### 10.3 Decision Frameworks

Attached to skills that support specific PM decisions:

```
add_to_position:
  Dimensions: View strength, entry timing, portfolio fit,
  opportunity cost, size reasoning

new_position:
  Dimensions: View quality, expression quality, portfolio
  construction, risk/reward, timing, initial size

risk_reduction:
  Dimensions: View status (wrong vs timing vs expression),
  portfolio impact, market context, partial vs full,
  risk budget redeployment
```

### 10.4 Skill Selection

The Agent's system prompt includes a skill catalog (~100 tokens per skill). The Agent selects dynamically based on the query. For simple queries, no skill needed. For complex queries, multiple skills may be loaded for different sub-agents.

---

## 11. Scheduled Operations

### 11.1 Cycle Types

```yaml
morning_review:
  frequency: "daily, 7:00 AM"
  budget: 6-8 analyses
  context_injection:
    - overnight market summary
    - today's calendar (data releases, events, earnings)
    - all active Views with review trigger status
    - all active Expressions with current P&L
    - pending items from prior cycles
    - recent Process Knowledge
  skill: attention_allocation
  workflow:
    1. Agent runs attention_allocation skill
    2. For each planned item, Agent either:
       a. Handles directly (quick checks)
       b. Spawns sub-agents for full analyses
    3. Agent integrates into morning brief
    4. View updates and Expressions through quality tiers
    5. Memory writes: observations, View updates

event_triggered:
  frequency: "on data release or market event"
  context_injection:
    - the event data
    - affected Views and Expressions
    - relevant Linkages
  workflow:
    1. Agent assesses: does this affect any active Views?
    2. For each affected View: validate or update
    3. For each affected Expression: reassess or hold
    4. If event matches a View's review_trigger: mandatory validation
    5. Memory writes: observations, View updates if warranted

end_of_day:
  frequency: "daily, 4:30 PM"
  budget: 4-6 analyses
  context_injection:
    - today's market moves
    - P&L attribution
    - any triggered invalidation conditions
    - new observations from the day
  workflow:
    1. Agent reviews the day's activity
    2. Record Observations worth remembering
    3. Update Views if the day's data warrants
    4. Flag items for tomorrow's morning review

weekly_retrospective:
  frequency: "weekly, Friday 5:00 PM"
  context_injection:
    - week's Outcomes (closed Expressions, resolved Views)
    - week's Counterfactuals (if tracking completed)
    - current Process Knowledge
  skill: retrospective
  workflow:
    1. Agent reviews each Outcome and Counterfactual
    2. Produces ProcessKnowledge entries
    3. Updates confidence calibration
    4. Proposes skill modifications if evidence warrants
    5. Updates Linkage confirmations/contradictions
```

### 11.2 Attention Allocation

Attention is a skill, not a component:

```
Skill: attention_allocation

  prompt: |
    You are deciding what the system should focus on during
    this {cycle_type} cycle. Budget: ~{budget} analyses.

    PRIORITIZE:
    1. Views where review_triggers have fired (mandatory)
    2. Expressions near stop or target conditions
    3. Today's data releases that affect active Views
    4. Views approaching staleness (not validated recently)

    ALSO CONSIDER:
    5. Unexplored relationships or new data
    6. Sectors/themes we haven't looked at recently
    7. Macro regime transitions in early stages

    For each item, specify:
    - What to analyze and why
    - Which skill to apply
    - Expected output type
    - Priority (critical / standard / if_budget_allows)
```

---

## 12. The Agent's System Prompt

```
FORGE — SYSTEM PROMPT (v5.1)

You are Forge, an analytical system supporting a discretionary
macro portfolio manager. Your role is to provide rigorous,
honest, and actionable investment analysis.

## YOUR CAPABILITIES

- MEMORY: The fund's accumulated knowledge — active Views,
  Expressions, Observations, Linkages, Outcomes, and Process
  Knowledge. Use it. Our history informs our future.
- DATA TOOLS: Market data, portfolio state, news, research,
  economic data. Pull what you need.
- ANALYSIS TOOLS: Computation, backtesting, scenario modeling,
  curve analysis.
- SKILL LIBRARY: Behavioral prompts for specific analytical tasks.
- CONTEXT MANIFEST: Your retrieval builds a manifest automatically.
  Use it for context management and sub-agent assignment.
- PLANNING: For complex tasks, create a Plan to delegate to
  focused sub-agents.

## YOUR PRINCIPLES

1. VIEWS PRECEDE TRADES. Every Expression must trace to a View.
2. SCENARIOS, NOT POINT ESTIMATES. Think in probability distributions.
3. INVALIDATION BEFORE CONVICTION. Define what kills the View first.
4. THE PORTFOLIO IS A SYSTEM. Positions interact. Always consider
   portfolio context.
5. CALIBRATE HONESTLY. Reference calibration data. Adjust
   for historical bias.
6. EVIDENCE OVER NARRATIVE. Build from data, not stories.
7. GAPS ARE INFORMATION. What you don't know matters.

## EXECUTION MODE

Most queries don't need a plan. Answer directly when you can.
Load a single skill for focused analytical tasks.
Plan and decompose when the query has 2+ distinct analytical
dimensions, or the stakes demand independent parallel analysis.

## QUALITY CALIBRATION

- Informational: respond directly (Tier 0)
- Analytical: self-review (Tier 1)
- View generation/modification: adversarial self-review (Tier 2)
- Expressions: independent review (Tier 3)

## MEMORY DISCIPLINE

Write to memory deliberately. Always write Views, Expressions,
and Outcomes. Write Observations and Linkages when your future
self would benefit. Don't write routine data or internal reasoning.

## PORTFOLIO CONSTRAINTS (current)
{injected at runtime}

## ACTIVE VIEWS (summary)
{injected at runtime}

## RECENT PROCESS KNOWLEDGE
{injected at runtime}

## CALIBRATION NOTES
{injected at runtime}

## SKILL CATALOG
{injected at runtime}
```

---

## 13. Guardrails

Mechanical checks on every capital-relevant output. The only hardcoded quality checks — correctly so, because they're not intelligence:

```python
class Guardrails:
    def validate_expression(self, expression, portfolio):
        checks = []

        # Position limits
        checks.append(self.check_position_size(expression, portfolio))

        # Concentration limits
        checks.append(self.check_sector_concentration(expression, portfolio))
        checks.append(self.check_single_name_exposure(expression, portfolio))
        checks.append(self.check_factor_concentration(expression, portfolio))

        # Risk limits
        checks.append(self.check_portfolio_var(expression, portfolio))
        checks.append(self.check_duration_limits(expression, portfolio))
        checks.append(self.check_gross_exposure(expression, portfolio))

        # Structural requirements
        checks.append(self.check_view_link(expression))
        checks.append(self.check_invalidation_conditions(expression))
        checks.append(self.check_exit_framework(expression))

        # Consistency
        checks.append(self.check_expression_view_consistency(expression))

        return ValidationResult(
            passed=all(c.passed for c in checks),
            violations=[c for c in checks if not c.passed],
            warnings=[c for c in checks if c.is_warning],
        )
```

Guardrails also inject constraints into the Agent's context at the START of reasoning:

```
Portfolio Constraints (active):
  Max single-name: 12% NAV
  Max sector: 30% NAV
  Max gross exposure: 200% NAV
  Max duration: ±5 years
  Max portfolio VaR (95%, 1d): 2.5% NAV
  Current: Gross 145%, Net long +60%, Duration +2.1yr, VaR 1.8%
```

---

## 14. Configuration

```yaml
# forge_v5.1_config.yaml

agent:
  model: "opus"
  sub_agent_model: "sonnet"
  max_sub_agents_per_query: 5
  max_tool_calls_per_turn: 20

quality:
  tier_minimums:
    View: 2
    Expression: 3
    Finding: 0
    Observation: 0
    Report: 1
    RiskAssessment: 2
  default_validation_model: "sonnet"
  independent_review:
    model: "opus"
    tool_access: true
  human_in_the_loop:
    new_expression_above: 50000
    view_invalidation_with_active_expressions: true
    portfolio_var_breach: true

guardrails:
  max_single_name_pct: 12
  max_sector_pct: 30
  max_gross_exposure_pct: 200
  max_duration_years: 5
  max_portfolio_var_pct: 2.5
  require_view_link: true
  require_invalidation_conditions: true
  require_exit_framework: true

schedules:
  morning_review:
    time: "07:00"
    timezone: "America/New_York"
    budget: 8
  event_triggered:
    enabled: true
    sources: ["economic_calendar", "earnings_calendar", "fed_communications"]
  end_of_day:
    time: "16:30"
    timezone: "America/New_York"
    budget: 6
  weekly_retrospective:
    day: "Friday"
    time: "17:00"
    budget: 4

memory:
  view_review_trigger_check: "daily"
  counterfactual_tracking: true
  max_active_views: 30
  observation_retention_days: 180
  process_knowledge_retention_days: 365

evolution:
  pm_approval_required_for_skill_changes: true
  calibration_update_frequency: "weekly"
```

---

## 15. Scaffolding Dissolution Path

### Near-term (current models)

Full system as described. Agent retrieves, manifests, decomposes for complex queries, sub-agents with validation, Agent integrates.

### Medium-term (better context + tool use)

Agent handles more queries directly without decomposing. Manifest still useful for context management. Validation requested less often as sub-agent first-draft quality improves.

### Long-term (very large context, reliable reasoning)

Agent handles almost everything directly. Manifest becomes just an audit trail. Orchestrator barely runs. Validation unused. What remains: the Agent, memory, tools, skills, guardrails.

### What Never Dissolves

- Guardrails (mechanical risk limits are always code)
- Memory (accumulated edge, always growing)
- Skills (PM's process, always valuable, always evolving)
- Output contracts (downstream consumers always need stable schemas)
- Audit trail (always need to know what informed what)
- Orchestrator as concept (when parallelism is needed, code manages it)

---

## 16. Summary: Who Does What

```
AGENT:
  All retrieval decisions, mode selection, planning,
  integration, quality self-review, gap-filling,
  memory write decisions, analytical reasoning,
  connection-drawing between data.

MANIFEST:
  Data structure only. Registry of retrieved items.
  Progressive disclosure. Retrieval log.
  Built by code, no LLM calls.

PLAN:
  Concrete structure generated by Agent via tool call.
  SubAgentSpecs with context item IDs, validation specs,
  dependencies, integration notes, quality tier.

ORCHESTRATOR:
  Executes plans mechanically. Resolves manifest IDs to
  content. Manages parallel/sequential execution.
  Mechanical retries. Runs validation middleware.
  Returns results to Agent.

VALIDATION MIDDLEWARE:
  Single fast LLM call per sub-agent (when requested).
  Different model. No tools, no retry.
  Accept/reject + specific feedback.
  Annotation, not a gate.

GUARDRAILS:
  Code. Mechanical risk limits. Always runs.

MEMORY:
  Persistent state. The system's accumulated edge.
  Guaranteed writes for structured outputs.
  Discretionary writes at Agent's judgment.

SKILLS:
  PM's investment process as behavioral prompts.
  Evolve through retrospective loop.
  The system's compounding advantage.

META OPTIMIZER:
  Retrospective → ProcessKnowledge → SkillEditProposals
  → PM review → skill updates → better future outputs.
  The loop that makes the system improve over time.
```
