# Skill Graph Architecture

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

The prose is the control flow. "For illiquid names" is a conditional. "Non-negotiable" is a mandatory marker. "These can be evaluated independently" signals parallelism. No metadata, no YAML edge types. Natural language carries the routing logic.

**When to use a graph vs a single file:** if a skill is a procedure (fixed steps, one consumer), keep it as one file. If it is a domain (interacting concepts, multiple consumers, variable depth), decompose it into a graph.

---

## Index as Entry Point

The graph starts with `skills/index.md`, a catalog of what exists. The index is the static view — useful for visualization, onboarding, lint passes. It is not the execution plan. Workflows are just skills with a particular prose style (guiding narratives with embedded wikilinks to atomic skills). A workflow entry point like `skills/trade-generation/SKILL.md` is structurally no different from any other skill.

At runtime, the agent doesn't consult the index to plan a DAG. It traverses by recursive descent — at each node, reading prose and deciding where to go next.

---

## Two Graphs

Two separate graphs on the same filesystem, both git-tracked.

**Skill graph** (`skills/`) — authored expertise. Changes slowly through human-reviewed edits. The textbook.

**Memory graph** (`memory/`) — accumulated experience. Changes constantly, maintained by agents from their own execution. The notebook.

```
skills/                          memory/
  index.md                         index.md
  trade-generation/                log.md
    SKILL.md                       correlations/
  position-sizing/                   tech-sector.md
    SKILL.md                       regimes/
    scripts/kelly.py                 current-regime.md
  vol-regime/                      pm-patterns/
    SKILL.md                         desk-alpha.md
  risk-limits/
    SKILL.md
  compliance-check/
    SKILL.md
```

Different trust levels: skills are instruction (authored, reviewed), memory is context (compiled by agents, may be wrong or stale).

Different evolution: memory updates autonomously after every execution. Skills update through human-reviewed proposals informed by memory patterns.

---

## Execution Model

The execution model follows the Recursive Language Model pattern (Zhang et al., 2025): **context is an external environment, not prompt content.** The agent's prompt stays minimal. Everything else lives on disk, accessed via shell.

### Traversal by Recursive Descent

```
Agent at skill X:
├── Skill X's content is already in the system prompt (injected when spawned)
├── Evaluate terminal conditions
│   └── If satisfied ("data unchanged, return early"): return
├── Encounter [[Y]] and [[Z]] described as independent
│   ├── spawn_agent("skills/Y/SKILL.md", task, data)     ╮ parallel
│   └── spawn_agent("skills/Z/SKILL.md", task, data)     ╯ (same turn)
├── Both return finding paths; read findings via bash
├── Encounter [[W]] which depends on Y's output
│   └── spawn_agent("skills/W/SKILL.md", task, data={Y's relevant slice})
├── W returns
├── Reason over findings, update memory via bash
└── Write output file, signal DONE
```

The agent does not pre-plan a DAG. Each agent at each depth reads its own skill (pre-injected), evaluates conditions, and spawns subagents for wikilinks it judges relevant. Dependencies are handled by the spawner — if W needs Y's output, the spawner waits for Y, peeks at the finding, extracts the relevant slice, injects it into W's initial data payload.

### Skill Injection

When the parent spawns a subagent for `[[position-sizing]]`, the `spawn_agent` tool reads `skills/position-sizing/SKILL.md` and injects the content into the subagent's system prompt. The subagent starts reasoning immediately with the skill already in context. It does not need to `cat` its own skill.

This matters for several reasons:
- The subagent's first turn is real reasoning, not I/O
- The skill is not in the subagent's bash trace — traces show what the agent did with the skill, not the skill itself
- Prompt caching kicks in: the harness prompt plus the skill content is a stable prefix across every invocation of that skill
- The parent can't accidentally delegate to the wrong skill — the wikilink resolution is what the spawn tool uses

Reading downstream skills (via more `spawn_agent` calls) also triggers injection. Only the wikilink traversal reads a skill's content — the agent never cats its own skill, only spawns children with their skills injected.

### Recursion Is Unbounded

Any agent can spawn subagents with the same two-tool harness. Those can spawn further. Depth is bounded by token budget, not by an architectural cap. The inception pattern falls out naturally.

### Subagent Coordination

