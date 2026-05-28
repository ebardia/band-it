# DAILY-ONBOARDING-V2-001 — Daily Home, Profile Signals & Opportunity Flow

## Status

**Phase 1 implemented — March 2026**

Companion documents:

- `Band-It-V2/Layer1_Philosophy_and_Principles.md` — core promise
- `Band-It-V2/Layer2_The_Experience (10).md` — cold start, The Daily, newspaper sections
- `Band-It-V2/BandIt_v2_Evolution_Plan.md` — what exists vs. what is new
- `docs/plans/GUIDED-ONBOARDING-001.md` — **still valid for band founders** (templates, milestones)

This spec **supersedes the user welcome portions** of GUIDED-ONBOARDING-001 (template picker at signup, `/discover` as onboarding exit). It does **not** replace band milestone onboarding.

---

## Problem Statement

Band It is evolving from a **band-first** product (signup → pick band type → create or discover bands) to a **user-first daily companion** (signup → `/daily` → tell us about yourself → personalized opportunities inside and outside the platform).

The current `/daily` onboarding UI reflects **both visions at once**, which causes broken UX:

1. **Right rail disappears** after one Continue, Skip, or navigate-away-and-back — because `hasCompletedWelcome` is set and never unset.
2. **Single-select interests** — product intent is multi-category (work, causes, play, community) from the same home.
3. **Wrong exits** — cause/community/creative → band create; browse → `/discover`. Neither matches “this is the area I want to work on → add my details on profile.”
4. **Boolean completion flags** — `hasCompletedWelcome` and `profileCompleted` treat onboarding as one-and-done. Users may fill one profile section today and another next month; back navigation without action should not permanently dismiss guidance.
5. **Promise vs. delivery gap** — copy says the Daily gets sharper as you tell us who you are, but `getHomeFeed` today only surfaces in-platform peer review and comment activity — not Open Calls, neighborhood items, or external gigs/events.

---

## Product Intent (One Paragraph)

**Tell us about yourself; we show you what is out there and what is in here.**

- **Out there:** external opportunities — gigs, events, grants, local listings (future: External Intelligence domain).
- **In here:** platform opportunities — funded projects, band tasks, invitations, Roundtable discussions. Often organized under **bands**, but bands are not the entry question. A funder’s paid project may live under a band; so may a neighborhood group or campaign.

`/daily` is **home** for logged-in users. It is a personal newspaper that composes both sources. Onboarding on `/daily` is **slow and revisitable**, not a forced gate at registration.

---

## Design Principles (from Layer 1 — applied here)

| Principle | Implication for onboarding |
|-----------|----------------------------|
| First interaction is never about tasks | Interest picker routes to **profile**, not task lists or band dashboards |
| People resist being told what to do | Multi-select, skip, return anytime; no permanent hide on first click |
| Real life is messy | User can care about paid work **and** causes **and** play simultaneously |
| Quiet days are valid | Daily may be sparse early; do not fabricate urgency |
| User owns their narrative | Interests and profile sections are visible and editable on profile |

---

## Current State (Code — March 2026)

### `/daily` page

- Renders: masthead, `DailyOnboarding`, `newspaper.getHomeFeed` (Lead + Roundtable).
- Feed is **in-platform only** today (task peer review, comment replies/mentions).

### `DailyOnboarding`

- Left: Editor’s note + mission + classified image.
- Right (when `!hasCompletedWelcome`): “Open calls” interest briefs — **single-select**.
- Below: “Member file” profile nudges (when `!profileCompleted`), invitations, “Below the fold” quiet copy.

### Interest actions (`welcomeInterests.ts`)

| Interest ID | Current Continue destination |
|-------------|------------------------------|
| `paid-work` | Scroll to inline profile on `/daily` + `completeWelcome` |
| `cause`, `community`, `creative` | `/bands/create?template=...` + `completeWelcome` |
| `browse` | `/discover` + `completeWelcome` |

Skip and all Continue paths call `completeWelcome` → right rail hidden on return.

### Flags

| Flag | Stored on | Current meaning | Problem |
|------|-----------|-----------------|--------|
| `hasCompletedWelcome` | `User` | User finished welcome | Set too early; hides interest UI permanently |
| `profileCompleted` | `EndUserProfile` (via API) | Location + resume present | Ignores causes/play; hides profile nudges too early |

### Progressive logic already exists

- `profileSignals.ts`: `countProfileSignals`, `buildNextMoves`, `buildEditionPreviewLines` — **5 signals** (place, resume, skills, causes, play). This is the right model for “not a boolean.”

### `/discover`

- Still exists: band invitations + recommended bands.
- Linked from legacy dashboard, quick actions, and onboarding “browse” path.
- **Not part of V2 home narrative** — discovery belongs in Daily sections, not a separate hub at cold start.

