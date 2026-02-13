# Forge v5.3 — Complete System Design & Implementation

## A Multi-Agent System for Discretionary Macro Portfolio Management

---

## 0. Design Evolution

v4.0–4.1: Rigid pipeline. Context Assembler → Planner → Orchestrator → Sub-agent → Evaluator → Synthesizer → Reflection → Validator. Right insights (Negative Space, contrastive checking, counterfactual tracking, maturity tiers), wrong architecture — 10+ LLM calls for every query.

v5.0–5.1: Correct architectural leap to agent-first. Views and Expressions vocabulary for macro PM. Quality tiers proportional to stakes. But over-engineered the interface: ContextManifest data structure, 25+ typed tools, quality tier enums.

v5.2: Brilliant interface simplification — filesystem abstraction, 5 tools, lean system prompt, explicit context engineering. But over-simplified: dropped Negative Space, weakened contrastive checking, eroded information fidelity at integration, thin evolution evidence bar, no multi-turn sessions, no counterfactual tracking implementation.

**v5.3 (this document):** v5.2's architecture + v4.1's intellectual rigor. Same 5 tools. Same filesystem. Same lean prompt. What changes:

| Change | Source | Mechanism |
|--------|--------|-----------|
| Negative Space restored | v4.1 | Retrieval skill writes `/session/context/gaps.md` |
| Contrastive validation | v4.1 | `validate_contrastive` option on delegate tasks |
| Information fidelity enforcement | v4.1 | System prompt + task list discipline for capital decisions |
| Multi-turn sessions | v4.1 | Session persistence across conversation turns |
| Structured memory queries | v5.1 | Query language in MemoryBackend (`key:value since:date >=N`) |
| Strengthened review | v5.1 | Reviewer gets memory access + calibration + PK |
| Counterfactual tracking | v4.1 | Code-based monitor for untaken decisions |
| Evolution evidence bar raised | v4.1 | 5+ corroborations, no contradictions, Agent-generated proposals |
| Richer attention allocation | v4.1 | Position-weighted, catalyst-aware, exploration budget |
| Scaffold dissolution markers | v5.1 | Explicit permanent vs scaffolding annotation |

No new tools. No new components. No new abstractions.

---

## 1. Principles

### 1.1 The Permanent Layer

What compounds over time regardless of model capability:

```
Memory           Views, Expressions, Observations, Linkages, ProcessKnowledge,
                 Outcomes, Calibration. The system's accumulated edge.

Tools            Market data, economic data, news, portfolio state, analytics.
                 The system's interface with the world.

Skills           The PM's investment process as behavioral prompts.
                 The one thing the PM directly controls. Evolves through
                 retrospective. The compounding advantage.

Output           Stable schemas for things that persist. Dashboard, risk
Contracts        system, trade log, retrospective all consume these.

Guardrails       Mechanical risk limits. Position sizing, exposure caps,
                 concentration rules. Code, not intelligence.

Audit Trail      Full decision lineage. What context informed what decision,
                 when, by which component.
```

### 1.2 The Scaffolding Layer [SCAFFOLD]

What dissolves as models improve:

```
Delegation       Parallel sub-tasks. Dissolves as models handle broader
                 scope in single passes.

Validation       Quality annotation on sub-agent outputs. Dissolves as
                 model self-consistency improves.

Progressive      Line-range reads, summary-then-full patterns. Partially
Disclosure       dissolves as context windows grow and attention improves.
                 But concise context is always better than bloated context.

Session          Multi-turn state management. Dissolves if models get
Compression      native long-running conversation support.

Negative Space   Explicit gap tracking. Dissolves if models reliably
Prompting        self-audit retrieval completeness without prompting.
```

### 1.3 Core Invariants

- **Code handles data management. The LLM handles thinking.** No code draws connections between data, identifies gaps, or assesses relevance. No LLM manages concurrency, computes token counts, or enforces risk limits.
- **Skills encode process. Code encodes plumbing.** If the PM's investment philosophy changes, skills change. If the execution mechanics change, code changes. These never cross.
- **Better models → better system without architectural changes.** Better retrieval decisions, better plans, better analysis, better integration. The permanent layer gains value; the scaffolding dissolves.
- **Every token earns its place.** System prompt is a lean index. Tool results return summaries with full content on filesystem. Sub-agents get curated context. But: for capital decisions, the Agent reads full content before integrating.
- **What you don't know matters.** The system has structural support for reasoning about what's missing, not just what's present.
- **Evolution has a burden of proof.** Skill modifications affect every future run. The evidence bar is high. PM approval is always the final gate.

---

## 2. Architecture

### 2.1 The Agent's Tools

```
read(path, lines?, query?)     Read anything: memory, skills, session, portfolio
write(path, content)           Write to memory or session
fetch(source, params)          External data (market, economic, news, web, analytics)
delegate(tasks)                Parallel sub-agents with optional contrastive validation
review(output, focus)          Independent adversarial review with memory access
```

Five tools. The Agent learns five patterns.

### 2.2 The Filesystem

```
/memory/
  /views/
    V-019.md                Each View is a file
    V-022.md                Standard header enables line-range reads
    ...
  /expressions/
    E-045.md
    ...
  /observations/
    O-188.md
    ...
  /linkages/
    L-014.md
    ...
  /pk/                      ProcessKnowledge
    PK-061.md
    ...
  /outcomes/
    OUT-055.md
    ...
  /counterfactuals/         Tracked untaken decisions
    CF-012.md
    ...
  /calibration/
    macro_regime.md
    relative_value.md
    ...
  /proposals/               Pending SkillEditProposals
    SEP-003.md
    ...

/skills/
  context_retrieval.md      Guides retrieval phase + Negative Space
  view_generation.md
  view_validation.md
  expression_design.md
  portfolio_review.md
  scenario_analysis.md
  rv_analysis.md
  event_analysis.md
  retrospective.md
  attention_allocation.md
  + PM-created custom skills

/portfolio/
  state.md                  Current exposures, risk budget
  constraints.md            Risk limits

/session/                   Per-conversation, persists across turns
  turn_history.md           Compressed prior turns
  tasks.md                  Task list (created by Agent)
  context/
    ctx_001.md              Full content of tool result 1
    ctx_002.md              Full content of tool result 2
    gaps.md                 Negative Space: what's missing
    ...
  results/
    sa_growth.md            Full output of sub-agent task
    sa_market.md
    ...
```

### 2.3 Core Flow

```
 Trigger (query, schedule, alert)
 │
 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       SESSION LAYER (Code)                           │
│                                                                      │
│  If active session: load /session/ from prior turn, inject summary   │
│  If new: create fresh /session/                                      │
│  If scheduled/alert: create fresh /session/, no turn history         │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                          THE AGENT                                    │
│                                                                      │
│  System prompt: lean index (~1,100 tok)                              │
│  Tools: read, write, fetch, delegate, review                         │
│                                                                      │
│  1. RETRIEVE: fetch() for external data, read() for memory           │
│     → Summaries in conversation, full content on filesystem          │
│     → Guided by context_retrieval skill                              │
│     → Write /session/context/gaps.md (Negative Space)                │
│                                                                      │
│  2. REASON: from context, decide execution mode                      │
│     → Direct answer (simple queries)                                 │
│     → Single-skill execution (focused analysis)                      │
│     → Planned decomposition (complex / high-stakes)                  │
│                                                                      │
│  3. EXECUTE: if planned, write task list + delegate()                │
│     → Contrastive validation for capital-relevant tasks              │
│     → Agent receives summaries + validation verdicts                 │
│                                                                      │
│  4. INTEGRATE:                                                       │
│     → For capital decisions: read() full sub-agent outputs first     │
│     → For informational: summaries sufficient                        │
│     → For View modifications: adversarial self-review or review()    │
│     → For Expressions: mandatory review()                            │
│                                                                      │
│  5. PERSIST: write() to memory                                       │
│     → Views, Expressions, Outcomes (guaranteed)                      │
│     → Observations, Linkages, PK (discretionary)                     │
│                                                                      │
│  6. RESPOND to PM                                                    │
│                                                                      │
└───────────────────────────────┬──────────────────────────────────────┘
                                │ (if planned decomposition)
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     DELEGATE EXECUTION (Code)                         │
│                                                                      │
│  Built into delegate tool. Resolves context refs → content.          │
│  Builds execution waves from dependency graph.                       │
│  Runs sub-agents in parallel within each wave.                       │
│  Runs validation (standard or contrastive) when requested.           │
│  Returns structured summaries to Agent.                              │
│  Stores full outputs at /session/results/<task_id>.md                │
│                                                                      │
└───────────────────────────────┬──────────────────────────────────────┘
                                │ (if review requested)
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    INDEPENDENT REVIEW (Optional)                      │
│                                                                      │
│  Built into review tool. Fresh LLM session.                          │
│  Gets: output, focus, portfolio, calibration, relevant PK.           │
│  Can read() memory for independent verification.                     │
│  Can fetch() external data.                                          │
│  Approve / Approve with notes / Revise / Escalate                    │
│                                                                      │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       GUARDRAILS (Code)                               │
│                                                                      │
│  Embedded in write tool. Fires on Expression writes.                 │
│  Position limits, exposure caps, required fields, consistency.       │
│                                                                      │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
                             Output
```

---

## 3. Context Engineering

### 3.1 System Prompt: Lean Index (~1,100 tokens)

Present for every LLM call. Every token must justify recurring inclusion.

```
~400 tok   Identity, principles, execution guidance, memory discipline
~100 tok   Portfolio snapshot: "Duration +2.1yr | Equity -3% UW | Gross 147% | VaR 1.8%"
~100 tok   View index: "5 active views: V-019(growth) V-022(rates) V-025(vol)
           V-028(credit) V-031(EM). read('/memory/views') for detail."
~60  tok   Skills: "11 skills available. read('/skills') for listing."
~120 tok   Top 3 PK by weight (1 line each):
           "PK-067(0.65): Model supply dynamics in rate views.
            PK-073(0.45): Prefer multi-scenario expression convexity.
            PK-074(0.40): Sequential downgrades may mean View is wrong."
~50  tok   Calibration alert: "⚠ Rate/curve: 0.70-0.80 band accuracy 0.50"
~80  tok   Session context (if multi-turn): compressed prior turns
~100 tok   Task list and integration discipline
~90  tok   Negative Space reminder + counterfactual awareness
```

**What's NOT in:** Full View content, skill prompts, full PK entries, calibration tables, observations, linkages, outcome history. All available via `read()`.

### 3.2 Fetch Results: Summary in Conversation, Full on Filesystem