**Default — black-box siblings.** Parallel subagents run in isolation via parallel tool calls in a single turn. Each has its own context, own memory reads/writes. The parent waits for all, reads findings, proceeds. Correct when skill prose declares independence.

**Opt-in — parent peek.** The parent can `cat` a child's output file mid-flight. Used for operational visibility on long-running subagents. Not coordination.

**Never — shared sibling scratchpad.** If two skills need to share state, they shouldn't be siblings — one should nest inside the other.

**Indirect coordination via memory.** Siblings can be aware of each other's durable observations through the memory graph. When one writes to `memory/correlations/tech-sector.md` before returning, another reading that file sees the update. Memory discipline (write only durable observations, not intermediate reasoning) keeps sibling awareness constrained to quality-threshold observations.

---

## The Harness

The harness is a `create_agent` loop from LangChain v1 with exactly two tools: `bash` and `spawn_agent`. Nothing else built in. No middleware stack. No framework-enforced control flow.

### The Two Tools

**`bash(command: str)`** — run a shell command in the workspace. The agent uses this for everything that isn't delegation: reading files, running skill scripts, querying and updating memory, searching with grep, writing output. One tool covers the entire filesystem and computational surface.

**`spawn_agent(skill_path: str, task: str, data: dict)`** — delegate a skill to a subagent. The tool reads the SKILL.md at `skill_path`, creates a fresh `create_agent` with the skill content injected into its system prompt, invokes it with the task and data, and returns the path to the subagent's output file.

That's the entire API the agent sees. Two tools.

### Agents Are Uniform

Every agent — the root, a subagent, a sub-subagent — is a `create_agent` built by the same `build_agent` function, with the same two tools, the same harness prompt, and a skill injected into the system prompt. There is no "root agent" vs "subagent" distinction in code. They differ only in which skill is injected and what task they received.

This means recursion is literally the same code path spawning itself. A deep nested trade-generation workflow is the same function called recursively with different skills.

### System Prompt Structure

```
[HARNESS — stable across all agents]
You are an agent navigating a skill graph via bash and spawn_agent.

Your tools:
- bash: execute shell commands in /workspace
- spawn_agent(skill_path, task, data): delegate a skill to a subagent

The workspace:
- skills/ — domain knowledge (read-only)
- memory/ — accumulated observations (read-write)
- data/ — shared data snapshots (read-only)
- work/<run_id>/ — your scratch space (read-write)

Navigation protocol:
- Your current skill is below; its prose tells you how to proceed
- Wikilinks [[x]] refer to skills/x/SKILL.md
- Traverse a wikilink via spawn_agent when judged relevant
- The tool will inject the linked skill into the subagent's prompt —
  don't cat it yourself
- Issue multiple spawn_agent calls in one turn to parallelize
  independent siblings
- Terminal conditions ("if X, return early") stop traversal at your level
- Before reasoning, check relevant memory via bash
  (grep, cat memory/...)
- Before returning, append durable observations to memory via
  bash (echo >> memory/...)
- Write your output to work/<run_id>/sub_<id>/output.md
- Say "DONE" when ready

[CURRENT SKILL — injected per spawn]
<skill>
{skill_content}
</skill>

[TASK — from parent]
<task>
{task_description}
</task>
```

The harness section is identical across all agents. The skill section is what the parent's `spawn_agent` call injected. The task section is what the parent wants done. The agent's first user message carries the data payload.

### Parallelism

The agent parallelizes by issuing multiple `spawn_agent` calls in a single turn. `create_agent` natively executes parallel tool calls concurrently. No separate batch primitive needed — the model learns to issue multiple spawns when the skill prose says "these are independent."

### Memory Maintenance

Write-on-execute lives in the harness prompt and in individual skill prose. Before returning, the agent appends observations to the relevant memory page via `echo >> memory/...`. No enforcement in code. If observed unreliability emerges, add a middleware hook later.

Periodic lint — contradictions, stale claims, orphans, dangling wikilinks — runs as a separate scheduled agent invoked against the memory graph. Same harness, different skill pointed at `skills/memory-lint/SKILL.md`. It opens PRs against the skills repo when patterns warrant skill edits.

---

## Implementation

LangChain v1's `create_agent` from `langchain.agents` is the core. `@tool` decorators from `langchain.tools` for the two tools. LangGraph's checkpointer for durable execution. Nothing else.

