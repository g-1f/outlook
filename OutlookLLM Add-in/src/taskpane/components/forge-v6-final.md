# Forge v6 — Final System Design

## Context-First Multi-Agent System for Discretionary Macro Portfolio Management

---

## 0. Design Evolution

v4.0–4.1: Right intellectual insights (Negative Space, contrastive checking, counterfactual tracking). Wrong architecture — rigid 10+ LLM call pipeline.

v5.0–5.2: Correct leap to agent-first. Filesystem abstraction. 5 tools. But dropped the intellectual rigor. No context engineering discipline.

v5.3: Restored v4.1's rigor into v5.2's architecture. Same 5 tools. But: monolithic planning via batch `delegate()`, sub-agent results overloading Agent context, context engineering classified as scaffolding, Agent both orchestrates and synthesizes from polluted context.

v5.4 (context-first redesign): Correctly reframed context engineering as permanent infrastructure. Introduced dispatch/collect, compact(), depth-aware reads, integration brief + synthesis sub-agent. But: over-engineered token budgeting (AttentionBudget class, runtime signal density tracking).

**v6 (this document):** Synthesizes v5.3's intellectual rigor with v5.4's execution model. Addresses red team findings:

| Issue | Fix |
|-------|-----|
| Skill interface is bespoke single-file markdown | Adopt Agent Skills open standard (folder-based SKILL.md) |
| No error recovery or graceful degradation | Retry support on dispatch + system prompt failure guidance |
| Dispatch/collect overstates Agent-side concurrency | Honest model: depends_on for mechanical sequencing, collect for adaptive checkpoints |
| Agent conversation accumulates noise | Mitigated by compact() + clean-room synthesis. Known tradeoff, not over-engineered. |
| No semantic search across memory | Dedicated search tool alongside deterministic read |

---

## 1. Principles

### 1.1 The Permanent Layer

```
Memory              Views, Expressions, PK, Calibration, Outcomes,
                    Counterfactuals. The system's accumulated edge.

Tools               Interface with the world. Normalized provider wrappers
                    across data vendors — broker research, econ time series,
                    market data, news, analytics.

Skills              PM's investment process as Agent Skills (open standard).
                    Folder-based: SKILL.md + scripts + templates + references.
                    Evolvable through retrospective. The compounding advantage.

Context Discipline  Attention management. Depth-aware progressive disclosure,
                    clean-room synthesis, Agent self-compression via compact().
                    PERMANENT INFRASTRUCTURE — not scaffolding.

Output Contracts    Stable schemas for downstream consumers. Structured YAML
                    sections within free-form markdown synthesis.

Guardrails          Mechanical risk limits. Code, not intelligence.

Audit Trail         Decision lineage. Structured event log.
```

### 1.2 The Scaffolding Layer (Actually Dissolves)

```
Delegation          Multi-agent decomposition → dissolves as models handle
                    broader scope in single passes.

Validation          Quality annotation → dissolves as model self-consistency
                    improves.

Session Mgmt        Multi-turn state compression → dissolves with native
                    long-context conversations.
```

### 1.3 Invariants

- **Code handles data flow. The LLM handles thinking.** No code draws connections. No LLM manages concurrency.
- **Skills encode process. Code encodes plumbing.** These never cross.
- **Better models → better system, zero code changes.**
- **Defaults enforce good behavior.** The Agent opts out, not in.
- **The plan emerges from reasoning.** Dispatch as you discover. Adapt as results arrive.
- **What you don't know matters.** Structural support for reasoning about gaps.
- **Evolution has a burden of proof.** 5+ corroborations, no contradictions, PM approval.
- **Fail gracefully.** Retry, degrade, flag — never silently drop.

---

## 2. Tool Surface

Each tool serves a distinct role. Not minimized for aesthetics, not expanded without reason.

```
RETRIEVAL
  read(path, depth?, query?)        Deterministic path access. Depth-aware defaults.
  search(scope, query, filters?)    Semantic search across content. Discovery.
  fetch(source, params)             External data via normalized provider wrappers.

EXECUTION
  dispatch(task)                    Start sub-agent. Returns immediately.
                                    Supports depends_on for auto-sequencing.
  collect(target)                   Retrieve results. "id" | "ready" | "all".
  review(output, focus)             Independent adversarial review with tool access.

PERSISTENCE
  write(path, content)              Memory and session writes. Guardrails on Expressions.

ATTENTION
  compact(target, focus)            Re-compress context for specific reasoning purpose.
```

Eight tools. Clean separation of concerns.

---

## 3. Tools — Complete Implementation

### 3.1 read — Depth-Aware Progressive Disclosure

The Agent must explicitly request full reads. Default depth varies by path, making attention hygiene the path of least resistance.

```python
class ReadTool:
    """Deterministic path-based reads with progressive disclosure defaults.

    depth="header"   → lines 1-8 (metadata + summary)    [default: /memory/]
    depth="summary"  → header + SUMMARY section           [default: /session/results/]
    depth="full"     → everything                         [must be explicit]
    """

    DEFAULT_DEPTHS = {
        "/memory/":          "header",
        "/session/results/": "summary",
        "/session/context/": "summary",
        "/skills/":          "full",
        "/portfolio/":       "full",
    }

    TOOL_DEF = {
        "name": "read",
        "description": (
            "Read files and directories by exact path.\n\n"
            "depth controls how much you see:\n"
            "  header  — metadata + summary (default for /memory/)\n"
            "  summary — header + key sections (default for /session/results/)\n"
            "  full    — everything (use for capital decisions)\n\n"
            "Directory reads return listings. Use query for metadata filters:\n"
            "  key:value  since:date  >=N  status:active\n\n"
            "For discovering relevant items across many files, use search() instead."
        ),
        "input_schema": {
            "type": "object",
            "required": ["path"],
            "properties": {
                "path":  {"type": "string"},
                "depth": {"type": "string",
                          "enum": ["header", "summary", "full"]},
                "query": {"type": "string",
                          "description": "Metadata filter for directory listings"},
            },
        },
    }

    def __init__(self, fs: "ForgeFS"):
        self.fs = fs

    async def execute(self, path: str, depth: str = None,
                      query: str = None) -> str:
        if self.fs.is_dir(path):
            entries = self.fs.list_dir(path, query=query)
            return self._format_listing(path, entries)

        if depth is None:
            depth = self._default_depth(path)

        content = self.fs.read_file(path)

        if depth == "header":
            return self._extract_header(content)
        elif depth == "summary":
            return self._extract_summary(content)
        return content

    def _default_depth(self, path: str) -> str:
        for prefix, default in self.DEFAULT_DEPTHS.items():
            if path.startswith(prefix):
                return default
        return "full"

    def _extract_header(self, content: str) -> str:
        lines = content.split("\n")
        header = "\n".join(lines[:8])
        remaining = len(lines) - 8
        if remaining > 0:
            return f"{header}\n[{remaining} more lines — depth='full' to read]"
        return header

    def _extract_summary(self, content: str) -> str:
        header = self._extract_header(content)
        summary = _extract_section(content, "SUMMARY")
        return f"{header}\n\n{summary}" if summary else header

    def _format_listing(self, path: str, entries: list) -> str:
        lines = [f"Directory: {path} ({len(entries)} items)"]
        for e in entries:
            lines.append(f"  {e.name}  {e.meta}")
        return "\n".join(lines)
```

### 3.2 search — Semantic Discovery Across Content

Separate from `read` because the operations are fundamentally different: `read` is "I know what I want," `search` is "help me find what's relevant."

```python
class SearchTool:
    """Semantic search across memory and session content.

    Uses hybrid retrieval: embedding similarity for semantic relevance,
    metadata filters for structured constraints, recency boost for
    freshness.

    Returns ranked results with headers. Use read(path, depth='full')
    to expand any result.
    """

    TOOL_DEF = {
        "name": "search",
        "description": (
            "Semantic search across files in a scope.\n\n"
            "Unlike read() which takes exact paths, search() finds\n"
            "relevant items using meaning, not just keywords.\n\n"
            "  search('/memory/views/', 'consumer weakness themes')\n"
            "  search('/memory/observations/', 'credit spread anomaly')\n"
            "  search('/memory/', 'anything related to V-019')\n"
            "  search('/memory/pk/', 'rate view lessons',\n"
            "         filters='weight>=0.4 since:2026-01')\n\n"
            "Returns ranked results with headers and relevance scores.\n"
            "Use read(path, depth='full') to expand any result."
        ),
        "input_schema": {
            "type": "object",
            "required": ["scope", "query"],
            "properties": {
                "scope":  {"type": "string",
                           "description": "Directory to search within"},
                "query":  {"type": "string",
                           "description": "Natural language search query"},
                "filters": {"type": "string",
                            "description": (
                                "Optional metadata filters: "
                                "key:value since:date >=N"
                            )},
                "max_results": {"type": "integer", "default": 5},
            },
        },
    }

    def __init__(self, fs: "ForgeFS", index: "SearchIndex"):
        self.fs = fs
        self.index = index

    async def execute(self, scope: str, query: str,
                      filters: str = None,
                      max_results: int = 5) -> str:
        results = self.index.search(
            scope=scope, query=query,
            filters=filters, max_results=max_results,
        )

        if not results:
            return f"No results found in {scope} for '{query}'"

        parts = [f"Search: '{query}' in {scope} "
                 f"({len(results)} results)"]
        for r in results:
            header = self.fs.read_lines(r.path, 1, 8)
            parts.append(f"\n  [{r.score:.2f}] {r.path}\n{header}")
        return "\n".join(parts)


class SearchIndex:
    """Hybrid search index over ForgeFS content.

    Components:
    - Embedding index: updated on writes via WriteTool hook
    - Metadata store: structured fields (confidence, status, date)
    - Recency boost: newer items score higher (configurable decay)

    Backend is pluggable — pgvector, ChromaDB, FAISS + SQLite, etc.
    """

    def __init__(self, embedding_model: str, backend: "VectorBackend"):
        self.embedder = EmbeddingModel(embedding_model)
        self.backend = backend

    def upsert(self, path: str, content: str, metadata: dict):
        """Called by WriteTool on every memory write."""
        embedding = self.embedder.encode(content)
        self.backend.upsert(
            id=path, embedding=embedding,
            metadata={**metadata, "updated_at": _now()},
            text=content,
        )

    def search(self, scope: str, query: str,
               filters: str = None,
               max_results: int = 5) -> list["SearchResult"]:
        query_embedding = self.embedder.encode(query)

        parsed_filters = _parse_filters(filters) if filters else {}
        parsed_filters["path_prefix"] = scope

        raw = self.backend.query(
            embedding=query_embedding,
            filters=parsed_filters,
            limit=max_results * 2,  # over-fetch for re-ranking
        )

        # Re-rank: semantic score * recency boost
        for r in raw:
            age_days = (_now() - r.metadata["updated_at"]).days
            recency = 1.0 / (1.0 + age_days / 30.0)
            r.score = r.similarity * 0.7 + recency * 0.3

        raw.sort(key=lambda r: r.score, reverse=True)
        return raw[:max_results]
```