```python
# Agent calls:
fetch("economic", {"indicator": "retail_sales", "latest": True})

# System stores full content:
write("/session/context/ctx_001.md", full_1200_token_report)

# Agent sees in conversation (~100 tokens):
"""[ctx_001 | economic | retail_sales | 1,200 tok]
Retail sales -0.3% MoM vs +0.2% exp (surprise -0.5%).
Control group -0.4% vs +0.1%. Prior revised down.
YoY decelerating to +1.8%. Auto and furniture weakest."""

# Agent can pull full content:
read("/session/context/ctx_001.md")
```

### 3.3 Negative Space: `/session/context/gaps.md`

After the retrieval phase, the Agent writes a Negative Space assessment guided by the `context_retrieval` skill. This is not hardcoded — it's a skill behavior that can evolve through retrospectives.

```markdown
# Retrieval Gaps Assessment

## Searches That Returned Nothing
- "consumer credit deterioration prime" → no observations in memory
- "treasury supply auction impact" → no linkages found

## Adjacent Context Considered But Not Retrieved
- V-028 (credit view) — tangentially related but not directly triggered
- Dealer positioning data — tool not available
- Sell-side consensus on growth — not in memory, would need web fetch

## Completeness Estimate: ~70%

## Primary Gaps
- No supply-side analysis for rate implications (known blind spot, see PK-067)
- No credit market context despite consumer weakness
- No positioning/flow data

## Decision-Critical Gaps
- Supply dynamics gap matters IF we're considering rate expressions
- Credit gap matters IF consumer data triggers recession scenario shift
```

The Agent reads this before planning/reasoning. The gaps inform whether to expand retrieval, delegate additional sub-agents, or flag uncertainty in the output.

### 3.4 Sub-Agent Context: Curated, Not Dumped

```python
delegate([{
    "id": "sa_growth",
    "skill": "view_validation",
    "objective": "Reassess V-019 against consumer data cluster...",
    "context": [
        "ctx_001",              # retail data — full by default
        "ctx_002",              # consumer confidence — full
        "ctx_005",              # V-019 content — full
        "ctx_007:summary",      # PK-061 — summary only (the warning)
    ],
    "notes": "PK-061 warns about overreacting to single data points.",
    "validate": True,
    "validate_contrastive": True,  # v5.3: adversarial validation
}])
```

### 3.5 Information Fidelity at Integration

For capital-relevant outputs (View changes, Expression design), the Agent MUST read full sub-agent outputs before integrating. The task list enforces this:

```markdown
- [x] sa_growth: V-019 conf 0.72→0.65 [validated: accept]
- [x] sa_expression: Steepener designed [validated(contrastive): accept]
- [ ] **READ FULL OUTPUTS before integrating (capital decision)**
      read("/session/results/sa_growth.md")
      read("/session/results/sa_expression.md")
- [ ] Integrate with full context, assess V-022 interaction
- [ ] Write to memory
- [ ] Deliver to PM
```

For informational outputs, summaries are sufficient. The distinction is behavioral (system prompt guidance), not hardcoded logic.

### 3.6 Delegate Results: Structured Summaries

Sub-agent skill prompts require a mandatory SUMMARY at the top. Delegate extracts and returns it:

```
── sa_growth (ok | validated(contrastive): accept) ──
View V-019 updated: confidence 0.72 → 0.65.
Consumer data cluster shifts distribution toward recession.
Labor resilience is key counter. Next payrolls critical.
Scenarios: base 55% (was 65%), mild recession 30% (was 20%).
[full: /session/results/sa_growth.md]

── sa_market (ok | validated: reject) ──
Market repricing moderate. 15bp additional cuts priced.
Credit barely moved — growth scare not credit event.
[full: /session/results/sa_market.md]
[contrastive feedback: Output doesn't address whether credit
 calm is complacency vs correct pricing. The strongest counter:
 consumer credit data is lagging — credit spreads may be behind.]
```

### 3.7 Context Budget: Worked Example

Full planned execution ("Retail sales weak — what does this mean?"):

```
AGENT WINDOW:                                    Cumulative
  System prompt (with session context)           ~1,100 tok
  Query                                              ~20 tok
  7 fetch() result summaries (avg ~100 each)        ~700 tok
  2 read() summaries (views from memory)            ~200 tok
  Negative Space assessment (gaps.md)               ~150 tok
  Task list creation                                ~250 tok
  Delegate call                                     ~200 tok
  ─── delegate executes, Agent waits ───
  3 task result summaries + validation verdicts     ~500 tok
  READ full outputs for capital integration        ~1,800 tok
  Integration reasoning + memory writes             ~800 tok
  Final response                                    ~500 tok
  ═══════════════════════════════════════════════════════════
  Total Agent window:                            ~6,200 tok

SUB-AGENT WINDOWS:
  sa_growth:  skill(700) + objective(150) + context(2,200)   ~3,050 tok
  sa_market:  skill(600) + objective(120) + context(1,500)   ~2,220 tok
  sa_portfolio: skill(600) + objective(130) + deps(400)
                + context(300)                               ~1,430 tok

VALIDATION (per task):
  Standard:     objective(150) + criteria(100) + output(600)    ~850 tok
  Contrastive:  objective(150) + criteria(100) + output(600)    ~850 tok
                (different prompt, same budget)

TOTAL ACROSS ALL LLM CALLS:                     ~14,600 tok
```

The ~2,500 token increase over v5.2 comes from: Negative Space assessment (~150), full output reads for capital integration (~1,800), session context (~80). This is the cost of information fidelity — worth it for decisions involving capital.

---

## 4. Multi-Turn Sessions

### 4.1 Session Lifecycle

```python
class SessionManager:
    """Manages session persistence across conversation turns.

    A session groups multiple PM interaction turns into one conversation.
    Scheduled/alert triggers always get fresh sessions.
    """

    def __init__(self, fs: "ForgeFS", config: dict):
        self.fs = fs
        self.config = config
        self.timeout = config.get("session_timeout_minutes", 30)

    def resolve_session(self, trigger: dict) -> "SessionContext":
        """Determine whether to continue or create a session."""

        if trigger["type"] in ("schedule", "alert"):
            # Always fresh session for non-interactive triggers
            session_id = self._new_session_id()
            self.fs.create_session(session_id)
            return SessionContext(
                session_id=session_id,
                turn_number=1,
                prior_summary=None,
            )

        # Interactive trigger — check for active session
        user_id = trigger.get("user_id", "default")
        active = self._find_active_session(user_id)

        if active and not self._is_expired(active):
            # Continue existing session
            turn_number = active["turn_number"] + 1
            prior_summary = self._compress_prior_turn(active)
            self._update_turn_history(active["session_id"], trigger, prior_summary)

            return SessionContext(
                session_id=active["session_id"],
                turn_number=turn_number,
                prior_summary=prior_summary,
            )

        # New session (or expired)
        if active:
            self._finalize_session(active["session_id"])

        session_id = self._new_session_id()
        self.fs.create_session(session_id)

        return SessionContext(
            session_id=session_id,
            turn_number=1,
            prior_summary=None,
        )

    def _compress_prior_turn(self, session: dict) -> str:
        """Compress prior turns into a concise summary for injection.

        Reads /session/turn_history.md and produces ~80 tokens.
        """
        history = self.fs.read_file(
            f"/session/turn_history.md",
            session_id=session["session_id"]
        )
        # Keep it lean: last 2-3 turns, conclusions and actions only
        lines = history.strip().split("\n")
        recent = lines[-15:]  # last ~15 lines covers 2-3 turns
        return "\n".join(recent)

    def _update_turn_history(self, session_id: str, trigger: dict,
                              prior_summary: str):
        """Append this turn to the running history."""
        entry = (
            f"\n## Turn {trigger.get('turn', '?')}\n"
            f"Query: {trigger['content'][:200]}\n"
            f"Summary: {prior_summary}\n"
        )
        history_path = "/session/turn_history.md"
        existing = self.fs.read_file(history_path, session_id=session_id)
        self.fs.write_file(history_path, existing + entry,
                           session_id=session_id)

    def _finalize_session(self, session_id: str):
        """On session end: Agent writes observations to memory.

        Called when session times out or user explicitly ends.
        The session directory is archived, not deleted.
        """
        self.fs.archive_session(session_id)

    def _find_active_session(self, user_id: str) -> dict | None:
        return self.fs.get_active_session(user_id)

    def _is_expired(self, session: dict) -> bool:
        age_minutes = (_now() - session["last_active"]).total_seconds() / 60
        return age_minutes > self.timeout

    def _new_session_id(self) -> str:
        return f"sess_{_timestamp_compact()}"


@dataclass
class SessionContext:
    session_id: str
    turn_number: int
    prior_summary: str | None
```

### 4.2 Session Injection Into System Prompt

When `prior_summary` is not None, it's appended to the system prompt:

```
SESSION (turn 3 of active conversation):
  Turn 1: "Analyze the curve" → 2s10s at -15bp, steepening view
    supported. V-022 confidence maintained at 0.72.
  Turn 2: "What about supply dynamics?" → Treasury auction calendar
    heavy in Q1. Supply pressure could delay steepening. Noted as gap.
  Current turn: [the new query]
  Prior context available: read("/session/context/") and
    read("/session/results/") from prior turns.
```

---

## 5. The Tools — Complete Implementation

### 5.1 read(path, lines?, query?)

```python
class ReadTool:
    """One tool for all reads. The filesystem provides the organization."""

    TOOL_DEF = {
        "name": "read",
        "description": (
            "Read files and directories. Memory, skills, portfolio, session "
            "state — everything is on the filesystem.\n\n"
            "Directory paths return listings. File paths return content.\n"
            "Use 'lines' to read a range (e.g., '1-8' for View header).\n"
            "Use 'query' to filter directory listings:\n"
            "  Keyword: read('/memory/observations', query='consumer')\n"
            "  Filters: 'category:blind_spot weight>=0.4 since:2026-01'\n"
            "  Combine: 'rates confidence>=0.5 since:2026-01'\n"
        ),
        "input_schema": {
            "type": "object",
            "required": ["path"],
            "properties": {
                "path":  {"type": "string", "description": "Filesystem path"},
                "lines": {"type": "string",
                          "description": "Line range, e.g. '1-8' or '10-25'"},
                "query": {"type": "string",
                          "description": "Filter for directory listings"},
            },
        },
    }

    def __init__(self, fs: "ForgeFS"):
        self.fs = fs

    async def execute(self, path: str, lines: str = None,
                      query: str = None) -> str:
        if self.fs.is_dir(path):
            entries = self.fs.list_dir(path, query=query)
            return self._format_listing(path, entries)

        content = self.fs.read_file(path)
        if lines:
            start, end = _parse_range(lines)
            content_lines = content.split("\n")
            content = "\n".join(content_lines[start - 1:end])

        return content

    def _format_listing(self, path: str, entries: list) -> str:
        lines = [f"Directory: {path} ({len(entries)} items)"]
        for e in entries:
            lines.append(f"  {e.name}  {e.meta}")
        return "\n".join(lines)
```

