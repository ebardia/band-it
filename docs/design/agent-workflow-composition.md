# Agent workflow composition

| Field | Value |
|-------|--------|
| **Status** | Draft — captured for future implementation |
| **Parent** | [Agent Factory & Opportunity Discovery](./agent-factory-opportunity-discovery.md) |
| **Related** | [Pre-channel opportunity discovery](./pre-channel-opportunity-discovery.md) (first workflow template) |

---

## Overview

Band It bands do **not** switch between fixed “modes” (governance-only vs agent-only). Every band uses the **same optional, composable workflow model**:

- Run **classic** paths: discussions → proposals → projects → tasks (no agents).
- **Inject agents** at any point—or run agents only.
- **Stack** agents, pause for human review (task, project, proposal, label), then continue.
- **End** in a webhook, document, discussion post, or existing PM artifacts.

**Opportunity Discovery** (trapped stock) is the **first pre-built workflow template**, not a separate product shape.

---

## Core idea

A **workflow** is a band-owned graph (or linear stack in v1) of **nodes**. Each run produces **artifacts** passed edge-to-edge. Humans configure the graph; agents transform data; humans approve at human nodes.

```text
[ Agent ] → [ Agent ] → [ Human: task ] → [ Agent ] → [ Human: project ] → [ Webhook ]
                ↘ [ Proposal + vote ] ↗              ↘ [ Document ] ↗
```

All steps are **optional**. The band chooses daily workflow per use case—not per band type.

---

## Node types

Human and sink nodes **reuse existing Band It entities** where possible.

| Node type | Maps to existing product | Purpose |
|-----------|--------------------------|---------|
| **Agent** | Agent Factory catalog + `callAI` | Scan, filter, rank, draft, enrich |
| **Human — Label** | Artifact label (buy / maybe / not) | Lightweight checkpoint (Opportunity Desk) |
| **Human — Task** | `Task` | Quick review, call, verify one lead |
| **Human — Project** | `Project` | Larger execution chunk with tasks |
| **Human — Proposal** | `Proposal` + vote | Band commits money, policy, or mission |
| **Sink — Webhook** | New integration | POST structured JSON to customer systems |
| **Sink — Document** | `Documents` / generated export | PDF, memo, CSV |
| **Sink — Discussion** | Band post / channel | “Team, review these N items” |
| **Input — Discussion** | Optional trigger | Start from thread context (later) |

**Principle:** AI nodes **never approve** spend or policy. Proposal votes and human node completion advance the run.

---

## Artifacts and runs

| Concept | Description |
|---------|-------------|
| **Workflow** | Band-owned definition: ordered nodes (v1) or graph (later), config JSON, enabled/disabled |
| **WorkflowTemplate** | Platform-published starter (e.g. “Trapped stock — DMV”, “Grant scan”) |
| **WorkflowRun** | One execution; status; cost rollup; trace per node |
| **Artifact** | Structured JSON (+ optional UI schema) passed between nodes; typed per domain (lead, grant, candidate…) |
| **NodeRun** | State for one step: pending, running, waiting_on_human, completed, failed |

When a human node completes (task done, proposal approved, label submitted), the **orchestrator** resumes the run at the next node.

---

## Example workflows (same engine)

### Joe — agents only

```text
[Signal scanner] → [Channel exclude] → [Ranker] → [Label] → [Webhook]
```

### Joe — review before export

```text
[Scanner] → [Ranker] → [Task: Call top 3] → [Webhook]
```

### Mixed — agents, task, project, webhook, document

```text
[Agent A] → [Agent B] → [Task: review] → [Agent C] → [Agent D]
    → [Project: Pursue deal] → [Tasks…] → [Webhook] + [Document]
```

### Classic governance (zero agents)

```text
[Discussion] → [Proposal] → [vote] → [Project] → [Tasks…]
```

### Classic + one agent assist

```text
[Discussion] → [Agent: draft proposal] → [Proposal] → [vote] → [Project]
```

---

## Relationship to Opportunity Discovery

Opportunity Discovery is implemented as a **WorkflowTemplate**:

| Template stage | Node type | Factory agent(s) |
|----------------|-----------|------------------|
| Scan + stress | Agent | Signal scanner, stress scanner |
| Exclude gates | Agent | Entity classifier (S26), channel detector (S15), bankruptcy-PR (S27) |
| Rank | Agent | Fit stacker, ranker |
| Review | Human — Label | buy / maybe / not |
| Export (optional) | Sink — Webhook | Customer endpoint |