### 3.3 fetch — Normalized Provider Wrappers

Each data vendor gets a provider class behind a uniform interface. Adding a new source is writing one class and registering it in config. The Agent doesn't know or care whether retail sales comes from FRED, Bloomberg, or a CSV.

```python
class FetchTool:
    """External data retrieval via normalized provider wrappers.

    Returns summary in conversation. Full content stored at
    /session/context/ctx_NNN.md for read() access.

    Sources are configurable — the enum is built from registered providers.
    """

    def __init__(self, fs: "ForgeFS", providers: dict):
        self.fs = fs
        self.providers = providers
        self._ctx_counter = 0

    @property
    def TOOL_DEF(self):
        sources = list(self.providers.keys())
        return {
            "name": "fetch",
            "description": (
                "Fetch external data.\n"
                f"Sources: {', '.join(sources)}\n\n"
                "Returns a summary. Full content stored at "
                "/session/context/ctx_NNN.md — use read(depth='full')."
            ),
            "input_schema": {
                "type": "object",
                "required": ["source", "params"],
                "properties": {
                    "source": {"type": "string", "enum": sources},
                    "params": {"type": "object"},
                },
            },
        }

    async def execute(self, source: str, params: dict) -> str:
        provider = self.providers.get(source)
        if not provider:
            return f"Unknown source: {source}. Available: {list(self.providers.keys())}"

        try:
            result = await provider.fetch(**params)
        except Exception as e:
            return f"[FETCH FAILED | {source}] {type(e).__name__}: {e}"

        self._ctx_counter += 1
        ctx_id = f"ctx_{self._ctx_counter:03d}"
        path = f"/session/context/{ctx_id}.md"

        self.fs.write_file(path, result.format_full())
        summary = result.format_summary()
        tokens = _count_tokens(result.format_full())

        return f"[{ctx_id} | {source} | {result.label} | {tokens} tok]\n{summary}"


# Provider registration — config, not code
def _create_providers(config: dict) -> dict:
    return {
        "economic":  FREDProvider(config.get("fred", {})),
        "market":    MarketDataProvider(config.get("market_data", {})),
        "news":      NewsProvider(config.get("news", {})),
        "research":  BrokerResearchProvider(config.get("research", {})),
        "web":       WebSearchProvider(config.get("web", {})),
        "analytics": AnalyticsProvider(config.get("analytics", {})),
    }


class DataProvider:
    """Abstract base. Every provider implements this interface."""
    async def fetch(self, **params) -> "FetchResult":
        raise NotImplementedError

class FetchResult:
    label: str
    def format_full(self) -> str:
        raise NotImplementedError
    def format_summary(self) -> str:
        """~100 tokens. The Agent sees this in conversation."""
        raise NotImplementedError
```

### 3.4 dispatch — Fire and Continue, With Dependencies and Retry

The critical architectural change from v5.3. No batching. The Agent dispatches as it discovers needs.

**Honest concurrency model:** The Agent does not truly reason in parallel with sub-agents. The Anthropic API is request-response — the Agent emits tool calls, the API processes them, results come back. The parallelism is between *sub-agents* (real — multiple run concurrently via asyncio). The Agent can squeeze fast tool calls (fetch, read, write) between dispatches while sub-agents run in the background, but it is not concurrent thinking. The real value of dispatch/collect is **plan adaptation** — dispatching early, collecting results, adapting the remaining plan — not pipelining.

```python
class DispatchTool:
    """Start a sub-agent in the background. Returns immediately.

    depends_on: task IDs this depends on. The executor auto-waits
    for dependencies and injects their summaries as context.
    The Agent doesn't need to manage wave sequencing.

    retry_of: re-dispatch a failed task with simplified context.
    """

    TOOL_DEF = {
        "name": "dispatch",
        "description": (
            "Start a sub-agent in the background. Returns immediately.\n\n"
            "Dispatch tasks as soon as you identify them. Independent "
            "tasks run in parallel. Use depends_on for tasks that need "
            "prior results — the executor handles sequencing.\n\n"
            "Don't batch. Don't over-plan. Dispatch → think → adapt.\n\n"
            "If a task fails, retry with retry_of to re-dispatch "
            "with simplified context.\n\n"
            "Use collect() to retrieve results when needed."
        ),
        "input_schema": {
            "type": "object",
            "required": ["id", "skill", "objective"],
            "properties": {
                "id":          {"type": "string"},
                "skill":       {"type": "string"},
                "objective":   {"type": "string"},
                "context":     {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": (
                        "Context refs: ctx_NNN, V-NNN, task_id, etc. "
                        "Append :summary or :header for less detail."
                    ),
                },
                "notes":       {"type": "string"},
                "depends_on":  {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": (
                        "Task IDs this depends on. Executor auto-waits "
                        "and injects their summaries."
                    ),
                },
                "validate":    {"type": "boolean"},
                "validate_contrastive": {"type": "boolean"},
                "retry_of": {
                    "type": "string",
                    "description": "Task ID to retry (inherits spec, simplified context)",
                },
            },
        },
    }

    def __init__(self, executor: "TaskExecutor"):
        self.executor = executor

    async def execute(self, id: str, skill: str, objective: str,
                      context: list = None, notes: str = None,
                      depends_on: list = None,
                      validate: bool = False,
                      validate_contrastive: bool = False,
                      retry_of: str = None) -> str:

        if retry_of:
            original = self.executor.get_spec(retry_of)
            if original:
                task = Task(
                    id=id, skill=original.skill,
                    objective=original.objective,
                    context=[f"{c}:summary" for c in (original.context or [])],
                    notes=f"RETRY of {retry_of}. Simplified context.\n{original.notes or ''}",
                    depends_on=depends_on,
                    validate=validate,
                    validate_contrastive=validate_contrastive,
                )
            else:
                return f"Cannot retry: {retry_of} not found."
        else:
            task = Task(
                id=id, skill=skill, objective=objective,
                context=context or [], notes=notes,
                depends_on=depends_on or [],
                validate=validate,
                validate_contrastive=validate_contrastive,
            )

        self.executor.submit(task)

        dep_note = ""
        if task.depends_on:
            dep_note = f" | waits for: {', '.join(task.depends_on)}"

        return (
            f"Dispatched: {task.id} | skill: {task.skill}{dep_note}\n"
            f"Use collect('{task.id}') or collect('all') for results."
        )
```

### 3.5 collect — Retrieve Results

```python
class CollectTool:
    """Retrieve results from dispatched tasks.

    Three modes:
      collect("task_id")  → wait for this task, return result
      collect("ready")    → return whatever's done (non-blocking)
      collect("all")      → wait for everything
    """

    TOOL_DEF = {
        "name": "collect",
        "description": (
            "Retrieve dispatched task results.\n\n"
            "  collect('task_id') — wait for a specific task\n"
            "  collect('ready')   — grab whatever's completed\n"
            "  collect('all')     — wait for everything\n\n"
            "Returns summaries. Full outputs at /session/results/<id>.md.\n"
            "Use collect('ready') between dispatches to absorb and adapt.\n\n"
            "Failed tasks show status and error. You can retry them with "
            "dispatch(retry_of='failed_id')."
        ),
        "input_schema": {
            "type": "object",
            "required": ["target"],
            "properties": {
                "target": {"type": "string"},
            },
        },
    }

    def __init__(self, executor: "TaskExecutor"):
        self.executor = executor

    async def execute(self, target: str) -> str:
        if target == "ready":
            completed = self.executor.drain_completed()
            if not completed:
                return "No tasks completed yet."
            return self._format(completed)
        elif target == "all":
            results = await self.executor.wait_all()
            return self._format(results)
        else:
            result = await self.executor.wait_for(target)
            return self._format({target: result})

    def _format(self, results: dict) -> str:
        parts = []
        for tid, r in results.items():
            header = f"── {tid} ({r.status}"
            if r.validation:
                vtype = ("contrastive" if r.validation.contrastive
                         else "validated")
                header += f" | {vtype}: {r.validation.verdict}"
            header += ") ──"

            if r.status == "ok":
                body = r.summary or "(no output)"
                body += f"\n[full: /session/results/{tid}.md]"
            elif r.status == "failed":
                body = f"FAILED: {r.error}\n[retry: dispatch(retry_of='{tid}')]"
            else:
                body = f"ERROR: {r.error}"

            if r.validation and r.validation.feedback:
                body += f"\n[feedback: {r.validation.feedback}]"

            parts.append(f"{header}\n{body}")

        pending = self.executor.pending_count()
        if pending:
            parts.append(f"({pending} tasks still running)")

        return "\n\n".join(parts)
```

