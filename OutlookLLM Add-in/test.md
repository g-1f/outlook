# The Library: Skill Graph Architecture

## Problem

A single SKILL.md works for procedures — fixed steps, one consumer, no branching. It breaks when the domain has depth. A trade-generation file starts at 2,000 tokens, then you add multi-leg coordination, concentration classification edge cases, currency hedging rules, and it hits 15,000. Every request pays the cost of the most complex case. A simple AAPL buy loads currency hedging instructions it will never use.

A flat file cannot express variable-depth reasoning. When a Japan-to-Korea rotation requires composing concepts — concentration classification interacting with benchmark provider rules interacting with FX hedging policy — in ways the author never anticipated, there is no path to follow.

---

## Skill Graphs

A skill graph decomposes domain knowledge into atomic skill folders connected by `[[wikilinks]]` embedded in prose. Each folder is one complete concept. Links tell the agent when and why to follow a connection.

A skill is a folder with a SKILL.md and optional scripts:

```
position-sizing/
  SKILL.md
  scripts/
    kelly.py
    adv_check.py
```

The SKILL.md reads as domain knowledge with routing embedded in prose:

```markdown
---
name: position-sizing
description: Size positions using Kelly-adjusted framework with vol-regime caps
  and correlation adjustments.
mandatory:
  - skill: red-team
    hook: before_concluding
    inputs: current_sizing_decision
  - skill: _validation/sizing-coherence
    hook: after_artifact_produced
    inputs: final_artifact
---

# Position Sizing

Start with the Kelly-optimal fraction. Run `scripts/kelly.py`
with signal strength and win rate to get the base fraction.

Adjust for the current [[vol-regime]] — in risk-off
environments, cap at 50bps regardless of Kelly output.

Check [[correlation-check]] against existing book. If the
new position is highly correlated with your largest holding,
you're concentrating risk even if single-name limits pass.

For illiquid names, run `scripts/adv_check.py` to get the
maximum executable size. If it's below the Kelly-optimal,
that's your binding constraint.
```

The prose is the control flow. "For illiquid names" is a conditional. "These can be evaluated independently" signals parallelism. Natural language carries the routing logic for traversals the model judges at runtime.

The frontmatter declares **mandatory skills** — traversals the harness enforces regardless of model judgment. This is the mechanism for non-negotiables (compliance, risk, red-team) and for validation. The prose stays pure; enforcement lives in structured metadata.

**When to use a graph vs a single file:** if a skill is a procedure (fixed steps, one consumer), keep it as one file. If it is a domain (interacting concepts, multiple consumers, variable depth), decompose it into a graph.

---

## Index as Entry Point

The graph starts with `skills/index.md`, a catalog of what exists. The index is the static view of the graph — useful for visualization, onboarding, lint passes, and orienting the agent at startup.

```markdown
# Skills Index

## Workflows
- [[trade-generation]] — generate orders from PM trade intents
- [[portfolio-rebalance]] — rebalance portfolio to target weights
- [[risk-report]] — produce risk analytics

## Shared Atomic Skills
- [[position-sizing]] — Kelly-adjusted sizing framework
- [[risk-limits]] — gross, net, concentration limits
- [[compliance-check]] — restricted list, conflicts, regs

## Enforcement and Validation Skills
- [[red-team]] — adversarial review of proposed actions
- [[_validation/sizing-coherence]] — validates sizing artifact alignment
- [[_validation/compliance-coherence]] — validates compliance artifact
```

The index is injected into the agent's system prompt at startup so the agent knows the shape of the graph. It is not the execution plan. The agent traverses by reading prose at each node and following wikilinks based on runtime judgment plus frontmatter-declared mandatories.

---

## Two Graphs

The system operates over two separate graphs, both stored in enterprise document management (SharePoint for skills, OneDrive for memory), both accessible through deepagents' composite filesystem backend.

**Skill graph** — authored expertise. How to size positions, what risk limits mean, when to hedge currency. Changes slowly through human-reviewed edits. Version-controlled via a Git-to-SharePoint publishing pipeline rather than ad-hoc SharePoint versioning. The textbook.