The entire harness is ~300 lines of Python.

### Directory Layout

```
/workspace
├── skills/                     # authored expertise (git-tracked)
├── memory/                     # agent-maintained experience (git-tracked)
├── data/                       # shared data snapshots (ephemeral, gitignored)
├── work/                       # per-run artifacts (ephemeral)
│   └── run_<id>/
│       ├── trace.jsonl
│       ├── answer.md
│       └── sub_<uuid>/
│           ├── output.md
│           └── trace.jsonl
└── src/library/
    ├── bash_tool.py            # ~40 lines
    ├── spawn_agent_tool.py     # ~60 lines
    ├── harness.py              # ~50 lines
    ├── prompts.py              # ~50 lines
    ├── runtime.py              # ~40 lines
    └── validation.py           # ~60 lines
```

### `bash_tool.py`

```python
import subprocess
from langchain.tools import tool
from pathlib import Path

WORKSPACE = Path("/workspace")
TIMEOUT_SEC = 120
MAX_OUTPUT_CHARS = 8192

@tool
def bash(command: str) -> str:
    """Run a shell command in the workspace.

    Use for reading skills (cat), searching memory (grep), running
    skill scripts (python skills/X/scripts/Y.py), writing to memory
    (echo >> memory/...), and any other filesystem or computational task.

    Working directory is /workspace. Timeout 120 seconds. Output
    truncated at 8192 chars.
    """
    try:
        result = subprocess.run(
            command,
            shell=True,
            cwd=WORKSPACE,
            capture_output=True,
            text=True,
            timeout=TIMEOUT_SEC,
        )
        output = (result.stdout or "") + (result.stderr or "")
        if len(output) > MAX_OUTPUT_CHARS:
            output = output[:MAX_OUTPUT_CHARS] + "\n[...output truncated]"
        return output or f"(exit {result.returncode}, no output)"
    except subprocess.TimeoutExpired:
        return f"[command timed out after {TIMEOUT_SEC}s]"
    except Exception as e:
        return f"[error: {e}]"
```

### `spawn_agent_tool.py`

```python
import json
import uuid
from pathlib import Path
from langchain.tools import tool
from langchain.tools.runtime import ToolRuntime
from library.harness import build_agent

WORKSPACE = Path("/workspace")

@tool
def spawn_agent(
    skill_path: str,
    task: str,
    data: dict,
    runtime: ToolRuntime,
) -> str:
    """Delegate a skill to a subagent.

    The skill file at skill_path is read and injected into the subagent's
    system prompt. The subagent runs with the same harness (bash and
    spawn_agent tools) and writes its finding to an output file.

    Args:
        skill_path: path to a SKILL.md (e.g. "skills/position-sizing/SKILL.md")
        task: what this subagent should do, in natural language
        data: curated data slice for the subagent

    Returns:
        Path to the subagent's output file. Read it with bash `cat` to
        get the finding.
    """
    skill_content = (WORKSPACE / skill_path).read_text()

    run_id = runtime.context["run_id"]
    sub_id = uuid.uuid4().hex[:8]
    output_path = f"work/{run_id}/sub_{sub_id}/output.md"
    (WORKSPACE / f"work/{run_id}/sub_{sub_id}").mkdir(parents=True, exist_ok=True)

    subagent = build_agent(
        skill_content=skill_content,
        task=task,
        run_id=run_id,
        sub_id=sub_id,
    )

    user_msg = (
        f"Task: {task}\n\n"
        f"Data:\n```json\n{json.dumps(data, indent=2)}\n```\n\n"
        f"Write your finding to {output_path} and say DONE when complete."
    )

    subagent.invoke({"messages": [{"role": "user", "content": user_msg}]})

    return output_path
```

### `harness.py`

```python
from langchain.agents import create_agent
from langchain.chat_models import init_chat_model

from library.bash_tool import bash
from library.spawn_agent_tool import spawn_agent
from library.prompts import HARNESS_PROMPT_TEMPLATE

def build_agent(
    skill_content: str,
    task: str,
    run_id: str,
    sub_id: str | None = None,
    model: str = "anthropic:claude-opus-4-7",
):
    """Build a create_agent scoped to a single skill.

    Used for the root agent (sub_id=None) and all subagents uniformly.
    The skill content is injected into the system prompt. The agent
    receives the task and data via the first user message from the caller.
    """
    system_prompt = HARNESS_PROMPT_TEMPLATE.format(
        skill_content=skill_content,
        task=task,
        run_id=run_id,
    )

    return create_agent(
        model=init_chat_model(model),
        tools=[bash, spawn_agent],
        system_prompt=system_prompt,
        context_schema={"run_id": run_id, "sub_id": sub_id},
    )
```

