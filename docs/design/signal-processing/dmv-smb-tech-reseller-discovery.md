# DMV SMB technology reseller discovery

| Field | Value |
|-------|--------|
| **Goal** | Ranked list of **50 qualified technology resellers** selling to **SMB** in DC metro |
| **Archetype** | [Work Smarter Digital](https://worksmarterdigital.com) — white-label **HighLevel** / CRM systems to local businesses (e.g. med spas) |
| **Cat Bot / Big Band use** | Prospects who could **adopt Cat Bots** for client verticals or resell roam intel under their brand |
| **Parent** | [signal-processing/](./README.md) |
| **Signal registry** | [dmv-smb-tech-reseller-signals.csv](./dmv-smb-tech-reseller-signals.csv) |
| **Outreach intel** | [dmv-smb-tech-reseller-outreach-intel.md](./dmv-smb-tech-reseller-outreach-intel.md) · [outreach signals CSV](./dmv-smb-tech-reseller-outreach-signals.csv) |
| **Seed list** | [dmv-smb-tech-resellers-seed.csv](./dmv-smb-tech-resellers-seed.csv) |

---

## 1. Problem

You found **one** qualified reseller (Work Smarter Digital). You need **50** comparable **Big Band** prospects in the DMV:

- They **resell or implement** technology (CRM, marketing automation, MSP stack) to **local SMBs**
- They are **not** the end client (med spa) — they are the **agency / VAR / partner**
- Geography: **DC, Maryland, Virginia** (DMV metro)

**Do not start with:** “Find me marketing agencies.”

**Start with:** “Find me **SMB-focused technology resellers** with partner badges, implementation services, and local end-client verticals.”

---

## 2. Reseller types (universe)

| Type | Examples | Work Smarter analog |
|------|----------|---------------------|
| **GHL / white-label SaaS** | Work Smarter, LUD Marketing, Services America | Closest — resell platform under own brand |
| **HubSpot Solutions Partner** | Fast Slow Motion, Creative Analytics, ElectricSage | CRM + automation to SMB |
| **Salesforce consulting (SMB)** | Southpoint, Dupont Circle Solutions, Fast Slow Motion | Higher ticket; still SMB practice |
| **Zoho / other CRM partner** | Simpalm (Rockville), OKIRE, NuBiz | SMB CRM implementation |
| **MSP / MSSP (SMB)** | GuardIT DMV, IT Assurance, JITServices | Resell M365/security; optional Cat Bot angle |

Tier **A** for Cat Bot pitch: **GHL white-label + HubSpot/Zoho SMB partners** with vertical end clients.

---

## 3. Fit filters (v1)

| ID | Rule |
|----|------|
| **F01** | DMV metro footprint |
| **F02** | Reseller / implementer to SMB (not enterprise-only) |
| **F03** | Agency scale ~5–75 employees |
| **F04** | Serves local SMB verticals (horizontal OK if SMB explicit) |

See [dmv-smb-tech-reseller-signals.csv](./dmv-smb-tech-reseller-signals.csv).

---

## 4. Universe sources

| Phase | Source | How |
|-------|--------|-----|
| **v0 (now)** | [dmv-smb-tech-resellers-seed.csv](./dmv-smb-tech-resellers-seed.csv) | Manual research + partner directories |
| **v1** | [HubSpot Solutions Directory](https://ecosystem.hubspot.com/marketplace/solutions) — filter MD / DC / VA | CRM implementation + SMB copy |
| **v1** | [Salesforce AppExchange](https://appexchange.salesforce.com/) — consultants near DC | SMB case studies |
| **v1** | [Zoho Partner Directory](https://www.zoho.com/partners/find-zoho-partner.html) | MD / DC filter |
| **v1** | Clutch — CRM consulting / digital marketing DC | `clutch.co` + service filters |
| **v2** | LinkedIn Sales Navigator | “HubSpot partner” + DMV + 11–50 employees |
| **v2** | GoHighLevel agency communities / case studies | GHL-specific resellers (sparse public directory) |

---

## 5. Qualification score (0–100)

| Points | Signal |
|--------|--------|
| +25 | F01–F04 all pass |
| +20 | H01 official partner or white-label SaaS |
| +15 | H03 SMB explicit on site |
| +15 | H04 implementation / managed CRM offer |
| +10 | Known vertical end clients (med spa home services pro services) |
| +10 | H02 white-label / agency platform language |
| −30 | Any X* exclude fires |

**Target:** top 50 with score ≥ 60 after human verify.

---

## 6. Seed list status (verified 2026-05-29)

[dmv-smb-tech-resellers-seed.csv](./dmv-smb-tech-resellers-seed.csv) — **52 rows** with columns `qualification_score`, `verify_notes`, `verified_date`.

| Status | Count | Action |
|--------|-------|--------|
| **qualified** | 27 | Outreach-ready (score ≥ 60, no exclude fires) |
| **maybe** | 20 | Approach with tailored pitch or re-check one signal |
| **no** | 5 | Drop: OKIRE, NuBiz, Mole Street, Wexler, Simpalm |

**Top qualified (score ≥ 75):** Work Smarter, LUD Marketing, ElectricSage, Revv Partners, JITServices, ProperExpression, Dupont Circle, The OBO Group.

**Corrections from verify:**
- **Services America** — SMB home-services reseller confirmed; **GHL not on site** (type → `marketing_automation`).
- **The OBO Group** — use `theobogroup.com` (obo.digital 503; merged with Aptitude 8).
- **OKIRE** — domain parked; drop from list.

**Contact fields (top 15 by score):** `contact_url`, `contact_email`, `contact_phone`, `linkedin_company_url`, `primary_contact_name`, `primary_contact_title`, `primary_contact_linkedin_url` — populated for outreach-ready rows only; blank where no public email/LinkedIn found.

---

## 7. Relationship to other docs

| Doc | Relationship |
|-----|----------------|
| [worksmarter-medspa/](./worksmarter-medspa/) | Work Smarter is **customer #1**; med spas are **their** end clients (Band layer) |
| [adopt-a-cat-bot-platform.md](../adopt-a-cat-bot-platform.md) | Resellers map to **Big Band** prospects; **House Band** dogfood first |
| [dmv-smb-tech-reseller-outreach-intel.md](./dmv-smb-tech-reseller-outreach-intel.md) | O-signals, dossiers, [anti-cannibalization §9](./dmv-smb-tech-reseller-outreach-intel.md#9-anti-cannibalization-sits-on-the-capture-stack) |
| [adopt-a-cat-bot.md §5.3–5.4](../adopt-a-cat-bot.md#53-value-on-top-of-public-sources-google-yelp-reddit-) | Value on public sources; sits on capture stack |
| [band-it-outbound-discovery.md](./band-it-outbound-discovery.md) | Same playbook; different universe (SMB end buyers vs resellers) |

---

## 8. v0 hypothesis test

**One reseller · verify · pitch Cat Bot factory**

| Field | Test value |
|-------|------------|
| **Archetype** | Work Smarter Digital |
| **Pitch** | Cat Bots as **vertical intel + memory** layer on top of GHL/capture — not replacement ([§9 outreach intel](./dmv-smb-tech-reseller-outreach-intel.md#9-anti-cannibalization-sits-on-the-capture-stack)) |
| **Proof path** | Script dossiers (homepage fetch) → House Band RoamRun → outreach with citeable O-signals |
| **Success** | 5 conversations with qualified resellers from seed list; 1 pilot interest |
