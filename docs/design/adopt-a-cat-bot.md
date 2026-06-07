# Adopt A Cat Bot — product design

| Field | Value |
|-------|--------|
| **Product name** | Adopt A Cat Bot (working) |
| **Domain** | [adoptacatbot.com](https://adoptacatbot.com) (target); App Store app later |
| **Status** | Draft — concept + v0 spec |
| **Parent** | [Design docs](./) |
| **Related** | [Platform & migration](./adopt-a-cat-bot-platform.md) (repo, Big Band hierarchy, keep/hide/new), [Work Smarter med spa demo](./signal-processing/worksmarter-medspa/worksmarter-medspa-discovery.md) (first neighborhood hypothesis), [Agent workflow composition](./agent-workflow-composition.md) (optional implementation substrate in monorepo) |
| **Audience** | Product, engineering, design, early adopters |

---

## 1. One-line pitch

**Adopt a specialized cat bot, unleash it to roam a neighborhood (any field or community), it learns from people first—especially in online communities—questions its first path, explores multiple angles, comes back with a structured report, and remembers only what its owner approves.**

---

## 2. Problem statement

### 2.1 What everyone experiences with chatbots

Large language models **rarely pivot on their own**. Once a conversation implies a direction, the model **executes and deepens** that frame instead of reframing:

| Observed pattern | Example from prior work |
|------------------|-------------------------|
| First frame sticks | “Find leads → get contact info” |
| Each answer deepens the same path | Lists, ads, directories, public records |
| Human must supply the reframe | Consent-first, personas, no physical touchpoints, no paid social |

ChatGPT seldom says unprompted: *“Wait—the whole contact-list frame may be wrong.”* Humans supply **reframes**; models **elaborate** the current frame.

### 2.2 Product opportunity

Productize **exploration before commitment**:

- Bounded **roam** in a symbolic **neighborhood** (vertical, geo, discipline, community)
- **Mandatory multi-angle** exploration—not one deep rut
- **Human-weighted learning** (people and owner corrections > generic web scrape)
- **Transparent bias** when cats offer opinions (especially marketing)
- **Persistent memory** that evolves only after human domestication

---

## 3. Core metaphor

| Cat metaphor | Product meaning |
|--------------|-----------------|
| **Adopt** | User chooses, names, and commits to a bot (relationship, not one-shot chat) |
| **Wild → domesticated** | Cat starts curious; owner approves what it **keeps** after each return |
| **Unleash to roam** | Agent explores a neighborhood with a mission—not a single query |
| **Neighborhood** | Bounded domain: “Potomac med-spa consent paths,” “DMV nonprofit gala world,” “reverse logistics SMB” |
| **Comes back** | Structured **return packet** (angles, evidence, traps, recommendations)—not endless chat |
| **Multiple cats** | User may adopt several bots with different missions, personas, or neighborhoods |
| **Monkeys and cats** | Opacity and “monkey business” rejected—biased cats **reveal their owner** |

---

## 4. Principles

| # | Principle | Implication |
|---|-----------|-------------|
| P1 | **Human in the loop** | Cats roam autonomously within rules; humans **approve memory**, **pick angles**, and **set mission** |
| P2 | **People > net (weighted)** | Online communities = human conversation; owner/SME corrections **override** thread consensus |
| P3 | **Forced self-questioning** | Self-pivot is **orchestrated** (required roam phases)—not spontaneous model whim |
| P4 | **Transparent bias** | Marketing or owner-aligned opinions are allowed; **owner identity and mission** are always disclosed |
| P5 | **Memory is gated** | Nothing becomes long-term knowledge without **Keep / Discard** (or equivalent) |
| P6 | **Evidence over vibe** | Community learnings cite **sources** (URLs, dates); opinions are labeled as opinions |
| P7 | **Bad learning is discardable** | Toxic, illegal, or stale advice goes to a **discard log**, not silent deletion |

---

## 5. What a Cat Bot is (and is not)

### 5.1 Is

- A **human-in-the-loop** specialized agent with a **world prompt** (story + constitution)
- A **community-reading researcher** that returns **artifacts**
- A **persistent persona** whose approved memory accumulates over roams
- Optionally **biased** (e.g. biz marketing) with **declared owner**

### 5.2 Is not

- A generic ChatGPT wrapper with a cute name
- A contact scraper or cold-outreach engine by default
- A fully autonomous strategist that changes business direction without owner input
- An offline brain that never calls an LLM (see §10)

---

## 6. Lifecycle

```text
ADOPT          ROAM                    RETURN              DOMESTICATE         ANSWER
(name,         (visit communities,     (3-angle report,    (owner Keep /       (serve from
 mission,       angle 1 → mirror →      STUCK_TRAP,         Discard on         approved
 world          angle 2 → angle 3)      evidence)           memories)          memory first)
 prompt)
     │               │                       │                    │                  │
     └───────────────┴───────────────────────┴────────────────────┴──────────────────┘
                                    repeat on schedule or on demand
```

### 6.1 Adopt

User provides (or selects from template):

- **Cat name** and optional persona flavor
- **Neighborhood** definition (topic, geo, discipline, exclusions)
- **Mission** for this adoption (what the cat is trying to learn or advise on)
- **World prompt** — long-form story + rules (see §7)
- **Owner profile** — who owns this cat; disclosure block for opinions

User may adopt **more than one cat**; each has its own memory, mission, and roam history.

### 6.2 Roam

Triggered manually (“go out”) or on schedule (e.g. weekly).

The cat:

1. Reads **approved prior memory** (if any) and **discard traps** (“don’t suggest contact lists”)
2. Explores **online communities** (Reddit, forums, public threads—read-only in v0)
3. Executes **three-angle protocol** (§8)
4. Produces a **return packet** (§9)—no promotion to long-term memory yet

### 6.3 Return

Owner (or delegate) reviews the packet:

- Which angles are credible?
- What goes to **approved memory**?
- What goes to **discard log**?
- Which angle should drive the **next roam** or business action?

### 6.4 Domestication (memory promotion)

**Domestication ≠ manual model training.** It is **curated memory**:

- Owner marks items: **Keep / Maybe / Discard**
- Only **Keep** enters `approved_memory`
- **Discard** is retained as explicit “we rejected this” (prevents re-learning bad paths)
- Owner free-text **corrections** outrank any community source

### 6.5 Answer (steady state)

Day-to-day questions are served **from approved memory first** (§10), with owner badge and citations. Full roam/API spend happens on schedule or explicit “go out again.”

---

## 7. World prompt (constitution)

~6 months prior work established that a **very long prompt** with story and clear instructions shapes behavior better than bullet lists alone.

Each cat ships with (or inherits) a **world prompt** containing:

| Block | Purpose |
|-------|---------|
| **Story / persona** | Who the cat is; tone; relationship to owner and neighborhood |
| **Roaming rules** | Where it may read; read-only vs post (v0: read-only); citation required |
| **Three-angle obligation** | Must not stop at first conclusion (§8) |
| **Self-questioning script** | Mandatory mirror step after angle 1 |
| **Return schema** | Fixed fields for every report (§9) |
| **Bias disclosure** | Must append owner block on any opinion |
| **Safety** | Illegal tactics, harassment, deception → discard, do not recommend |
| **Weighting** | Owner/SME corrections > community threads > generic web |

World prompt = **procedural memory** (how the cat behaves). It changes rarely compared to episodic/semantic memory.

---

## 8. Three-angle roam protocol

### 8.1 Why

Addresses **path dependency**: the first obvious read of a community (e.g. “buy leads,” “cold email”) is often wrong for consent-first or relationship-based goals.

### 8.2 Phases

| Phase | Name | Requirement |
|-------|------|-------------|
| 1 | **Angle A — First path** | Obvious community consensus; document thesis + evidence |
| 2 | **Mirror — Self-question** | “What did I overfit? Who is missing? If A is wrong, why?” |
| 3 | **Angle B — Contradict or stress-test** | Must differ from A in persona, channel, or assumption |
| 4 | **Angle C — Third lens** | Another distinct framing (e.g. opt-in vs hunt, SMB vs gala chair) |
| 5 | **Synthesis** | Compare angles; rank; name **STUCK_TRAP** |

### 8.3 “Pivot on their own” — honest framing

| Scope | Autonomy |
|-------|----------|
| **During roam** | Yes—if phases 2–4 are **mandatory** in the world prompt and orchestrator |
| **After report** | No—owner picks mission, angle, and what to keep |
| **Marketing claim** | “Cats question themselves **because the roam requires it**”—not because the model gained free will |

### 8.4 Learning from humans

Community threads provide:

- How people **phrase** problems and objections
- What they **reject** (e.g. cold DMs)
- What ** reportedly worked** (with skepticism and verification flags)

Cats do **not** download human cognition—they **extract patterns** from human text and owner corrections, returned as structured artifacts.

---

## 9. Return packet schema

Every roam **must** emit this shape (JSON or equivalent):

```json
{
  "roam_id": "cuid",
  "cat_id": "cuid",
  "neighborhood": "string",
  "mission": "string",
  "completed_at": "ISO-8601",
  "owner_disclosure": {
    "owner_name": "string",
    "owner_mission": "string",
    "bias_statement": "string"
  },
  "angle_1": {
    "thesis": "string",
    "evidence": [{ "source_url": "string", "quote_or_summary": "string", "observed_at": "date" }],
    "confidence": "low | medium | high"
  },
  "angle_2": {
    "thesis": "string",
    "contradicts_angle_1": "string",
    "evidence": [],
    "confidence": "low | medium | high"
  },
  "angle_3": {
    "thesis": "string",
    "lens": "string",
    "evidence": [],
    "confidence": "low | medium | high"
  },
  "stuck_trap": "What the first obvious path wanted us to do",
  "recommendation": {
    "ranked_paths": ["string"],
    "human_decision_needed": "string"
  },
  "do_not_do": ["Bad or rejected learnings from this roam"],
  "proposed_memory_items": [
    {
      "id": "temp-id",
      "kind": "fact | opinion | procedure | trap",
      "text": "string",
      "sources": [],
      "suggested_ttl_days": 90
    }
  ]
}
```

**UI rule:** Report is **read-only for promotion** until owner completes domestication review.

---

## 10. Memory architecture

### 10.1 Three layers

| Layer | Storage | Purpose | Changes when |
|-------|---------|---------|--------------|
| **Procedural** | `world_prompt` + roam orchestration | How cat behaves | Rarely (template updates) |
| **Episodic** | `episodic_log[]` | Full return packets per roam | Every roam |
| **Semantic** | `approved_memory[]` | Facts, opinions, traps owner kept | After domestication |
| **Negative** | `discard_log[]` | Rejected learnings and traps | After domestication |

### 10.2 Evolution

Cats **evolve** when:

1. Roams add episodic history
2. Owner promotes items to semantic memory
3. Owner corrections override prior facts
4. **Neighborhood map** improves (which subs/forums/keywords paid off)
5. **Rejected traps** accumulate (“don’t suggest X again”)

Evolution is **visible** (memory version or roam count)—not hidden weight changes in a foundation model.

### 10.3 Source weighting

When items conflict:

```text
owner_correction  >  sme_note  >  approved_prior_memory  >  new_community_thread  >  generic_web
```

### 10.4 TTL and staleness

Community-sourced **facts** carry `expires_at` (default **90 days** unless owner pins). Expired items trigger **re-verify** suggestion on next roam—not silent trust forever.

### 10.5 API usage tiers (answer path)

Cats **reduce** API calls by serving from memory; they **do not eliminate** LLM use entirely.

```text
User asks cat
      │
      ▼
Tier 0 — Template / FAQ     exact match on approved_memory     → 0 API
      │
      ▼
Tier 1 — Retrieve + cite      memory search + owner badge       → 0 API (or tiny format pass)
      │
      ▼
Tier 2 — Light synthesis      small model + retrieved chunks      → cheap API
      │
      ▼
Tier 3 — Full roam            communities + 3-angle protocol      → full API
```

| Query type | Typical tier |
|------------|--------------|
| “What did you learn about X?” | 0–1 |
| “Who owns you / what’s your bias?” | 0 |
| “What paths did we reject?” | 0–1 |
| “Does this new article change your angle?” | 2 |
| “Roam again on mission Y” | 3 |

**Do not promise** “zero API” or “fully own knowledge brain.” **Do promise** “answers from your cat’s approved memory first; roams on demand.”

### 10.6 Approved memory item schema

```json
{
  "id": "cuid",
  "cat_id": "cuid",
  "kind": "fact | opinion | procedure | trap | neighborhood_map",
  "text": "string",
  "sources": [{ "url": "string", "label": "string", "observed_at": "date" }],
  "owner_approved_at": "ISO-8601",
  "owner_approved_by": "user_id",
  "confidence": "low | medium | high",
  "expires_at": "ISO-8601 | null",
  "pinned": false,
  "supersedes_id": "cuid | null"
}
```

---

## 11. Transparent bias and owner disclosure

When a cat offers an **opinion** (especially marketing):

- Append **owner disclosure block** (name, mission, bias statement)
- Label **fact vs opinion** in UI
- Factual claims require **sources** or “owner correction” provenance
- Competing cats with different owners may disagree—**by design**

Example disclosure (also in return packet):

```text
This cat is owned by [Owner]. Mission: [mission]. It may favor paths that benefit [owner’s client or goal]. Facts cite sources; opinions are labeled.
```

---

## 12. Community learning (v0)

### 12.1 Sources

| Source | v0 | Notes |
|--------|-----|-------|
| Reddit (public threads) | Yes | Read-only; cite permalink |
| Forums / niche communities | Yes | Same |
| Owner/SME notes | Yes | Highest weight |
| Generic web search | Secondary | Fills gaps after community pass |

### 12.2 Constraints

- Respect **platform ToS** and rate limits
- **Read-only** in v0 (no posting as cat without explicit later feature)
- **Moderation**: items proposing illegal acts, harassment, or deceptive tactics → `do_not_do` + discard
- **Noise**: loud minorities, stale threads—confidence scores and TTL required

---

## 13. Multiple cat types (examples)

| Cat | Neighborhood | Mission |
|-----|--------------|---------|
| **Scout** | Broad vertical | Map communities and angles |
| **Persona** | Same neighborhood | Simulate one persona’s digital behavior |
| **Consent** | Same neighborhood | Only opt-in paths |
| **Skeptic** | Same neighborhood | Break other cats’ conclusions |

Cats may **cross-check** by comparing return packets; owner still decides.

---

## 14. Safety and moderation

| Risk | Mitigation |
|------|------------|
| Bad community advice persists | Discard log + no promotion without Keep |
| Illegal or harmful tactics | World prompt ban; `do_not_do` field; block promotion |
| Stale “facts” | TTL + re-verify on roam |
| Hidden marketing bias | Mandatory owner disclosure |
| Overfitting to first subreddit | Three-angle protocol + neighborhood map diversification |
| API cost runaway | Roam on schedule/button; tiered answer path; per-cat budgets |

---

## 15. Relationship to prior monorepo work

| Prior artifact | Relationship to Cat Bot |
|----------------|-------------------------|
| **Band It** (landing, agents, workflows) | Implementation substrate in this repo; **consumer product pivots** to Adopt A Cat Bot on new domain |
| [Work Smarter med spa demo](./signal-processing/worksmarter-medspa/worksmarter-medspa-discovery.md) | **First neighborhood hypothesis** — e.g. cat mission “digital consent paths for affluent DMV med-spa clients, no physical, no paid social” |
| [Agent workflow composition](./agent-workflow-composition.md) | Optional: roam = workflow run; domestication = human node |
| `AiHelpCache` (FAQ → cache → AI) | Precedent for **tiered answer path** (§10.5) |

The med-spa work validated the **problem** (path dependency toward contact hunting). Cat Bot is the **general product** response.

---

## 16. v0 hypothesis test

**One cat · one neighborhood · one roam · one domestication cycle**

| Field | Test value |
|-------|------------|
| **Cat** | “Potomac consent paths” |
| **Neighborhood** | Affluent DMV med-spa end clients; digital opt-in only |
| **Mission** | Map how target personas discover and consent—not cold contact |
| **Communities** | 2–3 relevant subs/forums + owner/SME note if available |
| **Success** | Return packet with 3 distinct angles, named STUCK_TRAP, actionable ranked paths |
| **Compare** | Quality vs linear doc-only agent chain |

After success: second roam using **approved memory**; measure Tier 0–1 answers without full roam.

---

## 17. Phased delivery

| Phase | Scope |
|-------|--------|
| **v0 — Concept proof** | Manual world prompt; one cat; scripted 3-angle roam; return packet JSON; spreadsheet or doc for domestication |
| **v1 — Product MVP** | Adopt UI; roam trigger; domestication Keep/Discard; approved_memory store; answer-from-memory; owner disclosure |
| **v1.5** | Multiple cats per user; scheduled roams; TTL expiry reminders |
| **v2** | Cat templates marketplace; skeptic/scout types; cross-cat compare view |
| **v3** | SME weighting integrations; optional post-as-cat (with strict policy); embedding search |

---

## 18. Data model (conceptual)

Org hierarchy and platform migration: [adopt-a-cat-bot-platform.md §3–7](./adopt-a-cat-bot-platform.md).

```text
User
 └── Member[] → Big Band | Band
       Big Band (reseller)
         └── Band (client) — the "musical band" cats belong to
               └── CatBot[]
                     ├── world_prompt, owner_profile, neighborhood_config
                     ├── RoamRun[]        → return packets (episodic)
                     ├── MemoryItem[]     → approved / discard (semantic)
                     └── roam_schedule
```

**Proposals, projects, and tasks are not part of this model** — legacy Band It only; hidden from Cat Bot product.

---

## 19. Naming (working)

| Term | Meaning |
|------|---------|
| **Cat Bot** | Specialized human-in-the-loop agent |
| **Adopt** | User creates or claims a cat |
| **Neighborhood** | Bounded learning domain |
| **Roam** | One exploration run (3 angles) |
| **Return packet** | Structured roam output |
| **Domesticate** | Owner approves what enters long-term memory |
| **STUCK_TRAP** | First-path bias the cat was trained to escape |

Avoid **Car Bot** in user-facing copy (typo in early email).

---

## 20. Open questions

1. ~~Exact new domain~~ → **adoptacatbot.com** (see [platform doc](./adopt-a-cat-bot-platform.md))
2. Reddit/data provider strategy for production (official API vs manual paste in v0)?
3. Public vs private cats (can others view a cat’s approved opinions)?
4. Embedding search vs structured tags for memory retrieval in v1?
5. Pricing: per roam, per cat, memory storage, or subscription?
6. Legal review for “biased marketing cat with disclosed owner”?
7. Can one cat’s memory fork into a child cat (lineage)?
8. Cat song format when we ship that layer (see [platform doc §3.2](./adopt-a-cat-bot-platform.md))?

---

## 21. Email excerpt (archived intent)

Source: founder email to friend (lightly edited).

> A Cat Bot is a human-in-the-loop AI bot. It is a wild cat that gets domesticated through training—but not necessarily by manual training. These cats are very specialized and when unleashed they go and learn from online communities where people discuss niche subjects.
>
> When they have learned enough they can offer opinions, maybe biased opinions (think biz marketing) but in a transparent way. If they offer biased opinions they reveal their owner so there is no monkey business. Monkeys and cats don’t get along.
>
> Unlike traditional AI models where they start in a direction and go deeper without questioning themselves, these cats are trained to question themselves: go one route, turn around, go a different route and maybe a third. They are told to learn reasoning, creativity, and problem solving from humans.

**Design mapping:** domestication = §6.4; communities = §12; transparent bias = §11; three routes = §8; learn from humans = §8.4 with orchestration caveats in §8.3.

---

## 22. Revision history

| Date | Change |
|------|--------|
| 2026-05-29 | Initial design doc: product pivot, lifecycle, 3-angle roam, memory, API tiers, schemas, v0 test, phased delivery |
| 2026-05-29 | §18: Big Band → Band → Cat hierarchy; link to platform doc; adoptacatbot.com |