### 3.6 review — Independent Adversarial Review

Fresh LLM session with tool access. Reviewer has portfolio, calibration, PK context and can read memory and fetch data independently.

```python
class ReviewTool:
    """Independent adversarial review. Fresh context.

    Reviewer gets: output, focus, portfolio, calibration, relevant PK.
    Reviewer tools: read (memory), fetch (external data).
    Does NOT see Agent's retrieval context — fresh perspective.
    """

    TOOL_DEF = {
        "name": "review",
        "description": (
            "Request adversarial review of a proposed output.\n"
            "Use for Expressions (mandatory) and when you want a "
            "fresh perspective to challenge your reasoning.\n\n"
            "The reviewer independently accesses memory and data.\n"
            "Returns verdict + reasoning."
        ),
        "input_schema": {
            "type": "object",
            "required": ["output", "focus"],
            "properties": {
                "output": {"type": "string"},
                "focus":  {"type": "string"},
            },
        },
    }

    def __init__(self, llm, fs: "ForgeFS", config: dict):
        self.llm = llm
        self.fs = fs
        self.config = config

    async def execute(self, output: str, focus: str) -> str:
        portfolio = self.fs.read_file("/portfolio/state.md")
        calibration = self._relevant_calibration(output)
        pk_context = self._relevant_pk(output, focus)

        context = (
            f"OUTPUT TO REVIEW:\n{output}\n\n"
            f"REVIEW FOCUS:\n{focus}\n\n"
            f"PORTFOLIO:\n{portfolio}\n"
        )
        if calibration:
            context += f"\nCALIBRATION:\n{calibration}\n"
        if pk_context:
            context += f"\nPROCESS KNOWLEDGE:\n{pk_context}\n"

        reviewer_tools = [
            ReadTool(self.fs).TOOL_DEF,
            FetchTool(self.fs, self.config.get("providers", {})).TOOL_DEF,
        ]

        response = await self.llm.call(
            model=self.config.get("review_model", "opus"),
            system=REVIEW_PROMPT,
            user=context,
            tools=reviewer_tools,
        )
        return response.text

    def _relevant_calibration(self, output: str) -> str | None:
        for cat in ["macro_regime", "relative_value", "vol_surface",
                     "event_driven", "flow_driven", "thematic"]:
            if cat.replace("_", " ") in output.lower():
                path = f"/memory/calibration/{cat}.md"
                if self.fs.exists(path):
                    return self.fs.read_file(path)
        return None

    def _relevant_pk(self, output: str, focus: str) -> str | None:
        pks = self.fs.list_dir("/memory/pk/", query="weight>=0.4")
        relevant = []
        for pk in pks:
            header = self.fs.read_lines(f"/memory/pk/{pk.name}", 1, 6)
            if any(w in header.lower()
                   for w in focus.lower().split() if len(w) > 3):
                relevant.append(header)
        return "\n---\n".join(relevant[:5]) if relevant else None


REVIEW_PROMPT = """\
You are reviewing a proposed output before capital is committed.
Your job is adversarial — find what's wrong, missing, or overconfident.

You have tools: read() for memory, fetch() for external data.
USE THEM. Don't just review what's in front of you — investigate.

Be specific. State what you'd change and why.

VERDICT: approve / approve_with_notes / revise / escalate
If revising: state EXACTLY what needs to change."""
```

### 3.7 write — With Side Effects, Guardrails, and Search Index Updates

```python
class WriteTool:
    """Write to memory or session. Path determines behavior.

    Side effects:
    - Expression close → auto-record Outcome
    - Expression reject → auto-record Counterfactual
    - View invalidate → flag linked Expressions
    - Any memory write → update search index
    """

    TOOL_DEF = {
        "name": "write",
        "description": (
            "Write to memory or session.\n"
            "  /memory/views/V-NNN.md       — create/update View\n"
            "  /memory/expressions/E-NNN.md — create/update Expression\n"
            "  /memory/observations/new.md  — create Observation\n"
            "  /memory/pk/new.md            — create ProcessKnowledge\n"
            "  /memory/counterfactuals/new.md — record untaken decision\n"
            "  /session/tasks.md            — task log\n"
            "  /session/context/gaps.md     — Negative Space assessment\n"
            "  /session/integration_brief.md — editorial guidance\n"
            "Use 'new.md' for auto-assigned IDs."
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

    def __init__(self, fs: "ForgeFS", guardrails: "Guardrails",
                 search_index: "SearchIndex" = None):
        self.fs = fs
        self.guardrails = guardrails
        self.search_index = search_index

    async def execute(self, path: str, content: str) -> str:
        category = _path_to_category(path)
        parsed = _parse_content(content, category)

        # Auto-version
        if category in ("views", "expressions") and self.fs.exists(path):
            self.fs.archive(path)

        # Guardrails on Expressions
        if category == "expressions":
            violations = self.guardrails.check(parsed)
            if violations:
                return "GUARDRAIL VIOLATIONS:\n" + "\n".join(
                    f"  [{v.severity}] {v.rule}: {v.actual} (limit: {v.limit})"
                    for v in violations
                )

        # Auto-ID
        if path.endswith("/new.md"):
            item_id = self.fs.next_id(category)
            path = path.replace("new.md", f"{item_id}.md")

        # Side effects
        if category == "expressions" and parsed.get("status") == "closed":
            self._auto_outcome(path, parsed)
        if category == "views" and parsed.get("status") == "invalidated":
            self._flag_linked_expressions(parsed)
        if category == "expressions" and parsed.get("status") == "rejected":
            self._auto_counterfactual(path, parsed)

        self.fs.write_file(path, content)

        # Update search index for memory writes
        if path.startswith("/memory/") and self.search_index:
            metadata = {k: v for k, v in parsed.items()
                        if isinstance(v, (str, int, float))}
            self.search_index.upsert(path, content, metadata)

        return f"Written: {path}"

    def _auto_outcome(self, path, parsed):
        outcome_id = self.fs.next_id("outcomes")
        self.fs.write_file(
            f"/memory/outcomes/{outcome_id}.md",
            f"# {outcome_id}\n"
            f"view: {parsed.get('view_id', '')}\n"
            f"expression: {_id_from_path(path)}\n"
            f"status: {parsed.get('exit_reason', 'closed')}\n"
            f"closed_at: {_now()}\n---\n\n"
            f"Entry: {parsed.get('entry_details', 'N/A')}\n"
            f"Exit: {parsed.get('exit_details', 'N/A')}\n"
            f"PnL: {parsed.get('pnl', 'pending')}\n"
        )

    def _flag_linked_expressions(self, view):
        for expr_id in view.get("expressions", []):
            path = f"/memory/expressions/{expr_id}.md"
            if self.fs.exists(path):
                content = self.fs.read_file(path).replace(
                    "status: active", "status: review_required")
                self.fs.write_file(path, content)

    def _auto_counterfactual(self, path, parsed):
        cf_id = self.fs.next_id("counterfactuals")
        self.fs.write_file(
            f"/memory/counterfactuals/{cf_id}.md",
            f"# {cf_id}\ndecision_type: rejected_expression\n"
            f"expression: {_id_from_path(path)}\n"
            f"reason: {parsed.get('rejection_reason', 'PM rejected')}\n"
            f"reference_date: {_now()}\nstatus: tracking\n"
        )
```

### 3.8 compact — Agent Self-Managed Attention

```python
class CompactTool:
    """Re-compress context for a specific reasoning purpose.

    Uses Haiku for speed — compression is straightforward.
    The Agent decides when its context is noisy. This is the
    primary mitigation for conversation accumulation.
    """

    TOOL_DEF = {
        "name": "compact",
        "description": (
            "Re-compress context for your current reasoning purpose.\n\n"
            "  compact('session_history', 'decisions affecting rates')\n"
            "  compact('sa_growth', 'just the confidence change')\n"
            "  compact('all_results', 'summary table for integration')\n\n"
            "Use before high-stakes reasoning to clear noise."
        ),
        "input_schema": {
            "type": "object",
            "required": ["target", "focus"],
            "properties": {
                "target": {"type": "string"},
                "focus":  {"type": "string"},
            },
        },
    }

    def __init__(self, llm, fs: "ForgeFS"):
        self.llm = llm
        self.fs = fs

    async def execute(self, target: str, focus: str) -> str:
        source = self._resolve(target)
        response = await self.llm.call(
            model="haiku",
            system=(
                "Compress the source to answer the FOCUS question. "
                "Keep numbers, dates, key facts. Drop process artifacts "
                "and anything irrelevant to the focus. "
                "50-100 words. Never exceed 150."
            ),
            user=f"FOCUS: {focus}\n\nSOURCE:\n{source}",
            max_tokens=400,
        )
        return response.text

    def _resolve(self, target: str) -> str:
        if target == "session_history":
            return self.fs.read_file("/session/turn_history.md")
        elif target == "all_results":
            entries = self.fs.list_dir("/session/results/")
            parts = []
            for e in entries:
                parts.append(
                    f"--- {e.name} ---\n"
                    f"{self.fs.read_file(f'/session/results/{e.name}')}"
                )
            return "\n\n".join(parts)
        elif self.fs.exists(f"/session/results/{target}.md"):
            return self.fs.read_file(f"/session/results/{target}.md")
        elif self.fs.exists(target):
            return self.fs.read_file(target)
        return f"(target '{target}' not found)"
```

