# Skill Graph Architecture

## Why Not a Single Skill File

A single SKILL.md works for procedures — fixed steps, one consumer, no branching. It breaks when the domain has depth. A trade generation file starts at 2,000 tokens, then you add multi-leg coordination, concentration classification edge cases, currency hedging rules, and it hits 15,000. Every request pays the cost of the most complex case. A simple AAPL buy loads currency hedging instructions it will never use.

The deeper problem: a flat file can’t express variable-depth reasoning. When a Japan-to-Korea rotation requires composing concepts — concentration classification interacting with benchmark provider rules interacting with FX hedging policy — in ways the author never anticipated, there’s no path to follow.

-----

## Skill Graphs

A skill graph decomposes domain knowledge into atomic skill files connected by `[[wikilinks]]` embedded in prose. Each file is one complete concept. The links tell the agent when and why to follow a connection.

A skill is a folder with a markdown file and optional scripts:

```
position-sizing/
  SKILL.md
  scripts/
    kelly.py
    adv_check.py
```

The markdown reads as domain knowledge with embedded routing logic:

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

The prose *is* the control flow. “For illiquid names” is a conditional. “Non-negotiable” (in a compliance reference) is a mandatory marker. “These can be evaluated independently” signals parallelism. No metadata, no YAML edge types, no configuration. Natural language carries the routing logic.

A workflow entry point is just another skill file — a guided reasoning narrative with links to atomic skills:

```markdown
# Trade Generation

When a PM submits a trade intent, first understand what
they're asking through [[intent-parsing]].

Check [[portfolio-state]] and verify permissibility under
[[mandate-check]]. These can be evaluated independently.

Size via [[position-sizing]], which will pull in
[[vol-regime]], [[correlation-check]], and
[[execution-routing]] as the situation demands.

The sized trade must pass [[risk-limits]]. For multi-leg
rotations, [[multi-leg]] coordinates across legs.

[[compliance-check]] is non-negotiable. Format via
[[order-format]] for OMS submission.
```

**When to use a graph vs a single file:** if a skill is a procedure (fixed steps, one consumer), keep it as one file. If it’s a domain (interacting concepts, multiple consumers, variable depth), decompose it into a graph.

-----

## Two Graphs

The system operates over two separate graphs stored as directories of markdown files.

**Skill graph** — authored expertise. How to size positions, what risk limits mean, when to hedge currency. Changes slowly through human-reviewed edits. The textbook.

**Memory graph** — accumulated experience. AAPL-MSFT correlation spiked during the last sell-off. This PM sizes aggressively on semis. Korea concentration cleared under FTSE in 12 of 12 rotations this quarter. Changes constantly, maintained by the agent from its own execution. The notebook.

```
skills/                          memory/
  trade-generation/                correlations/
    index.md                         tech-sector.md
  position-sizing/                 regimes/
    SKILL.md                         current-regime.md
    scripts/kelly.py               pm-patterns/
  vol-regime/                        desk-alpha.md
    SKILL.md                       index.md
  risk-limits/                     log.md
    SKILL.md
    scripts/risk_calc.py
  compliance-check/
    SKILL.md
```

They connect at runtime. The skill tells the agent *how* to reason. The memory tells it *what’s been observed*. Both are markdown with wikilinks. Both live on the filesystem. Both are navigated the same way.

They have different trust levels. A skill file has been authored and reviewed — it’s instruction. A memory file has been compiled by the agent — it’s context that might be wrong or stale. Sub-agents treat them differently.

They evolve at different rates. Memory updates autonomously after every execution. Skills update through human-reviewed proposals informed by accumulated memory patterns.

-----

## Execution Model

The execution model is based on Recursive Language Models (Zhang et al., 2025). Agents run in loop with access to a sandboxed REPL environment — Python and bash with filesystem access to the skill and memory directories. There is no framework, no orchestrator, no typed primitives. The REPL is the primitive. Everything the agent needs to do is just code:

- Reading a skill: `cat skills/position-sizing/SKILL.md`
- Running a script: `python skills/position-sizing/scripts/kelly.py`
- Querying memory: `cat memory/correlations/tech-sector.md`
- Updating memory: `echo "## 2026-04-11\nCorrelation at 0.87..." >> memory/correlations/tech-sector.md`
- Calling a sub-agent: an API call from the REPL
- Parallelizing: batch API calls

### Root Agent

The root agent receives a request and a workflow entry point. It loops — writing code, observing output, writing more code — until it sets `answer["ready"] = True`. Its scope is the whole workflow. It reads skills, navigates the graph, dispatches sub-agents for domain reasoning, curates data handoffs between them, and assembles the final output.

