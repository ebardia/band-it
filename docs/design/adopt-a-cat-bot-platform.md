# Adopt A Cat Bot — platform & migration design

| Field | Value |
|-------|--------|
| **Product** | [Adopt A Cat Bot](./adopt-a-cat-bot.md) |
| **Domain** | [adoptacatbot.com](https://adoptacatbot.com) (target); mobile app (App Store) later |
| **Codebase** | Existing **band-it** monorepo — evolve in place, do not greenfield copy |
| **Status** | Draft — decisions captured 2026-05-29 |
| **Parent** | [Design docs](./) |
| **Related** | [Cat Bot product spec](./adopt-a-cat-bot.md), [Big Band design](../big-band-design.md), [Work Smarter med spa demo](./signal-processing/worksmarter-medspa/worksmarter-medspa-discovery.md) |

---

## 1. Summary of decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Repository** | Keep **same monorepo** (`band-it` → rename when ready) | No Band It customers; auth, files, audit, AI, Big Band already wired; copy-paste new repo would delay exploration |
| **Band It product** | **Not shipped**; kept as **fallback in git** if Cat Bot direction fails | Exploring new direction only |
| **Governance features** | **Hide** from nav/routes; **do not repurpose** | Proposals, projects, tasks, etc. are unrelated to cats |
| **Org model** | **Reuse Big Band → Band** hierarchy | Reseller = Big Band; end clients = Bands |
| **Cat Bot domain** | **New models** under Band | Cat inventory, roams, memory — not mapped from tasks |
| **Signal processing** | Stays in **design docs + scripts** (v0) | Feeds cat neighborhood/target config; not embedded in app initially |
| **First band on platform** | **House Band** (internal dogfood) | Roaming cats for signal tuning, reseller dossiers, med-spa lab — before customer Big Band demos |
| **Build sequencing** | **Scripts prove roam → JSON first**; then House Band on adoptacatbot | Avoid empty UI; tune signals from real API output before Prisma/UI |
| **First vertical** | Marketing cats; med spa via Work Smarter demo | One cat in inventory at a time |
| **Forum mingling** | **New code** + policy (read/post, moderation, disclosure) | Not in Band It today |
| **Brand metaphor** | Bands are **musical groups for cats**; **cat songs** later | Symbolic layer on hierarchy — optional future feature |

---

## 2. Repository strategy

### 2.1 Decision: same repo, new product surface

**Do not** create a second repository and copy slices of Band It.

The pieces worth reusing (auth, `Band`, files, `AuditLog`, AI clients, email, admin waiting room) are **deeply coupled** to the existing monorepo. A copy would recreate the same structure with weeks of wiring bugs.

**Do** evolve the existing turbo monorepo:

```text
band-it/                          → rename later: adopt-a-cat-bot/
├── apps/
│   ├── api/                      slim active routers + new cat routers
│   ├── web/                      adoptacatbot.com
│   └── mobile/                   later (Expo) — shares packages/shared
├── packages/
│   └── shared/                   Cat types, roam schemas, disclosure blocks
├── docs/design/
│   ├── adopt-a-cat-bot.md        product spec
│   ├── adopt-a-cat-bot-platform.md   (this doc)
│   └── signal-processing/        external to app core (v0)
└── docs/big-band-design.md       hierarchy reference (partial reuse)
```

### 2.2 Band It as fallback

- **No live Band It customers** — no obligation to maintain governance UI.
- Legacy code remains in repo and on a **tag or branch** (`band-it-legacy`) if needed for reference.
- If Cat Bot exploration fails, revert or fork from that point — **not** by running two products in parallel now.

### 2.3 Deployment

- **adoptacatbot.com** → same `apps/web` deployment with new branding and routes.
- Env flag acceptable for v0: `NEXT_PUBLIC_PRODUCT=catbot` to hide legacy nav.
- App Store app later: `apps/mobile` + same API (monorepo advantage).

---

## 3. Organization hierarchy (Big Band → Band → Cat)

### 3.1 Mapping

```text
Big Band                    Reseller / agency (e.g. Work Smarter Digital)
  └── Band (sub-band)       End client (e.g. Potomac Skin Care)
        └── CatBot[]        Marketing cats — niche inventory, one at a time
              ├── RoamRun[]
              └── MemoryItem[]
```

| Layer | Real-world example | Product role |
|-------|-------------------|--------------|
| **Big Band** | Work Smarter Digital (HighLevel white-label reseller) | Roster of client bands; optional shared templates, billing |
| **Band** | Potomac Skin Care | **Musical band** the cats belong to; client identity & disclosure |
| **CatBot** | “Potomac consent paths” marketing cat | Specialized agent: roam, learn, offer transparent opinions |
| **RoamRun** | One 3-angle outing | Episodic learning (see [product spec §8–9](./adopt-a-cat-bot.md)) |
| **MemoryItem** | Owner-approved fact/opinion/trap | Domesticated long-term knowledge |

### 3.2 Musical bands (symbolic layer)

Bands are not just CRM records — they are **musical groups for cats**:

| Musical metaphor | Cat Bot |
|------------------|---------|
| The group | **Band** (client) |
| The label / roster | **Big Band** (reseller) |
| Band member with a role | Each **cat** (niche, persona, mission) |
| The band’s sound | **World prompt + approved memory** |
| A **cat song** (future) | Packaged roam synthesis or on-brand narrative — repeatable “how this group speaks” |

**Cat songs** are **not in v0 scope**. Document as future delight: generated copy, campaign chorus, or published roam report in the band’s voice.

### 3.3 What this is NOT

**Proposals, projects, tasks, and checklists are unrelated to cats.**

| Band It artifact | Cat Bot |
|------------------|---------|
| Proposal | *(unused — hide from product)* |
| Project | *(unused — hide from product)* |
| Task / checklist | *(unused — hide from product)* |
| Calendar, posts, newspaper, Talk It Out | *(unused — hide from product)* |

There is **no mapping** “project → roam” or “task → memory.” Cats use **new tables and new UI** only.

The sole structural reuse at the org level is:

> **Band** = container for an owner’s world (now: **cats**, not governance workflows).

### 3.4 Codebase reuse for Big Band

Already implemented (see [big-band-design.md](../big-band-design.md)):

| Feature | Reuse for Cat Bot? |
|---------|-------------------|
| `Band.parentBandId`, `Band.isBigBand` | **Yes** |
| Sub-band creation under Big Band | **Yes** |
| Display: `Work Smarter > Potomac Skin Care` | **Yes** |
| Admin `createBigBand` | **Yes** (demo setup) |
| Big Band bundled billing | **Later** |
| Cross-band policies, governance on Big Band | **No** (deferred / out of scope) |
| Big Band proposals/projects/tasks | **No** (hidden) |

### 3.5 House Band (internal dogfood)

The **first Band on adoptacatbot.com** is not a customer — it is the **House Band**: the operator’s internal org for dogfood, signal tuning, and roaming cat bots before Work Smarter-scale Big Band demos ship.

```text
House Band (Band — standalone or operator Big Band)
  └── CatBot[]     internal roster, e.g.:
        ├── DMV Reseller Scout     → O-signal dossiers, Big Band prospecting
        ├── Outreach Intel Cat     → pre-email roam + openers
        └── Market Cat (med spa)   → Places + Yelp + Reddit lab vertical
              ├── RoamRun[]        → import from scripts, later API-triggered
              └── MemoryItem[]     → approved traps, stack facts, pitch frames
```

| Role | House Band | Customer Big Band (later, e.g. Work Smarter) |
|------|------------|-----------------------------------------------|
| **Purpose** | Tune signals, store roam JSON, iterate openers | White-label cats for end-client Bands |
| **Data** | Seed CSVs, dossier JSON, signal registries | Client-facing memory + disclosure |
| **Cats** | Scout / intel types + vertical lab cats | Marketing cats per sub-band |
| **APIs** | Full lab stack; script-first | Subset exposed via product UI |

**Why House Band exists:** Central place to **adjust signals**, **re-run roams**, and **domesticate memory** without waiting for reseller onboarding. Product spec value layer: [adopt-a-cat-bot.md §5.3](./adopt-a-cat-bot.md#53-value-on-top-of-public-sources-google-yelp-reddit-).

**Sequencing:** Prove roam output in Python (`run_cat_bot_roam_v0.py`, future `run_reseller_dossier_v0.py`) → import JSON as first `RoamRun` records under House Band → add trigger UI. Do not embed detectors in `apps/api` until packet shape is stable (§6.4–6.5).

---

## 4. Reference scenario: Work Smarter + med spa

| Entity | Name | Notes |
|--------|------|-------|
| Big Band | Work Smarter Digital | HighLevel reseller; manages many spa clients |
| Band | Potomac Skin Care | Dr. Jovy Eusebio; gold-path hypothesis in [med spa demo](./signal-processing/worksmarter-medspa/worksmarter-medspa-discovery.md) |
| CatBot (v0) | e.g. “Potomac Consent Cat” | Marketing cat; neighborhood = affluent DMV med-spa **digital opt-in**; no cold contact |
| Signal processing | External CSV/scripts | Layer A/B signals inform **targets and neighborhood** — not stored as Band It projects |

**Positioning vs reseller stack:** Cat Bot complements GHL / LaaS / voice capture — see [product spec §5.4](./adopt-a-cat-bot.md#54-sits-on-the-capture-stack-anti-cannibalization) and [reseller outreach intel §9](./signal-processing/dmv-smb-tech-reseller-outreach-intel.md#9-anti-cannibalization-sits-on-the-capture-stack).

---

## 5. Transparent disclosure (two levels)

When a cat mingles in forums or offers opinions, disclosure uses **both** band and Big Band when applicable:

```text
I'm [Cat Name], a marketing cat for Potomac Skin Care.
This band is on the roster of Work Smarter Digital.
Mission: [mission]. I may favor paths that benefit my band's goals.
Facts cite sources; opinions are labeled.
```

| Level | Discloses |
|-------|-----------|
| **Band** | End client the cat speaks for |
| **Big Band** | Reseller/agency (when `parentBandId` set) |
| **Cat** | Specific niche, mission, bias statement |

See [product spec §11](./adopt-a-cat-bot.md) for return-packet fields.

---

## 6. Platform: keep, hide, build new

### 6.1 Keep (active platform)

| Area | Use in Cat Bot |
|------|----------------|
| **Auth** — register, login, verify, waiting room | Unchanged |
| **User**, **admin** | Unchanged |
| **Band**, **Member**, invites | Workspace + team |
| **Big Band** / sub-band hierarchy | Reseller → client |
| **File** | Roam exports, cat assets, reports |
| **AuditLog** | Roam actions, domestication, forum activity |
| **AIUsage**, `callAI` / Gemini | Roam + answer tiers |
| **Email service** | Verification, notifications |
| **Stripe** (optional v1) | Per Big Band or per Band subscription |

### 6.2 Hide (legacy Band It — do not delete schema yet)

Remove from **navigation and primary routes**; do not build Cat Bot on these:

- Proposals, votes, proposal AI  
- Projects, tasks, checklists, reorder  
- Calendar / events  
- Channels, messages, discussions  
- Posts, newspaper, daily feed, discover  
- Talk It Out  
- Donations, finance buckets, dues  
- Onboarding flows tied to governance  
- Quick actions (vote, checklist, etc.)  

**Implementation:** route gating, nav config, `NEXT_PUBLIC_PRODUCT=catbot`. Tables may remain until Phase 3 cleanup.

### 6.3 Build new (Cat Bot product)

| Component | Description |
|-----------|-------------|
| **Prisma models** | `CatBot`, `RoamRun`, `MemoryItem` (+ enums: memory kind, roam status, approval state) |
| **API router** | `catBot` — adopt, list, roam trigger, domestication, answer-from-memory |
| **Web routes** | `/`, `/cats`, `/bands/[slug]/cats`, `/cats/[id]`, domestication review UI |
| **Cat inventory UI** | One niche cat at a time in catalog; band-scoped adoption |
| **Forum module** | Read communities (v0); post with disclosure (later); moderation queue |
| **Publish Cat (guest posts)** | Design: [guest-post-publish-cat-potomac-skin-care.md](./signal-processing/worksmarter-medspa/guest-post-publish-cat-potomac-skin-care.md) — not implemented until client-active |
| **Social Cat (organic copilot)** | Design: [social-cat-campaign-copilot-potomac-skin-care.md](./signal-processing/worksmarter-medspa/social-cat-campaign-copilot-potomac-skin-care.md) — weekly plan + drafts; human publishes; not implemented until client-active |
| **Marketing site** | adoptacatbot.com landing — adopt narrative |

Product behavior (3-angle roam, memory tiers, world prompt): [adopt-a-cat-bot.md](./adopt-a-cat-bot.md).

### 6.4 Signal processing (outside app core, v0)

| Location | Role |
|----------|------|
| `docs/design/signal-processing/` | Signal catalogs, playbooks, hypothesis CSVs |
| Python scripts (e.g. outbound v1) | Offline ranking; outputs feed **cat neighborhood config** |
| Not in `apps/api` initially | Avoid coupling app to vertical-specific detectors |

Flow:

```text
Signal scripts / SME research  →  neighborhood + target brief  →  CatBot config  →  roam
```

### 6.5 Build sequencing (v0 — decided 2026-06-08)

| Step | Where | Outcome |
|------|--------|---------|
| **1. Script proof** | `docs/design/signal-processing/scripts/` | Real API output: Places, Yelp, news; reseller dossier JSON (O-signals) |
| **2. House Band shell** | adoptacatbot — Prisma `CatBot`, `RoamRun`, `MemoryItem` | Import roam JSON; view packet; domesticate |
| **3. Roam in product** | API worker calls same logic as scripts | Adjust `neighborhoodConfig` / signal refs → re-roam |
| **4. Customer Big Band demo** | Work Smarter + Potomac sub-band | External-facing white-label story |

**Rule:** Do not build detectors inside the app before step 1 produces stable return packets. Exception: static demo UI with pre-generated JSON for an external meeting.

**API priority by track:**

| Track | Prove first | Defer |
|-------|-------------|-------|
| Med spa Market Cat | Google Places (New), Yelp Fusion, news RSS | Reddit until Data Access approved |
| Reseller outreach | Homepage fetch, partner dirs, news | Places/Yelp (low signal for B2B agencies) |

---

## 7. Data model (platform)

### 7.1 Hierarchy

```text
User
 ├── Member[] → Band | Big Band
 └── (optional direct cat admin)

Big Band (Band where isBigBand = true, parentBandId = null)
 └── subBands[] (Band where parentBandId = bigBand.id)
       └── CatBot[]
             ├── RoamRun[]
             └── MemoryItem[]   (approved | pending | discarded)
```

### 7.2 New models (sketch)

**CatBot**

| Field | Notes |
|-------|-------|
| `id`, `bandId` | FK to client Band |
| `slug`, `name` | Inventory identity |
| `status` | draft \| active \| paused |
| `worldPrompt` | Constitution + story |
| `neighborhoodConfig` | JSON — topic, geo, communities, exclusions |
| `mission`, `biasStatement` | Disclosure |
| `ownerDisclosureJson` | Rendered block for forum/posts |
| `signalBriefRef` | Optional link/path to external signal artifact |
| `createdById`, timestamps | |

**RoamRun**

| Field | Notes |
|-------|-------|
| `catBotId` | |
| `status` | running \| completed \| failed |
| `returnPacket` | JSON — [schema in product spec §9](./adopt-a-cat-bot.md) |
| `startedAt`, `completedAt` | |
| `apiCostTokens` | Rollup |

**MemoryItem**

| Field | Notes |
|-------|-------|
| `catBotId` | |
| `roamRunId` | Source roam (nullable if owner correction) |
| `kind` | fact \| opinion \| procedure \| trap \| neighborhood_map |
| `text`, `sources` | JSON |
| `approvalState` | pending \| approved \| discarded |
| `approvedById`, `approvedAt` | |
| `expiresAt`, `pinned` | TTL |
| `supersedesId` | Optional lineage |

**No FK from CatBot to Proposal, Project, or Task.**

---

## 8. Navigation & routes (target v1)

### 8.1 Show

| Route / area | Purpose |
|--------------|---------|
| `/` | adoptacatbot.com landing |
| `/login`, `/register`, `/waiting-room` | Auth |
| `/bands/my-bands` | User’s bands |
| `/bands/[slug]` | Band home → **cats** (not proposals) |
| `/bands/[slug]/cats` | Cat inventory for client band |
| `/cats/[catId]` | Cat detail, roams, memory, disclose |
| `/cats/[catId]/domesticate/[roamId]` | Keep / Discard review |
| Big Band routes | Sub-band list, create sub-band (reseller) |
| `/admin/*` | Waiting room, users (trimmed) |

### 8.2 Hide

All routes under `/bands/[slug]/proposals`, `/projects`, `/tasks`, `/calendar`, `/posts`, `/finance`, `/talk-it-out`, `/daily`, `/discover`, etc.

---

## 9. Implementation phases

| Phase | Scope | Band It legacy |
|-------|--------|----------------|
| **0 — Fork surface** | New landing (adoptacatbot.com); hide legacy nav; env flag | Code remains, unlinked |
| **0b — Roam lab proof** | Places + Yelp + dossier scripts; tune signals from JSON output | N/A (scripts only) |
| **1 — House Band** | Seed House Band + 1–2 cats; import roam JSON as RoamRun; domesticate UI | Hidden |
| **2 — First customer cat** | Work Smarter Big Band + Potomac sub-band + Market Cat; one roam cycle in app | Hidden |
| **3 — Forum read** | Community read-only for roam; citations in return packet | Hidden |
| **4 — Forum post** | Disclosed opinions; moderation queue | Hidden |
| **5 — Schema cleanup** | Drop unused models/migrations if direction confirmed | Removed |
| **6 — Mobile** | Expo app; same API | N/A |
| **Future** | **Cat songs** — packaged band voice content | N/A |
| **Future** | **Publish Cat** — guest post pipeline when working with client band | See [guest-post design](./signal-processing/worksmarter-medspa/guest-post-publish-cat-potomac-skin-care.md) |
| **Future** | **Social Cat** — organic social weekly copilot when working with client band | See [social-cat design](./signal-processing/worksmarter-medspa/social-cat-campaign-copilot-potomac-skin-care.md) |

---

## 10. Cat Bot type (v0 focus)

| Attribute | v0 choice |
|-----------|-----------|
| **Purpose** | Marketing bots |
| **Inventory** | Very niche; **one cat at a time** in catalog |
| **Learning** | Online communities (read v0); 3-angle roam |
| **Output** | Transparent opinions + evidence |
| **Owner** | Band (+ Big Band in disclosure) |

Other cat types (scout, skeptic, persona) — see [product spec §13](./adopt-a-cat-bot.md); later inventory expansion.

---

## 11. Risks

| Risk | Mitigation |
|------|------------|
| Legacy UI confusion | Hide routes; single product flag |
| Schema bloat | Phase 5 drop after validation |
| Forum ToS / legal | Read-only v0; legal review before post |
| Reseller/client identity bleed | Sub-band boundary + two-level disclosure |
| Over-scoping Big Band governance | Reuse hierarchy only; defer policies |
| Cat Bot perceived as review clone | §5.3 in product spec; pitch intelligence layer not stars |
| Cannibalizing reseller capture SKUs | §5.4 + outreach intel §9; white-label Market Cat frame |

---

## 12. Open questions

1. Rename GitHub repo to `adopt-a-cat-bot` — when (after v1 cat ships)?  
2. Big Band self-serve creation vs admin-only for early access?  
3. Billing: per Big Band, per Band, or per Cat?  
4. Can cats exist on **standalone** Band (no Big Band) for solo marketers?  
5. Cat song format — generated audio, markdown “single”, or campaign PDF?  

---

## 13. Document map

| Doc | Contents |
|-----|----------|
| [adopt-a-cat-bot.md](./adopt-a-cat-bot.md) | Roam lifecycle, memory tiers, 3-angle protocol, schemas |
| **This doc** | Repo strategy, org hierarchy, keep/hide/new, routes, migration |
| [worksmarter-medspa-discovery.md](./signal-processing/worksmarter-medspa/worksmarter-medspa-discovery.md) | First vertical hypothesis |
| [guest-post-publish-cat-potomac-skin-care.md](./signal-processing/worksmarter-medspa/guest-post-publish-cat-potomac-skin-care.md) | Publish Cat — guest post route (design; client-ready) |
| [social-cat-campaign-copilot-potomac-skin-care.md](./signal-processing/worksmarter-medspa/social-cat-campaign-copilot-potomac-skin-care.md) | Social Cat — organic social copilot (design; client-ready) |
| [dmv-smb-tech-reseller-outreach-intel.md](./signal-processing/dmv-smb-tech-reseller-outreach-intel.md) | Big Band prospecting dossiers, anti-cannibalization pitch |
| [big-band-design.md](../big-band-design.md) | Original Big Band implementation (partial reuse) |

---

## 14. Revision history

| Date | Change |
|------|--------|
| 2026-05-29 | Initial platform doc: repo decision, Big Band → Band → Cat hierarchy, explicit non-mapping of governance artifacts, keep/hide/new, Work Smarter scenario, disclosure, phases, cat songs as future |
| 2026-06-08 | §3.5 House Band; §6.5 build sequencing; phased roadmap 0b/1 House Band; links to §5.3–5.4 value and anti-cannibalization |
| 2026-06-10 | §6.3 Publish Cat guest-post design link; phase table future Publish Cat |
| 2026-06-10 | §6.3 Social Cat organic copilot design link; document map |