Bands may **fork** the template: add a Task node, remove Label and go straight to Webhook, stack extra agents, etc.

---

## Reuse of current codebase

**Keep and wire in—do not discard:**

| Existing | Role in workflow model |
|----------|------------------------|
| `Band`, `Member`, roles | Tenancy, who edits/runs/completes nodes |
| `Proposal`, `Vote` | Human — Proposal node |
| `Project`, `Task` | Human — Project / Task nodes |
| `callAI`, `AIInstruction`, usage logging | Agent nodes; per-band tuning; ~$10/run caps |
| `AuditLog` | Run trace, labels, webhook delivery |
| `Notification` | “Run complete”, “waiting on your task” |
| `Documents` | Document sink |
| Discussions | Input or discussion sink |
| Finance / buckets | When proposal node includes budget |

**New platform pieces:**

- Agent catalog (Factory)
- Workflow + WorkflowRun + NodeRun + Artifact store
- Orchestrator (resume after human nodes)
- Webhook sink + delivery log

---

## Band navigation (directional)

| Area | Purpose |
|------|---------|
| **Workflows** | Define and edit node stacks (templates + band copies) |
| **Runs / Inbox** | Active and recent runs; artifacts waiting on human nodes |
| **Proposals / Projects / Tasks** | Unchanged—also reachable as **node types** inside workflows |

Exact routes TBD (`/bands/[slug]/workflows`, etc.). Opportunity Desk may become **Inbox filtered to a discovery workflow** rather than a separate product silo.

---

## Orchestration (high level)

```text
1. User triggers run (manual or cron)
2. Orchestrator executes Agent nodes sequentially until:
   - next node is Human → create Task/Project/Proposal/Label wait state → pause run
   - next node is Sink → execute webhook/document → continue or complete
3. On human completion event → orchestrator loads artifact → runs next Agent nodes
4. Persist trace + cost on WorkflowRun
```

Short-circuit: skip Agent stages if upstream artifact empty (configurable).

---

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| UX too complex | v1: **linear stack only**; templates; no visual graph editor |
| Run state bugs | Explicit `NodeRun` status; idempotent resume |
| AI cost surprises | Per-node and per-run cost on `WorkflowRun`; band budget alerts |
| Scope creep | Ship trapped-stock template first; add node types incrementally |

---

## Phased delivery

| Phase | Scope |
|-------|--------|
| **v1** | Linear stack; nodes: **Agent**, **Label**, **Webhook**; one template (Opportunity Discovery / trapped stock) |
| **v1.5** | **Task** and **Project** as pausable human nodes; “promote artifact → task” |
| **v2** | **Proposal** node; **Document** sink; **Discussion** sink; workflow editor UI |
| **v3** | Branching graph; user-authored agents; marketplace templates per industry |

Opportunity Discovery Phase 1 build aligns with **workflow v1** (linear stack), not the full vision.

---

## Naming (working)

| Term | Meaning |
|------|---------|
| **Workflow** | Band-owned composed pipeline (preferred user-facing name) |
| **WorkflowTemplate** | Platform starter pack |
| **WorkflowRun** | Single execution |
| **Agent Factory** | Global catalog of agent node definitions |
| **Cat Bot traits** | Design language for intelligence agents — see [Cat Bot intelligence gathering](./cat-bot-intelligence-gathering.md) |
| **Artifact** | Data passed between nodes |

Avoid calling the composed unit a **Proposal**—that term remains band governance.

---

## Open questions

1. Visual graph editor vs form-based “stack list” for v2?
2. One active run per workflow vs parallel runs?
3. Artifact schema registry per domain pack vs free-form JSON?
4. Webhook signing, retries, and dead-letter queue?
5. Can a single Task node attach to an existing task or always create new?
6. Public bands: are workflow definitions and run outputs publicly visible (transparency principle)?

---

## Revision history

| Date | Change |
|------|--------|
| 2026-05-29 | Initial draft: flexible workflow composition, node types, phases, Opportunity Discovery as first template |
| 2026-06-11 | Glossary: Cat Bot traits link to [cat-bot-intelligence-gathering.md](./cat-bot-intelligence-gathering.md) |