### 5.2 write(path, content)

```python
class WriteTool:
    """One tool for all writes. Path determines what happens."""

    TOOL_DEF = {
        "name": "write",
        "description": (
            "Write to memory or session. Path determines the type:\n"
            "  /memory/views/V-NNN.md — create/update View (auto-versioned)\n"
            "  /memory/expressions/E-NNN.md — create/update Expression\n"
            "  /memory/observations/new.md — create Observation (ID assigned)\n"
            "  /memory/pk/new.md — create ProcessKnowledge (ID assigned)\n"
            "  /memory/linkages/... — create/update Linkage\n"
            "  /memory/counterfactuals/new.md — record untaken decision\n"
            "  /session/tasks.md — update task list\n"
            "  /session/context/gaps.md — write Negative Space assessment\n"
            "Use 'new.md' as filename to create; system assigns ID."
        ),
        "input_schema": {
            "type": "object",
            "required": ["path", "content"],
            "properties": {
                "path":    {"type": "string"},
                "content": {"type": "string"},
            },
        },
    }

    def __init__(self, fs: "ForgeFS", guardrails: "Guardrails"):
        self.fs = fs
        self.guardrails = guardrails

    async def execute(self, path: str, content: str) -> str:
        category = _path_to_category(path)
        parsed = _parse_content(content, category)

        # Auto-version Views and Expressions
        if category in ("views", "expressions") and self.fs.exists(path):
            self.fs.archive(path)
            if isinstance(parsed, dict):
                parsed["version"] = (
                    self.fs.read_meta(path).get("version", 0) + 1
                )

        # Guardrails on Expressions
        if category == "expressions":
            violations = self.guardrails.check(parsed)
            if violations:
                return "GUARDRAIL VIOLATIONS:\n" + "\n".join(
                    f"  [{v.severity}] {v.rule}: {v.actual} "
                    f"(limit: {v.limit})"
                    for v in violations
                )

        # Auto-generate ID for new items
        if path.endswith("/new.md"):
            item_id = self.fs.next_id(category)
            path = path.replace("new.md", f"{item_id}.md")

        # Side effects for Expressions
        if category == "expressions" and parsed.get("status") == "closed":
            self._auto_record_outcome(path, parsed)

        # Side effects for Views
        if category == "views" and parsed.get("status") == "invalidated":
            self._flag_linked_expressions(parsed)

        # Side effects for rejected/abandoned Expressions → counterfactual
        if (category == "expressions"
                and parsed.get("status") == "rejected"):
            self._auto_record_counterfactual(path, parsed)

        self.fs.write_file(path, content)
        return f"Written: {path}"

    def _auto_record_outcome(self, path: str, expr: dict):
        """When an Expression closes, auto-record the Outcome."""
        outcome_id = self.fs.next_id("outcomes")
        outcome_content = (
            f"# {outcome_id}\n"
            f"view: {expr.get('view_id', expr.get('view', ''))}\n"
            f"expression: {_id_from_path(path)}\n"
            f"status: {expr.get('exit_reason', 'closed')}\n"
            f"closed_at: {_now()}\n"
            f"---\n\n"
            f"## Details\n"
            f"Entry: {expr.get('entry_details', 'N/A')}\n"
            f"Exit: {expr.get('exit_details', 'N/A')}\n"
            f"PnL: {expr.get('pnl', 'pending')}\n"
        )
        self.fs.write_file(
            f"/memory/outcomes/{outcome_id}.md", outcome_content
        )

    def _flag_linked_expressions(self, view: dict):
        """When a View is invalidated, flag its Expressions for review."""
        for expr_id in view.get("expressions", []):
            path = f"/memory/expressions/{expr_id}.md"
            if self.fs.exists(path):
                content = self.fs.read_file(path)
                content = content.replace(
                    "status: active", "status: review_required"
                )
                self.fs.write_file(path, content)

    def _auto_record_counterfactual(self, path: str, expr: dict):
        """When an Expression is rejected, begin counterfactual tracking."""
        cf_id = self.fs.next_id("counterfactuals")
        cf_content = (
            f"# {cf_id}\n"
            f"decision_type: rejected_expression\n"
            f"view: {expr.get('view_id', expr.get('view', ''))}\n"
            f"expression: {_id_from_path(path)}\n"
            f"reason: {expr.get('rejection_reason', 'PM rejected')}\n"
            f"reference_date: {_now()}\n"
            f"reference_levels: {expr.get('reference_levels', 'N/A')}\n"
            f"track_for_days: {expr.get('time_horizon_days', 90)}\n"
            f"status: tracking\n"
        )
        self.fs.write_file(
            f"/memory/counterfactuals/{cf_id}.md", cf_content
        )
```

### 5.3 fetch(source, params)

```python
class FetchTool:
    """External data retrieval. One tool, multiple sources."""

    TOOL_DEF = {
        "name": "fetch",
        "description": (
            "Fetch external data. Sources:\n"
            "  economic — indicators (retail_sales, GDP, CPI, NFP, etc.)\n"
            "  market — prices, yields, spreads, futures, vol\n"
            "  news — headlines and articles\n"
            "  web — general web search\n"
            "  analytics — curve, options, scenario calculations\n"
            "Returns a summary in conversation. Full content stored at "
            "/session/context/ctx_NNN.md — use read() to access."
        ),
        "input_schema": {
            "type": "object",
            "required": ["source", "params"],
            "properties": {
                "source": {
                    "type": "string",
                    "enum": ["economic", "market", "news",
                             "web", "analytics"],
                },
                "params": {"type": "object"},
            },
        },
    }

    def __init__(self, fs: "ForgeFS", data_providers: dict):
        self.fs = fs
        self.providers = data_providers
        self._ctx_counter = 0

    async def execute(self, source: str, params: dict) -> str:
        provider = self.providers[source]
        result = await provider.fetch(**params)

        # Store full content on filesystem
        self._ctx_counter += 1
        ctx_id = f"ctx_{self._ctx_counter:03d}"
        path = f"/session/context/{ctx_id}.md"

        full_content = result.format_full()
        self.fs.write_file(path, full_content)

        # Generate summary (code-based, per source type)
        summary = result.format_summary()
        tokens = _count_tokens(full_content)
        label = result.label

        return f"[{ctx_id} | {source} | {label} | {tokens} tok]\n{summary}"
```

### 5.4 delegate(tasks) — With Contrastive Validation

```python
class DelegateTool:
    """Run parallel sub-agents. Returns structured summaries.

    v5.3: supports validate_contrastive for adversarial validation.
    """

    TOOL_DEF = {
        "name": "delegate",
        "description": (
            "Run focused sub-agents in parallel. Each task gets a skill, "
            "objective, and context references.\n\n"
            "Results return as summaries. Full outputs stored at "
            "/session/results/<task_id>.md.\n\n"
            "Context refs are ctx_NNN IDs from fetch results. Append "
            "':summary' to inject only the summary.\n\n"
            "Validation options:\n"
            "  validate: true — standard quality check\n"
            "  validate_contrastive: true — adversarial counterargument "
            "check. Use for View/Expression outputs."
        ),
        "input_schema": {
            "type": "object",
            "required": ["tasks"],
            "properties": {
                "tasks": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["id", "skill", "objective"],
                        "properties": {
                            "id":          {"type": "string"},
                            "skill":       {"type": "string"},
                            "objective":   {"type": "string"},
                            "context":     {"type": "array",
                                            "items": {"type": "string"}},
                            "notes":       {"type": "string"},
                            "depends_on":  {"type": "array",
                                            "items": {"type": "string"}},
                            "validate":    {"type": "boolean",
                                            "default": False},
                            "validate_contrastive": {
                                "type": "boolean",
                                "default": False,
                            },
                            "validate_criteria": {"type": "string"},
                        },
                    },
                },
            },
        },
    }

    def __init__(self, llm, fs: "ForgeFS", config: dict):
        self.llm = llm
        self.fs = fs
        self.config = config

    async def execute(self, tasks: list[dict]) -> str:
        tasks = [Task(**t) for t in tasks]
        waves = self._build_waves(tasks)
        results = {}

        for wave in waves:
            wave_results = await asyncio.gather(*[
                self._run_task(t, results) for t in wave
            ])
            for t, r in zip(wave, wave_results):
                results[t.id] = r

        return self._format_results(results)

    async def _run_task(self, task: "Task",
                        prior: dict) -> "TaskResult":
        # Load skill
        skill_content = self.fs.read_file(f"/skills/{task.skill}.md")
        skill_prompt = _extract_prompt(skill_content)
        skill_tools = _extract_tools(skill_content)

        # Build sub-agent context
        user_msg = self._build_context(task, prior)

        # Run sub-agent
        output = await self._call_with_retry(
            system=skill_prompt,
            user=user_msg,
            tools=skill_tools,
        )

        if output is None:
            return TaskResult(task.id, status="failed")

        # Store full output
        self.fs.write_file(
            f"/session/results/{task.id}.md", output.text
        )

        summary = _extract_summary(output.text)

        # Validation
        validation = None
        if task.validate or task.validate_contrastive:
            validation = await self._validate(
                task, skill_content, output.text,
                contrastive=task.validate_contrastive,
            )

        return TaskResult(
            task.id, status="ok", summary=summary,
            validation=validation, tokens=output.usage.total,
        )

    def _build_context(self, task: "Task", prior: dict) -> str:
        """Assemble sub-agent user message from components."""
        sections = [f"OBJECTIVE:\n{task.objective}"]

        if task.context:
            ctx_parts = []
            for ref in task.context:
                if ref.endswith(":summary"):
                    ctx_id = ref.replace(":summary", "")
                    path = f"/session/context/{ctx_id}.md"
                    content = self.fs.read_lines(path, 1, 5)
                else:
                    path = f"/session/context/{ref}.md"
                    content = self.fs.read_file(path)
                ctx_parts.append(f"[{ref}]\n{content}")
            sections.append("CONTEXT:\n" + "\n\n".join(ctx_parts))

        if task.depends_on:
            dep_parts = []
            for dep_id in task.depends_on:
                dep = prior.get(dep_id)
                if dep and dep.summary:
                    dep_parts.append(f"[From {dep_id}]\n{dep.summary}")
            if dep_parts:
                sections.append(
                    "PRIOR ANALYSIS:\n" + "\n\n".join(dep_parts)
                )

        if task.notes:
            sections.append(f"NOTES:\n{task.notes}")

        return "\n\n---\n\n".join(sections)

    async def _validate(self, task: "Task", skill_content: str,
                        output_text: str,
                        contrastive: bool = False) -> "Validation":
        """Validation call. Standard or contrastive."""
        criteria = (
            task.validate_criteria
            or _extract_eval_guidance(skill_content)
        )

        prompt = (
            CONTRASTIVE_VALIDATION_PROMPT if contrastive
            else STANDARD_VALIDATION_PROMPT
        )

        # For contrastive: send full output, not just summary
        output_for_validation = (
            output_text if contrastive
            else _extract_summary(output_text)
        )

        response = await self.llm.call(
            model=self.config.get("validation_model", "sonnet"),
            system=prompt,
            user=(
                f"OBJECTIVE:\n{task.objective}\n\n"
                f"CRITERIA:\n{criteria}\n\n"
                f"OUTPUT:\n{output_for_validation}"
            ),
            max_tokens=500,
        )
        return _parse_validation(response.text, contrastive=contrastive)

    def _format_results(self, results: dict) -> str:
        parts = []
        for tid, r in results.items():
            header = f"── {tid} ({r.status}"
            if r.validation:
                vtype = ("contrastive" if r.validation.contrastive
                         else "validated")
                header += f" | {vtype}: {r.validation.verdict}"
            header += ") ──"

            body = r.summary or "(no output)"
            body += f"\n[full: /session/results/{tid}.md]"

            if r.validation and r.validation.feedback:
                body += f"\n[feedback: {r.validation.feedback}]"

            parts.append(f"{header}\n{body}")

        return "\n\n".join(parts)

    async def _call_with_retry(self, system, user, tools,
                                max_retries=2):
        for attempt in range(1 + max_retries):
            try:
                return await self.llm.call(
                    model=self.config.get("subagent_model", "sonnet"),
                    system=system, user=user, tools=tools,
                    timeout=self.config.get("timeout", 30),
                )
            except (TimeoutError, ConnectionError):
                if attempt == max_retries:
                    return None

    @staticmethod
    def _build_waves(tasks):
        """Topological sort into parallel execution waves."""
        remaining = {t.id: t for t in tasks}
        completed = set()
        waves = []
        while remaining:
            wave = [
                t for t in remaining.values()
                if not t.depends_on
                or all(d in completed for d in t.depends_on)
            ]
            if not wave:
                raise ValueError("Circular dependency in task graph")
            waves.append(wave)
            for t in wave:
                del remaining[t.id]
                completed.add(t.id)
        return waves


# ── Validation Prompts ──

STANDARD_VALIDATION_PROMPT = """\
Assess the sub-agent output against the objective and criteria.

Respond with exactly:
VERDICT: accept or reject
FEEDBACK: (if rejecting) What specifically is missing or wrong.

Accept if the output substantively addresses the objective.
Reject if the output misses the objective or ignores key criteria."""


CONTRASTIVE_VALIDATION_PROMPT = """\
You are performing adversarial validation of an analytical output.

STEP 1: Read the output. Understand its main conclusion and reasoning.

STEP 2: CONSTRUCT THE STRONGEST COUNTERARGUMENT.
What would a sophisticated skeptic say? What evidence would contradict
the conclusion? What assumptions are weakest?

STEP 3: Does the output anticipate and address this counterargument?

STEP 4: Verdict.
VERDICT: accept — if the output either addresses the counterargument
  or if the counterargument is weak.
VERDICT: reject — if the counterargument is compelling AND the output
  doesn't address it.

COUNTERARGUMENT: (always state it, even on accept)
FEEDBACK: (if rejecting) The specific counterargument and what the
  output should address. Be concrete enough that someone could fix
  the gap without re-doing the full analysis."""
```