**Memory graph** — accumulated experience. AAPL-MSFT correlation spiked during the last sell-off. This PM sizes aggressively on semis. Korea concentration cleared under FTSE in 12 of 12 rotations this quarter. Changes constantly, maintained by agents themselves. Stored on OneDrive with user-ownership semantics. The notebook.

```
skills/ (SharePoint)              memory/ (OneDrive)
  index.md                          index.md
  trade-generation/                 correlations/
    SKILL.md                          tech-sector.md
  position-sizing/                  regimes/
    SKILL.md                          current-regime.md
    scripts/kelly.py                pm-patterns/
  vol-regime/                         desk-alpha.md
    SKILL.md
  risk-limits/
    SKILL.md
  compliance-check/
    SKILL.md
  red-team/
    SKILL.md
  _validation/
    sizing-coherence/SKILL.md
    compliance-coherence/SKILL.md
```

Different trust levels (skill is instruction, memory is observation), different evolution rates (skills through human review, memory autonomously), different storage patterns (skills read-heavy with authored-release cadence, memory write-heavy with accumulation).

---

## Execution Model

The execution model has three modes, all driven by model judgment at runtime, plus one enforcement layer driven by skill frontmatter.

### Mode 1: Inline Graph Walk (Default)

The agent navigates the skill graph within its own context. It reads the workflow entry, encounters wikilinks in prose, calls `navigate(wikilink)` to load the target skill into its context, reasons over it, and continues. Scripts run via the shell tool. Memory is read and written via filesystem tools. The reasoning thread stays continuous.

Most workflows — routine trades, standard rebalances, simple risk reports — complete entirely in this mode. One agent, one context, walks the graph, finishes.

### Mode 2: Parallel Subagent Spawn

When the skill prose declares multiple independent children ("evaluate X and Y independently," "gather A, B, and C"), the agent spawns subagents in parallel via the `task` tool. Each child works on its skill in isolation. The parent waits for all, receives findings directly, continues.

Parallelism is prose-driven. The agent identifies independence from the skill text and issues multiple `task` calls in a single turn. `create_agent` executes them concurrently.

### Mode 3: Same-Node Self-Spawn (Context Isolation)

When the agent navigates to a node and realizes the reasoning there is complex enough to warrant isolation — because the skill's conditional structure is intricate for the current data, or because the parent's context has grown dense — it spawns a fresh instance of itself at the same node with a narrowly scoped sub-problem.