### What to keep from v1

- **Band template selection** at `/bands/create` (cause, community, creative, other).
- **Band milestone onboarding** (`BandOnboarding`, progress banner, celebrations) — for **founders**, not new members at signup.
- **Invitation accept flow** on Daily — invited users are a distinct path (Layer 2 Path A).

---

## Target Experience

### Registration → home

- Register (name, email, password, legal) → verify → **`/daily`**.
- Login → **`/daily`**. Logo → **`/daily`**.
- `/welcome` redirects to `/daily` (legacy route).

### First visit to `/daily`

User sees a **real newspaper**, not an empty dashboard:

1. Masthead — “Your edition”
2. **First edition** orientation (Editor’s note, mission, classified art)
3. **Open calls** rail — “What brings you here?” — **multi-select**
4. Optional: pending **invitations** (if any)
5. **Member file** — progressive profile nudges (rule-based next moves)
6. Feed slots (Lead, Roundtable) — may be quiet
7. **Below the fold** — honest preview of what fills in as profile grows

### Interest picker (revised)

**Interaction**

- Toggle **one or more** briefs (paid work, causes, community, creative, still exploring).
- **Continue** → save selections → navigate to **`/user-dashboard/profile`** with optional focus (e.g. `?sections=skills,causes` or hash anchors).
- **Skip for now** → dismiss **this session’s** emphasis only — **do not** set permanent welcome-complete.
- Returning to `/daily` → rail may show collapsed nudge (“Add more to your listing”) if signals are still low — not gone forever.

**Destinations — all “work on this area” paths go to profile**

| Interest | Profile focus (suggested) |
|----------|---------------------------|
| Paid work & gigs | Location, resume, skills |
| Causes & campaigns | Causes taxonomy |
| Community & mutual aid | Causes + location |
| Creative collabs | Play interests |
| Still figuring it out | No forced section — stay on Daily or profile overview |

**Do not** route cold-start interests to `/bands/create` or `/discover`.

**Band create** remains available elsewhere: “Start a band” in nav, profile, or when user engages with an in-platform opportunity that requires a collective.

### Profile page

- User adds details **across sections over time** — not one session.
- Completion is **signal depth** (`countProfileSignals`), not a single boolean gate.
- Daily onboarding “Member file” band uses `buildNextMoves` until user dismisses or signal threshold met — independent of interest rail.

### Return to `/daily`

As profile signals grow:

- Preview copy updates (`buildEditionPreviewLines`).
- Future: newspaper sections populate (Open Calls, Neighborhood, Your Stories, etc.).
- User reads opportunities **on the Daily** — taps through to act (apply, join band, open project).

### Invited users (Layer 2 Path A)

- If pending invitations exist, show prominently on Daily.
- Accept → band (existing behavior).
- “Look around first” → stay on Daily, skip heavy onboarding.

---

## Relationship to The Daily (Newspaper)

Onboarding is **not separate from** the newspaper — it is the **above-the-fold editorial** until the user has enough signals. Long term, the same surface composes:

| Section (Layer 2) | Source | Status |
|-------------------|--------|--------|
| The Lead | Best match today (funded project, milestone, news) | Partial (in-platform review only) |
| Open Calls | Funded projects accepting applications | Not built |
| In Progress | User’s active projects | Not in feed |
| The Neighborhood | Local events, hands-needed | Not built |
| Your Stories | Followed issues/threads | Not built |
| The Roundtable | Talk It Out / discussions | Partial (comments) |
| The Wider World | External news in interest areas | Not built |
| Just For You | Play, hobbies | Not built |

**Phase 1 (this spec):** fix onboarding routing, flags, multi-select, profile destination.

**Phase 2:** wire feed sections to profile signals + platform data.

**Phase 3:** external intelligence → “out there” content.

---

## Data Model

### Deprecate (behavior, not necessarily column yet)

- **`hasCompletedWelcome` as UI gate** — stop using it to hide the interest rail. Optionally repurpose or remove in a later migration.

### Replace boolean thinking with signals

| Concept | Approach |
|---------|----------|
| Profile depth | Existing `countProfileSignals` (5 checks) — expose in API if needed |
| Onboarding dismiss | Optional `dailyOnboardingDismissedAt` or per-section dismiss flags — **explicit user action**, not navigation side effect |
| Interest selections | **New:** persist selected interest IDs |

### Proposed: user interest selections

```prisma
// Option A — JSON on EndUserProfile (simplest)
model EndUserProfile {
  // ... existing fields
  welcomeInterestIds  String[]  @default([])  // e.g. ['paid-work', 'cause']
}

// Option B — normalized join (if we need metadata later)
model UserWelcomeInterest {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(...)
  interestId String  // matches welcomeInterests.ts ids
  createdAt DateTime @default(now())
  @@unique([userId, interestId])
}
```