### 5.5 review(output, focus) — With Memory Access

```python
class ReviewTool:
    """Independent adversarial review. Fresh LLM session with read access.

    v5.3: Reviewer gets calibration, PK, and can read() memory.
    """

    TOOL_DEF = {
        "name": "review",
        "description": (
            "Request adversarial review of a proposed output. "
            "Use for Expression outputs or when you want a fresh "
            "perspective to challenge your reasoning.\n\n"
            "The reviewer has independent access to memory (Views, PK, "
            "calibration) and can fetch() external data. It sees the "
            "output without your retrieval context — a fresh perspective.\n\n"
            "Returns verdict + reasoning."
        ),
        "input_schema": {
            "type": "object",
            "required": ["output", "focus"],
            "properties": {
                "output": {
                    "type": "string",
                    "description": "The output to review",
                },
                "focus": {
                    "type": "string",
                    "description": "What to challenge / key concerns",
                },
            },
        },
    }

    def __init__(self, llm, fs: "ForgeFS", config: dict):
        self.llm = llm
        self.fs = fs
        self.config = config

    async def execute(self, output: str, focus: str) -> str:
        # Build curated context for reviewer
        portfolio = self.fs.read_file("/portfolio/state.md")

        # v5.3: Reviewer gets calibration and relevant PK
        calibration = self._get_relevant_calibration(output)
        pk_context = self._get_relevant_pk(output, focus)

        reviewer_context = (
            f"OUTPUT TO REVIEW:\n{output}\n\n"
            f"REVIEW FOCUS:\n{focus}\n\n"
            f"PORTFOLIO STATE:\n{portfolio}\n\n"
        )

        if calibration:
            reviewer_context += f"CALIBRATION DATA:\n{calibration}\n\n"
        if pk_context:
            reviewer_context += f"PROCESS KNOWLEDGE:\n{pk_context}\n\n"

        # Reviewer has read + fetch tools for independent investigation
        reviewer_tools = [
            ReadTool(self.fs).TOOL_DEF,
            FetchTool(self.fs, self.config.get("data_providers", {})).TOOL_DEF,
        ]

        response = await self.llm.call(
            model=self.config.get("review_model", "opus"),
            system=REVIEW_PROMPT,
            user=reviewer_context,
            tools=reviewer_tools,
        )

        return response.text

    def _get_relevant_calibration(self, output: str) -> str | None:
        """Extract calibration data relevant to the output's View category."""
        # Heuristic: look for View category in output
        for cat in ["macro_regime", "relative_value", "fundamental_equity",
                     "vol_surface", "event_driven", "flow_driven", "thematic"]:
            if cat.replace("_", " ") in output.lower() or cat in output.lower():
                path = f"/memory/calibration/{cat}.md"
                if self.fs.exists(path):
                    return self.fs.read_file(path)
        return None

    def _get_relevant_pk(self, output: str, focus: str) -> str | None:
        """Get high-weight PK entries relevant to the review focus."""
        pks = self.fs.list_dir("/memory/pk/", query="weight>=0.4")
        relevant = []
        for pk in pks:
            content = self.fs.read_lines(
                f"/memory/pk/{pk.name}", 1, 6
            )
            # Simple relevance: any keyword overlap
            if any(word in content.lower()
                   for word in focus.lower().split()
                   if len(word) > 3):
                relevant.append(content)

        if relevant:
            return "\n---\n".join(relevant[:5])
        return None


REVIEW_PROMPT = """\
You are reviewing a proposed output before capital is committed.
Your job is adversarial — find what's wrong, missing, or overconfident.

You have tool access:
- read() to check memory (Views, Observations, ProcessKnowledge, Outcomes)
- fetch() to verify data independently

USE YOUR TOOLS. Don't just review what's in front of you — actively
investigate. Check our calibration history. Look at related Outcomes.
Verify key data points.

Be specific. State what you'd change and why. Don't approve to be polite.

End with: VERDICT: approve / approve_with_notes / revise / escalate
If revising, state EXACTLY what needs to change."""
```

---

## 6. The Filesystem Layer

```python
class ForgeFS:
    """Virtual filesystem. Routes paths to appropriate backends."""

    def __init__(self, db, skill_dir: str, session_store: "SessionStore"):
        self.db = db
        self.skill_dir = skill_dir
        self.session_store = session_store
        self._active_session_id = None

        self.backends = {
            "/memory/":    MemoryBackend(db),
            "/skills/":    FileBackend(skill_dir),
            "/portfolio/": PortfolioBackend(db),
            "/session/":   None,  # resolved dynamically
        }

    def create_session(self, session_id: str):
        """Create a new ephemeral session."""
        self._active_session_id = session_id
        self.session_store.create(session_id)
        self.backends["/session/"] = SessionBackend(
            self.session_store, session_id
        )

    def load_session(self, session_id: str):
        """Load an existing session (multi-turn continuation)."""
        self._active_session_id = session_id
        self.backends["/session/"] = SessionBackend(
            self.session_store, session_id
        )

    def read_file(self, path: str, session_id: str = None) -> str:
        backend = self._route(path, session_id)
        return backend.read(path)

    def read_lines(self, path: str, start: int, end: int) -> str:
        content = self.read_file(path)
        lines = content.split("\n")
        return "\n".join(lines[start - 1:end])

    def write_file(self, path: str, content: str,
                    session_id: str = None):
        backend = self._route(path, session_id)
        backend.write(path, content)

    def list_dir(self, path: str, query: str = None) -> list:
        backend = self._route(path)
        return backend.list(path, query)

    def exists(self, path: str) -> bool:
        backend = self._route(path)
        return backend.exists(path)

    def is_dir(self, path: str) -> bool:
        return path.endswith("/") or "." not in path.split("/")[-1]

    def archive(self, path: str):
        content = self.read_file(path)
        archive_path = path.replace("/memory/", "/memory/.archive/")
        archive_path = archive_path.replace(
            ".md", f"_{_timestamp()}.md"
        )
        self.write_file(archive_path, content)

    def archive_session(self, session_id: str):
        self.session_store.archive(session_id)

    def get_active_session(self, user_id: str) -> dict | None:
        return self.session_store.get_active(user_id)

    def next_id(self, category: str) -> str:
        backend = self._route(f"/memory/{category}/")
        return backend.next_id(category)

    def read_meta(self, path: str) -> dict:
        backend = self._route(path)
        return backend.read_meta(path)

    def _route(self, path: str, session_id: str = None):
        for prefix, backend in self.backends.items():
            if path.startswith(prefix):
                if prefix == "/session/" and session_id:
                    return SessionBackend(
                        self.session_store, session_id
                    )
                return backend
        raise ValueError(f"No backend for path: {path}")
```

### MemoryBackend with Query Language