### Sub-Agents

The root agent spawns sub-agents scoped to one skill. A sub-agent also loops — it reads its skill file, checks relevant memory, runs scripts, reasons, and updates memory with what it observed before returning its finding to the root agent.

The difference between root and sub-agent is scope and termination. Root loops until `answer["ready"] = True` and owns the workflow. Sub-agent loops until it returns a result and owns one skill. Both have REPL access. Both can read files, run scripts, write code, iterate.

### How It Looks

```python
# Root agent — navigating the skill graph

workflow = open("skills/trade-generation/index.md").read()

# Reads prose, identifies intent-parsing is first
intent = sub_agent(
    skill="skills/intent-parsing/SKILL.md",
    data={"request": pm_request}
)

# Prose says portfolio-state and mandate-check are independent
portfolio, mandate = parallel_sub_agents([
    {"skill": "skills/portfolio-state/SKILL.md"},
    {"skill": "skills/mandate-check/SKILL.md", 
     "data": {"instrument": "AAPL"}},
])

# Reads position-sizing skill, sees it references kelly.py
# Runs the script directly — no sub-agent needed for computation
kelly = subprocess.run(["python", 
    "skills/position-sizing/scripts/kelly.py",
    "--signal", "0.6", "--win-rate", "0.55"])

# Dispatches sub-agent for vol-regime reasoning
vol = sub_agent(
    skill="skills/vol-regime/SKILL.md",
    data={"market": market_data}
)

# Reads prose, judges correlation-check isn't needed for AAPL
# Skips it — agent's decision based on context

# Compliance is "non-negotiable" per workflow prose
compliance = sub_agent(
    skill="skills/compliance-check/SKILL.md",
    data={"position": sized_position}
)

answer["content"] = format_order(...)
answer["ready"] = True
```

```python
# Sub-agent — scoped to position-sizing

# 1. Read the skill
skill = open("skills/position-sizing/SKILL.md").read()

# 2. Check relevant memory
sector_mem = open("memory/correlations/tech-sector.md").read()
regime_mem = open("memory/regimes/current-regime.md").read()

# 3. Run computation
kelly = subprocess.run(["python", "scripts/kelly.py", ...])

# 4. Reason: "Kelly says 150bps, regime caps at 100bps,
#    correlation is low so no reduction needed. 
#    Binding constraint: regime cap."

# 5. Update memory with observation
with open("memory/correlations/tech-sector.md", "a") as f:
    f.write(f"\n## {timestamp}\n"
            f"AAPL-MSFT correlation at 0.41. "
            f"Low — no sizing adjustment needed.\n")

# 6. Return to root
return {
    "size_bps": 100,
    "binding_constraint": "regime_cap",
    "reasoning": "..."
}
```

### Depth

Depth is emergent, not configured. The same workflow entry point leads to shallow traversal for a simple AAPL buy and deep traversal for a complex rotation. Three things control depth naturally:

**Skill prose.** Authors frame links with context: “for more granular regime detection, see [[regime-detection-advanced]] — rarely needed for standard sizing.” The agent reads “rarely needed” and usually stops.

**Request context.** The root agent knows the original request. A simple buy doesn’t warrant deep investigation. A request that says “vol surface looks strange” does.

**REPL iteration limits.** A safety net, not the primary mechanism.

### Data Flow

Shared data (portfolio holdings, market data) is fetched once by the root agent and stored as a variable. Each sub-agent receives the relevant slice — the root agent curates the handoff based on what the skill prose says it needs. Sub-agent findings are stored as root-agent variables for downstream use. Nothing gets buried — all results persist in the root’s namespace. Nothing gets bloated — each sub-agent gets only what it needs.

For unchanged data across time steps, the root agent checks programmatically:

```python
econ_hash = hashlib.md5(fetch("econ-indicators")).hexdigest()
if prior_checkpoint and econ_hash == prior_checkpoint["econ_hash"]:
    econ = prior_checkpoint["econ_analysis"]  # skip re-analysis
```

-----

## Memory Maintenance

The memory graph evolves through three operations, following the LLM wiki pattern (Karpathy, 2026):

**Write-on-execute.** Every sub-agent reads relevant memory before reasoning and writes observations back before returning. Memory updates are a natural part of skill execution, not a separate maintenance job. The tech-sector correlation page gets a new entry every time a sub-agent processes a tech trade. Memory compounds one atomic execution at a time.