---

## 4. Skills: Agent Skills Open Standard

### 4.1 Folder Structure

Each skill is a directory with `SKILL.md` as the entrypoint, following Anthropic's Agent Skills standard. Supporting files (scripts, templates, references) coexist in the directory. Progressive disclosure: the system prompt contains only skill names and descriptions. Full instructions load on demand when the skill is invoked.

```
skills/
  context_retrieval/
    SKILL.md
    references/
      gap_assessment_guide.md

  view_validation/
    SKILL.md
    templates/
      view_output.yaml
    references/
      calibration_usage.md

  expression_design/
    SKILL.md
    templates/
      expression_output.yaml
    scripts/
      kelly_sizing.py
      option_payoff.py

  portfolio_synthesis/
    SKILL.md
    templates/
      synthesis_output.yaml
    references/
      integration_brief_guide.md

  scenario_analysis/
    SKILL.md
    scripts/
      scenario_tree.py

  rv_analysis/
    SKILL.md
    scripts/
      zscore.py

  event_analysis/
    SKILL.md

  portfolio_review/
    SKILL.md

  retrospective/
    SKILL.md
    references/
      counterfactual_guide.md

  attention_allocation/
    SKILL.md
```

### 4.2 SKILL.md Format

Standard YAML frontmatter + markdown instructions. The frontmatter controls metadata; the body is the prompt injected when the skill is loaded.

```markdown
---
name: view_validation
description: >
  Reassess an existing View against new evidence. Use when new data
  arrives that may affect an active View's confidence or scenarios.
allowed-tools: fetch, read, search
---

# View Validation

Reassess an existing View against new data.

## Output Format

Begin with SUMMARY (3-5 sentences: conclusion, updated confidence,
key evidence, what changed).

Use the output schema in `templates/view_output.yaml` for structured
sections.

## Procedure

1. Check each invalidation condition against current data
2. If any triggered → recommend invalidation with evidence
3. Assess: strengthen, weaken, or neutral?
4. Update confidence with SPECIFIC reasoning
5. Update scenario probabilities if warranted
6. When revising downward: should the View be FLIPPED?
   Sequential downgrades often mean the View is wrong.
7. State what would change your mind
8. Reference calibration data
   (see references/calibration_usage.md)

## Eval Criteria

- Must check each invalidation condition
- Must cite specific data
- Must update confidence with reasoning
- Must address counterarguments
- Must reference calibration for the View's category
```

### 4.3 Example: portfolio_synthesis SKILL.md

```markdown
---
name: portfolio_synthesis
description: >
  Synthesize multiple sub-agent analyses into PM-facing output.
  Use as a clean-room synthesis sub-agent with curated context:
  integration brief + full sub-agent outputs.
allowed-tools: read
---

# Portfolio Synthesis

Produce PM-facing output from an integration brief and sub-agent analyses.

The integration brief contains editorial guidance from the orchestrating
Agent: what matters, what disagrees, what gaps survived, calibration
awareness. Trust it as editorial direction but independently assess the
raw analyses.

## Output Format (mandatory structure)

Use the schema in `templates/synthesis_output.yaml`.

### SUMMARY
3-5 sentences: what changed, what to do, confidence level.

### VIEW UPDATES
For each affected View, produce EXACTLY:
```yaml
view_id: V-NNN
prior_confidence: 0.XX
updated_confidence: 0.XX
direction: unchanged | strengthened | weakened | invalidated
scenario_changes:
  - scenario: "name"
    prior_probability: 0.XX
    updated_probability: 0.XX
key_evidence: "one sentence"
```

### EXPRESSION IMPLICATIONS
For each affected Expression:
```yaml
expression_id: E-NNN
action: hold | adjust | close | review
adjustment: "description if adjusting"
urgency: immediate | next_session | monitoring
```

### OPEN QUESTIONS
Free-form: what the PM should think about, what we don't know.

### NEXT ACTIONS
Free-form: what the system will monitor, what triggers re-analysis.

## Guidelines

- The structured sections (VIEW UPDATES, EXPRESSION IMPLICATIONS) are
  machine-parseable. Be precise with numbers and enums.
- The free-form sections (SUMMARY, OPEN QUESTIONS, NEXT ACTIONS)
  preserve nuance for PM judgment.
- If the integration brief flags calibration concerns, be conservative.
- If analyses disagree, state the disagreement explicitly.
- Flag gaps prominently — what wasn't analyzed matters.

## Eval Criteria

- Must include all mandatory sections
- Structured YAML must be valid and complete
- Must address all sub-agent results
- Must reference integration brief guidance
- Must flag unresolved gaps
```

### 4.4 Skill Loader

```python
class SkillLoader:
    """Load skills following Agent Skills open standard.

    Scans skills directory at startup, indexes frontmatter.
    Full content loaded when invoked by Agent or sub-agent.
    """

    def __init__(self, skills_dir: str):
        self.skills_dir = skills_dir
        self._index: dict[str, SkillMeta] = {}
        self._scan()

    def _scan(self):
        for entry in os.scandir(self.skills_dir):
            if not entry.is_dir():
                continue
            skill_path = os.path.join(entry.path, "SKILL.md")
            if not os.path.exists(skill_path):
                continue
            meta = _parse_frontmatter(skill_path)
            self._index[meta["name"]] = SkillMeta(
                name=meta["name"],
                description=meta.get("description", ""),
                path=entry.path,
                allowed_tools=meta.get("allowed-tools", "").split(", "),
            )

    def catalog(self) -> str:
        """For system prompt injection. Name + one-line description."""
        return "\n".join(
            f"  {m.name}: {m.description[:80]}"
            for m in self._index.values()
        )

    def load(self, skill_name: str) -> "LoadedSkill":
        """Full skill load for sub-agent execution."""
        meta = self._index[skill_name]
        raw = _read_file(os.path.join(meta.path, "SKILL.md"))
        body = _strip_frontmatter(raw)

        return LoadedSkill(
            name=meta.name,
            prompt=body,
            allowed_tools=meta.allowed_tools,
            base_path=meta.path,
            templates=_load_subdir(meta.path, "templates"),
            references=_load_subdir(meta.path, "references"),
            scripts=_list_subdir(meta.path, "scripts"),
        )


@dataclass
class SkillMeta:
    name: str
    description: str
    path: str
    allowed_tools: list[str]


@dataclass
class LoadedSkill:
    name: str
    prompt: str
    allowed_tools: list[str]
    base_path: str
    templates: dict[str, str]    # filename → content
    references: dict[str, str]   # filename → content
    scripts: list[str]           # file paths
```

---

## 5. Task Executor

Manages sub-agent lifecycle. Handles dependency resolution, retry, skill loading, context assembly, validation. Invisible to the Agent — the Agent interacts only through dispatch/collect.