```python
class MemoryBackend:
    """Routes /memory/ paths to database storage.

    Supports structured queries for directory listings:
      "category:blind_spot weight>=0.4 since:2026-01"
      "rates confidence>=0.5"
      "skill:view_generation"
    """

    def __init__(self, db):
        self.db = db

    def read(self, path: str) -> str:
        category, item_id = _parse_memory_path(path)
        record = self.db.get(category, item_id)
        return self._to_markdown(record, category)

    def write(self, path: str, content: str):
        category, item_id = _parse_memory_path(path)
        record = self._from_markdown(content, category)
        self.db.upsert(category, item_id, record)

    def list(self, path: str, query: str = None) -> list:
        category = _parse_category(path)
        records = self.db.list(category)

        if query:
            records = self._apply_query(records, query)

        return [
            DirEntry(
                name=f"{r['id']}.md",
                meta=self._listing_meta(r, category),
            )
            for r in records
        ]

    def _apply_query(self, records: list, query: str) -> list:
        """Parse and apply query filters.

        Syntax:
          keyword             — full-text search across all text fields
          key:value           — exact match on a field
          key>=N / key<=N     — numeric comparison
          since:YYYY-MM-DD   — date filter (created_at or last_validated)
          skill:name          — match relevant_skills field (for PK)
          status:active       — match status field
        """
        tokens = query.split()
        filtered = records

        for token in tokens:
            if ">=" in token:
                field, value = token.split(">=", 1)
                filtered = [
                    r for r in filtered
                    if _numeric(r.get(field, 0)) >= _numeric(value)
                ]
            elif "<=" in token:
                field, value = token.split("<=", 1)
                filtered = [
                    r for r in filtered
                    if _numeric(r.get(field, 0)) <= _numeric(value)
                ]
            elif token.startswith("since:"):
                date_str = token.split(":", 1)[1]
                cutoff = _parse_date(date_str)
                filtered = [
                    r for r in filtered
                    if _get_date(r) >= cutoff
                ]
            elif token.startswith("skill:"):
                skill_name = token.split(":", 1)[1]
                filtered = [
                    r for r in filtered
                    if skill_name in r.get("relevant_skills", [])
                    or skill_name in str(r.get("skill", ""))
                ]
            elif token.startswith("status:"):
                status = token.split(":", 1)[1]
                filtered = [
                    r for r in filtered
                    if r.get("status", "") == status
                ]
            elif token.startswith("category:"):
                cat = token.split(":", 1)[1]
                filtered = [
                    r for r in filtered
                    if r.get("category", "") == cat
                ]
            elif ":" in token:
                # Generic key:value
                field, value = token.split(":", 1)
                filtered = [
                    r for r in filtered
                    if str(r.get(field, "")).lower() == value.lower()
                ]
            else:
                # Keyword full-text search
                keyword = token.lower()
                filtered = [
                    r for r in filtered
                    if keyword in _full_text(r).lower()
                ]

        return filtered

    def _to_markdown(self, record: dict, category: str) -> str:
        """Convert database record to structured markdown.
        Lines 1-8: Header. Line 9: separator. Lines 10+: Full content.
        """
        formatter = self._formatters.get(category, self._generic_to_md)
        return formatter(record)

    def _from_markdown(self, content: str, category: str) -> dict:
        """Parse markdown back to a record dict."""
        return _parse_markdown_to_dict(content)

    def _listing_meta(self, record: dict, category: str) -> str:
        if category == "views":
            return (f"{record.get('scope', '')} | "
                    f"conf:{record.get('confidence', '')} | "
                    f"{record.get('status', '')}")
        elif category == "expressions":
            return (f"view:{record.get('view_id', record.get('view', ''))} | "
                    f"{record.get('status', '')}")
        elif category == "pk":
            return (f"w:{record.get('weight', '')} | "
                    f"{record.get('category', '')}")
        elif category == "outcomes":
            return (f"view:{record.get('view', '')} | "
                    f"{record.get('status', '')}")
        elif category == "counterfactuals":
            return (f"{record.get('decision_type', '')} | "
                    f"{record.get('status', '')}")
        elif category == "observations":
            return (f"{record.get('category', '')} | "
                    f"conf:{record.get('confidence', '')}")
        elif category == "linkages":
            return (f"conf:{record.get('confidence', '')} | "
                    f"n:{record.get('instance_count', '')}")
        return ""

    def next_id(self, category: str) -> str:
        prefix = {
            "views": "V", "expressions": "E", "observations": "O",
            "linkages": "L", "pk": "PK", "outcomes": "OUT",
            "counterfactuals": "CF", "proposals": "SEP",
        }.get(category, "X")
        count = self.db.count(category) + 1
        return f"{prefix}-{count:03d}"

    def read_meta(self, path: str) -> dict:
        category, item_id = _parse_memory_path(path)
        record = self.db.get(category, item_id)
        return record or {}

    def exists(self, path: str) -> bool:
        category, item_id = _parse_memory_path(path)
        return self.db.exists(category, item_id)
```

---

## 7. The Agent Loop

```python
class Agent:
    """The Agent: one continuous LLM conversation with 5 tools."""

    def __init__(self, llm, fs: ForgeFS, session_mgr: SessionManager,
                 config: dict):
        self.llm = llm
        self.fs = fs
        self.session_mgr = session_mgr
        self.config = config

    async def run(self, trigger: dict) -> str:
        """One trigger → one response. Tool-use loop."""

        # Resolve session (continue or create)
        session = self.session_mgr.resolve_session(trigger)
        self.fs.load_session(session.session_id)

        # Build system prompt (with session context if multi-turn)
        system = self._build_system_prompt(session)
        messages = [{"role": "user", "content": trigger["content"]}]

        # Instantiate tools
        tools = self._create_tools()

        while True:
            response = await self.llm.call(
                model=self.config.get("agent_model", "opus"),
                system=system,
                messages=messages,
                tools=[t.TOOL_DEF for t in tools.values()],
            )

            if not response.tool_calls:
                # Update session turn history before returning
                self._record_turn(session, trigger, response.text)
                return response.text

            messages.append({
                "role": "assistant", "content": response.content
            })
            for call in response.tool_calls:
                tool = tools[call.name]
                result = await tool.execute(**call.arguments)
                messages.append({
                    "role": "user",
                    "content": [{
                        "type": "tool_result",
                        "tool_use_id": call.id,
                        "content": result,
                    }],
                })

    def _create_tools(self) -> dict:
        guardrails = Guardrails(self.config["guardrails"], self.fs)
        return {
            "read":     ReadTool(self.fs),
            "write":    WriteTool(self.fs, guardrails),
            "fetch":    FetchTool(self.fs,
                                  _create_providers(self.config)),
            "delegate": DelegateTool(self.llm, self.fs,
                                     self.config["delegate"]),
            "review":   ReviewTool(self.llm, self.fs,
                                   self.config["review"]),
        }

    def _build_system_prompt(self, session: SessionContext) -> str:
        """Lean system prompt. ~1,100 tokens."""

        views = self.fs.list_dir("/memory/views/")
        view_index = " ".join(
            f"{v.name.replace('.md', '')}({v.meta.split('|')[0].strip()})"
            for v in views
        )

        skills = self.fs.list_dir("/skills/")
        skill_names = ", ".join(
            s.name.replace(".md", "") for s in skills
        )

        pks = self.fs.list_dir("/memory/pk/", query="weight>=0.4")
        pk_lines = []
        for pk in sorted(pks, key=lambda p: p.meta, reverse=True)[:3]:
            content = self.fs.read_lines(
                f"/memory/pk/{pk.name}", 1, 3
            )
            pk_lines.append(f"  {content}")

        portfolio = self.fs.read_file("/portfolio/state.md")
        cal_alert = self._worst_calibration()

        session_block = ""
        if session.prior_summary:
            session_block = (
                f"\nSESSION (turn {session.turn_number}):\n"
                f"{session.prior_summary}\n"
                f"Prior context available via read('/session/').\n"
            )

        return SYSTEM_PROMPT.format(
            portfolio=portfolio,
            view_count=len(views),
            view_index=view_index,
            skill_names=skill_names,
            pk_lines="\n".join(pk_lines),
            cal_alert=cal_alert,
            session_block=session_block,
        )

    def _worst_calibration(self) -> str:
        cals = self.fs.list_dir("/memory/calibration/")
        worst = None
        worst_bias = 0
        for c in cals:
            content = self.fs.read_file(
                f"/memory/calibration/{c.name}"
            )
            bias = _extract_worst_bias(content)
            if abs(bias) > abs(worst_bias):
                worst_bias = bias
                worst = c.name.replace(".md", "")
        if worst:
            return f"⚠ {worst}: worst band bias {worst_bias:+.2f}"
        return "Insufficient calibration data."

    def _record_turn(self, session: SessionContext, trigger: dict,
                      response: str):
        """Record this turn for multi-turn session history."""
        summary = response[:300]  # Crude; could use LLM for compression
        entry = (
            f"\n## Turn {session.turn_number}\n"
            f"Query: {trigger['content'][:200]}\n"
            f"Result: {summary}\n"
        )
        history_path = "/session/turn_history.md"
        existing = ""
        if self.fs.exists(history_path):
            existing = self.fs.read_file(history_path)
        self.fs.write_file(history_path, existing + entry)
```

---

## 8. System Prompt

```python
SYSTEM_PROMPT = """\
You are Forge, an analytical system supporting a discretionary
macro portfolio manager.

TOOLS: read, write, fetch, delegate, review.
Everything is on the filesystem. read() for memory, skills, session.
write() for memory and task tracking. fetch() for external data.
delegate() for parallel sub-agents. review() for adversarial review.

PRINCIPLES:
- Views precede trades. Every Expression links to a View.
- Scenarios, not point estimates. Think in probability distributions.
- Invalidation before conviction. Define what kills the View first.
- The portfolio is a system. Positions interact.
- Calibrate honestly. Reference calibration data.
- Evidence over narrative. Gaps are information.

RETRIEVAL:
When gathering context, follow the context_retrieval skill guidance.
After retrieval, write /session/context/gaps.md — assess what's
missing, what searches returned nothing, and whether gaps matter
for this query. Read gaps.md before reasoning or planning.

EXECUTION:
Most queries: answer directly from read() and fetch(). No delegation.
Focused analysis: read a skill, apply its approach in your reasoning.
Complex / parallel: write a task list, then delegate() sub-agent tasks.

When delegating:
- Write /session/tasks.md first to track all work
- Each task: id, skill, objective, context refs, notes, depends_on
- Use validate: true for quality annotation
- Use validate_contrastive: true for View/Expression outputs
  (adversarial counterargument check, different model)
- Context refs are ctx_NNN IDs. Append :summary for background items.
- Delegate returns summaries. Full output at /session/results/<id>.md

INTEGRATION DISCIPLINE:
- Informational outputs: integrate from summaries
- Capital-relevant outputs (Views, Expressions): ALWAYS read full
  sub-agent output via read('/session/results/<id>.md') before
  integrating. Summary-only integration loses critical nuance.
  Include "READ FULL OUTPUTS" as explicit task list step.

QUALITY:
- Informational: respond directly
- View modifications: construct strongest counterargument before
  finalizing, or use review() for independent challenge
- Expressions: ALWAYS use review() for independent adversarial review

MEMORY:
Always write Views, Expressions, Outcomes when warranted.
Write Observations, Linkages, ProcessKnowledge when your future
self would benefit. Test: "Would I want this 2-3 weeks from now?"
Record untaken decisions as counterfactuals for learning.
{session_block}
PORTFOLIO: {portfolio}

VIEWS: {view_count} active: {view_index}
  read('/memory/views') for listing, read('/memory/views/V-NNN.md')
  for detail.

SKILLS: {skill_names}
  read('/skills/<name>.md') for approach.

PROCESS KNOWLEDGE (top by weight):
{pk_lines}

CALIBRATION: {cal_alert}
  read('/memory/calibration/') for full data.
"""
```

