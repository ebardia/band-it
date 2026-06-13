# Cat Bot intelligence gathering — design

| Field | Value |
|-------|--------|
| **Status** | Design — extends Agent Factory + Opportunity Discovery |
| **Parent** | [Pre-channel opportunity discovery](./pre-channel-opportunity-discovery.md), [Agent workflow composition](./agent-workflow-composition.md) |
| **Product** | [Adopt A Cat Bot](./adopt-a-cat-bot.md) (consumer) · Band It Agent Factory (implementation substrate) |
| **Reference vertical** | VetDesk — vertical SaaS selling to independent veterinary clinics |
| **Pre-channel instance** | Reverse logistics / trapped stock (Track A) — same architecture, different signals |

---

## 1. Concept

**Cat bots** are specialized intelligence-gathering agents, each modeled on a **cat trait**. Instead of dashboards full of raw signals, they deliver **vetted findings** (“dead mice”). The fleet is a **clowder** — bots that work independently but share a common **entity graph**.

This extends the existing **Agent Factory** architecture (pre-channel opportunity discovery) with a **trait-based bot design pattern** and a worked vertical example.

```text
Named accounts / entities
        ↓
Clowder of trait-specialist cats (patrol, whiskers, night vision, …)
        ↓
Shared entity graph (entities · signals · findings)
        ↓
Dead mice (3–5 vetted findings / week) — NOT a raw signal dashboard
        ↓
Human checkpoint (would buy / maybe / not) → trains pounce thresholds
```

**Differentiation (guides all design decisions):** Existing platforms sell **breadth at low resolution**. Cat bots sell **persistent, named-account observation** at a resolution where big platforms have no data at all.

---

## 2. The seven traits → bot behaviors

| # | Trait | Behavior | Implementation sketch |
|---|--------|----------|------------------------|
| 1 | **Stalking** | Patient observation — passive long-term monitoring of named target accounts. Watches quietly over weeks; **pounces** only when a real pattern emerges — never noisy per-event alerts. | Per-entity signal accumulation with pattern thresholds; alert fires only when multiple correlated signals cross a confidence threshold. |
| 2 | **Territory patrol** | Scheduled change detection — crawls the same sources on a schedule (pricing pages, job boards, leadership/about pages) and flags **deltas**, not raw data. | Scheduled diff jobs per source per entity; store snapshots; surface only changes. |
| 3 | **Whiskers** | Weak-signal detection — subtle shifts: hiring slowdowns, tone changes in press releases, exec LinkedIn activity changes. | AI analysis comparing current vs. historical content for tone/pattern shifts; low-confidence signals accumulate rather than alert. |
| 4 | **Curiosity** | Auto side-investigation — when any bot encounters an unknown entity (new competitor, new vendor, regional consolidator), spawns a one-off investigation and adds the result to the shared entity graph. | Unknown-entity detection triggers a bounded research task; results enrich the entity graph. |
| 5 | **Dead mouse** | **The deliverable** — the product is NOT a dashboard. Each bot delivers **3–5 vetted findings per week**, each formatted as: entity, what happened, why it matters, opportunity window, evidence links. | A **Finding** object with structured fields (entity, narrative, opportunity window, confidence, source links). Primary output surface. |
| 6 | **Night vision** | Low-visibility sources — state licensing board minutes, practice-brokerage listings, Chamber announcements, niche forums/subreddits, regional press, regulatory filings. | Configurable **SourceRegistry** per vertical including non-standard sources; these are the differentiation. |
| 7 | **Clowder** | Fleet coordination — multiple specialist bots (pricing cat, hiring cat, funding cat, licensing cat) work mostly alone but share entity tags in a common graph. Not a hive mind — loose coordination through shared data. | Shared entity graph (entities, signals, findings, relationships); each bot reads/writes the graph independently. |

**Strongest product metaphor:** *Brings you a dead mouse* — the difference between dashboards full of raw signals and an agent that delivers **one vetted finding**.

---

## 3. Worked example — VetDesk

Use this as the **reference implementation pattern** for vertical SaaS whose buyers are too small or offline for intent-data platforms.

### 3.1 Target market

| Field | Value |
|-------|--------|
| **Company** | VetDesk — 15-person vertical SaaS |
| **Product** | Practice-management software for **independent** veterinary clinics (not chains) |
| **Economics** | ~$8k ACV · ~30,000 target clinics · sales-led |
| **Incumbent stack problem** | ZoomInfo contacts, Apollo sequences, 6sense intent — intent data barely registers for six-person clinics; firmographics go stale |
| **Wedge** | Niche sits **below the resolution of mainstream BI** |

**Same pattern applies to:** dental, HVAC, funeral homes, marinas — any vertical where buyers are too small/offline for Bombora-style intent.

### 3.2 The clowder (VetDesk)

| Cat | Role |
|-----|------|
| **Territory Cat** | Patrols ~2,000 named clinics weekly — website, Google Business, Yelp, state vet-board licenses. Not searching; **noticing deltas**: new associate on team page, hours changed, “now accepting new patients,” second location. |
| **Whisker Cat** | Weak composite signals: receptionist job mentioning Cornerstone (current stack); owner license renewal lapse (retirement → sale → re-evaluation window); reviews citing long hold times. |
| **Night Vision Cat** | Sources platforms barely index: state vet-board minutes, practice-brokerage listings, Chamber announcements, VIN/vet subreddit threads complaining about specific software. |
| **Curiosity Cat** | Unknown clinic or regional consolidator buying practices → bounded side investigation → entity added to graph. |

### 3.3 Example dead mouse

Delivered to VetDesk’s salesperson (not a dashboard row):