```python
class TaskExecutor:
    """Sub-agent lifecycle management.

    - Receives dispatched tasks
    - Resolves depends_on (auto-waits, injects dependency summaries)
    - Loads skills via SkillLoader
    - Builds sub-agent context from refs
    - Runs sub-agents with appropriate model and tools
    - Runs validation (standard or contrastive)
    - Stores results on filesystem
    - Serves results to collect() calls
    """

    def __init__(self, llm, fs: "ForgeFS",
                 skill_loader: "SkillLoader", config: dict):
        self.llm = llm
        self.fs = fs
        self.skill_loader = skill_loader
        self.config = config
        self._tasks: dict[str, asyncio.Task] = {}
        self._specs: dict[str, Task] = {}
        self._results: dict[str, TaskResult] = {}
        self._completed: asyncio.Queue = asyncio.Queue()

    def submit(self, task: Task):
        self._specs[task.id] = task
        self._tasks[task.id] = asyncio.ensure_future(
            self._execute(task)
        )

    def get_spec(self, task_id: str) -> Task | None:
        return self._specs.get(task_id)

    def total_submitted(self) -> int:
        return len(self._tasks)

    async def wait_for(self, task_id: str) -> TaskResult:
        if task_id in self._results:
            return self._results[task_id]
        if task_id not in self._tasks:
            return TaskResult(task_id, status="error",
                              error=f"Unknown task: {task_id}")
        await self._tasks[task_id]
        return self._results[task_id]

    async def wait_all(self) -> dict[str, TaskResult]:
        if self._tasks:
            await asyncio.gather(*self._tasks.values(),
                                  return_exceptions=True)
        return dict(self._results)

    def drain_completed(self) -> dict[str, TaskResult]:
        completed = {}
        while not self._completed.empty():
            tid = self._completed.get_nowait()
            completed[tid] = self._results[tid]
        return completed

    def pending_count(self) -> int:
        return len(self._tasks) - len(self._results)

    async def _execute(self, task: Task):
        try:
            # 1. Wait for dependencies
            dep_summaries = {}
            if task.depends_on:
                for dep_id in task.depends_on:
                    dep_result = await self.wait_for(dep_id)
                    if dep_result.status == "ok":
                        dep_summaries[dep_id] = dep_result.summary
                    else:
                        self._store(task.id, TaskResult(
                            task.id, status="failed",
                            error=f"Dependency {dep_id} failed: "
                                  f"{dep_result.error}",
                        ))
                        return

            # 2. Load skill
            skill = self.skill_loader.load(task.skill)

            # 3. Build sub-agent system prompt
            system = self._build_system(skill)

            # 4. Build sub-agent context (user message)
            context = self._build_context(task, dep_summaries)

            # 5. Resolve sub-agent tools
            subagent_tools = self._resolve_tools(skill)

            # 6. Run sub-agent (with retry)
            output = await self._call(
                model=self.config.get("subagent_model", "sonnet"),
                system=system, user=context, tools=subagent_tools,
            )

            if output is None:
                self._store(task.id, TaskResult(
                    task.id, status="failed",
                    error="Sub-agent call failed after retries",
                ))
                return

            # 7. Store full output
            self.fs.write_file(
                f"/session/results/{task.id}.md", output.text
            )

            # 8. Extract summary
            summary = _extract_summary(output.text)

            # 9. Validate if requested
            validation = None
            if task.validate or task.validate_contrastive:
                validation = await self._validate(
                    task, skill, output.text,
                    contrastive=task.validate_contrastive,
                )

            self._store(task.id, TaskResult(
                task.id, status="ok", summary=summary,
                validation=validation,
                tokens=output.usage.total,
            ))

        except Exception as e:
            self._store(task.id, TaskResult(
                task.id, status="error", error=str(e),
            ))

    def _store(self, task_id: str, result: TaskResult):
        self._results[task_id] = result
        self._completed.put_nowait(task_id)

    def _build_system(self, skill: LoadedSkill) -> str:
        """Build sub-agent system prompt from skill contents."""
        parts = [skill.prompt]

        if skill.templates:
            parts.append("\n## Output Templates")
            for name, content in skill.templates.items():
                parts.append(f"\n### {name}\n```\n{content}\n```")

        if skill.references:
            parts.append("\n## Reference Materials")
            for name, content in skill.references.items():
                parts.append(f"\n### {name}\n{content}")

        if skill.scripts:
            parts.append(
                f"\n## Available Scripts "
                f"(base: {skill.base_path}/scripts/)"
            )
            for s in skill.scripts:
                parts.append(f"  - {os.path.basename(s)}")

        return "\n".join(parts)

    def _build_context(self, task: Task,
                       dep_summaries: dict) -> str:
        """Assemble sub-agent user message from refs + deps."""
        sections = [f"OBJECTIVE:\n{task.objective}"]

        if task.context:
            ctx_parts = []
            for ref in task.context:
                content = self._resolve_ref(ref)
                ctx_parts.append(f"[{ref}]\n{content}")
            sections.append("CONTEXT:\n" + "\n\n".join(ctx_parts))

        if dep_summaries:
            dep_parts = [f"[From {did}]\n{s}"
                         for did, s in dep_summaries.items()]
            sections.append(
                "PRIOR ANALYSIS:\n" + "\n\n".join(dep_parts)
            )

        if task.notes:
            sections.append(f"NOTES:\n{task.notes}")

        return "\n\n---\n\n".join(sections)

    def _resolve_ref(self, ref: str) -> str:
        """Resolve context ref to content with depth suffixes."""
        depth = "full"
        base = ref
        for suffix in (":summary", ":header"):
            if ref.endswith(suffix):
                depth = suffix[1:]
                base = ref[:-len(suffix)]
                break

        path = self._ref_to_path(base)
        if not self.fs.exists(path):
            return f"(ref '{ref}' not found)"

        content = self.fs.read_file(path)
        if depth == "header":
            return "\n".join(content.split("\n")[:8])
        elif depth == "summary":
            header = "\n".join(content.split("\n")[:8])
            summary = _extract_section(content, "SUMMARY")
            return f"{header}\n{summary}" if summary else header
        return content

    def _ref_to_path(self, ref: str) -> str:
        if ref.startswith("ctx_"):
            return f"/session/context/{ref}.md"
        if ref.startswith("V-"):
            return f"/memory/views/{ref}.md"
        if ref.startswith("E-"):
            return f"/memory/expressions/{ref}.md"
        if ref.startswith("PK-"):
            return f"/memory/pk/{ref}.md"
        if ref == "integration_brief":
            return "/session/integration_brief.md"
        if self.fs.exists(f"/session/results/{ref}.md"):
            return f"/session/results/{ref}.md"
        return ref

    def _resolve_tools(self, skill: LoadedSkill) -> list:
        """Sub-agent tools: read-only memory + skill-specified."""
        tools = [ReadTool(self.fs).TOOL_DEF]
        if "fetch" in skill.allowed_tools:
            tools.append(
                FetchTool(self.fs,
                          self.config.get("providers", {})).TOOL_DEF
            )
        if "search" in skill.allowed_tools:
            tools.append(
                SearchTool(self.fs,
                           self.config.get("search_index")).TOOL_DEF
            )
        return tools

    async def _validate(self, task, skill, output_text,
                        contrastive=False):
        criteria = (_extract_section(skill.prompt, "Eval Criteria")
                    or "")
        prompt = (CONTRASTIVE_VALIDATION_PROMPT if contrastive
                  else STANDARD_VALIDATION_PROMPT)
        model = (self.config.get("contrastive_model", "opus")
                 if contrastive
                 else self.config.get("validation_model", "sonnet"))

        response = await self._call(
            model=model, system=prompt,
            user=(f"OBJECTIVE:\n{task.objective}\n\n"
                  f"CRITERIA:\n{criteria}\n\n"
                  f"OUTPUT:\n{output_text}"),
            max_tokens=500,
        )
        return (_parse_validation(response.text,
                                  contrastive=contrastive)
                if response else None)

    async def _call(self, model, system, user, tools=None,
                    max_tokens=None, max_retries=2):
        """LLM call with retry on transient failures."""
        for attempt in range(1 + max_retries):
            try:
                return await self.llm.call(
                    model=model, system=system, user=user,
                    tools=tools, max_tokens=max_tokens,
                    timeout=self.config.get("timeout", 30),
                )
            except (TimeoutError, ConnectionError):
                if attempt == max_retries:
                    return None


STANDARD_VALIDATION_PROMPT = """\
Assess the sub-agent output against the objective and criteria.
VERDICT: accept or reject
FEEDBACK: (if rejecting) What specifically is missing or wrong."""

CONTRASTIVE_VALIDATION_PROMPT = """\
Adversarial validation.
1. Understand the output's conclusion.
2. Construct the STRONGEST COUNTERARGUMENT.
3. Does the output address it?
4. VERDICT: accept (addressed or weak counter) / reject (compelling, unaddressed)
   COUNTERARGUMENT: (always state)
   FEEDBACK: (if rejecting) specific gap."""
```

---

## 6. The Agent Loop

Single continuous conversation. Eight tools available throughout. The loop is model-agnostic plumbing — all intelligence lives in the system prompt, skills, and the model itself.

```python
class Agent:
    def __init__(self, llm, fs: "ForgeFS",
                 session_mgr: "SessionManager",
                 skill_loader: "SkillLoader",
                 search_index: "SearchIndex",
                 config: dict):
        self.llm = llm
        self.fs = fs
        self.session_mgr = session_mgr
        self.skill_loader = skill_loader
        self.search_index = search_index
        self.config = config

    async def run(self, trigger: dict) -> str:
        session = self.session_mgr.resolve_session(trigger)
        self.fs.load_session(session.session_id)

        system = self._build_system_prompt(session)
        messages = [{"role": "user",
                     "content": trigger["content"]}]

        executor = TaskExecutor(
            self.llm, self.fs, self.skill_loader,
            self.config.get("executor", {}),
        )
        tools = self._create_tools(executor)

        while True:
            response = await self.llm.call(
                model=self.config.get("agent_model", "opus"),
                system=system,
                messages=messages,
                tools=[t.TOOL_DEF for t in tools.values()],
            )

            if not response.tool_calls:
                self._record_turn(session, trigger,
                                  response.text)
                return response.text

            messages.append({
                "role": "assistant",
                "content": response.content,
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

    def _create_tools(self, executor: TaskExecutor) -> dict:
        guardrails = Guardrails(self.config["guardrails"],
                                self.fs)
        return {
            "read":     ReadTool(self.fs),
            "search":   SearchTool(self.fs, self.search_index),
            "write":    WriteTool(self.fs, guardrails,
                                  self.search_index),
            "fetch":    FetchTool(self.fs,
                                  _create_providers(self.config)),
            "dispatch": DispatchTool(executor),
            "collect":  CollectTool(executor),
            "review":   ReviewTool(self.llm, self.fs,
                                   self.config.get("review", {})),
            "compact":  CompactTool(self.llm, self.fs),
        }

    def _build_system_prompt(self, session) -> str:
        """~1,200 tokens. Stable content first for prompt cache."""

        views = self.fs.list_dir("/memory/views/")
        view_index = " ".join(
            f"{v.name.replace('.md','')}("
            f"{v.meta.split('|')[0].strip()})"
            for v in views
        )

        skill_catalog = self.skill_loader.catalog()

        pks = self.fs.list_dir("/memory/pk/",
                               query="weight>=0.4")
        pk_lines = []
        for pk in sorted(pks, key=lambda p: p.meta,
                         reverse=True)[:3]:
            pk_lines.append(
                self.fs.read_lines(f"/memory/pk/{pk.name}", 1, 3)
            )

        portfolio = self.fs.read_file("/portfolio/state.md")
        cal_alert = self._worst_calibration()

        session_block = ""
        if session.prior_summary:
            session_block = (
                f"\nSESSION (turn {session.turn_number}):\n"
                f"{session.prior_summary}\n"
                f"Prior context: read('/session/').\n"
            )

        return SYSTEM_PROMPT.format(
            portfolio=portfolio,
            view_count=len(views),
            view_index=view_index,
            skill_catalog=skill_catalog,
            pk_lines="\n".join(pk_lines),
            cal_alert=cal_alert,
            session_block=session_block,
        )

    def _worst_calibration(self) -> str:
        cals = self.fs.list_dir("/memory/calibration/")
        worst, worst_bias = None, 0
        for c in cals:
            content = self.fs.read_file(
                f"/memory/calibration/{c.name}")
            bias = _extract_worst_bias(content)
            if abs(bias) > abs(worst_bias):
                worst_bias, worst = bias, c.name.replace(".md","")
        if worst:
            return f"⚠ {worst}: worst band bias {worst_bias:+.2f}"
        return "Insufficient calibration data."

    def _record_turn(self, session, trigger, response):
        summary = response[:300]
        entry = (f"\n## Turn {session.turn_number}\n"
                 f"Query: {trigger['content'][:200]}\n"
                 f"Result: {summary}\n")
        path = "/session/turn_history.md"
        existing = (self.fs.read_file(path)
                    if self.fs.exists(path) else "")
        self.fs.write_file(path, existing + entry)
```

