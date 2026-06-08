# Campaign brief — Potomac Skin Care (Layer B dry run)

| Field | Value |
|-------|--------|
| **Status** | Theory test — no outreach, no contact PII |
| **Parent** | [worksmarter-medspa-discovery.md](./worksmarter-medspa-discovery.md) §6.3, §14–§18 |
| **Agency** | Work Smarter Digital (HighLevel white-label) |
| **Approved spa (assumed)** | Potomac Skin Care — Dr. Jovy Eusebio |
| **Address** | 10000 Falls Rd Ste 100, Potomac, MD 20854 |
| **Phone** | (301) 765-0990 |
| **Website** | [thepotomacskincare.com](https://www.thepotomacskincare.com/) |
| **Service radius** | ~12 miles from 20854 |

---

## 1. Purpose

Validate **Layer B** of the Work Smarter demo: given a human-approved med spa (Layer A **buy**), can we produce **campaign-ready audience segments**, offers, channels, and HighLevel tags — without taking action on a real contact list?

This brief is the expected output shape for **Agent 2** (`worksmarter-medspa-marketing-v1`).

---

## 2. Layer A → Layer B bridge

| Layer A signal | Evidence (public) | Campaign use (C09) |
|----------------|-------------------|---------------------|
| **M14** Premium zip, budget digital | Potomac 20854 clientele; Google Sites web presence | “Trusted in-office experience — digital front door should match” |
| **M15** VIP positioning, no visible nurture | “Feel like a VIP on every visit”; call-to-book flow | Re-engagement + reminder cadence for existing-fit clients |
| **F02/F03** Independent, physician-led | Single location since 1998 | Physician-trust messaging vs. chain/discount clinics |

**Campaign theme:** *Trusted Potomac physician care — private consult, minimal friction, treatment continuity.*

**Spa services to promote:**

- Botox and dermal fillers  
- Skin care treatments (ZO Skin Health affiliation)  
- Body & fat treatments (Venus Bliss, cellulite, tightening)  
- Cherry pay-over-time financing  

---

## 3. Target geography

Intersect **12-mile drive-time** from spa with [affluent-dmv-zips.csv](./affluent-dmv-zips.csv).

| Priority | Zip | Area | Segment tags |
|----------|-----|------|--------------|
| Primary | 20854 | Potomac, MD | affluent_residential, executive, family |
| Primary | 20818 | Cabin John, MD | affluent_residential, family |
| Primary | 20817 | Rockville corridor | affluent_residential, wellness |
| Secondary | 22066 | Great Falls, VA | affluent_residential, country_club, equestrian |
| Secondary | 20815 | Chevy Chase, MD | affluent_residential, country_club, gala |
| Secondary | 20814 | Bethesda, MD | affluent_residential, executive, gala |
| Secondary | 20833 | Brookeville, MD | affluent_residential, equestrian |
| Secondary | 20837 | Poolesville, MD | affluent_residential, equestrian |
| Tertiary | 20007 | Georgetown, DC | affluent_residential, gala, luxury_retail |
| Tertiary | 20016 | Spring Valley, DC | affluent_residential, diplomatic, gala |
| Tertiary | 20008 | NW Foxhall, DC | affluent_residential, diplomatic, gala |
| Tertiary | 22101 | McLean, VA | affluent_residential, executive, luxury_retail |

---

## 4. Campaign segments (3)

### Segment 1 — Potomac & River Road loyalists

| Field | Value |
|-------|--------|
| **HighLevel tag** | `PSC_Potomac_Core_VIP` |
| **Target zips** | 20854, 20818, 20817 |
| **Consumer signals** | C01, C08, C09 |
| **Audience** | Established Potomac-area homeowners, 45–65, physician-trust oriented |
| **Pain / hook** | Strong in-office VIP experience; weak digital follow-up and rebooking |
| **Offer** | Free skin consult + Cherry financing overview for qualifying body/skin packages |
| **Channels** | Email nurture (3-touch) + SMS consult reminder |

**Archetypes (representative, not real contacts):**

| # | Profile | Zip | Service | Why on list |
|---|---------|-----|---------|-------------|
| 1 | Retired executive, Botox every 4 months, books by phone | 20854 | Injectables | Needs easier rebooking / reminders |
| 2 | Empty-nester, body contouring interest | 20854 | Venus Bliss / body | Cherry financing nurture |
| 3 | Cabin John professional, ZO skincare loyalist | 20818 | Skin treatments | VIP in-office; no between-visit email |

---

### Segment 2 — Country club & Great Falls corridor

| Field | Value |
|-------|--------|
| **HighLevel tag** | `PSC_GreatFalls_PreSeason` |
| **Target zips** | 22066, 20815, 20833, 20837, 20814 |
| **Consumer signals** | C02, C04, C08 |
| **Audience** | Affluent families and club members prepping for spring/summer social calendar |
| **Pain / hook** | Event-ready skin/body; competitors actively market injectables nearby |
| **Offer** | Pre-season consult — skin refresh or body plan before Memorial Day–July 4 |
| **Channels** | Instagram/Meta geo (zip-targeted) + email |

**Archetypes:**

| # | Profile | Zip | Service | Why on list |
|---|---------|-----|---------|-------------|
| 4 | Great Falls mom, club event in ~6 weeks | 22066 | Skin refresh | C04 event-ready |
| 5 | Chevy Chase member, injectables elsewhere | 20815 | Botox consult | C02 club corridor; MD oversight |
| 6 | Brookeville equestrian household | 20833 | Body contouring | C02 equestrian; drives to Potomac for MD trust |

---

### Segment 3 — Executive weekday consult (NW DC + McLean)

| Field | Value |
|-------|--------|
| **HighLevel tag** | `PSC_Executive_WeekdayConsult` |
| **Target zips** | 20007, 20016, 20008, 22101 |
| **Consumer signals** | C06, C07, C09 |
| **Audience** | Lawyers, consultants, diplomats, Tysons-adjacent executives |
| **Pain / hook** | Tight calendars; phone-tag booking; wants discretion + continuity |
| **Offer** | Weekday consult slots (Tue–Fri) — skin analysis + personalized plan |
| **Channels** | LinkedIn geo + email + SMS confirmation |

**Archetypes:**

| # | Profile | Zip | Service | Why on list |
|---|---------|-----|---------|-------------|
| 7 | Georgetown attorney, 50s, first-time filler curious | 20007 | Injectables consult | C07; MD-led not chain |
| 8 | Spring Valley, maintenance Botox | 20016 | Injectables | C07 + discretion |
| 9 | McLean consultant, frequent travel | 22101 | Skin maintenance | C06 wellness-adjacent; needs cadence |
| 10 | Foxhall empty nester, sun damage | 20008 | Skin rejuvenation | C07; physician trust |

---

## 5. Master priority list (12 campaign rows)

Queue for campaign build — archetypes until spa CRM or compliant list source exists.

| Rank | Segment tag | Archetype | Zip | Primary offer | LTV |
|------|-------------|-----------|-----|---------------|-----|
| 1 | `PSC_Potomac_Core_VIP` | Longtime injectables patient, phone-only booker | 20854 | VIP re-engagement + easy rebook | High |
| 2 | `PSC_Potomac_Core_VIP` | Body contouring + Cherry prospect | 20854 | Consult + financing explainer | High |
| 3 | `PSC_GreatFalls_PreSeason` | Great Falls gala-prep skin refresh | 22066 | Pre-season consult | High |
| 4 | `PSC_GreatFalls_PreSeason` | Chevy Chase club member, competitor switch | 20815 | Physician-led injectables consult | High |
| 5 | `PSC_Executive_WeekdayConsult` | Georgetown professional, first filler | 20007 | Weekday consult slot | Med–High |
| 6 | `PSC_Executive_WeekdayConsult` | Spring Valley maintenance Botox | 20016 | Membership continuity | High |
| 7 | `PSC_Potomac_Core_VIP` | Cabin John ZO loyalist | 20818 | Treatment plan reminders | Medium |
| 8 | `PSC_GreatFalls_PreSeason` | Brookeville equestrian, body contouring | 20833 | Body consult | Med–High |
| 9 | `PSC_Executive_WeekdayConsult` | McLean traveler, skin maintenance | 22101 | Between-visit nurture | Medium |
| 10 | `PSC_Potomac_Core_VIP` | Potomac empty-nester, sun damage | 20854 | Skin rejuvenation consult | Medium |
| 11 | `PSC_GreatFalls_PreSeason` | Bethesda professional, event season | 20814 | Event-ready package consult | Med–High |
| 12 | `PSC_Executive_WeekdayConsult` | Foxhall discreet aesthetic client | 20008 | Private consult | High |

---

## 6. Sample cadence — Segment 1 (`PSC_Potomac_Core_VIP`)

**Compliance (C10):** Consult required. No guaranteed results. Individual results vary. Include opt-out on SMS.

| Week | Channel | Content |
|------|---------|---------|
| 1 | Email | **Subject:** Your Potomac skin consult — on your schedule · Physician-led practice since 1998; free consult; Cherry financing for qualifying treatments. |
| 1 | SMS | Potomac Skin Care: Free consult slots this month on River Rd. Reply YES for callback or call (301) 765-0990. Msg/data rates apply. Reply STOP to opt out. |
| 2 | Email | Social proof + services (Botox, fillers, body contouring) — trusted by Potomac neighbors for 30 years. |
| 3 | Email | Seasonal nudge — spring skin refresh / body plan before summer. |
| 3 | SMS | Reminder + direct phone CTA. |

---

## 7. Draft copy (compliance-safe)

### Email — Segment 2 (pre-season)

**Subject:** Pre-season skin consult — Potomac Skin Care  

**Body:**  
Spring events are around the corner. Potomac Skin Care has served the River Road community since 1998 with physician-led aesthetic care — injectables, advanced skin treatments, and body contouring.  

Schedule a ** complimentary consultation** to discuss a plan that fits your calendar. Consult required; individual results vary.  

Call **(301) 765-0990** or request an appointment at [thepotomacskincare.com](https://www.thepotomacskincare.com/).

---

### SMS — Segment 3 (weekday consult)

Potomac Skin Care: Weekday consult slots available Tue–Fri on River Rd. Physician-led skin & injectables. Call (301) 765-0990. Msg/data rates apply. Reply STOP to opt out.

---

### Social caption — Segment 2

Physician-led aesthetics in Potomac since 1998. Planning ahead for the season? Book a consult — we'll map a plan that fits you. Consult required. (301) 765-0990 · Link in bio.

---

## 8. HighLevel export (demo shape)

Manual import columns for Work Smarter sub-account:

| contact_tag | spa_client | campaign_name | segment_zip | email_subject | sms_body |
|-------------|------------|---------------|-------------|---------------|----------|
| `PSC_Potomac_Core_VIP` | Potomac Skin Care | Spring_VIP_2026 | 20854;20818;20817 | Your Potomac skin consult — on your schedule | *(see §6 week 1 SMS)* |
| `PSC_GreatFalls_PreSeason` | Potomac Skin Care | PreSeason_Gala_2026 | 22066;20815;20833 | Pre-season skin consult — Potomac Skin Care | *(optional)* |
| `PSC_Executive_WeekdayConsult` | Potomac Skin Care | Weekday_Consult_2026 | 20007;20016;22101 | Weekday consult — Potomac Skin Care | *(see §7 SMS)* |

Additional tags: `Spring_2026`, `Consult_Required`, `Cherry_Eligible`, `WorkSmarter_Demo`.

---

## 9. Validation checklist (theory test)

| Question | Pass if… |
|----------|----------|
| Segments map to affluent zips near spa? | Yes — 12 zips within ~12 mi |
| Lifestyle signals explain *why* each segment? | Yes — C02/C04/C07/C08 tied per segment |
| Layer A pain informs copy? | Yes — VIP trust + digital friction in theme |
| Copy passes C10? | Yes — consult required; no outcome claims |
| Spa owner would recognize ideal clients? | **Human verify** on call with Work Smarter + spa |
| Ready for HighLevel without code? | Yes — tags + zip strings + draft copy |

---

## 10. What this is not

- Not a list of real individuals with email/phone  
- Not permission to send SMS/email (needs opt-in or spa-owned CRM)  
- Not a performance forecast  

**Next step after theory pass:** Ask Potomac Skin Care (or Work Smarter): *“Do these three segments match who you wish walked in the door?”* Adjust zips and archetypes before Band It automation.

---

## 11. Ten-client campaign list

Full machine-readable export: [campaign-clients-potomac-skin-care.csv](./campaign-clients-potomac-skin-care.csv)

Synthetic demo personas — **not real people**. No contact PII. Each row maps Layer A spa signals, Layer B consumer signals (C01–C09), segment tag, offer, and channel.

| ID | Persona | Zip | Segment | Service | Consumer signals | Layer A (via C09) |
|----|---------|-----|---------|---------|------------------|-------------------|
| PSC-001 | Margaret H. | 20854 Potomac | Core VIP | Botox maintenance | C01 C07 C08 C09 | M06 M15 physician trust |
| PSC-002 | David & Sarah W. | 20854 Potomac | Core VIP | Body contouring | C01 C08 C09 | M14 M15 Cherry path |
| PSC-003 | Priya K. | 20818 Cabin John | Core VIP | ZO skin treatments | C01 C06 C09 | M07 M15 VIP gap |
| PSC-004 | Elizabeth R. | 22066 Great Falls | PreSeason | Skin refresh | C01 C02 C04 C08 | M13 M14 competitor pressure |
| PSC-005 | James M. | 20815 Chevy Chase | PreSeason | Injectables switch | C01 C02 C05 C09 | M14 MD vs chain |
| PSC-006 | Catherine A. | 20833 Brookeville | PreSeason | Body tightening | C01 C02 C05 C08 | M02 body line |
| PSC-007 | Amanda L. | 20007 Georgetown | Weekday consult | First filler | C01 C04 C07 C09 | M06 M14 booking friction |
| PSC-008 | Helena V. | 20016 Spring Valley | Weekday consult | Botox + skin | C01 C03 C04 C07 | M15 discreet continuity |
| PSC-009 | Michael T. | 22101 McLean | Weekday consult | Travel maintenance | C01 C03 C06 C07 C08 | M08 cadence gap |
| PSC-010 | Patricia O. | 20814 Bethesda | PreSeason | Gala-ready package | C01 C02 C04 C07 C08 | M13 M14 high LTV events |

**Signal coverage across the list:**

| Layer | Signals used in client selection |
|-------|----------------------------------|
| **Fit (spa)** | F02 independent · F03 owner-led ICP |
| **Hunt (spa → copy)** | M02 M06 M07 M08 M09 M13 M14 M15 |
| **Consumer** | C01 geography · C02 club · C03 travel · C04 gala · C05 luxury corridor · C06 wellness · C07 executive · C08 seasonal · C09 spa context |
| **Calibrate** | C10 on all hooks (consult required; no outcome claims) |
| **Exclude** | X01–X03 confirmed absent on spa (not applied to clients) |

---

## Revision history

| Date | Change |
|------|--------|
| 2026-05-29 | Initial Layer B dry run for Potomac Skin Care |
| 2026-05-29 | Added ten-client list (§11) + CSV export |