**Lint.** Periodically, a maintenance agent audits the memory graph. Which pages contradict each other? Which observations are stale? Which concepts are referenced but lack their own page? Which pages have no inbound links? This keeps the memory graph healthy as it grows.

**Propose skill edits.** When memory accumulates enough observations that a pattern becomes a principle — “Korea concentration cleared under FTSE in 12 of 12 rotations” — the system proposes an edit to the relevant skill file. A human reviews and approves. Memory evolves autonomously. Skills evolve through human-supervised proposals informed by memory.

```
Execution traces
    ↓ automatic
Memory graph updates (by sub-agents)
    ↓ pattern detection
Proposed skill edits
    ↓ human review
Skill graph updates
```

-----

## Validation

The REPL trajectory is the audit trail. Every file read, every script execution, every sub-agent call is in the code history.

```python
def validate(trajectory, workflow):
    files_read = extract_file_reads(trajectory)
    mandatory = workflow.get_mandatory_nodes()  # parsed from "non-negotiable" etc
    visited = {parse_skill_name(f) for f in files_read}
    
    graph_files = list_all_skill_files()

    return {
        "valid": mandatory <= visited and not (visited - graph_files),
        "missed_mandatory": mandatory - visited,
        "out_of_bounds": visited - graph_files,
        "trajectory": trajectory,
    }
```

**Mandatory nodes missed** — the agent skipped compliance-check. Caught before the output reaches production.

**Out-of-bounds access** — the agent read a file outside the skill graph. It hallucinated a source of authority.

**Desk-specific constraints** — different mandates enforce different rules over the same graph:

```python
DESK_RULES = {
    "long-only-equity": {
        "mandatory": {"compliance-check", "risk-limits"},
        "forbidden": {"leverage-calc", "short-locate"},
    },
}
```

Each sub-agent call is a discrete record — which skill, what data, what response. Replayable, diffable, auditable. The foundation for validation, compliance, and the self-improvement loop.

-----

## Design Principles

**The harness is a sandbox.** Agents run in loops with REPL access to a filesystem of markdown and scripts. No framework, no orchestrator, no typed primitives. The REPL is the primitive.

**Two graphs, one navigation pattern.** Skills (authored expertise) and memory (accumulated experience) are both markdown with wikilinks, both on the filesystem, both navigated by agents writing code.

**Prose is the routing mechanism.** Wikilinks in reasoning prose carry conditionals, parallelism hints, mandatory markers, and depth gates. Natural language is the control flow.

**Depth is emergent.** Driven by request complexity interacting with skill prose framing and agent judgment. Not configured.

**Sub-agents own memory.** Each sub-agent reads relevant memory before reasoning and writes observations back before returning. Memory compounds from atomic executions.

**Skills evolve through human review. Memory evolves autonomously.** The textbook changes deliberately. The notebook changes constantly.

**The harness doesn’t change.** Better models navigate the same graphs more intelligently. The skills evolve. The memory grows. The sandbox stays the same.

-----

## System

```
┌──────────────────────────────────────────────┐
│  Filesystem                                  │
│                                              │
│  skills/          memory/                    │
│  ├── workflow.md  ├── correlations/           │
│  ├── sizing/      ├── regimes/               │
│  │   ├── SKILL.md ├── pm-patterns/           │
│  │   └── scripts/ ├── index.md               │
│  ├── risk/        └── log.md                 │
│  └── ...                                     │
│                                              │
│  Markdown + wikilinks + scripts              │
│  Version controlled in git                   │
└──────────────────┬───────────────────────────┘
                   │
                   │ filesystem access
                   ▼
┌──────────────────────────────────────────────┐
│  Root Agent (REPL loop)                      │
│                                              │
│  Reads workflow, navigates graph in code     │
│  Spawns sub-agents for skill reasoning       │
│  Runs scripts directly for computation       │
│  Curates data between sub-agents             │
│  Loops until answer["ready"] = True          │
└────────┬─────────────────────────────────────┘
         │
         │ spawns
         ▼
┌──────────────────────────────────────────────┐
│  Sub-Agents (REPL loops)                     │
│                                              │
│  Scoped to one skill                         │
│  Reads skill + relevant memory               │
│  Runs skill scripts                          │
│  Updates memory with observations            │
│  Loops until return(result)                  │
└────────┬─────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│  Traces + Validation                         │
│                                              │
│  REPL trajectory = audit trail               │
│  Mandatory node checking                     │
│  Desk-specific constraints                   │
│  Replayable atomic sub-agent records         │
└──────────────────────────────────────────────┘
```