---

## 7. System Prompt

~1,200 tokens. Stable content ordered first for Anthropic prompt cache hits.

```python
SYSTEM_PROMPT = """\
You are Forge, an analytical system supporting a discretionary
macro portfolio manager.

TOOLS: read, search, write, fetch, dispatch, collect, review, compact.

RETRIEVAL:
  read(path)     — exact path access. Defaults to header for /memory/.
                   Use depth='full' deliberately for capital decisions.
  search(scope, query) — semantic search across files. Use for discovery
                   when you don't know exactly what you need.
  fetch(source, params) — external data. Summary returned, full stored
                   at /session/context/ctx_NNN.md.

EXECUTION:
  dispatch(task)  — start sub-agent in background. Returns immediately.
                   Use depends_on for tasks needing prior results.
  collect(target) — retrieve results. 'task_id', 'ready', or 'all'.
                   Failed tasks show retry guidance.
  review(output, focus) — independent adversarial review. Mandatory
                   for Expressions. Reviewer has memory + data access.

PERSISTENCE:
  write(path, content) — memory and session writes. Guardrails on
                   Expressions. Use new.md for auto-assigned IDs.

ATTENTION:
  compact(target, focus) — re-compress context when reasoning gets
                   noisy. Use before high-stakes integration.

PRINCIPLES:
- Views precede trades. Every Expression links to a View.
- Scenarios, not point estimates. Probability distributions.
- Invalidation before conviction. Define what kills the View.
- The portfolio is a system. Positions interact.
- Calibrate honestly. Reference calibration data.
- Evidence over narrative. Gaps are information.

RETRIEVAL DISCIPLINE:
Follow context_retrieval skill guidance. After retrieval, write
/session/context/gaps.md — what's missing and whether it matters.
Read gaps.md before reasoning or dispatching.

EXECUTION MODEL:
Most queries: answer directly from read/search/fetch. No delegation.
Focused analysis: read a skill, apply in your reasoning.
Complex / parallel: dispatch sub-agents as you discover needs.
  Dispatch → think → collect('ready') → adapt → dispatch more.
  Use depends_on for tasks needing prior results.
  Don't plan everything upfront. Let the plan emerge.

INTEGRATION FOR COMPLEX QUERIES:
When multiple sub-agents ran:
  1. Read full outputs for capital-relevant results (depth='full')
  2. Use compact() if context is noisy before integrating
  3. Write /session/integration_brief.md — your editorial guidance:
     what matters, what disagrees, what gaps survived, output direction
  4. Dispatch synthesis sub-agent (portfolio_synthesis skill) with
     brief + full sub-agent outputs for clean-room synthesis
  5. Collect synthesis. review() if Expression-level.

ERROR HANDLING:
If a sub-agent fails: assess whether it's critical.
  Critical: retry via dispatch(retry_of='failed_id')
  Non-critical: proceed, flag the gap prominently in output.
If a fetch fails: note the missing data, proceed if possible,
  flag what you couldn't verify.
Never silently drop failed work. Always surface gaps.

MEMORY:
Always write Views, Expressions, Outcomes when warranted.
Write Observations, Linkages, PK when your future self benefits.
Record untaken decisions as counterfactuals.
{session_block}
PORTFOLIO: {portfolio}

VIEWS: {view_count} active: {view_index}

SKILLS:
{skill_catalog}

PROCESS KNOWLEDGE (top by weight):
{pk_lines}

CALIBRATION: {cal_alert}
"""
```

---

## 8. Model Routing

Configuration, not hardcoded intelligence. Every model is interchangeable; routing expresses cost/quality tradeoffs the PM can adjust.

```python
MODEL_ROUTING = {
    "agent":                   "opus",
    "subagent":                "sonnet",
    "validation":              "sonnet",
    "contrastive_validation":  "opus",
    "review":                  "opus",
    "synthesis":               "opus",
    "compact":                 "haiku",
}
```

**Attention map:**

| Role | Model | Memory Access | Turn Count | Signal Quality |
|------|-------|---------------|------------|----------------|
| Agent | Opus | full r/w | multi-turn, grows over session | degrades → use compact() |
| Sub-Agent | Sonnet | read-only | single turn | high (curated context) |
| Reviewer | Opus | read + fetch | single turn | high (curated) |
| Synthesizer | Opus | read-only | single turn | highest (integration brief + raw outputs) |
| Compactor | Haiku | read-only | single turn | n/a (compression utility) |

---

## 9. Filesystem and Memory

### 9.1 Filesystem Layout

```
/memory/
  /views/             V-NNN.md (standard header for line-range reads)
  /expressions/       E-NNN.md
  /observations/      O-NNN.md
  /linkages/          L-NNN.md
  /pk/                PK-NNN.md
  /outcomes/          OUT-NNN.md
  /counterfactuals/   CF-NNN.md
  /calibration/       macro_regime.md, relative_value.md, ...
  /proposals/         SEP-NNN.md (pending skill edit proposals)

/skills/              Agent Skills standard (folder-based)
  /context_retrieval/ SKILL.md + references/
  /view_validation/   SKILL.md + templates/ + references/
  ...

/portfolio/
  state.md            Current exposures, risk budget
  constraints.md      Risk limits

/session/             Per-conversation, persists across turns
  turn_history.md
  tasks.md            Living task log with adaptation annotations
  integration_brief.md
  context/
    ctx_001.md        Full content of fetch results
    gaps.md           Negative Space assessment
  results/
    sa_growth.md      Full output of sub-agent tasks
    synthesis.md
```

### 9.2 ForgeFS

```python
class ForgeFS:
    """Virtual filesystem. Routes paths to backends."""

    def __init__(self, db, skills_dir: str,
                 session_store: "SessionStore"):
        self.backends = {
            "/memory/":    MemoryBackend(db),
            "/skills/":    FileBackend(skills_dir),
            "/portfolio/": PortfolioBackend(db),
            "/session/":   None,  # resolved per session
        }
        self.session_store = session_store

    def load_session(self, session_id: str):
        self.backends["/session/"] = SessionBackend(
            self.session_store, session_id)

    def read_file(self, path: str) -> str:
        return self._route(path).read(path)

    def read_lines(self, path: str, start: int, end: int) -> str:
        content = self.read_file(path)
        lines = content.split("\n")
        return "\n".join(lines[start - 1:end])

    def write_file(self, path: str, content: str):
        self._route(path).write(path, content)

    def list_dir(self, path: str, query: str = None) -> list:
        return self._route(path).list(path, query)

    def exists(self, path: str) -> bool:
        return self._route(path).exists(path)

    def is_dir(self, path: str) -> bool:
        return path.endswith("/") or "." not in path.split("/")[-1]

    def archive(self, path: str):
        content = self.read_file(path)
        archive_path = path.replace(
            "/memory/", "/memory/.archive/"
        ).replace(".md", f"_{_timestamp()}.md")
        self.write_file(archive_path, content)

    def next_id(self, category: str) -> str:
        prefix = {"views": "V", "expressions": "E",
                  "observations": "O", "linkages": "L",
                  "pk": "PK", "outcomes": "OUT",
                  "counterfactuals": "CF", "proposals": "SEP",
                  }.get(category, "X")
        count = self._route(
            f"/memory/{category}/").count(category) + 1
        return f"{prefix}-{count:03d}"

    def _route(self, path: str):
        for prefix, backend in self.backends.items():
            if path.startswith(prefix):
                return backend
        raise ValueError(f"No backend for: {path}")
```

### 9.3 MemoryBackend with Query Language