---

## 9. Skills

### 9.1 context_retrieval (enhanced with Negative Space)

```markdown
# context_retrieval
summary: Guides the Agent's retrieval phase and Negative Space assessment
output_type: none (retrieval guidance)
tools: read, fetch

---

## Prompt

When gathering context for analysis, think like a research analyst
preparing a briefing:

START BROAD, THEN FOCUS:
- What directly relates to this trigger?
- What's adjacent? (same macro factor, same asset class, same horizon)
- What might contradict the obvious interpretation?
- What does our own history say? (Views, ProcessKnowledge, Outcomes)
- What does our calibration say about this type of analysis?

ASSESS WHAT YOU HAVE:
After initial retrieval, look at your context index.
- Do you have multiple perspectives, or just one narrative?
- Is there a major data category completely absent?
- Did any searches return nothing? Is that absence meaningful?
- Is the data fresh enough for the question being asked?

KNOW WHEN TO STOP:
You don't need everything. You need enough to reason well.
If past 10-12 items and the picture isn't getting clearer, stop.

KNOW WHEN TO KEEP GOING:
If you only have confirming evidence and no disconfirming evidence,
you haven't looked hard enough.

NEGATIVE SPACE (mandatory after retrieval):
After gathering context, write /session/context/gaps.md with:
1. Searches that returned nothing (and whether absence is meaningful)
2. Adjacent context considered but not retrieved (and why skipped)
3. Completeness estimate (percentage)
4. Primary gaps listed concretely
5. Which gaps are decision-critical for THIS specific query

Read gaps.md before you begin reasoning or planning. Factor gaps
into your confidence and into delegation decisions.
```

### 9.2 view_validation

```markdown
# view_validation
summary: Reassess an existing View against new evidence
output_type: View
tools: fetch
eval_guidance: |
  Must check each invalidation condition. Must cite specific data.
  Must update confidence with reasoning. Must address counterarguments.
  Must reference calibration data for the View's category.

---

## Prompt

You are validating an existing View against new data.

OUTPUT FORMAT:
Begin with SUMMARY (3-5 sentences: conclusion, updated confidence,
key evidence, what changed). Then provide full analysis.

PROCEDURE:
1. Check each invalidation condition against current data
2. If any triggered → recommend invalidation with evidence
3. Assess new evidence: strengthen, weaken, or neutral?
4. Update confidence with SPECIFIC reasoning, not narrative
5. Update scenario probabilities if warranted
6. When revising downward: should the View be FLIPPED, not
   just weakened? Sequential downgrades often mean the View is wrong.
7. State what would change your mind (update review_triggers)

Reference specific data points. Note known gaps.
Acknowledge calibration data if provided.
```

### 9.3 expression_design

```markdown
# expression_design
summary: Design a trade expression implementing a View
output_type: Expression
tools: fetch, analytics
eval_guidance: |
  Must justify instrument choice vs alternatives.
  Must have explicit exit framework (target, stop, time, reassessment).
  Must address portfolio interaction and correlation.
  Must size from conviction + risk budget, not arbitrary.

---

## Prompt

You are designing an Expression — a trade that implements a View.

OUTPUT FORMAT:
Begin with SUMMARY (3-5 sentences: what, why this instrument,
sizing rationale, key risk). Then provide full design.

DESIGN PRINCIPLES:
1. Start with the VIEW, not the trade. What are you expressing?
2. Evaluate instrument alternatives: futures vs cash vs options vs
   spreads. Justify your choice with specific reasoning.
3. Consider optionality: if conviction is moderate, prefer convex
   structures (options, spreads) over linear (futures, cash).
4. Size from conviction + risk budget. Reference Kelly or similar.
   State the risk budget consumed.
5. Exit framework BEFORE entry:
   - Target condition (not just price — what market state?)
   - Stop condition (not just price — what invalidates?)
   - Time exit (when does the thesis expire?)
   - Reassessment triggers (what events force a re-look?)
6. Portfolio interaction: how does this interact with existing book?
   Duration impact, correlation, factor overlap.
7. Known gaps: what don't you know that matters for this design?
```

### 9.4 attention_allocation (enhanced)

```markdown
# attention_allocation
summary: Triage what deserves attention during scheduled cycles
output_type: Finding (prioritized attention list)
tools: read

---

## Prompt

You are deciding what the system should focus on during this
{cycle_type} cycle. Budget: ~{budget} analyses.

PRIORITIZE:
1. Views where review_triggers have fired (mandatory)
2. Expressions near stop or target conditions
3. Today's data releases that affect active Views
4. Views approaching staleness (not validated in >14 days)
5. Larger positions get more attention (position-weighted)
6. Imminent catalysts increase urgency (earnings, FOMC, data)

ALSO CONSIDER (exploration budget — ~20% of budget):
7. Sectors or themes we haven't looked at in 2+ weeks
8. Macro regime transitions in early stages
9. New data patterns that don't match any existing View
10. Counterfactual tracking results that just completed

DEDUPLICATION:
- Correlated positions can share one analysis (e.g., IBIT/FBTC)
- If a View covers multiple Expressions, one View check covers all

For each item, specify:
- What to analyze and why
- Which skill to apply
- Expected output type
- Priority: critical / standard / if_budget_allows
- Whether exploration (helps avoid blind spots) or exploitation
  (manages existing positions)
```

### 9.5 retrospective (enhanced with counterfactual awareness)

```markdown
# retrospective
summary: Analyze outcomes to extract lessons, calibrate confidence,
         and propose skill improvements
output_type: ProcessKnowledge, SkillEditProposal
tools: read, fetch
eval_guidance: |
  Must be honest about failures. Must distinguish luck from skill.
  Must produce specific, actionable ProcessKnowledge.
  Only propose skill edits with clear evidence (5+ corroborations).
  Must update calibration with actual numbers.

---

## Prompt

You are conducting a retrospective on recent outcomes.
Honesty over comfort. Pattern recognition over rationalization.

FOR EACH TRADED OUTCOME:
1. WHAT HAPPENED vs WHAT WE EXPECTED
   Compare original View/Expression with actual outcome.
   Be specific about the delta.

2. WHY
   Was the core view right or wrong?
   If right: right for right reasons, or lucky?
   If wrong: logic flawed, data insufficient, timing off,
   or expression poorly designed?
   Distinguish: view wrong vs timing wrong vs expression wrong.

3. WHAT WE MISSED
   Look at the output's metadata:
   - known_gaps: Did any turn out to matter?
   - key_inputs: Were any misleading?
   - Was important context available but not retrieved?

4. CONFIDENCE CALIBRATION
   Stated confidence vs outcome. Update calibration.

5. GENERALIZABLE LESSONS → ProcessKnowledge
   Only when supported by specific evidence and actionable.

6. SKILL ASSESSMENT → SkillEditProposal
   Only when evidence is strong (5+ corroborating outcomes
   across related ProcessKnowledge entries).

FOR EACH COUNTERFACTUAL:
7. Would the expression have been profitable?
8. What held us back? (conviction threshold? regime filter? PM veto?)
9. Is there a PATTERN in what we're avoiding?
   Systematic avoidance of profitable trade types = hidden cost.
10. Does this counterfactual confirm or contradict existing PK?
    Update corroborations/contradictions.
```

---

## 10. Memory File Formats

Standard header (lines 1-8) enables progressive disclosure via `read(path, lines="1-8")`.

### View

```markdown
# V-019: Growth Slowdown But Not Recession
scope: growth | macro_regime
direction: Slowing but not recessionary
confidence: 0.65
status: active
last_validated: 2026-02-11
expressions: E-045, E-047
review_triggers: payrolls, GDP, consumer_confidence
---

## Key Drivers
- Consumer spending decelerating (retail sales, confidence)
- Labor market resilient but softening (claims trending up)
- Disinflation continuing (CPI 2.8% and falling)

## Key Risks
- Labor market break (3 consecutive negative payrolls)
- Consumer credit deterioration spreading to prime
- External shock (geopolitical, energy)

## Scenarios
- Base (55%): Slow growth, no recession. GDP 1.5-2.0%.
- Mild recession (30%): Consumer-led contraction. GDP -0.5 to -1.0%.
- Reacceleration (15%): Labor stays strong, consumer rebounds.

## Invalidation Conditions
- 3 consecutive months of negative payrolls
- GDP negative for 2 consecutive quarters
- Consumer confidence rebounds above 105

## Reasoning
Consumer data cluster shifts distribution toward recession scenario.
Labor resilience is the key counter.

## Meta
created: 2026-01-15
trigger: "Macro regime assessment for Q1"
context_ids: ctx_001, ctx_002, ctx_003, ctx_007, ctx_009
known_gaps: No supply-side analysis for rate implications
version: 4
```

### Expression

```markdown
# E-045: Duration Overlay (Long)
view: V-019
instrument_type: futures
instruments: 10Y UST futures, +2.1yr duration
conviction: 0.65
risk_budget: 3.0%
status: active
entry_date: 2026-01-20
---

## Sizing Rationale
Kelly criterion at 0.65 conviction with ~2:1 R:R suggests 3-4%
risk budget. Sized at 3% — conservative end.

## Exit Framework
target: 10Y yield drops 50bp from entry (4.15% → 3.65%)
stop: 10Y yield rises 30bp from entry (4.15% → 4.45%)
time_exit: 6 months
reassessment_triggers: FOMC, payrolls, CPI, GDP

## Portfolio Interaction
Primary duration contributor. Correlated with equity underweight.
Net VaR contribution: 0.6%.

## Meta
created: 2026-01-20
trigger: "Growth view expression design"
context_ids: ctx_004, ctx_005, ctx_011
known_gaps: No supply-side term premium analysis
```

### ProcessKnowledge

```markdown
# PK-067: Model Supply Dynamics in Rate Views
weight: 0.65
category: blind_spot
relevant_skills: view_generation, view_validation
---

## Lesson
Rate view analysis should explicitly model supply dynamics (auction
calendar, net issuance, QT pace) alongside fundamental data.

## Evidence
- OUT-042: 10Y view missed term premium widening from heavy issuance
- OUT-049: Duration trade worked but for wrong reason (supply, not growth)
- OUT-055: Steepener thesis ignored supply factor, got lucky

## Corroborations (3)
- OUT-042 (2026-01-05): Supply-driven rate move ignored
- OUT-049 (2026-01-18): PnL attribution showed supply was driver
- OUT-055 (2026-02-01): Post-mortem confirmed supply blind spot

## Contradictions (0)
None.

## Suggested Skill Change
Add to view_validation and view_generation: "For rate and curve views,
explicitly assess supply dynamics: auction calendar, net issuance,
QT pace."
```

