# Band It outbound discovery — signal processing design

| Field | Value |
|-------|--------|
| **Status** | Draft — ready for agent spec in Cursor |
| **Goal** | Ranked list of **50 SMB companies** in DC metro to call for Band It |
| **Parent folder** | [signal-processing/](./README.md) |
| **Signal registry** | [band-it-outbound-signals.csv](./band-it-outbound-signals.csv) |
| **Reference implementation** | [Pre-channel opportunity discovery](../pre-channel-opportunity-discovery.md) (reverse logistics) |

---

## 1. Problem

Band It needs **outbound prospects** — not a generic “AI interested” list, but companies exhibiting **observable signals** that suggest:

- Change, growth, or transformation underway  
- Operational or coordination pain  
- Fit for an **orchestration layer** (people + agents + existing systems)

**Target wedge (v1):**

| Filter | Value |
|--------|--------|
| Geography | DC metro (DC, MD, VA — radius TBD) |
| Revenue | ~$2M–$10M (proxy OK in Phase 1) |
| Headcount | ~10–100 employees |
| Output | Top **50** companies → human verify → call list |

This use case **dogfoods** Band It’s own signal-processing story: the same engine we sell should find our first customers.

---

## 2. Core approach (agreed)

**Do not start with:** “Find me companies that want AI.”

**Start with:** “Find me companies exhibiting signals that suggest **change, growth, pain, inefficiency, opportunity, or transformation**.”

Those companies are most likely to buy Band It **now**.

**Playbook** (same as reverse logistics):

```
Fit filters → Hunt signals → Exclude rules → Verify → Rank → Call
```

See [pre-channel-signal-to-deal-playbook.md](../pre-channel-signal-to-deal-playbook.md) for the operational rhythm; swap signal definitions only.

---

## 3. ChatGPT recommended approach (summary)

ChatGPT endorsed structuring signals into **categories**, prioritizing **Band It–specific** signals, and shipping **Version 1 with ~10 signals** before expanding.

### 3.1 Proposed categories

| Category | Intent |
|----------|--------|
| Growth signals | Expansion, new markets, hiring, funding |
| Operational stress signals | Turnover, open roles, chaos, manual processes |
| Technology readiness signals | Copilot, AI jobs, CRM/ERP upgrades, cloud |
| Capture management signals | Gov contracts, SAM, proposal/capture hiring |
| Organizational change signals | CEO/COO, PE, M&A, rebranding |
| Market signals | Regulation, competition, industry disruption |
| Band It–specific signals | Knowledge concentration, workflow fragmentation, coordination |

### 3.2 ChatGPT “Version 1” top 10 (starting set)

ChatGPT suggested focusing the first agent on:

1. Revenue $2M–$10M  
2. 10–100 employees  
3. Recent hiring surge  
4. New service offering  
5. New vertical market  
6. Business development hiring  
7. Technology modernization initiative  
8. Leadership change  
9. Knowledge concentration risk  
10. Workflow fragmentation  

Then compute a **Band It Opportunity Score (0–100)** and use that to produce the first **50 companies to call**.

ChatGPT noted this framework can later adapt to reverse logistics, capture management, environmental consulting, and other verticals.

---

## 4. ChatGPT full signal catalog (reference)

One line per signal — **Phase 2 backlog** unless marked for v1. Full machine-readable list in [band-it-outbound-signals.csv](./band-it-outbound-signals.csv) (`signal_role=backlog`).

### Growth signals

| Signal | Description |
|--------|-------------|
| Recent hiring surge | Job postings up more than X% in the last 90 days. |
| New department creation | Roles appearing in a previously nonexistent department. |
| Multiple open positions | Several openings posted at once. |
| New office opening | Expansion into a new geography. |
| Geographic expansion | Company entering a new market or territory. |
| New service offering | Website announces a new service or capability. |
| New vertical market | Company begins serving a new industry. |
| Partnership announcement | New strategic partnership announced. |
| Acquisition activity | Company acquires another business. |
| Funding event | Company receives investment or financing. |

### Operational stress signals

| Signal | Description |
|--------|-------------|
| High job turnover | Same positions repeatedly advertised. |
| Long-term open positions | Critical roles open for months. |
| Rapid growth without systems | Hiring outpaces organizational maturity. |
| Employee complaints | Public reviews mention inefficiency or chaos. |
| Customer service complaints | Reviews indicate operational bottlenecks. |
| Missed deadlines | Public references to project delays. |
| Leadership overload | Founder or executive still in day-to-day ops. |
| Dependency on key individuals | One person central to operations in public info. |
| Manual process indicators | Spreadsheets or email workflows cited publicly. |
| Operational scaling challenges | Public comments about growing pains. |

### Technology readiness signals

