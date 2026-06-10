# Guest post / Publish Cat — Potomac Skin Care (design)

| Field | Value |
|-------|--------|
| **Status** | Design only — **not implemented**; use when actively working with the client |
| **Parent** | [worksmarter-medspa-discovery.md](./worksmarter-medspa-discovery.md), [consent-machine-potomac-skin-care.md](./consent-machine-potomac-skin-care.md) |
| **Spa** | Potomac Skin Care — Dr. Jovy Eusebio · (301) 765-0990 · [thepotomacskincare.com](https://www.thepotomacskincare.com/) |
| **Agency** | Work Smarter Digital (HighLevel white-label) |
| **Cat type** | **Publish Cat** (mingling / guest content) — distinct from **Consent Cat** (roam + inbound) |
| **Principle** | **Disclosed marketing cat.** Educational guest content on **invited** third-party sites — not drive-by comments, not cold outreach, not paid link farms |
| **Product spec** | [adopt-a-cat-bot.md §13 Publish Cat](../../adopt-a-cat-bot.md#13-multiple-cat-types-examples), [platform §6.3 forum / post (later)](../../adopt-a-cat-bot-platform.md#63-build-new-cat-bot-product) |

---

## 1. What this is

After **Scout / Consent Cat** roams produce a return packet ([potomac-consent-cat-packet-*.json](./output/)), a **Publish Cat** helps the spa earn visibility on **other people’s audiences** by contributing **guest articles** — with explicit disclosure that a marketing cat assisted the spa.

| Scout / Consent Cat (built v0) | Publish Cat (this doc) |
|--------------------------------|-------------------------|
| Read public web → return packet | Draft pitches + outlines + articles for **guest placement** |
| No posting in v0 roam lab | **Human sends pitch**; **physician approves** draft before publish |
| Consent machines (SMS, web, partner) | **Earned media** → soft CTA to consult booking |
| Tavily, Places, Gemini synthesis | Reuses roam **themes** (physician-trust, consult-first, VIP) |

**Not in scope:** automated comments on news articles, Yelp, Reddit, or LinkedIn connection spam; pay-for-play junk blogs; undisclosed astroturfing (even with a bot label on a spam comment, it is still a STUCK_TRAP).

---

## 2. Why guest posts (vs comment injection)

| Approach | Verdict |
|----------|---------|
| **Guest post** on local/wellness blog that accepts contributors | ✅ On-brand; editor gate; durable URL; fits affluent trust |
| **Disclosed comment** on someone else’s post (rare, helpful reply) | ⚠️ Secondary — sparse, human-approved only |
| **Drive-by promo comments** on articles/forums | ❌ STUCK_TRAP — ToS + reputation risk |
| **LinkedIn LaaS / cold DMs** | ❌ Out of scope — competes with reseller stack; see [§5 anti-cannibalization](../../adopt-a-cat-bot.md#54-sits-on-the-capture-stack-anti-cannibalization) |

Guest posts align with roam findings: affluent clients **research safety and physician credentials** before booking; an educational article on a trusted local/wellness site supports that journey without scraping reviews into a cold list.

---

## 3. End-to-end workflow (7 steps)

```text
TARGET → FIT → PITCH → OUTLINE → DRAFT → DISCLOSURE → PUBLISH → (opt-in nurture)
```

| Step | Owner | Cat Bot role |
|------|--------|--------------|
| **1. Target** | Human approves list | Find guest-post-friendly sites (Tavily / manual); rank local + wellness |
| **2. Fit** | Human picks top N | Match roam themes to each site’s audience |
| **3. Pitch** | **Human sends email** | Draft 150–250 word pitch + proposed title |
| **4. Outline** | Human + editor | Draft 4–6 section outline after “maybe” |
| **5. Draft** | **Physician / spa reviews** | Draft 800–1,200 word article; no outcome guarantees |
| **6. Disclosure** | Human approves | Byline + footer (cat + not medical advice) |
| **7. Publish** | Host site | Link from spa site / opt-in email only — no cold retarget |

**Rule:** Nothing is sent or published without **human approval**. Cat Bot drafts; it does not impersonate Dr. Jovy or hide automation.

---

## 4. Target universe (Potomac Skin Care)

Prioritize sites that **publish outside contributors** or run community health/wellness columns.

| Tier | Type | Examples / signals |
|------|------|-------------------|
| **A** | Local lifestyle / community | Potomac, Bethesda, Chevy Chase local mags; community association newsletters; “write for us” |
| **B** | Wellness / women’s health (DMV) | Skincare over 40, menopause/wellness, local “health” columns |
| **C** | Partner-adjacent (relationship) | Wellness studio, Pilates, physician referral partners — **co-authored** or guest slot |
| **D** | Industry trade (B2B) | Med spa marketing publications — better for **Work Smarter** white-label story than end-client volume |

**Deprioritize:** national news, platforms with no guest policy, pay-for-link SEO farms, RealSelf-style forums with strict promo rules (verify ToS first).

**Output artifact (future):** `guest-post-targets-potomac.csv` — columns: `site_name`, `url`, `contact`, `guest_policy_url`, `angle`, `status`, `pitch_sent_date`, `notes`.

---

## 5. Article angles (from Consent Cat roam)

Reuse themes from [potomac-consent-cat-packet-*.json](./output/) — educational, not salesy:

| # | Proposed title (working) | Roam tie-in |
|---|--------------------------|-------------|
| 1 | What to ask before your first med spa consult | Angle 3 — due diligence, physician training |
| 2 | Why VIP care means consult-first, not same-day injectables | Angle 2 — VIP + consult booking on site |
| 3 | How to choose a physician-led med spa in Montgomery County | Angle 1 — ASPS-style physician standard |
| 4 | Body contouring after 40: questions to bring to your consult | Services line (Venus Bliss) — consult required |

Each pitch should tailor **one angle** to the **target site’s readers** (not a generic blast).

---

## 6. Pitch template (human sends)

```text
Subject: Guest idea — [proposed title] (Potomac physician-led practice)

Hi [Editor name],

[1–2 sentences: why their readers care — local, wellness, safety-first aesthetics.]

I’d like to propose a guest piece:

Title: [title]
Outline:
• [bullet 1]
• [bullet 2]
• [bullet 3]

Author: Dr. Jovy Eusebio, Potomac Skin Care — physician-led aesthetic practice serving Potomac since 1998.

Happy to adapt length and tone to your guidelines. No promotional claims; consult-required framing throughout.

Best,
[Human name / spa contact]
[phone] · [website]
```

**Volume (pilot):** 3–5 personalized pitches per week; expect many non-replies.

---

## 7. Disclosure (required)

Every guest post includes **human byline** + **cat disclosure footer**.

**Byline:**

> Dr. Jovy Eusebio, Potomac Skin Care · Potomac, Maryland

**Footer:**

```text
This article was prepared with assistance from the Potomac Consent Cat, a disclosed
marketing tool for Potomac Skin Care (on the Work Smarter Digital CRM roster).
General information only — not medical advice. A consultation is required before
any treatment; individual results vary.
thepotomacskincare.com · (301) 765-0990
```

If the host requires **sponsored content** labeling, use their label — still disclose cat assistance.

---

## 8. After publish (consent-native)

| Do | Don’t |
|----|--------|
| Link from spa website / disclosed LinkedIn company post | Buy lists from article readers |
| Email **opt-in** list: “We published a guide…” | Cold SMS/email to scraped contacts |
| Add URL to HighLevel nurture as **content asset** | Retarget strangers without consent |

Same boundary as [consent-machine-potomac-skin-care.md](./consent-machine-potomac-skin-care.md): nurture **after** opt-in or **after** they visit owned properties.

---

## 9. STUCK_TRAP (guest post edition)

| Trap | Why wrong |
|------|-----------|
| Mass identical pitches | Spam reputation |
| Paid links on junk blogs | SEO penalty; off-brand |
| Medical outcome claims without physician review | Compliance risk |
| Cat publishes without human approval | Trust break — “monkey business” |
| Article reads as Botox ad | Editors reject |
| Comment bots on third-party posts | ToS bans; astroturfing |

---

## 10. Success metrics (client pilot)

| Milestone | Target (realistic) |
|-----------|-------------------|
| Target list | 15–25 ranked sites |
| Pitches sent | 5 in week 1 |
| Outline requested | 1+ within 2–6 weeks |
| **Published guest post** | **1** on credible local/wellness outlet within 4–12 weeks |
| Consults attributed | Track via “how did you hear about us” — optional |

Not measured by: comment volume, backlinks count alone, or pitches sent without replies.

---

## 11. Relationship to other agents

```text
[Agent 1: Spa opportunity — Layer A]
        ▼ human: buy
[Agent 2: Segment strategist — campaign brief]
        ▼
[Consent Cat — roam lab]  →  return packet JSON
        ▼
[Agent 3: Consent architect — SMS / web / partner]  ← live inbound
        ▼
[Publish Cat — guest posts]  ← THIS DOC (earned media, when client-ready)
        ▼ human: pitch + physician approve
[Social Cat — organic copilot]  ← [social-cat design](./social-cat-campaign-copilot-potomac-skin-care.md) (when client-ready)
        ▼ human: publish IG/FB/groups/Nextdoor
[Agent 4: Nurture — HighLevel]  ← opt-in only
```

Publish Cat **feeds** nurture with **content assets**; it does **not** replace consent machines or Work Smarter capture SKUs.

---

## 12. Future implementation (when client-ready)

Not built in v0 roam lab. Planned artifacts:

| Artifact | Purpose |
|----------|---------|
| `guest-post-targets-potomac.csv` | Pipeline CRM for outreach |
| `run_guest_post_pipeline_v0.py` | Tavily target discovery + pitch/outline draft from roam packet |
| Publish Cat approval queue | Platform UI (post–House Band) — draft → spa approve → export |

Until then: manual process using roam packet + this doc.

---

## 13. Document map

| Doc | Relationship |
|-----|--------------|
| [campaign-brief-potomac-skin-care.md](./campaign-brief-potomac-skin-care.md) | Segments + copy tone |
| [consent-machine-potomac-skin-care.md](./consent-machine-potomac-skin-care.md) | Inbound opt-in — complementary |
| [social-cat-campaign-copilot-potomac-skin-care.md](./social-cat-campaign-copilot-potomac-skin-care.md) | **Social Cat** — organic weekly copilot (complementary) |
| [adopt-a-cat-bot.md §5.3–5.4](../../adopt-a-cat-bot.md) | Value layer; anti-cannibalization |
| [dmv-smb-tech-reseller-outreach-intel.md](../dmv-smb-tech-reseller-outreach-intel.md) | Work Smarter **sales** dossier — separate track |

---

## 14. Revision history

| Date | Change |
|------|--------|
| 2026-06-10 | Initial design: guest post Publish Cat workflow, disclosure, targets, angles, STUCK_TRAP, metrics; not implemented |