### `runtime.py`

```python
import json
import uuid
from datetime import datetime
from pathlib import Path
from langchain_core.callbacks import BaseCallbackHandler
from library.harness import build_agent

WORKSPACE = Path("/workspace")

def run_workflow(workflow_path: str, request: str) -> dict:
    """Entry point: run a workflow against a user request.

    Args:
        workflow_path: path to workflow SKILL.md, e.g.
            "skills/trade-generation/SKILL.md"
        request: the user's natural-language request

    Returns:
        {"run_id": ..., "answer_path": ..., "trace_path": ...}
    """
    run_id = uuid.uuid4().hex[:8]
    run_dir = WORKSPACE / f"work/run_{run_id}"
    run_dir.mkdir(parents=True, exist_ok=True)

    workflow_content = (WORKSPACE / workflow_path).read_text()

    root_agent = build_agent(
        skill_content=workflow_content,
        task=request,
        run_id=run_id,
    )

    answer_path = f"work/run_{run_id}/answer.md"
    user_msg = (
        f"Request: {request}\n\n"
        f"Write your final answer to {answer_path} and say DONE when ready."
    )

    root_agent.invoke(
        {"messages": [{"role": "user", "content": user_msg}]},
        config={"callbacks": [TraceHandler(run_id)]},
    )

    return {
        "run_id": run_id,
        "answer_path": str(WORKSPACE / answer_path),
        "trace_path": str(run_dir / "trace.jsonl"),
    }


class TraceHandler(BaseCallbackHandler):
    """Appends every tool call to work/run_<id>/trace.jsonl."""

    def __init__(self, run_id: str):
        self.trace_path = WORKSPACE / f"work/run_{run_id}/trace.jsonl"

    def on_tool_start(self, serialized, input_str, **kwargs):
        event = {
            "ts": datetime.utcnow().isoformat(),
            "type": "tool_call",
            "tool": serialized.get("name"),
            "input": input_str,
            "run_id": kwargs.get("run_id"),
            "parent_run_id": kwargs.get("parent_run_id"),
        }
        with open(self.trace_path, "a") as f:
            f.write(json.dumps(event) + "\n")
```

### `validation.py`

```python
import json
import re
from pathlib import Path

WORKSPACE = Path("/workspace")

DESK_RULES = {
    "long-only-equity": {
        "mandatory": {"compliance-check", "risk-limits", "mandate-check"},
        "forbidden": {"leverage-calc", "short-locate"},
    },
    "global-macro": {
        "mandatory": {"compliance-check", "risk-limits", "currency-hedge"},
        "forbidden": set(),
    },
}

def validate_run(run_id: str, desk: str) -> dict:
    """Post-run validation against the trace.

    Extracts skills visited (from spawn_agent calls and bash reads)
    and checks against desk rules.
    """
    trace_path = WORKSPACE / f"work/run_{run_id}/trace.jsonl"
    events = [json.loads(l) for l in trace_path.read_text().splitlines()]

    spawns = [e for e in events if e["tool"] == "spawn_agent"]
    bash_cmds = [e for e in events if e["tool"] == "bash"]

    visited = set()
    for s in spawns:
        inp = json.loads(s["input"]) if isinstance(s["input"], str) else s["input"]
        path = inp.get("skill_path", "")
        name = parse_skill_name(path)
        if name:
            visited.add(name)

    graph_skills = {p.parent.name for p in (WORKSPACE / "skills").rglob("SKILL.md")}
    rules = DESK_RULES[desk]

    errors = []
    missed = rules["mandatory"] - visited
    if missed:
        errors.append(f"Missed mandatory skills: {missed}")

    forbidden_used = visited & rules["forbidden"]
    if forbidden_used:
        errors.append(f"Used forbidden skills: {forbidden_used}")

    hallucinated = visited - graph_skills
    if hallucinated:
        errors.append(f"Skills not in graph: {hallucinated}")

    return {
        "valid": not errors,
        "errors": errors,
        "visited_skills": sorted(visited),
        "spawn_count": len(spawns),
        "bash_count": len(bash_cmds),
    }

def parse_skill_name(path: str) -> str | None:
    m = re.match(r"skills/([^/]+)/SKILL\.md", path)
    return m.group(1) if m else None
```

