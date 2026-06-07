# Campaign leads — public research method (Layer B)

| Field | Value |
|-------|--------|
| **Status** | Active — manual hypothesis test |
| **Parent** | [worksmarter-medspa-discovery.md](./worksmarter-medspa-discovery.md) §17 |
| **Template** | [campaign-leads-research-template.csv](./campaign-leads-research-template.csv) |
| **Example (Potomac Skin Care)** | [campaign-leads-potomac-skin-care-research.csv](./campaign-leads-potomac-skin-care-research.csv) |

---

## What this is

A **research ledger** for real people who match consumer signals (C01–C09) — not a dial-ready consumer list.

Each row records:

- **Who** — name and public role  
- **Why** — signals + lifestyle trigger  
- **Proof** — `evidence_url`  
- **Reach** — only **publicly published** contact paths  
- **Hook** — compliance-safe campaign angle (C10)

---

## Workflow

```text
Pick segment (zip + tag)
  → Search public sources (foundation boards, gala committees, news)
  → Record name + role + URL
  → Add contact ONLY if published (org email, event inbox, business phone)
  → Human verify: fit + appropriate channel
  → Optional outreach (professional context — not bulk cold SMS)
```

---

## Good public sources (DMV affluent)

| Source | Signals | Typical fields |
|--------|---------|----------------|
| Hospital foundation board pages | C04, C07 | Name, role, org |
| Gala committee / co-chair listings | C04, C08 | Name, spouse pairs, employer |
| Charity event sponsor posts | C04, C05 | Name, company |
| School gala chairs (private schools) | C02, C08 | Name, event email |
| GuideStar / ProPublica nonprofit officers | C04, C07 | Name, title |
| Society / wealth firm event recaps | C05, C07 | Name, firm |
| Woman-owned business directories (backlog C11) | C07, C05, C06 | Owner, company, business site |
| FEC / state campaign finance (C16) | C16, C04, C07 | Donor name, amount, date, zip |
| Charity sponsor / honor roll PDFs (C17) | C17, C04 | Donor tier, charity name |
| County deed records (C14) | C14 | Owner name, address, deed date |

---

## Contact rules

| Field | Rule |
|-------|------|
| `public_contact_type` | `org_events_email`, `org_staff_routed`, `org_development_contact`, `org_event_email`, `org_general_inquiry`, `business_phone_public`, `none_public` |
| `public_contact_value` | **Copy exactly from source** — no guessed `@gmail.com` |
| `recommended_channel` | How Work Smarter would *actually* approach (referral, event team, LinkedIn manual, geo ad) |
| Personal cell / home email | Leave blank unless **explicitly public** on source page |

---

## Verify statuses

| Status | Meaning |
|--------|---------|
| `identified_public` | Name + role confirmed from URL |
| `contact_pending` | Person identified; routing contact not yet chosen |
| `approved_for_outreach` | Human approved message + channel |
| `rejected` | Wrong fit — remove from campaign |

---

## Potomac Skin Care example (10 rows)

See [campaign-leads-potomac-skin-care-research.csv](./campaign-leads-potomac-skin-care-research.csv).

**Segment mix:**

- **PSC_GreatFalls_PreSeason** — 8 leads (gala chairs, foundation boards, Great Falls events)  
- **PSC_Executive_WeekdayConsult** — 2 leads (executive gala chairs)

**Important:** Several rows share **org event emails** (e.g. `Events@cc-dc.org`) — that is correct. Public role research often yields **routing contacts**, not personal inboxes. Geo-targeted ads + professional intros fill the gap.

---

## Revision history

| Date | Change |
|------|--------|
| 2026-05-29 | Template + 10 public-research leads for Potomac Skin Care demo |
| 2026-05-29 | Added C13–C17 sources + optional CSV columns (migration + donation) |