| Signal | Description |
|--------|-------------|
| Microsoft Copilot adoption | Public mention of Copilot training or rollout. |
| ChatGPT mention | Leadership publicly discussing AI adoption. |
| AI job postings | Hiring for AI-related positions. |
| Data analyst hiring | Growing interest in automation and analytics. |
| Business systems upgrade | CRM, ERP, or software migration underway. |
| Digital transformation initiative | Public modernization announcement. |
| Technology leadership hire | New CIO, CTO, or technology executive. |
| Cloud migration | Moving systems to cloud platforms. |
| Process improvement initiative | Lean, Six Sigma, or operational excellence programs. |
| Innovation program launch | Internal innovation initiatives announced. |

### Capture management signals

| Signal | Description |
|--------|-------------|
| Government contract awards | Recent contract win. |
| Government contract losses | Recent contract loss. |
| New NAICS codes added | Expansion into adjacent markets. |
| SAM registration updates | Active government market participation. |
| Proposal manager hiring | Increasing bid activity. |
| Capture manager hiring | Direct indicator of capture motion. |
| Business development hiring | Growth-oriented hiring signal. |
| Contract vehicle award | New access to government opportunities. |
| Set-aside eligibility change | New certifications obtained. |
| Agency relationship expansion | Increasing government presence. |

### Organizational change signals

| Signal | Description |
|--------|-------------|
| New CEO | Leadership transition. |
| New COO | Operational transformation likely. |
| Private equity investment | Pressure to scale and improve. |
| Ownership transition | Succession planning or sale process. |
| Merger activity | Integration challenges ahead. |
| Rebranding initiative | Company repositioning itself. |
| Strategic planning initiative | Public references to new direction. |
| Board expansion | Governance changes. |
| Business model change | Shift in service offerings. |
| Corporate restructuring | Significant internal changes. |

### Market signals

| Signal | Description |
|--------|-------------|
| New regulation | Industry affected by regulatory change. |
| Competitive pressure | Competitor enters local market. |
| Market consolidation | Industry mergers increasing. |
| Labor shortage | Industry-wide hiring difficulties. |
| Margin compression | Industry economics deteriorating. |
| Supply chain changes | Industry disruptions occurring. |
| Industry growth | Market expanding rapidly. |
| Industry disruption | New technologies affecting the sector. |
| Customer demand shift | Changes in buyer behavior. |
| Procurement changes | New buying patterns emerging. |

### Band It–specific signals (ChatGPT favorites)

| Signal | Description |
|--------|-------------|
| Knowledge concentration risk | Business depends heavily on one or two key people. |
| Process complexity growth | Business more complex than current systems handle. |
| Cross-functional coordination needs | Multiple teams involved in delivering outcomes. |
| Opportunity discovery needs | Success depends on finding opportunities before competitors. |
| Workflow fragmentation | Work spread across disconnected systems. |
| Human bottleneck detection | Critical decisions concentrated in few individuals. |
| Institutional knowledge risk | Expertise difficult to transfer to new employees. |
| High-value repetitive decisions | Same decisions repeatedly made by experts. |
| Signal-rich environment | Industry generates large amounts of actionable information. |
| Growth through coordination | Success depends on coordination, not only hiring. |

---

## 5. Engineering recommendations (Cursor / Band It team)

ChatGPT’s list is **directionally correct** but **too broad for v1**. Lessons from [pre-channel-opportunity-discovery.md](../pre-channel-opportunity-discovery.md):

| Lesson | Application |
|--------|-------------|
| Every signal needs **sources** | Indeed, LinkedIn, SAM, website diff — not LLM-invented companies |
| **Exclude rules** are mandatory | Wrong ICP, AI-native SaaS, enterprise “done” stack |
| **Verify before call** | Human or agent checkpoint; signals are clues not proof |
| **Stack signals** | Boost score when 2+ hunt signals from different categories |
| **Phase 2 backlog** | Analyst-grade market signals (margin compression, PE) wait for paid data |

Many ChatGPT signals are **hard to detect** for private SMBs (Copilot rollout, PE investment, industry disruption). v1 should favor **public, checkable** sources: jobs, leadership LinkedIn, website changes, SAM/FPDS, local press.

### 5.1 Recommended v1 registry

Implemented in CSV as `phase=v1`:

| ID | Role | Signal | Description |
|----|------|--------|-------------|
| F01 | fit | DC metro footprint | HQ, office, or majority of jobs in DC–MD–VA. |
| F02 | fit | SMB revenue band | Estimated $2M–$10M (proxy via headcount / credit Phase 2). |
| F03 | fit | SMB headcount band | ~10–100 employees. |
| B01 | hunt | Recent hiring surge | Postings up materially vs prior 90 days. |
| B02 | hunt | Business development hiring | New BD, capture, or partnerships roles. |
| B03 | hunt | Ops / project coordinator hiring | Cross-team coordination hiring. |
| B04 | hunt | New service or vertical | New offering or industry on site or in press. |
| B05 | hunt | Leadership change | New CEO, COO, or President in last 12 months. |
| B06 | hunt | Knowledge concentration risk | One expert/founder central to delivery. |
| B07 | hunt | Workflow fragmentation | Email, Excel, manual handoffs in public text. |
| B08 | hunt | Gov / contract-facing growth | SAM, wins/losses, capture hiring, NAICS shift. |
| B09 | hunt | Digital modernization mention | CRM/ERP/cloud/process improvement language. |
| B10 | hunt | Multi-team delivery model | Project-based or multi-practice delivery. |
| X01 | exclude | Enterprise stack locked | Mature enterprise stack; no ops pain signals. |
| X02 | exclude | Wrong business model | Staffing, MSP-only, pure dev shop, reseller. |
| X03 | exclude | AI-native product company | Builds AI product in-house; low orchestration fit. |

### 5.2 Band It Opportunity Score (v1)

```
1. Must pass F01 AND (F02 OR F03)
2. +10 per hunt signal (B01–B10), cap raw at 100
3. +15 bonus if ≥2 hunt signals in different categories
4. −50 if any exclude (X01–X03) fires
5. Sort descending → take top 50 → verification queue → calls
```

Categories for stacking bonus: `growth`, `operational_stress`, `technology_readiness`, `capture_management`, `organizational_change`, `band_it_specific`.

---

## 6. Agent pipeline (factory mapping)

Not one chatbot — a **band workflow** (see [agent-workflow-composition.md](../agent-workflow-composition.md)):

| Agent node | Role |
|------------|------|
| **Entity list builder** | Seed DMV SMB universe (SOS, LinkedIn geo, NAICS list) |
| **Fit filter** | Apply F01–F03 |
| **Signal scanner** | Run B01–B10 adapters per source |
| **Entity classifier** | Apply X01–X03 |
| **Signal stacker** | Boost multi-category stacks |
| **Ranker** | Band It Opportunity Score → top 50 |
| **Human checkpoint** | Verify top N; mark buy / maybe / not — calibrate weights |
| **Sink** | CRM sheet or Band It Opportunity Desk export |

---

## 7. Phases

| Phase | Scope |
|-------|--------|
| **0** | Manual: 20 companies, mark which signals would have predicted a good call |
| **1** | Automate F01–F03 + B01–B04, B02, B05 + excludes; weekly ranked CSV |
| **2** | Add B06–B10, website diff, SAM; stacking bonus |
| **3** | Judgment profile — reweight signals from closed/won and dead leads |
| **Backlog** | ChatGPT catalog (G* rows in CSV) as adapters pass feasibility review |

---

## 8. Folder structure decision

**Yes — use `docs/design/signal-processing/`** for:

- Reusable signal-processing **framework** docs  
- Per–use-case signal CSVs (Band It outbound, future verticals)  
- Scoring and agent role patterns shared across customers  

**Keep elsewhere:**

| Location | Contents |
|----------|----------|
| `docs/design/pre-channel-*.md` | Reverse logistics vertical (Track A customer) |
| `docs/design/customer-track-a-spreadsheet/` | Joe’s spreadsheets, PDFs, DC metro leads |
| `docs/design/intelligence-signal-processing-*` | Marketing / narrative diagrams |

New vertical? Add `docs/design/signal-processing/<vertical>-discovery.md` + `<vertical>-signals.csv` and link from [README.md](./README.md).

---

## 9. Next steps for Cursor agent build

1. Read [band-it-outbound-signals.csv](./band-it-outbound-signals.csv) — v1 rows implemented in script.  
2. **V1 script:** [scripts/run_band_it_outbound_v1.py](./scripts/run_band_it_outbound_v1.py)  
3. Seed companies: [sample-seed-companies.csv](./sample-seed-companies.csv) → replace with real DMV list.  
4. Output: [output/band-it-outbound-leads.csv](./output/band-it-outbound-leads.csv)  
5. Phase 2: add Indeed/SAM/website-diff adapters; wire to Band It Opportunity Desk UI.


---

## 10. Related documents

- [Pre-channel opportunity discovery](../pre-channel-opportunity-discovery.md)  
- [Pre-channel AI discovery analysis](../pre-channel-ai-discovery-analysis.md)  
- [Pre-channel signal-to-deal playbook](../pre-channel-signal-to-deal-playbook.md)  
- [Agent workflow composition](../agent-workflow-composition.md)  
- [Pre-channel-opportunity-signals.csv](../customer-track-a-spreadsheet/Pre-channel-opportunity-signals.csv) — column schema reference  