### Invocation

```python
from library.runtime import run_workflow
from library.validation import validate_run

result = run_workflow(
    workflow_path="skills/trade-generation/SKILL.md",
    request="Buy 100bps AAPL for the growth fund",
)

validation = validate_run(result["run_id"], desk="long-only-equity")

if validation["valid"]:
    # Send to OMS
    answer = open(result["answer_path"]).read()
else:
    # Flag for human review
    ...
```

The harness is generic. Trade generation, portfolio rebalancing, risk reporting are all just different workflow SKILL.md files passed as `workflow_path`. No per-workflow Python modules.

---

## Tradeoffs

RLM + skill graph wins for multi-factor domain workflows, long-horizon temporal reasoning, auditable finance workflows, and self-improving systems.

Wrong fit for short single-skill procedures where harness overhead exceeds benefit, tasks where integrated reasoning across sub-boundaries loses information, and high-throughput low-latency work where REPL iteration is too slow.

The Prime Intellect math-python ablation showed RLM hurting performance where the task didn't need scaffolding. Simple procedural tasks should use a plain `create_agent` without this harness.

---

## Design Principles

**Two tools, nothing else.** `bash` and `spawn_agent` are the entire surface. No middleware stack, no filesystem tool suite, no skill registry. The shell is the primitive.

**Context is environment.** Skills, memory, data live on disk. The agent's prompt contains only the harness instructions, the currently scoped skill, the task, and whatever the agent surfaced via bash.

**Skill injection at spawn.** When delegating, the parent's `spawn_agent` reads the skill and injects its content into the subagent's system prompt. The subagent starts reasoning immediately — it does not cat its own skill.

**Agents are uniform.** Root and subagents are built by the same function, with the same tools and prompt structure. Recursion is the same code path spawning itself.

**Prose is the routing mechanism.** Wikilinks carry conditionals, parallelism hints, mandatory markers, terminal conditions. Natural language is the control flow.

**Recursion is unbounded.** No architectural depth cap. Token budget bounds it.

**Black-box siblings, peek-able children.** Parallel siblings don't share state. Parents can peek at children's output files for observability. Memory is the principled channel for durable cross-sibling observations.

**Memory evolves autonomously. Skills evolve through human review.** Subagents write durable observations before returning. A periodic lint agent proposes skill edits from memory patterns; humans review and merge.

**Every call is auditable.** The trace.jsonl captures every bash command and spawn_agent call. Replayable, diffable, RL-training substrate.

**The harness doesn't change.** Better models navigate the same graphs more intelligently. The ~300 lines of Python stay the same. Skills evolve, memory grows.

---

## System

```
┌────────────────────────────────────────────────────┐
│  Filesystem (environment)                          │
│                                                    │
│  skills/        memory/        data/               │
│  └── *.md +     └── *.md       └── snapshots       │
│      scripts/                                      │
│                                                    │
│  work/run_<id>/                                    │
│  ├── answer.md                                     │
│  ├── trace.jsonl                                   │
│  └── sub_<uuid>/output.md                          │
└───────────────────┬────────────────────────────────┘
                    │
                    │ subprocess bash (cwd=workspace)
                    ▼
┌────────────────────────────────────────────────────┐
│  Agent (create_agent)                              │
│                                                    │
│  Prompt: harness + injected skill + task           │
│  Tools: bash, spawn_agent                          │
│  Message loop until DONE                           │
└────────┬───────────────────────────────────────────┘
         │
         │ spawn_agent(skill_path, task, data)
         │   → reads skill, injects into new create_agent
         │   → recursive: same build_agent function
         ▼
┌────────────────────────────────────────────────────┐
│  Subagent (create_agent)                           │
│                                                    │
│  Same harness + different skill injected           │
│  Can spawn further subagents (unbounded depth)     │
│  Writes output to disk, parent reads via bash      │
└────────────────────────────────────────────────────┘
```