The parent has already loaded the skill into its context (that's how it made the judgment). The child loads the same skill into fresh context and receives the specific hard sub-problem. The parent waits, integrates the child's finding, continues the workflow.

This preserves continuous reasoning for the common case while providing an escape valve for genuinely complex sub-problems.

### The Bitter-Lesson Frame

Which mode fires is a runtime judgment the model makes. As models improve, they judge better — recognizing parallelism in prose, sensing when context is getting dense, deciding when reasoning needs isolation. The harness doesn't change; the execution gets smarter as model capability grows.

---

## Mandatory Traversals

Some traversals cannot be left to model judgment. Red-team on every sizing decision. Compliance-check on every order. Validation of specific high-consequence artifacts. These are non-negotiables — the skill author has decided they must happen, and the harness enforces this regardless of what the agent judges.

### Frontmatter Declaration

Mandatoriness lives in skill frontmatter, not in prose. This keeps the prose clean and makes enforcement mechanical.

```yaml
---
name: position-sizing
mandatory:
  - skill: red-team
    hook: before_concluding
    inputs: current_sizing_decision
  - skill: _validation/sizing-coherence
    hook: after_artifact_produced
    inputs: final_artifact
---
```

Each entry declares: which skill must be invoked, at what hook point in this skill's lifecycle, and what inputs to pass.

**Hooks:**

- `before_concluding` — mandatory runs before the agent can terminate this node. Used for pre-output review (red-team).
- `after_artifact_produced` — mandatory runs after the node produces its output, before that output flows to the parent. Used for validation.
- `on_entry` — mandatory runs when the agent enters this node, before reasoning begins. Used for pre-reasoning checks.

### Enforcement Mechanism

A single middleware (`MandatoryMiddleware`) handles all mandatories uniformly. It reads the current skill's frontmatter on node entry. It tracks which mandatories have been satisfied by inspecting the trace for corresponding spawns. When the agent attempts an action that would bypass an unsatisfied mandatory (concluding before red-team ran, propagating an artifact before validation ran), the middleware intercepts and sends a correction message:

> You produced a finding at position-sizing but did not invoke red-team, which is mandatory for this skill (hook: before_concluding). Invoke red-team against your current sizing decision before concluding.

The agent re-engages, runs the mandatory skill, and resubmits. The trace shows the original attempt, the correction, and the subsequent compliance — more auditable than silent blocking.

### Red-Team and Validation Are the Same Pattern

Red-team is a mandatory that runs on the node's work product before concluding — it adversarially reviews the decision. Validation is a mandatory that runs on the node's output artifact after production — it checks coherence before propagation. Both are "this skill declares another skill must run at a specific hook point."

One mechanism handles both. Authoring a new enforcement class (say, second-opinion on large trades) is just declaring it in skill frontmatter. No harness changes.

### Selective Validation

Not every node declares validation. Validation is an opt-in property of skills that benefit from it:

- High-consequence skills (compliance-check, risk-limits, position-sizing) declare validation
- Structural/mechanical skills (order-format, intent-parsing) don't
- Aggregation nodes that integrate children declare integration-coherence validation
- Leaf computation nodes rely on script assertions, not LLM validation

This keeps validation latency proportional to domain risk. A routine trade through lightly-declared skills has minimal validation overhead. A complex trade through heavily-declared skills pays for the additional scrutiny.

### Validation Parallelism

When multiple validators are triggered at the same hook (a node with two `after_artifact_produced` validators, or the final node invoking three validators before shipping), they run in parallel via `task`. Latency is bounded by the slowest validator at any hook point, not the sum.

### Model Diversity

Validation skills should be invoked with a different model than the one that produced the artifact. Claude-validating-Claude misses shared failure modes. Pairing Opus in the main flow with Sonnet or GPT-5 for validation catches a broader class of issues. This is declared in the validation skill's own frontmatter:

```yaml
---
name: _validation/sizing-coherence
description: Validates that a sizing artifact aligns with its skill's guidance
  and the inputs provided.
preferred_model: openai:gpt-5.1  # different from main agent
---
```

The harness respects `preferred_model` when spawning validation subagents.

---

## Artifact Flow

### Direct Injection to Parent

When a subagent returns, its artifact content is the task tool's return value — not a file path the parent needs to cat. The parent sees the artifact directly in its next turn and integrates it inline. This saves a turn per spawn and keeps integration flowing naturally.

The artifact file still persists on disk (`/work/run_<id>/sub_<uuid>/output.md`) for audit, for downstream validation, and for memory of the run. But the parent's synchronous view is: call `task`, receive artifact content, integrate.

This works because skill authoring produces bounded artifacts. A well-authored skill returns a structured finding in the hundreds or low thousands of tokens, not unbounded dumps. If a skill's output might be very large, the skill's prose should instruct the subagent to write to a file and return a summary with a reference to the full content.

### Recursive Aggregation

When a parent integrates multiple children's artifacts, the integration is itself a new artifact that the parent produces. That parent artifact is subject to the parent skill's own frontmatter — if the parent declares `after_artifact_produced` validation, the integration gets validated before it flows to the grandparent.

Validation is thus recursive along the execution tree: every node's output artifact passes through its skill's declared validations before propagating up. Failures at any level trigger correction messages. The tree of artifacts becomes a tree of validated artifacts, bottom-up.

### Auditability of Artifacts

Every artifact produced at any node is captured in the trace with:

- Node identity (which skill, which invocation instance)
- Inputs received
- Skill prose content at time of execution
- Output artifact content
- Mandatories satisfied (red-team, validation results)
- Parent that received the artifact

Post-hoc queries: "show me every artifact where validation flagged a concern," "show me red-team outputs for trades over $10M last quarter," "show me cases where the mandatory correction message triggered."

---

## Stack

The implementation is built on LangChain v1 and deepagents, with deepagents providing enterprise infrastructure we would otherwise build ourselves.

**What we use from deepagents:**

- **CompositeBackend** — routes filesystem operations to different backends per path prefix. SharePoint for `/skills/`, OneDrive for `/memory/`, StateBackend for `/work/`, a sandbox for `/data/` and script execution.
- **Filesystem tools** (`ls`, `read_file`, `write_file`, `edit_file`, `glob`, `grep`) — wired through the composite backend. The agent reads SharePoint skills and OneDrive memory uniformly via paths.
- **Sandbox backend with shell execution** — runs inside AWS AgentCore for production. Provides `execute` for running skill scripts.
- **SubagentMiddleware** (`task` tool) — handles subagent spawning with isolated contexts and configurable models (supports model diversity for validation).
- **LangGraph integration** — durable execution, streaming, LangSmith tracing with per-subagent `lc_agent_name` metadata.

**What we write as a thin custom layer:**

- **IndexMiddleware** — reads `skills/index.md` at startup, injects into system prompt.
- **MandatoryMiddleware** — reads current skill's frontmatter, tracks satisfaction of mandatories, sends correction messages when unsatisfied mandatories would be bypassed.
- **Navigate tool** — resolves wikilinks to skill paths, reads skill content through the composite backend for inline walks.
- **Harness prompt** — teaches the three execution modes, mandatory traversal semantics, memory discipline, artifact flow.
- **Audit queries** — post-hoc trace analysis for compliance and quality reporting.

---

## Enterprise Infrastructure

### Storage via Composite Backend

```python
from deepagents.backends import CompositeBackend, StateBackend, SandboxBackend
from library.backends.sharepoint import SharePointBackend
from library.backends.onedrive import OneDriveBackend

backend_factory = lambda rt: CompositeBackend(
    default=StateBackend(rt),       # per-run /work/
    routes={
        "/skills/": SharePointBackend(
            site="awm-ai-strats",
            library="Library-Skills",
            read_only=True,
        ),
        "/memory/": OneDriveBackend(
            site="awm-ai-strats",
            library="Library-Memory",
            mode="append_only",
        ),
        "/data/": SandboxBackend(runtime=agentcore),
    },
)
```

Skills live in SharePoint with Git-to-SharePoint CI sync: authors edit markdown in Git, PRs are reviewed, merged PRs publish to SharePoint. The backend reads from SharePoint at runtime; writes are blocked.

Memory lives in OneDrive under a shared library. Writes are append-only to avoid version explosion. Periodic maintenance agents consolidate and archive.

Per-run ephemeral state (`/work/run_<id>/`) lives in LangGraph state. Scripts and shell execution happen in the AgentCore sandbox.

### Shell Execution via AgentCore

AgentCore hosts the agent process and provides a shell sandbox with appropriate isolation, scaling, and lifecycle management. The sandbox backend's `execute` tool routes to AgentCore's shell runtime. Skill scripts execute in this sandbox with access to the composite filesystem view.

---

## The Custom Layer

### MandatoryMiddleware

```python
from langchain.agents.middleware import AgentMiddleware, wrap_model_call, hook_config
from langchain.agents.middleware.types import ModelRequest
import yaml

class MandatoryMiddleware(AgentMiddleware):
    """Enforces frontmatter-declared mandatory skills.

    Parses the current skill's frontmatter, tracks which mandatories
    have been satisfied by inspecting task tool calls in the trace,
    intercepts node termination or artifact production to ensure
    mandatories ran, sends correction messages when they didn't.
    """

    def __init__(self, backend):
        self.backend = backend

    def _current_skill_path(self, state) -> str | None:
        """Determine which skill the agent is currently executing."""
        # Read from runtime context set when navigate() loads a skill
        return state.get("current_skill_path")

    def _parse_mandatories(self, skill_content: str) -> list[dict]:
        """Extract mandatory declarations from skill frontmatter."""
        if not skill_content.startswith("---"):
            return []
        _, frontmatter, _ = skill_content.split("---", 2)
        meta = yaml.safe_load(frontmatter)
        return meta.get("mandatory", [])

    def _satisfied(self, mandatory: dict, trace: list) -> bool:
        """Check whether this mandatory has a corresponding spawn in the trace."""
        return any(
            event["tool"] == "task"
            and event["args"].get("skill") == mandatory["skill"]
            for event in trace
        )

    @wrap_model_call
    def enforce(self, request: ModelRequest, handler):
        skill_path = self._current_skill_path(request.state)
        if not skill_path:
            return handler(request)

        skill_content = self.backend.read(skill_path)
        mandatories = self._parse_mandatories(skill_content)

        if not mandatories:
            return handler(request)

        trace = request.state.get("trace", [])
        unsatisfied = [m for m in mandatories if not self._satisfied(m, trace)]

        if unsatisfied and self._agent_attempting_termination(request):
            correction = self._build_correction_message(unsatisfied, skill_path)
            request = request.override(
                messages=request.messages + [{"role": "system", "content": correction}]
            )

        return handler(request)

    def _build_correction_message(self, unsatisfied, skill_path):
        lines = [f"You are executing {skill_path}."]
        lines.append("The following mandatory skills must be invoked before concluding:")
        for m in unsatisfied:
            lines.append(f"- {m['skill']} (hook: {m['hook']}, inputs: {m['inputs']})")
        lines.append("Invoke each via the task tool before producing your final output.")
        return "\n".join(lines)
```

### Navigate Tool

```python
from langchain.tools import tool
from langchain.tools.runtime import ToolRuntime

@tool
def navigate(wikilink: str, runtime: ToolRuntime) -> str:
    """Follow a wikilink to load a skill's full content into your context.

    Resolves [[position-sizing]] to /skills/position-sizing/SKILL.md
    and returns the content. Also updates runtime context to reflect
    which skill is currently being executed, enabling MandatoryMiddleware
    to track mandatory satisfaction per node.

    Use for inline graph walking. Use the task tool for isolation
    (parallel children or complex sub-reasoning).
    """
    backend = runtime.context["backend"]
    path = f"/skills/{wikilink}/SKILL.md"
    try:
        content = backend.read(path)
        # Update runtime context so MandatoryMiddleware knows current skill
        runtime.state_update["current_skill_path"] = path
        return content
    except FileNotFoundError:
        return f"Error: skill '{wikilink}' not found in graph"
```

### Harness Prompt

```python
HARNESS_PROMPT = """
You are an agent navigating a skill graph to complete a domain workflow.

The skill graph is at /skills/, with entry point /skills/index.md
(injected above). Individual skills are at /skills/<name>/SKILL.md
and may have scripts in /skills/<name>/scripts/.

Memory accumulates under /memory/ as markdown. Read relevant memory
before reasoning at each node; append observations before returning.
Use edit_file to append, never overwrite.

Per-run working artifacts go under /work/run_<id>/.

## Your tools

- navigate(wikilink): Load a skill's full content into your current
  context. Use this when walking the graph inline.
- task(skill, task, inputs): Spawn a subagent for isolated work.
- read_file, write_file, edit_file, ls, grep, glob: Filesystem.
- execute: Run shell commands.

## Execution modes

### 1. Walk inline (default)
Read the next skill via navigate(). Reason over it. Continue. Your
context grows with the workflow; reasoning stays continuous.

### 2. Parallel spawn
When a skill's prose lists independent children, issue multiple
task() calls in one turn. They run in parallel.

### 3. Same-node self-spawn (context isolation)
When the reasoning at a node is complex — intricate conditionals
for your specific data, or your context is getting crowded —
spawn a fresh instance of yourself via task() with the skill and
a narrow sub-problem. Use sparingly.

## Mandatory skills

Some skills declare mandatory children in their frontmatter. These
must be invoked regardless of your judgment. The harness will
remind you if you try to conclude without satisfying them.

Examples:
- red-team at hook before_concluding: invoke before your final output
- _validation/* at hook after_artifact_produced: invoke on your artifact

When you see mandatories in the current skill's frontmatter, plan
to invoke them. Don't wait for reminders.

## Artifact flow

When a subagent returns, you receive its artifact content directly
in the task tool result. Integrate it into your reasoning. The full
artifact persists on disk for audit.

When you produce your own artifact, write it to your designated
output path before concluding. The harness will run any
after_artifact_produced mandatories automatically.

## Memory discipline

Before reasoning at a node, grep /memory/ for relevant pages. Read
them. Before returning, append durable observations to the
appropriate memory page — not intermediate reasoning, only
attributable observations worth future retrieval.

## Output

Write your final answer to /work/run_<id>/answer.md. Say DONE.
"""
```

### Agent Construction

```python
from deepagents import create_deep_agent

def build_library_agent(desk: str, agentcore_runtime):
    backend_factory = make_composite_backend(agentcore_runtime)

    return create_deep_agent(
        model="anthropic:claude-opus-4-7",
        system_prompt=HARNESS_PROMPT + f"\n\nDesk: {desk}",
        tools=[navigate] + domain_fetch_tools(desk),
        middleware=[
            IndexMiddleware(backend_factory),
            MandatoryMiddleware(backend_factory),
        ],
        backend=backend_factory,
    )
```

### Invocation

```python
agent = build_library_agent(desk="long-only-equity", agentcore_runtime=rt)

result = agent.invoke(
    {"messages": [{"role": "user",
                   "content": "Buy 100bps AAPL for the growth fund"}]},
    config={"configurable": {"thread_id": run_id}},
)

# Mandatories ran automatically (red-team, validations)
# Full trace in LangSmith with per-node attribution
# Answer ready at /work/run_<run_id>/answer.md
```

---

## Memory Maintenance

Three operations, same as before:

**Write-on-execute.** Every node appends durable observations before returning. Enforced by harness prompt.

**Lint.** Scheduled maintenance agent runs against `/memory/` for contradictions, stale pages, orphans, dangling wikilinks. Uses the same harness pointed at a memory-lint skill.

**Propose skill edits.** When memory patterns become principles, maintenance agent opens PRs against the Git skills repo. Humans review and merge. CI deploys to SharePoint.

```
Execution traces → Memory (append via subagents)
                      ↓ scheduled lint + pattern detection
                   Proposed skill edits (PR to Git)
                      ↓ human review
                   Skill graph updates (CI deploy to SharePoint)
```

---

## Auditability

Every action in the system produces a structured trace event:

- Navigate calls (which wikilink, resolved to which skill)
- Task spawns (parallel, self-spawn, mandatory)
- Mandatory satisfactions (which mandatory, satisfied by which spawn)
- Correction messages (when, why, what the agent did in response)
- Artifacts produced (at which node, what content)
- Validation results (which validator, pass/flag/fail, rationale)
- Memory writes (which page, what observation)
- Shell executions (which script, inputs, outputs)

The trace is the substrate for:

- Regulatory compliance reporting (did mandatories run, did validations pass)
- Quality analysis (where did validators flag, what did they catch)
- Skill improvement (which skills produce artifacts that fail validation often)
- RL training (policy over navigation decisions, conditioned on outcomes)

LangSmith provides the UI and query layer. Custom queries cover domain-specific audit questions.

---

## Tradeoffs

**Fits:** multi-factor domain workflows with long-horizon reasoning, compliance requirements, and self-improvement goals.

**Doesn't fit:** short single-skill procedures, high-throughput low-latency tasks, domains without meaningful decomposition.

**Latency profile:** routine workflows through lightly-declared skills run fast (inline walk, one model, few mandatories). Complex workflows through heavily-declared skills pay for multiple parallel mandatories and validations. Latency is proportional to declared enforcement, not uniform.

**The honest risks to monitor:**
- Validators becoming rubber stamps if they pass everything — periodic adversarial audit of validator behavior
- Mandatory correction loops on specific skills indicating prompt or skill authoring issues — traces surface these
- Artifact bloat if skills produce unbounded outputs — authoring convention caught in lint

---

## Design Principles

**Enterprise primitives off the shelf.** SharePoint, OneDrive, AgentCore via deepagents composite backend. We don't build auth, versioning, sandboxing.

**Custom layer is thin.** Index middleware, mandatory middleware, navigate tool, harness prompt. The rest is deepagents and prose.

**Three execution modes, runtime-judged.** Inline walk, parallel spawn, same-node self-spawn. Model picks per situation.

**Mandatories unify enforcement.** Red-team, compliance, validation — same pattern, frontmatter-declared, one middleware enforces. New enforcement classes are declaration-only changes.

**Prose carries model-judged routing. Frontmatter carries harness-enforced requirements.** Clean separation.

**Artifacts flow directly from child to parent.** The task tool return is the artifact. Full content persists on disk.

**Validation is selective and parallel.** Skills opt in via frontmatter. Multiple validators at the same hook run concurrently.

**Model diversity for validation.** Validators use different models than the node being validated. Catches shared failure modes.

**Skills evolve through human review. Memory evolves autonomously.** Git-reviewed PRs for skills, append-on-execute for memory.

**Harness scales with model capability.** As models judge execution modes better and produce better artifacts, the system gets smarter without harness changes.

**Every action is audit-traceable.** Structured trace events for navigation, spawning, mandatories, artifacts, validations, memory writes, shell execution.

---

## System

```
┌──────────────────────────────────────────────────────┐
│  Enterprise Storage                                  │
│                                                      │
│  SharePoint              OneDrive                    │
│  /skills/ (Git-synced)   /memory/ (append-only)      │
│  ├── index.md            ├── index.md                │
│  ├── trade-generation/   ├── correlations/           │
│  ├── position-sizing/    ├── regimes/                │
│  ├── red-team/           └── pm-patterns/            │
│  └── _validation/                                    │
└───────────────────┬──────────────────────────────────┘
                    │
                    │ CompositeBackend (deepagents)
                    │ routes: /skills/ → SharePoint (RO)
                    │         /memory/ → OneDrive (append)
                    │         /data/   → AgentCore sandbox
                    │         /work/   → StateBackend
                    ▼
┌──────────────────────────────────────────────────────┐
│  Agent (create_deep_agent)                           │
│                                                      │
│  System prompt:                                      │
│  ├── Harness (3 modes, mandatories, discipline)      │
│  └── Skills index (IndexMiddleware)                  │
│                                                      │
│  Middleware:                                         │
│  ├── IndexMiddleware                                 │
│  └── MandatoryMiddleware                             │
│                                                      │
│  Tools:                                              │
│  ├── navigate(wikilink) — inline graph walk          │
│  ├── task(skill, task) — subagent spawn              │
│  ├── read_file, write_file, edit_file, grep, glob    │
│  ├── execute — shell in AgentCore                    │
│  └── domain fetch tools                              │
│                                                      │
│  Runtime decisions per node:                         │
│  • Walk inline / parallel spawn / self-spawn         │
│  • Satisfy frontmatter-declared mandatories          │
└────────────┬─────────────────────────────────────────┘
             │
             │ task() invokes:
             │ • Parallel siblings (prose-declared)
             │ • Self-spawn (context isolation)
             │ • Mandatory skills (frontmatter-declared)
             │   - red-team (before_concluding)
             │   - validation (after_artifact_produced)
             ▼
┌──────────────────────────────────────────────────────┐
│  Subagents (isolated context)                        │
│                                                      │
│  Fresh context with same tools                       │
│  Different model for validators (model diversity)    │
│  Can navigate, spawn, declare own mandatories        │
│  Returns artifact directly to parent                 │
└────────────┬─────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────┐
│  Trace + Audit                                       │
│                                                      │
│  Structured events: navigate, task, mandatory        │
│    satisfy/correct, artifact produce, validate       │
│    pass/flag/fail, memory write, shell execute       │
│  LangSmith UI + per-agent lc_agent_name metadata     │
│  AgentCore: shell execution logs                     │
│  Queryable substrate for compliance, quality,        │
│    skill improvement, RL training                    │
└──────────────────────────────────────────────────────┘
```