```python
class MemoryBackend:
    """Routes /memory/ paths to database. Structured query support.

    Query syntax for directory listings:
      keyword           — full-text search
      key:value         — exact match
      key>=N / key<=N   — numeric comparison
      since:YYYY-MM-DD  — date filter
      skill:name        — PK skill relevance
      status:active     — status filter
    """

    def __init__(self, db):
        self.db = db

    def read(self, path: str) -> str:
        category, item_id = _parse_memory_path(path)
        record = self.db.get(category, item_id)
        return self._to_markdown(record, category)

    def write(self, path: str, content: str):
        category, item_id = _parse_memory_path(path)
        record = _parse_markdown_to_dict(content)
        self.db.upsert(category, item_id, record)

    def list(self, path: str, query: str = None) -> list:
        category = _parse_category(path)
        records = self.db.list(category)
        if query:
            records = self._apply_query(records, query)
        return [DirEntry(
            name=f"{r['id']}.md",
            meta=self._listing_meta(r, category),
        ) for r in records]

    def _apply_query(self, records, query):
        filtered = records
        for token in query.split():
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
                cutoff = _parse_date(token.split(":", 1)[1])
                filtered = [
                    r for r in filtered
                    if _get_date(r) >= cutoff
                ]
            elif ":" in token:
                field, value = token.split(":", 1)
                filtered = [
                    r for r in filtered
                    if str(r.get(field, "")).lower() == value.lower()
                ]
            else:
                kw = token.lower()
                filtered = [
                    r for r in filtered
                    if kw in _full_text(r).lower()
                ]
        return filtered

    def count(self, category: str) -> int:
        return len(self.db.list(category))

    def exists(self, path: str) -> bool:
        category, item_id = _parse_memory_path(path)
        return self.db.exists(category, item_id)

    def _listing_meta(self, record, category):
        if category == "views":
            return (f"{record.get('scope','')} | "
                    f"conf:{record.get('confidence','')} | "
                    f"{record.get('status','')}")
        elif category == "pk":
            return (f"w:{record.get('weight','')} | "
                    f"{record.get('category','')}")
        elif category == "expressions":
            return (f"view:{record.get('view_id','')} | "
                    f"{record.get('status','')}")
        elif category == "counterfactuals":
            return (f"{record.get('decision_type','')} | "
                    f"{record.get('status','')}")
        return ""
```

---

## 10. Sessions

Multi-turn persistence with timeout and compressed turn history.

```python
class SessionManager:
    def __init__(self, fs: "ForgeFS", config: dict):
        self.fs = fs
        self.timeout = config.get("session_timeout_minutes", 30)

    def resolve_session(self, trigger: dict) -> "SessionContext":
        if trigger["type"] in ("schedule", "alert"):
            return self._new_session()

        active = self.fs.get_active_session(
            trigger.get("user_id", "default"))

        if active and not self._expired(active):
            return self._continue_session(active, trigger)

        if active:
            self.fs.archive_session(active["session_id"])

        return self._new_session()

    def _new_session(self) -> "SessionContext":
        sid = f"sess_{_timestamp_compact()}"
        self.fs.create_session(sid)
        return SessionContext(session_id=sid, turn_number=1,
                              prior_summary=None)

    def _continue_session(self, active, trigger) -> "SessionContext":
        turn = active["turn_number"] + 1
        summary = self._compress_prior(active["session_id"])
        return SessionContext(session_id=active["session_id"],
                              turn_number=turn,
                              prior_summary=summary)

    def _compress_prior(self, session_id: str) -> str:
        history = self.fs.read_file("/session/turn_history.md")
        lines = history.strip().split("\n")
        return "\n".join(lines[-15:])

    def _expired(self, session: dict) -> bool:
        age = (_now() - session["last_active"]).total_seconds() / 60
        return age > self.timeout


@dataclass
class SessionContext:
    session_id: str
    turn_number: int
    prior_summary: str | None
```

---

## 11. Evolution: MetaOptimizer

High evidence bar for skill changes. Operates on standard skill folder structure.

```python
class MetaOptimizer:
    """Proposes skill edits based on accumulated ProcessKnowledge.

    Evidence bar:
    - 5+ corroborating PKs (no contradictions)
    - Concrete proposal generated
    - PM approval required before any skill file is modified

    Now edits target specific files within skill directories
    (SKILL.md, templates, references) rather than single monolithic files.
    """

    def __init__(self, fs: "ForgeFS", llm,
                 skill_loader: "SkillLoader", config: dict):
        self.fs = fs
        self.llm = llm
        self.skill_loader = skill_loader
        self.config = config

    async def check_evolution(self):
        """Run after weekly retrospective."""
        pks = self.fs.list_dir("/memory/pk/",
                               query="weight>=0.4")
        clusters = self._cluster_by_skill(pks)

        for skill_name, pk_group in clusters.items():
            if len(pk_group) < self.config.get(
                    "min_corroborations", 5):
                continue
            if self._has_contradictions(pk_group):
                continue

            proposal = await self._generate_proposal(
                skill_name, pk_group)

            if proposal:
                proposal_id = self.fs.next_id("proposals")
                self.fs.write_file(
                    f"/memory/proposals/{proposal_id}.md",
                    proposal,
                )

    async def _generate_proposal(self, skill_name, pks):
        skill = self.skill_loader.load(skill_name)
        pk_content = "\n---\n".join(
            self.fs.read_file(f"/memory/pk/{pk.name}")
            for pk in pks
        )

        response = await self.llm.call(
            model=self.config.get("proposal_model", "sonnet"),
            system=PROPOSAL_PROMPT,
            user=(f"SKILL: {skill_name}\n\n"
                  f"CURRENT SKILL.md:\n{skill.prompt}\n\n"
                  f"TEMPLATES:\n{skill.templates}\n\n"
                  f"REFERENCES:\n{skill.references}\n\n"
                  f"PROCESS KNOWLEDGE:\n{pk_content}"),
        )
        return response.text if response else None

    def _cluster_by_skill(self, pks):
        clusters = {}
        for pk in pks:
            content = self.fs.read_file(f"/memory/pk/{pk.name}")
            skills = _extract_relevant_skills(content)
            for s in skills:
                clusters.setdefault(s, []).append(pk)
        return clusters

    def _has_contradictions(self, pk_group):
        ...
        return False


PROPOSAL_PROMPT = """\
Generate a concrete skill edit proposal.

Given process knowledge from real analyses, propose specific changes to
the skill's SKILL.md, templates, or references. Be precise:
- Quote what exists
- State what should change
- Explain why (citing PK evidence)

Format as a diff-like proposal the PM can approve/reject."""
```

---

## 12. Tracking: Outcomes and Counterfactuals

```python
class OutcomeTracker:
    """Monitors open Expressions for exit conditions."""

    async def check_all(self):
        """Hourly: check if any Expression hit target/stop/time."""
        exprs = self.fs.list_dir(
            "/memory/expressions/", query="status:active")
        for expr in exprs:
            content = self.fs.read_file(
                f"/memory/expressions/{expr.name}")
            parsed = _parse_markdown_to_dict(content)
            if self._exit_triggered(parsed):
                # Update status → closed
                # WriteTool side effect auto-records Outcome
                ...


class CounterfactualDetector:
    """Detects and resolves tracked counterfactuals."""

    def detect(self):
        """Hourly: check tracked counterfactuals."""
        cfs = self.fs.list_dir(
            "/memory/counterfactuals/",
            query="status:tracking")
        for cf in cfs:
            content = self.fs.read_file(
                f"/memory/counterfactuals/{cf.name}")
            parsed = _parse_markdown_to_dict(content)
            if self._resolution_ready(parsed):
                self._resolve(cf, parsed)
```

---

## 13. Guardrails

```python
class Guardrails:
    """Mechanical risk limits. Code, not intelligence."""

    def __init__(self, config: dict, fs: "ForgeFS"):
        self.config = config
        self.fs = fs

    def check(self, expression: dict) -> list["Violation"]:
        violations = []
        portfolio = self._load_portfolio()

        checks = [
            ("max_single_risk", expression.get("max_loss_pct", 0),
             self.config["max_single_risk"]),
            ("max_gross_exposure",
             portfolio.get("gross", 0) + expression.get("notional", 0),
             self.config["max_gross"]),
            ("max_duration_contribution",
             abs(expression.get("duration_impact", 0)),
             self.config["max_duration"]),
        ]

        for rule, actual, limit in checks:
            if actual > limit:
                violations.append(Violation(
                    rule=rule, actual=actual,
                    limit=limit, severity="hard",
                ))

        return violations

    def _load_portfolio(self) -> dict:
        content = self.fs.read_file("/portfolio/state.md")
        return _parse_markdown_to_dict(content)


@dataclass
class Violation:
    rule: str
    actual: float
    limit: float
    severity: str
```

---

## 14. Configuration

```python
DEFAULT_CONFIG = {
    "agent_model": "opus",

    "executor": {
        "subagent_model": "sonnet",
        "validation_model": "sonnet",
        "contrastive_model": "opus",
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
        "min_days": 14,
        "min_confidence": 0.6,
        "default_tracking_days": 90,
    },

    "evolution": {
        "min_corroborations": 5,
        "require_no_contradictions": True,
        "proposal_model": "sonnet",
        "pm_approval_required": True,
    },

    "search": {
        "embedding_model": "text-embedding-3-small",
        "recency_weight": 0.3,
        "semantic_weight": 0.7,
    },
}
```

---

## 15. Scheduled Triggers

```python
class Scheduler:
    def __init__(self, agent: Agent, fs: "ForgeFS",
                 meta: MetaOptimizer, config: dict):
        self.agent = agent
        self.fs = fs
        self.meta = meta
        self.config = config["schedules"]

    async def morning_review(self):
        return await self.agent.run({
            "type": "schedule",
            "content": (
                f"Morning review — {_today()}.\n"
                f"Budget: ~{self.config['morning_budget']} analyses.\n\n"
                f"Scan overnight moves. Check stale Views "
                f"(>{self.config['staleness_days']} days). "
                f"Prioritize by position-weighted attention."
            ),
        })

    async def end_of_day(self):
        return await self.agent.run({
            "type": "schedule",
            "content": (
                f"End of day review — {_today()}.\n"
                f"Budget: ~{self.config['eod_budget']} analyses.\n\n"
                f"Review today's moves. Update Views if warranted. "
                f"Record Observations. Flag items for tomorrow."
            ),
        })

    async def weekly_retrospective(self):
        outcomes = self.fs.list_dir(
            "/memory/outcomes/",
            query=f"since:{_week_ago()}")
        cfs = self.fs.list_dir(
            "/memory/counterfactuals/",
            query="status:completed")

        result = await self.agent.run({
            "type": "schedule",
            "content": (
                f"Weekly retrospective — {_today()}.\n"
                f"{len(outcomes)} new outcomes. "
                f"{len(cfs)} completed counterfactuals.\n\n"
                f"Load retrospective skill. Analyze honestly. "
                f"Produce PK entries. Update calibration. "
                f"Propose skill edits only with strong evidence."
            ),
        })

        await self.meta.check_evolution()
        return result

    async def hourly_monitoring(self):
        await self.outcome_tracker.check_all()
        self.cf_detector.detect()
```