**Recommendation:** Option A for Phase 1 unless we need timestamps per interest.

### API additions

```typescript
// onboarding router
saveWelcomeInterests: mutation({ userId, interestIds: string[] })
getWelcomeInterests: query({ userId }) => { interestIds: string[] }

// Stop calling completeWelcome on interest Continue.
// completeWelcome may be removed or reserved for explicit "I'm done with setup" (TBD).
```

### `profileCompleted`

- Short term: stop gating Daily UI on this boolean alone; use `countProfileSignals` client-side (already available via profile payload).
- Long term: rename or split into `profileSignalsFilled: number` / `profileSignalsTotal: number` in API responses.

---

## `/discover` — Deprecation Plan

| Phase | Action |
|-------|--------|
| Now | Remove from onboarding paths; no new links in Daily flow |
| Next | Replace dashboard/quick-action links with `/daily` or contextual band browse |
| Later | Redirect `/discover` → `/daily` or remove route when band recommendations live in a Daily section |

**Rationale:** V2 discovery is **content in the newspaper**, not a band-recommendation page at cold start. The route can remain temporarily for legacy users.

---

## What GUIDED-ONBOARDING-001 Still Owns

Keep unchanged until a separate spec says otherwise:

- Template selection during **band creation**
- `BandOnboarding` milestones (10 steps)
- Progress banner, hints, celebrations on band pages
- Founder notifications

Update GUIDED-ONBOARDING-001 header to reference this doc for **user** welcome flow.

---

## Implementation Phases

### Phase 1 — Onboarding behavior (critical path)

1. Multi-select interest briefs
2. Persist `welcomeInterestIds` on save
3. Continue → `/user-dashboard/profile` with section focus from selections
4. Remove `completeWelcome` from interest Continue and Skip
5. Change visibility: show interest rail / nudges based on **signal depth + explicit dismiss**, not `hasCompletedWelcome`
6. Remove `/discover` and `/bands/create` from interest Continue handlers

**Files (expected):**

- `apps/web/src/components/newspaper/DailyOnboarding.tsx`
- `apps/web/src/lib/welcomeInterests.ts`
- `apps/web/src/app/user-dashboard/profile/page.tsx` (section focus)
- `apps/api/src/server/routers/onboarding.ts`
- `apps/api/prisma/schema.prisma` (if persisting interests)
- `apps/api/src/server/routers/profile/index.ts` (optional signal fields in response)

### Phase 2 — Daily feed maturity

1. Extend `getHomeFeed` with placeholder or real Open Calls section driven by profile
2. Surface invitations in feed when relevant
3. Align “Below the fold” with actual section availability

### Phase 3 — External & matching (Evolution Plan Domain 8/11)

1. Open Calls from funded projects
2. External gigs/events ingestion
3. Matching algorithms beyond exact taxonomy overlap

---

## Success Metrics

| Metric | Target | Notes |
|--------|--------|-------|
| Interest Continue → profile | >70% | vs. band create / discover today |
| Multi-select usage | >40% pick 2+ | validates multi-category promise |
| Return to Daily within 7 days | Baseline + lift | home stickiness |
| Profile signals after 7 days | Avg ≥2 of 5 filled | progressive enrichment |
| Right rail “disappeared” support tickets | → 0 | boolean bug class eliminated |

---

## Open Questions

| Question | Lean | Notes |
|----------|------|-------|
| Explicit “dismiss onboarding” control? | Yes, subtle link | Separate from Skip; sets dismiss timestamp |
| Keep inline profile band on Daily vs. profile-only? | Profile page primary; Daily shows summary + link | Avoid duplicating full profile form on Daily |
| When to prompt “Start a band”? | After in-platform opportunity or user-initiated | Not at cold start |
| Retire `hasCompletedWelcome` column? | Phase 2 migration | Stop reading it in Phase 1 |
| Map interests to taxonomy seeds? | Optional Phase 2 | Pre-check categories on profile from interest IDs |

---

## Appendix: Historical Flow Summary

| Era | Entry | Interest choice | Exit |
|-----|-------|-----------------|------|
| v1 `/welcome` (main) | Login, no bands | Band template | `/bands/create?template=...` or Skip → `/discover` |
| v1 interest picker (`bb978b6`) | `/welcome` | Single card | Paid work → profile; bands → create **without** completeWelcome; browse → discover |
| Current `/daily` | Login → `/daily` | Single brief | Mixed: scroll profile, band create, discover; **all** call `completeWelcome` |
| **Target (this spec)** | Login → `/daily` | Multi brief | Profile (focused sections); Daily stays home; bands/discover not cold-start exits |

---

## Revision History

| Date | Change |
|------|--------|
| 2026-03-28 | Initial draft from product/code exploration |