### Counterfactual

```markdown
# CF-012: Rejected Steepener Expression
decision_type: rejected_expression
view: V-022
expression: E-048
reason: PM rejected — timing concern, wanted to wait for FOMC
reference_date: 2026-01-28
reference_levels: 2s10s: -18bp, 2Y: 4.35%, 10Y: 4.17%
track_for_days: 60
status: tracking
---

## Tracking
Will record actual levels at 2026-03-29.
Feed outcome into weekly retrospective.

## Resolution (filled when tracking completes)
actual_levels:
counterfactual_pnl:
lesson:
```

---

## 11. The Retrospective Loop

### 11.1 Outcome Tracking (Code)

```python
class OutcomeTracker:
    """Monitors Expressions against exit conditions.

    Code-based — no LLM calls. Runs periodically (hourly or on
    market data refresh).
    """

    def __init__(self, fs: ForgeFS, data_providers: dict):
        self.fs = fs
        self.data = data_providers

    async def check_all(self):
        """Check all active Expressions and Counterfactuals."""
        await self._check_expressions()
        await self._check_counterfactuals()

    async def _check_expressions(self):
        exprs = self.fs.list_dir(
            "/memory/expressions/", query="status:active"
        )
        for expr_entry in exprs:
            path = f"/memory/expressions/{expr_entry.name}"
            content = self.fs.read_file(path)
            expr = _parse_markdown_to_dict(content)

            triggers = await self._evaluate_exit_conditions(expr)

            if triggers:
                # Flag for Agent attention, don't auto-close
                content = content.replace(
                    "status: active",
                    f"status: exit_triggered\n"
                    f"triggered_conditions: {', '.join(triggers)}"
                )
                self.fs.write_file(path, content)

    async def _check_counterfactuals(self):
        """Check if any counterfactual tracking periods have expired."""
        cfs = self.fs.list_dir(
            "/memory/counterfactuals/", query="status:tracking"
        )
        for cf_entry in cfs:
            path = f"/memory/counterfactuals/{cf_entry.name}"
            content = self.fs.read_file(path)
            cf = _parse_markdown_to_dict(content)

            ref_date = _parse_date(cf.get("reference_date", ""))
            track_days = int(cf.get("track_for_days", 90))

            if (_now() - ref_date).days >= track_days:
                # Tracking period expired — record outcome
                actual = await self._get_current_levels(cf)
                cf_pnl = self._compute_counterfactual_pnl(cf, actual)

                resolution = (
                    f"\n## Resolution\n"
                    f"actual_levels: {actual}\n"
                    f"counterfactual_pnl: {cf_pnl}\n"
                    f"completed_at: {_now()}\n"
                )
                content = content.replace(
                    "status: tracking", "status: completed"
                )
                content += resolution
                self.fs.write_file(path, content)

    async def _evaluate_exit_conditions(self, expr: dict) -> list:
        """Check target, stop, and time exit conditions."""
        triggers = []
        # ... market data checks against exit framework ...
        return triggers

    async def _get_current_levels(self, cf: dict) -> dict:
        """Fetch current market levels for counterfactual comparison."""
        # ... fetch from data providers ...
        return {}

    def _compute_counterfactual_pnl(self, cf: dict,
                                     actual: dict) -> str:
        """Estimate P&L if the expression had been taken."""
        # ... computation based on reference vs actual levels ...
        return "N/A"
```

### 11.2 Counterfactual Auto-Detection (Code)

```python
class CounterfactualDetector:
    """Detects untaken decisions that should be tracked.

    Runs daily. Catches Views without Expressions that have been
    active for >N days with sufficient conviction.
    """

    def __init__(self, fs: ForgeFS, config: dict):
        self.fs = fs
        self.min_conviction_days = config.get(
            "counterfactual_min_days", 14
        )
        self.min_confidence = config.get(
            "counterfactual_min_confidence", 0.6
        )

    def detect(self):
        """Find Views that could have been expressed but weren't."""
        views = self.fs.list_dir(
            "/memory/views/", query="status:active"
        )
        for view_entry in views:
            path = f"/memory/views/{view_entry.name}"
            content = self.fs.read_file(path)
            view = _parse_markdown_to_dict(content)

            # View with no Expressions and sufficient conviction
            expressions = view.get("expressions", [])
            confidence = float(view.get("confidence", 0))
            created = _parse_date(view.get("created_at", ""))
            age_days = (_now() - created).days

            if (not expressions
                    and confidence >= self.min_confidence
                    and age_days >= self.min_conviction_days):

                # Check if we already have a CF for this View
                existing = self.fs.list_dir(
                    "/memory/counterfactuals/",
                    query=f"view:{view['id']}"
                )
                if not existing:
                    self._create_counterfactual(view)

    def _create_counterfactual(self, view: dict):
        cf_id = self.fs.next_id("counterfactuals")
        content = (
            f"# {cf_id}\n"
            f"decision_type: not_expressed\n"
            f"view: {view['id']}\n"
            f"reason: View active {view.get('confidence', '')} "
            f"confidence but no Expression created\n"
            f"reference_date: {_now()}\n"
            f"reference_levels: pending_fill\n"
            f"track_for_days: 90\n"
            f"status: tracking\n"
        )
        self.fs.write_file(
            f"/memory/counterfactuals/{cf_id}.md", content
        )
```

---

## 12. Meta Optimizer — Strengthened Evidence Bar

```python
class MetaOptimizer:
    """Check for accumulated evidence that warrants skill edits.

    v5.3: Raised evidence bar. Requires:
    - 5+ total corroborating outcomes across relevant PKs
    - No unresolved contradictions
    - Proposal generated by Agent (not field extraction)
    """

    def __init__(self, llm, fs: ForgeFS, config: dict):
        self.llm = llm
        self.fs = fs
        self.config = config

    async def check_evolution(self):
        """Run after weekly retrospective."""
        skills = self.fs.list_dir("/skills/")
        for skill_entry in skills:
            skill_name = skill_entry.name.replace(".md", "")
            await self._evaluate_skill(skill_name)

    async def _evaluate_skill(self, skill_name: str):
        """Check if accumulated PK warrants a skill edit proposal."""

        # Get relevant PKs
        pks = self.fs.list_dir(
            "/memory/pk/",
            query=f"skill:{skill_name} weight>=0.4"
        )

        if len(pks) < 2:
            return  # Not enough evidence

        # Check no existing pending proposal
        existing = self.fs.list_dir(
            "/memory/proposals/",
            query=f"skill:{skill_name} status:proposed"
        )
        if existing:
            return

        # Load PK details and compute evidence strength
        pk_details = []
        total_corroborations = 0
        has_contradictions = False

        for pk_entry in pks:
            content = self.fs.read_file(
                f"/memory/pk/{pk_entry.name}"
            )
            pk_data = _parse_markdown_to_dict(content)
            pk_details.append(pk_data)

            # Count corroborations
            corr_section = pk_data.get("corroborations", "")
            total_corroborations += _count_items(corr_section)

            # Check for unresolved contradictions
            contra_section = pk_data.get("contradictions", "")
            if _count_items(contra_section) > 0:
                has_contradictions = True

        # v5.3 evidence bar: 5+ total corroborations, no contradictions
        if total_corroborations < 5:
            return
        if has_contradictions:
            return

        # Generate proposal via Agent call (not field extraction)
        await self._generate_proposal(skill_name, pk_details)

    async def _generate_proposal(self, skill_name: str,
                                  pk_details: list):
        """Use an LLM call to generate a reasoned proposal."""

        skill_content = self.fs.read_file(f"/skills/{skill_name}.md")

        pk_summaries = "\n\n".join(
            f"PK: {pk.get('id', '?')} (weight: {pk.get('weight', '?')})\n"
            f"Lesson: {pk.get('lesson', '?')}\n"
            f"Evidence: {pk.get('evidence', '?')}"
            for pk in pk_details
        )

        response = await self.llm.call(
            model=self.config.get("proposal_model", "sonnet"),
            system=PROPOSAL_GENERATION_PROMPT,
            user=(
                f"CURRENT SKILL ({skill_name}):\n{skill_content}\n\n"
                f"ACCUMULATED PROCESS KNOWLEDGE:\n{pk_summaries}\n\n"
                f"Generate a specific, scoped edit proposal."
            ),
            max_tokens=800,
        )

        # Parse and store proposal
        proposal_id = self.fs.next_id("proposals")
        pk_ids = ", ".join(
            pk.get("id", "?") for pk in pk_details
        )
        total_corr = sum(
            _count_items(pk.get("corroborations", ""))
            for pk in pk_details
        )

        proposal_content = (
            f"# {proposal_id}: Edit {skill_name}\n"
            f"target_skill: {skill_name}\n"
            f"status: proposed\n"
            f"evidence_strength: "
            f"{'strong' if total_corr >= 8 else 'moderate'}\n"
            f"total_corroborations: {total_corr}\n"
            f"supporting_pk: {pk_ids}\n"
            f"---\n\n"
            f"## Proposed Change\n"
            f"{response.text}\n"
        )

        self.fs.write_file(
            f"/memory/proposals/{proposal_id}.md", proposal_content
        )

    def apply_decision(self, proposal_path: str, decision: str,
                       pm_notes: str = "",
                       modified_text: str = ""):
        """PM approves, modifies, or rejects a proposal."""
        proposal = self.fs.read_file(proposal_path)
        skill_name = _extract_field(proposal, "target_skill")

        if decision == "reject":
            updated = proposal.replace(
                "status: proposed", "status: rejected"
            )
            self.fs.write_file(
                proposal_path, updated + f"\npm_notes: {pm_notes}"
            )
            return

        text = (
            modified_text
            or _extract_section(proposal, "Proposed Change")
        )
        skill_path = f"/skills/{skill_name}.md"
        skill_content = self.fs.read_file(skill_path)

        # Append to skill
        skill_content += f"\n\n{text}"
        self.fs.write_file(skill_path, skill_content)

        # Update proposal status
        status = "approved" if decision == "approve" else "modified"
        updated = proposal.replace(
            "status: proposed", f"status: {status}"
        )
        self.fs.write_file(
            proposal_path, updated + f"\npm_notes: {pm_notes}"
        )


PROPOSAL_GENERATION_PROMPT = """\
You are generating a skill edit proposal based on accumulated
process knowledge.

Read the current skill prompt carefully. Read all PK entries.

Generate a SPECIFIC, SCOPED edit:
1. What text to add or modify (quote the current text if modifying)
2. The new text (ready to be appended or substituted)
3. Why this change will improve future outputs
4. What it won't fix (scope limitations)

Do NOT propose vague changes like "be more careful about X."
Propose concrete additions to the prompt that encode the lesson.

Keep additions to 2-4 sentences. Skills should stay focused."""
```