---

## 16. Architecture Diagram

```
 Trigger (PM query | schedule | alert)
 │
 ▼
┌──────────────────────────────────────────────────────────────────┐
│                    SESSION LAYER (Code)                           │
│  Resolve session. Build system prompt (stable first for cache).  │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                      THE AGENT (Opus)                             │
│                                                                  │
│  8 tools: read, search, write, fetch,                            │
│           dispatch, collect, review, compact                     │
│                                                                  │
│  Retrieve → Dispatch+Adapt → Integrate → Synthesize → Persist   │
│  (behavioral guidance — Agent interleaves freely)                │
│                                                                  │
└────────┬──────────┬──────────┬──────────┬────────────────────────┘
         │          │          │          │
         ▼          ▼          ▼          ▼
  ┌────────────┐ ┌────────┐ ┌──────────┐ ┌──────────────┐
  │  TASK      │ │ GUARD- │ │ SEARCH   │ │ FILESYSTEM   │
  │  EXECUTOR  │ │ RAILS  │ │ INDEX    │ │              │
  │            │ │        │ │          │ │ /memory/     │
  │ Skill load │ │ Risk   │ │ Hybrid:  │ │ /skills/     │
  │ Context    │ │ limits │ │ embed +  │ │ /portfolio/  │
  │ assembly   │ │ Factor │ │ metadata │ │ /session/    │
  │ Sub-agent  │ │ checks │ │ + recency│ │              │
  │ lifecycle  │ │        │ │          │ │ MemoryBackend│
  │ Validation │ │        │ │ Updated  │ │ FileBackend  │
  │ Retry      │ │        │ │ on write │ │ SessionBackend│
  │ Dep.resolve│ │        │ │          │ │ PortfolioBknd│
  └────────────┘ └────────┘ └──────────┘ └──────────────┘
```

---

## 17. Project Structure

```
forge/
├── agent.py              Agent loop (~80 lines)
├── session.py            SessionManager + SessionContext
├── tools/
│   ├── read.py           ReadTool (depth-aware defaults)
│   ├── search.py         SearchTool (semantic + hybrid retrieval)
│   ├── write.py          WriteTool + side effects + search index hook
│   ├── fetch.py          FetchTool + provider base class
│   ├── dispatch.py       DispatchTool (depends_on, retry_of)
│   ├── collect.py        CollectTool
│   ├── review.py         ReviewTool (with memory + fetch access)
│   └── compact.py        CompactTool (Haiku-powered compression)
├── executor.py           TaskExecutor (skill load, dep resolution, validation)
├── fs.py                 ForgeFS + backends
│   ├── memory_backend.py MemoryBackend (with query language)
│   ├── file_backend.py   FileBackend (skills, plain files)
│   ├── portfolio_backend.py
│   └── session_backend.py
├── search_index.py       SearchIndex (embedding + metadata + recency)
├── skill_loader.py       SkillLoader (Agent Skills standard)
├── guardrails.py         Guardrails + Violation
├── tracking/
│   ├── outcome.py        OutcomeTracker
│   └── counterfactual.py CounterfactualDetector
├── meta.py               MetaOptimizer (skill evolution)
├── prompt.py             SYSTEM_PROMPT template
├── scheduler.py          Scheduled triggers
├── providers/            Data provider implementations
│   ├── base.py           DataProvider + FetchResult base
│   ├── fred.py           FRED economic data
│   ├── market.py         Market data (prices, yields, vol)
│   ├── news.py           News provider
│   ├── research.py       Broker research
│   ├── web.py            Web search
│   └── analytics.py      Curve, options, scenarios
├── config.py             DEFAULT_CONFIG + MODEL_ROUTING
├── skills/               Agent Skills standard (folder-based)
│   ├── context_retrieval/
│   │   ├── SKILL.md
│   │   └── references/gap_assessment_guide.md
│   ├── view_validation/
│   │   ├── SKILL.md
│   │   ├── templates/view_output.yaml
│   │   └── references/calibration_usage.md
│   ├── expression_design/
│   │   ├── SKILL.md
│   │   ├── templates/expression_output.yaml
│   │   └── scripts/kelly_sizing.py
│   ├── portfolio_synthesis/
│   │   ├── SKILL.md
│   │   ├── templates/synthesis_output.yaml
│   │   └── references/integration_brief_guide.md
│   ├── scenario_analysis/
│   │   ├── SKILL.md
│   │   └── scripts/scenario_tree.py
│   ├── rv_analysis/
│   │   ├── SKILL.md
│   │   └── scripts/zscore.py
│   ├── event_analysis/SKILL.md
│   ├── portfolio_review/SKILL.md
│   ├── retrospective/
│   │   ├── SKILL.md
│   │   └── references/counterfactual_guide.md
│   └── attention_allocation/SKILL.md
└── main.py               Wiring
```

---

## 18. Changelog: v5.3 → v6

| Aspect | v5.3 | v6 |
|--------|------|-----|
| Tools | 5 (read, write, fetch, delegate, review) | 8 (+ search, dispatch, collect, compact; - delegate) |
| Skill format | Single .md, bespoke parsing | Agent Skills standard: folder with SKILL.md + templates + scripts + references |
| Planning | Monolithic batch delegate() | Adaptive dispatch/collect with depends_on |
| Semantic search | None (keyword filter on read only) | Dedicated search tool with hybrid retrieval |
| Context management | Agent discipline only | compact() + depth-aware read defaults |
| Progressive disclosure | Agent remembers lines="1-8" | Code defaults to header/summary per path |
| Synthesis | Agent integrates from polluted context | Integration brief → clean-room synthesis sub-agent |
| Sub-agent memory | Walled off (context refs only) | Read-only /memory/ + allowed tools per skill |
| Error handling | None | Retry on dispatch + failure guidance in system prompt |
| Dependency sequencing | Manual wave management by Agent | depends_on on dispatch, executor auto-sequences |
| Model routing | Agent=Opus, rest=Sonnet | Per-operation: Haiku/Sonnet/Opus (see §8) |
| Prompt caching | Not considered | Stable-first system prompt ordering |
| Context engineering | Classified as scaffolding | Permanent infrastructure |
| Search index | None | Embedding + metadata + recency, updated on writes |
| Filesystem | ✓ same | ✓ same |
| Memory / query language | ✓ same | ✓ same |
| Sessions | ✓ same | ✓ same |
| Negative Space | ✓ same (skill behavior) | ✓ same |
| Contrastive validation | ✓ same | ✓ same (contrastive uses Opus) |
| Counterfactual tracking | ✓ same | ✓ same |
| Evolution / MetaOptimizer | ✓ same (5+ corroboration bar) | ✓ same (now edits skill folders) |
| Guardrails | ✓ same | ✓ same |
| Output contracts | Unspecified | Structured YAML + free-form in synthesis skill |

---

## 19. The Bitter Lesson Audit

| Decision | Hardcoded? | Justification |
|----------|------------|---------------|
| 8 tools | Interface contracts | Like syscalls. Model decides when/how. |
| Depth defaults | Soft default, overridable | Nudges good behavior. Model always has depth='full'. |
| dispatch/collect | Interface design | Enables adaptive behavior the model controls. |
| depends_on | Mechanical sequencing | Code waits; model decides the dependency graph. |
| Skills (SKILL.md standard) | Open standard | Model interprets prompts. PM writes process. Scripts are deterministic helpers. |
| Model routing | Infrastructure config | Like instance types. Doesn't constrain intelligence. |
| Guardrails | Intentionally hardcoded | Risk limits SHOULD be code-enforced. |
| Search index | Infrastructure | Embedding backend is pluggable. Model queries it. |
| Integration brief pattern | Behavioral guidance | Agent can skip for simple queries. Not enforced. |
| Synthesis sub-agent | Behavioral guidance | Agent chooses when to use. Not code-enforced. |
| Retry support | Infrastructure | Model decides when to retry. Code handles mechanics. |

Nothing prevents a better model from doing everything in a single pass. The scaffolding dissolves. The permanent layer compounds.

---

## 20. Known Tradeoffs (Acknowledged, Not Over-Engineered)

| Tradeoff | Status | Mitigation |
|----------|--------|------------|
| Agent conversation accumulates noise over 15+ tool calls | Accepted | compact() for self-management; synthesis sub-agent for clean output |
| Dispatch/collect is not true Agent-side concurrency | Accepted | Honest docs; real value is plan adaptation + sub-agent parallelism |
| Integration brief quality depends on Agent | Accepted | Synthesis sub-agent has raw outputs; review catches major issues |
| Memory writes depend on Agent parsing synthesis | Accepted | Code-driven parsing of structured YAML recommended for production |
| Counterfactual detection depends on Agent discipline | Accepted | Scheduled counterfactual sweep recommended as future improvement |
| Search index backend unspecified | Accepted | Interface defined; backend is pluggable engineering decision |
