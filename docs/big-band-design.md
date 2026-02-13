# Big Band Feature Design Document

## Overview

A **Big Band** is an umbrella organization that contains multiple **Bands** (sub-bands) beneath it. Examples:
- A school (Big Band) with Orchestra, Volleyball Club, Drama Club (Bands)
- United Nations (Big Band) with Human Rights Council, Climate Action Committee (Bands)

Big Bands provide governance, shared resources, and policy enforcement across their sub-bands.

---

## Implementation Strategy

This is a **large feature** broken into phases. Each phase is independently deployable and valuable.

| Phase | Scope | Effort |
|-------|-------|--------|
| **MVP (Phase 1)** | Core structure, basic UI | Medium |
| Phase 2 | Policies (informational only) | Low-Medium |
| Phase 3 | Cross-visibility | High |
| Phase 4 | Policy enforcement with AI | High |
| Phase 5 | Budget integration | Medium |
| Phase 6 | Lifecycle (join/leave existing bands) | Medium |

---

# MVP (Phase 1)

## What's Included

- `parentBandId` field on Band model
- Big Band creation by Band It admin
- Sub-band creation by Big Band founder
- Big Band page showing sub-band list
- Dashboard shows "My Bands" and "My Big Bands" separately
- Sub-band display format: "School > Orchestra"
- Big Band has its own channels, files, events, proposals, projects, tasks (like any band)
- Bundled billing (Big Band subscription covers sub-bands)

## What's NOT Included (Deferred)

- Cross-visibility (sub-band members can't see sibling sub-bands yet)
- Policies and policy enforcement
- Automatic budget transfers
- Existing bands joining a Big Band
- Sub-bands leaving a Big Band

---

## Data Model

**Approach**: Self-referential `Band` table with `parentBandId` field

```
Band
├── parentBandId: String? (FK to Band.id)
│   - null = standalone band OR big band
│   - set = sub-band
```

A band is a **Big Band** if other bands reference it as their parent.
A band is a **Sub-Band** if it has a `parentBandId` set.
A band is **Standalone** if `parentBandId` is null and no bands reference it as parent.

### Hierarchy Rules
- **Two levels only**: Big Band → Bands
- A band can belong to **at most one** Big Band
- Existing standalone bands remain unchanged

---

## Membership & Roles (MVP)

### Role Hierarchy
Same as regular bands: Founder → Governor → Moderator → Conductor → Voting Member → Observer

### Membership Rules
- Users can be members of Big Band only, sub-band only, or both
- Big Band governors have **no automatic role** in sub-bands
- Big Band governors **cannot intervene** directly in sub-bands
- A person can be in the Big Band without being in any sub-band (e.g., school administrator)

### Visibility (MVP - Simple)
- Big Band members see Big Band content only
- Sub-band members see their sub-band content only
- No cross-sub-band visibility yet (Phase 3)

### Joining Flow
Either path works:
1. **Join Big Band first** → then join specific sub-band(s)
2. **Join sub-band directly** → can optionally join Big Band later

Sub-band members can invite people directly to their sub-band.

---

## Big Band Features (MVP)

Big Bands function like regular bands:

| Feature | Big Band Has It? |
|---------|------------------|
| Channels | Yes |
| Files | Yes |
| Events | Yes |
| Proposals | Yes |
| Projects | Yes |
| Tasks | Yes |
| Buckets | Yes |
| Member Directory | Yes (Big Band members only in MVP) |

---

## Lifecycle (MVP)

### Big Band Creation
1. **Only Band It admin** can create a Big Band
2. Admin assigns a **founder** to the Big Band
3. Admin has **no role** in Big Band after creation

### Sub-Band Creation
- Big Band **founder** can create sub-bands
- When founder creates a sub-band, they become that sub-band's founder

### Dissolution (MVP)
- Big Band **cannot dissolve** until all sub-bands dissolve first
- Sub-bands dissolve normally

---

## Billing (MVP)

- **Bundled subscription**: Big Band subscription covers all sub-bands
- Only Band It admin creates Big Bands (involves business discussion about fees)
- Sub-bands do not have separate subscriptions

---

## UX / Frontend (MVP)

### Big Band Page
- Shows list of all sub-bands with name and key info
- Shows Big Band description, mission, values
- Follow existing tight layout patterns (see proposals, projects, tasks pages)

### Sub-Band Display
- Show as: `{Big Band Name} > {Sub-Band Name}` (e.g., "School > Orchestra")

### Sidebar
- Stays mostly the same for both Big Bands and Bands
- Users discover sub-bands from the Big Band detail page
- Consider subtle indicator to distinguish Big Band from regular Band

### Dashboard / My Bands
- Single "My Bands" list with indicator showing which are Big Bands
- If user is in 2 sub-bands under same Big Band, shows all 3 items with appropriate indicators

### Discovery / Browse Bands
- Browse Bands shows indicator on each band (Big Band vs regular Band)
- Non-members can see list of sub-bands when viewing a Big Band
- Users can join sub-bands directly

---

# Future Phases

## Phase 2: Policies (Informational Only)

- New Policy model linked to Big Band
- Policy types: enforced / informational / suggestion (enum)
- Policy created via proposals in Big Band
- Policies displayed in sub-bands (read-only, no enforcement yet)
- Policies apply to all sub-bands by default, can exclude specific ones

## Phase 3: Cross-Visibility

- All members across a Big Band can **view** content in any sibling sub-band
- Cross-sub-band participation is **view only** (cannot claim tasks, vote, etc.)
- Big Band member directory shows all members with sub-band affiliations
- Big Band events visible to all sub-band members, all can RSVP
- Big Band announcements notify all sub-band members

**Note**: This phase has highest effort - touches many permission checks throughout codebase.

## Phase 4: Policy Enforcement with AI

- AI validation checks sub-band proposals against Big Band enforced policies
- Rejection message explains which policy was violated
- Sub-band policies must align with Big Band policies
- May need ad hoc AI training feature for corrections

## Phase 5: Budget Integration

- Big Band buckets
- Budget allocation proposals (Big Band → sub-band)
- Automatic transfer when proposal passes
- Transfer tagged on both sides

## Phase 6: Lifecycle (Join/Leave)

- Existing standalone band can join a Big Band (requires vote)
- Band keeps all history when joining
- Sub-band can leave Big Band and become standalone (requires vote)

---

# Out of Scope (Future Consideration)

1. **Multiple founders** - Any founder can assign other members as founders (separate feature)
2. **Analytics** - Aggregate analytics for Big Bands across all sub-bands
3. **More than 2 levels** - Deeper hierarchy (e.g., District → School → Club)
4. **Cross-sub-band task assignment** - Allow members to participate in other sub-bands

---

# Migration

- Existing bands remain as **standalone bands**
- No automatic conversion
- Bands can join Big Bands later (Phase 6)