---

## 13. Guardrails

```python
class Guardrails:
    """Code-enforced checks on Expression writes.

    The only hardcoded quality checks — correctly so, because
    they're mechanical limits, not intelligence.
    """

    def __init__(self, config: dict, fs: ForgeFS):
        self.config = config
        self.fs = fs

    def check(self, expression: dict) -> list:
        violations = []
        portfolio = self._load_portfolio()

        # Structural requirements
        if not expression.get("view"):
            violations.append(Violation(
                "view_link", "required", "missing", "block"
            ))
        if (not expression.get("exit_framework")
                and not expression.get("target")):
            violations.append(Violation(
                "exit_framework", "required", "missing", "block"
            ))
        if not expression.get("invalidation_conditions",
                              expression.get("stop")):
            violations.append(Violation(
                "invalidation", "required", "missing", "warn"
            ))

        # Position limits
        risk = float(expression.get("risk_budget", 0))
        max_single = self.config["max_single_risk"]
        if risk > max_single:
            violations.append(Violation(
                "single_risk", f"max {max_single}%",
                f"{risk}%", "block"
            ))

        # Portfolio limits
        gross = portfolio.get("gross_exposure", 0) + risk
        max_gross = self.config["max_gross"]
        if gross > max_gross:
            violations.append(Violation(
                "gross_exposure", f"max {max_gross}%",
                f"{gross:.0f}%", "block"
            ))

        # Duration limits
        dur_impact = float(expression.get("duration_impact", 0))
        current_dur = portfolio.get("duration", 0)
        max_dur = self.config["max_duration"]
        if abs(current_dur + dur_impact) > max_dur:
            violations.append(Violation(
                "duration", f"max ±{max_dur}yr",
                f"{current_dur + dur_impact:.1f}yr", "block"
            ))

        # Factor concentration
        # ... additional checks as needed ...

        return violations

    def _load_portfolio(self) -> dict:
        content = self.fs.read_file("/portfolio/state.md")
        return _parse_portfolio(content)


@dataclass
class Violation:
    rule: str
    limit: str
    actual: str
    severity: str  # "block" or "warn"
```

---

## 14. Scheduled Operations

```python
class Scheduler:
    """All scheduled operations enter the Agent as triggers."""

    def __init__(self, agent: Agent, fs: ForgeFS,
                 outcome_tracker: OutcomeTracker,
                 cf_detector: CounterfactualDetector,
                 meta_optimizer: MetaOptimizer,
                 config: dict):
        self.agent = agent
        self.fs = fs
        self.outcome_tracker = outcome_tracker
        self.cf_detector = cf_detector
        self.meta_optimizer = meta_optimizer
        self.config = config

    async def morning_review(self):
        overnight = await self._fetch_overnight()
        calendar = await self._fetch_calendar()
        views = self.fs.list_dir("/memory/views/")

        trigger = {
            "type": "schedule",
            "content": (
                f"Morning review — {_today()}.\n"
                f"Budget: ~{self.config['morning_budget']} analyses.\n\n"
                f"OVERNIGHT:\n{overnight}\n\n"
                f"CALENDAR:\n{calendar}\n\n"
                f"ACTIVE VIEWS: {len(views)}\n"
                f"Load attention_allocation skill. Prioritize by position "
                f"size, catalyst proximity, staleness. Include ~20% "
                f"exploration budget.\n"
                f"Write task list. Execute."
            ),
        }
        return await self.agent.run(trigger)

    async def event_triggered(self, event: dict):
        trigger = {
            "type": "alert",
            "content": (
                f"EVENT: {event['type']} — {event['description']}\n"
                f"DATA: {event.get('data', 'N/A')}\n\n"
                f"Assess impact on active Views and Expressions."
            ),
        }
        return await self.agent.run(trigger)

    async def end_of_day(self):
        trigger = {
            "type": "schedule",
            "content": (
                f"End of day review — {_today()}.\n"
                f"Budget: ~{self.config['eod_budget']} analyses.\n\n"
                f"Review today's market moves. Update Views if data "
                f"warrants. Record Observations worth remembering. "
                f"Flag items for tomorrow's morning review."
            ),
        }
        return await self.agent.run(trigger)

    async def weekly_retrospective(self):
        outcomes = self.fs.list_dir(
            "/memory/outcomes/", query=f"since:{_week_ago()}"
        )
        cfs = self.fs.list_dir(
            "/memory/counterfactuals/", query="status:completed"
        )

        trigger = {
            "type": "schedule",
            "content": (
                f"Weekly retrospective — {_today()}.\n"
                f"{len(outcomes)} new outcomes. "
                f"{len(cfs)} completed counterfactuals.\n\n"
                f"Load retrospective skill. For each outcome and "
                f"counterfactual: analyze honestly. Produce "
                f"ProcessKnowledge entries. Update calibration. "
                f"Propose skill edits only with strong evidence."
            ),
        }
        result = await self.agent.run(trigger)

        # After retrospective, run meta optimizer
        await self.meta_optimizer.check_evolution()

        return result

    async def hourly_monitoring(self):
        """Background task: check exit conditions and counterfactuals."""
        await self.outcome_tracker.check_all()
        self.cf_detector.detect()
```

---

## 15. Configuration

```python
DEFAULT_CONFIG = {
    "agent_model": "opus",

    "delegate": {
        "subagent_model": "sonnet",
        "validation_model": "sonnet",
        "timeout": 30,
    },

    "review": {
        "review_model": "opus",
    },

    "guardrails": {
        "max_single_risk": 5.0,
        "max_gross": 200.0,
        "max_duration": 5.0,
        "max_factor_conc": 30.0,
    },

    "schedules": {
        "morning_budget": 8,
        "eod_budget": 6,
        "morning_time": "07:00",
        "eod_time": "16:30",
        "retrospective_day": "Friday",
        "retrospective_time": "17:00",
        "timezone": "US/Eastern",
        "staleness_days": 14,
    },

    "sessions": {
        "session_timeout_minutes": 30,
    },

    "counterfactuals": {
        "counterfactual_min_days": 14,
        "counterfactual_min_confidence": 0.6,
        "default_tracking_days": 90,
    },

    "evolution": {
        "min_corroborations_for_proposal": 5,
        "require_no_contradictions": True,
        "proposal_model": "sonnet",
        "pm_approval_required": True,
    },

    "context": {
        "system_prompt_target": 1100,
        "fetch_summary_tokens": 100,
        "task_summary_tokens": 250,
        "subagent_budget": 3500,
    },
}
```

---

## 16. Project Structure

```
forge/
├── agent.py              Agent loop (~60 lines)
├── session.py            SessionManager + SessionContext
├── tools/
│   ├── read.py           ReadTool
│   ├── write.py          WriteTool + side effects
│   ├── fetch.py          FetchTool + data providers
│   ├── delegate.py       DelegateTool + wave execution + validation
│   └── review.py         ReviewTool (with memory access)
├── fs.py                 ForgeFS + backends
│   ├── memory_backend.py MemoryBackend (with query language)
│   ├── file_backend.py   FileBackend (skills, session files)
│   ├── portfolio_backend.py
│   └── session_backend.py
├── guardrails.py         Guardrails + Violation
├── tracking/
│   ├── outcome.py        OutcomeTracker
│   └── counterfactual.py CounterfactualDetector
├── meta.py               MetaOptimizer (skill evolution)
├── prompt.py             SYSTEM_PROMPT template
├── scheduler.py          Scheduled triggers
├── config.py             DEFAULT_CONFIG
├── skills/               Skill markdown files
│   ├── context_retrieval.md   (with Negative Space guidance)
│   ├── view_generation.md
│   ├── view_validation.md
│   ├── expression_design.md
│   ├── portfolio_review.md
│   ├── scenario_analysis.md
│   ├── rv_analysis.md
│   ├── event_analysis.md
│   ├── retrospective.md       (with counterfactual awareness)
│   ├── attention_allocation.md (position-weighted, exploration)
│   └── subagent_review.md
└── main.py               Wiring
```

---

## 17. Scaffolding Dissolution Path

### What Dissolves

| Component | Current Role | Dissolves When | What Remains |
|-----------|-------------|----------------|-------------|
| **delegate()** | Parallel sub-tasks | Models handle broader analytical scope in single passes | Agent does everything directly; orchestrator unused |
| **Validation** | Quality annotation on sub-agent outputs | Models' self-consistency improves; contrastive self-review becomes reliable | Agent self-reviews only |
| **Progressive disclosure** | Line-range reads, summaries | Context windows 2M+ with reliable attention | Pass everything directly; manifest is just audit |
| **Session compression** | Compressed turn history | Native long-running conversations | Full history in context |
| **Negative Space prompting** | Skill-guided gap assessment | Models reliably self-audit retrieval completeness | Remove from skill; Agent does it naturally |

### What Never Dissolves

| Component | Why Permanent |
|-----------|--------------|
| **Memory** | Accumulated edge. Always growing. Structural advantage. |
| **Skills** | PM's investment process. Always valuable. Always evolving. |
| **Guardrails** | Mechanical risk limits. Always code. |
| **Output contracts** | Downstream consumers need stable schemas. |
| **Audit trail** | Regulatory and decision forensics. Always needed. |
| **Retrospective loop** | Learning from outcomes. Always valuable. |
| **Counterfactual tracking** | Eliminating survivorship bias. Always needed. |
| **Calibration** | Confidence honesty. Always needed. |

---

## 18. v5.2 → v5.3 Changelog

| Aspect | v5.2 | v5.3 |
|--------|------|------|
| Negative Space | Dropped | Restored via context_retrieval skill → gaps.md |
| Validation | Standard only (accept/reject) | Standard + contrastive (counterargument construction) |
| Integration discipline | Agent can read full outputs | Agent MUST read full outputs for capital decisions |
| Memory queries | Unspecified query param | Structured: `key:value since:date >=N` |
| Sessions | Ephemeral per-trigger | Persistent across conversation turns |
| Review tool context | Portfolio only | Portfolio + calibration + PK + read/fetch tools |
| Counterfactual tracking | Mentioned, not implemented | Full implementation: auto-detection + tracking + resolution |
| Evolution evidence bar | 2 PKs at weight ≥ 0.4 | 5+ corroborations, no contradictions, Agent-generated proposals |
| Attention allocation | Thin | Position-weighted, catalyst-aware, exploration budget |
| System prompt | ~1,000 tok | ~1,100 tok (added session context, Negative Space reminder) |
| Tools | 5 | 5 (same tools, enhanced behaviors) |
| Architecture | Filesystem + Agent | Same (no new components or abstractions) |