```text
Maple Creek Animal Hospital (Boise) — practice listed with a broker in March;
license transferred to Dr. Sarah Kim on May 28; she posted two front-desk job
listings yesterday mentioning "transitioning systems." New owner, actively
re-evaluating software, ~30-day window. Evidence: three source links.
```

---

## 4. Integration with existing Agent Factory work

Cat traits are the **design language and behavioral spec** for the same pipeline as pre-channel pallet discovery:

```text
signal scanner → channel detector → legitimacy → fit → rank → human checkpoint
```

| Existing factory agent | Cat trait mapping |
|------------------------|-------------------|
| **Signal scanner** | Territory patrol + whiskers |
| **Channel detector** | Stalking threshold logic (pattern before pounce) |
| **Entity classifier / legitimacy** | Clowder graph hygiene; exclude rules |
| **Ranker** | Confidence stack before dead-mouse promotion |
| **Human checkpoint** | Customer labels: would buy / maybe / not — **trains pounce thresholds** |
| **Opportunity Desk / daily digest** | **Dead mouse delivery** — primary output surface |

| Vertical | Instance |
|----------|----------|
| Reverse logistics / trapped stock | [Pre-channel opportunity discovery](./pre-channel-opportunity-discovery.md) — S01–S30 signals, exclude gates |
| Vertical SaaS (VetDesk pattern) | Named-account clowder + night-vision sources |
| Med spa / local B2C | [Adopt A Cat Bot roam lab](./adopt-a-cat-bot.md) — Scout/Consent/Publish/Social cats (marketing lane) |

**Rule:** Do not fork architecture per vertical — fork **SourceRegistry**, **BotConfig**, and signal catalogs; share Entity · Signal · Finding graph.

---

## 5. Data model additions

| Model | Purpose |
|-------|---------|
| **Entity** | Companies/accounts being watched; nodes in shared graph |
| **Signal** | Raw observations tied to entities — type, source, confidence, timestamp |
| **Finding** | The dead mouse: entity, narrative, opportunity window, confidence, evidence links, `delivered_at`, `customer_feedback` |
| **SourceRegistry** | Per-vertical source lists including night-vision sources |
| **BotConfig** | Which traits/behaviors are active per bot, per vertical |

**Finding (conceptual fields):**

```typescript
// Conceptual — not implemented schema yet
Finding {
  entityId
  narrative          // what happened
  whyItMatters       // buyer-facing reasoning
  opportunityWindow  // e.g. "~30 days"
  confidence         // 0–1 or tier
  evidenceLinks[]    // citations required
  deliveredAt
  customerFeedback   // buy | maybe | not + why
  botId              // which cat caught it
}
```

---

## 6. What to build first

Do **not** build all seven traits at once.

| Priority | Build | Why |
|----------|-------|-----|
| **1** | **Territory patrol** — scheduled change detection on a SourceRegistry | Proves repeatable observation loop |
| **2** | **Dead mouse delivery** — Finding object + simple weekly digest view | Product output surface |
| **3** | **Shared entity graph** — minimal entities + signals + findings | Clowder foundation |

**Defer until loop works end-to-end:** stalking thresholds, whiskers AI diff, curiosity auto-spawn, full clowder coordination.

Aligns with [signal-processing build sequencing](./signal-processing/README.md#build-sequencing-v0): scripts prove patrol → finding JSON first; then House Band / Opportunity Desk UI.

---

## 7. Open questions (before implementation)

| # | Question |
|---|----------|
| **1** | How does this integrate with existing pre-channel discovery tables — **extend them or new tables**? |
| **2** | What is the simplest scheduled-job setup for territory patrol given our existing infrastructure? |
| **3** | Where should the Findings digest view live — inside the existing **Opportunity Desk** (Pallet Hunter workflow), or a separate **Findings** surface both workflows share? |

**Working hypotheses (for discussion, not decided):**

- **Tables:** Extend Opportunity Discovery schema with `Entity`, `Signal`, `Finding` rather than parallel silos; pre-channel rows become vertical-specific signal types on the same graph.
- **Scheduling:** Agent workflow **scheduled Agent nodes** (see [agent-workflow-composition.md](./agent-workflow-composition.md)) + snapshot store for diffs; v0 lab uses cron + Python scripts in `signal-processing/scripts/`.
- **UI:** Opportunity Desk becomes **inbox filtered to Findings** for discovery workflows; ranked opportunity list and weekly dead-mouse digest are two views on the same graph.

---

## 8. Document map

| Doc | Relationship |
|-----|--------------|
| [pre-channel-opportunity-discovery.md](./pre-channel-opportunity-discovery.md) | Track A vertical — trapped stock signals S01–S30 |
| [pre-channel-ai-discovery-analysis.md](./pre-channel-ai-discovery-analysis.md) | Deep analysis of pre-channel playbook |
| [agent-workflow-composition.md](./agent-workflow-composition.md) | Workflow nodes: Agent · Label · Webhook |
| [adopt-a-cat-bot.md](./adopt-a-cat-bot.md) | Consumer product — roam, domesticate, certify |
| [signal-processing/README.md](./signal-processing/README.md) | Scripts, APIs, vertical folders |
| [band-it-outbound-discovery.md](./signal-processing/band-it-outbound-discovery.md) | Dogfood SMB outbound — same signal playbook |
| [dmv-marketing-agency-cat-bot-discovery.md](./signal-processing/dmv-marketing-agency-cat-bot-discovery.md) | Cat Bot **adoption agency** prospects — DMV marketing shops |

---

## 9. Revision history

| Date | Change |
|------|--------|
| 2026-06-11 | Initial design: seven traits, VetDesk reference, Agent Factory mapping, data model, build order, open questions |
