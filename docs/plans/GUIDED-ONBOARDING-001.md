# GUIDED-ONBOARDING-001 — User & Band Onboarding

> **User welcome flow:** superseded by [`DAILY-ONBOARDING-V2-001.md`](./DAILY-ONBOARDING-V2-001.md) (`/daily` home, profile-first). This document remains authoritative for **band template selection** and **band milestone onboarding**.

## Problem Statement

Users discover Band It through community posts or referrals. Two failure modes:

1. **Account dead-end:** User signs up, sees empty dashboard, doesn't know what to do, leaves
2. **Band dead-end:** User creates band, sees features everywhere, doesn't know where to start, leaves

## Purpose

Guide users from signup to their first successful collective action through:
1. **User welcome flow** - Direct new users toward their goal
2. **Template selection** - Match band setup to user intent
3. **Milestone tracking** - Step-by-step guidance to functioning band

---

## Scope

### ✅ IN SCOPE

- Welcome flow for users without bands
- Template selection during band creation (4 templates)
- Milestone tracking per band
- Progress banner and checklist UI
- Contextual hints on relevant pages
- Celebration moments
- Skip/dismiss functionality
- Founder notifications on milestone completion

### ❌ OUT OF SCOPE

- AI-generated content
- Per-user onboarding within a band (joining member experience)
- Gamification beyond progress tracking
- Custom user-created templates

---

## Part 1: User Welcome Flow

### Trigger

User logs in AND:
- `hasCompletedWelcome === false`
- User belongs to zero bands

### Welcome Screen

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    Welcome to Band It                       │
│                                                             │
│  Make decisions and get things done together.               │
│                                                             │
│  What brings you here?                                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🚀  I want to start a group                        │   │
│  │      Create a band and invite others to join         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ✉️  I was invited to join                          │   │
│  │      Check your pending invitations                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  👀  Just exploring                                 │   │
│  │      See how Band It works                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Routing

| Selection | Destination | Notes |
|-----------|-------------|-------|
| Start a group | `/bands/create` | Template selection first |
| Invited | `/invitations` | Show pending invites |
| Exploring | `/discover` | Browse public bands |

After any selection, set `hasCompletedWelcome = true`.

### Data Model Addition

```prisma
model User {
  // ... existing fields
  hasCompletedWelcome  Boolean  @default(false)
}
```

---

## Part 2: Template Selection

### Templates (4 Total)

#### 1. Organizing a Cause
**Emoji:** ✊
**Description:** For campaigns, advocacy, activism, or political organizing
**Suggested defaults:**
- Mission placeholder: "We're organizing to..."
- Values: `["Transparency", "Collective Action", "Accountability"]`
- Voting method: Simple Majority
- Voting period: 3 days
- Member threshold: 3

#### 2. Community Group
**Emoji:** 🏘️
**Description:** For neighborhoods, mutual aid, local organizations, or associations
**Suggested defaults:**
- Mission placeholder: "Our community comes together to..."
- Values: `["Community", "Mutual Support", "Inclusion"]`
- Voting method: Supermajority 66%
- Voting period: 7 days
- Member threshold: 4

#### 3. Creative Project
**Emoji:** 🎨
**Description:** For bands, art collectives, theater groups, or creative collaborations
**Suggested defaults:**
- Mission placeholder: "We create..."
- Values: `["Creativity", "Collaboration", "Fairness"]`
- Voting method: Simple Majority
- Voting period: 2 days
- Member threshold: 2

#### 4. Something Else
**Emoji:** ⚙️
**Description:** For unique groups or experienced users
**Suggested defaults:**
- No pre-filled mission
- Values: `[]`
- Voting method: Simple Majority (platform default)
- Voting period: 7 days (platform default)
- Member threshold: 3

### Template Selection UI

During band creation, before the form:

```
┌─────────────────────────────────────────────────────────────┐
│                     Create Your Band                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  What kind of group are you building?                       │
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │         ✊            │  │         🏘️           │        │
│  │  Organizing a Cause  │  │   Community Group    │        │
│  │                      │  │                      │        │
│  │  Campaigns, advocacy │  │  Neighborhoods,      │        │
│  │  activism, political │  │  mutual aid, local   │        │
│  └──────────────────────┘  └──────────────────────┘        │
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │         🎨            │  │         ⚙️           │        │
│  │   Creative Project   │  │    Something Else    │        │
│  │                      │  │                      │        │
│  │  Bands, art groups,  │  │  Unique groups or    │        │
│  │  creative collabs    │  │  experienced users   │        │
│  └──────────────────────┘  └──────────────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Selection pre-fills the band creation form with suggested defaults.

---

## Part 3: Band Milestones

### Universal Milestones

All templates use the same 10 milestones. Only wording and thresholds vary.

| # | Milestone | Completion Check | Default Threshold |
|---|-----------|------------------|-------------------|
| 1 | Create your band | automatic | — |
| 2 | Define your mission | `band.mission` exists and not empty | — |
| 3 | Invite your first members | `band.members.count >= N` | Template-specific |
| 4 | Start your first discussion | Any channel has messages | — |
| 5 | Set up voting rules | `governanceSettingsUpdated` flag | — |
| 6 | Create your first proposal | `proposals.count >= 1` | — |
| 7 | Pass your first proposal | Any proposal with `status = PASSED` | — |
| 8 | Launch a project | `projects.count >= 1` | — |
| 9 | Complete a task | Any task with `status = COMPLETED` | — |
| 10 | Document your agreements | `documents.count >= 1` | — |

### Milestone Wording by Template

| Milestone | Organizing a Cause | Community Group | Creative Project | Something Else |
|-----------|-------------------|-----------------|------------------|----------------|
| 3 | Recruit organizers | Invite neighbors | Bring in collaborators | Invite members |
| 6 | Propose an action | Propose something | Propose a project | Create a proposal |
| 8 | Launch a campaign | Start an initiative | Set up production | Launch a project |
| 10 | Document principles | Save your bylaws | Record agreements | Add documentation |

### Template Data Structure

```typescript
// apps/api/src/lib/onboarding/templates.ts

interface OnboardingTemplate {
  id: string;
  name: string;
  emoji: string;
  description: string;

  suggestedMission: string;
  suggestedValues: string[];
  suggestedVotingMethod: VotingMethod;
  suggestedVotingPeriodDays: number;
  memberThreshold: number;

  milestoneWording: {
    [milestoneId: string]: {
      title: string;
      description: string;
      celebration: string;
    }
  }
}

const TEMPLATES: Record<string, OnboardingTemplate> = {
  cause: {
    id: 'cause',
    name: 'Organizing a Cause',
    emoji: '✊',
    description: 'For campaigns, advocacy, activism, or political organizing',
    suggestedMission: 'We are organizing to...',
    suggestedValues: ['Transparency', 'Collective Action', 'Accountability'],
    suggestedVotingMethod: 'SIMPLE_MAJORITY',
    suggestedVotingPeriodDays: 3,
    memberThreshold: 3,
    milestoneWording: {
      invite_members: {
        title: 'Recruit organizers',
        description: 'You need at least 3 organizers to build momentum.',
        celebration: 'Your organizing team is forming!',
      },
      // ... etc
    }
  },
  // ... other templates
};
```

---

## Part 4: Progress UI

### Progress Banner

Always visible on band pages until dismissed or completed:

```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Getting Started                              Step 3/10  │
│ ━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  30%  │
│                                                             │
│ Next: Recruit organizers                                    │
│ You need at least 3 organizers to build momentum.          │
│                                                             │
│ [Invite Members →]                      [All Steps]    [✕] │
└─────────────────────────────────────────────────────────────┘
```

### Progress Modal

Full view when clicking "All Steps":

```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Band Setup Progress                               [✕]   │
│                                                             │
│ Organizing a Cause                                          │
│ ━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  30%        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ✓  Create your band                                        │
│    Done                                                     │
│                                                             │
│ ✓  Define your mission                                     │
│    "Fighting for housing justice in Oakland"                │
│                                                             │
│ →  Recruit organizers                          [Do This]   │
│    You need at least 3 organizers to build momentum.       │
│    1 of 3 members                                           │
│                                                             │
│ ○  Start your first discussion                             │
│ ○  Set up voting rules                                     │
│ ○  Propose an action                                       │
│ ○  Pass your first proposal                                │
│ ○  Launch a campaign                                       │
│ ○  Complete a task                                         │
│ ○  Document your principles                                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ [Dismiss Onboarding]                                        │
└─────────────────────────────────────────────────────────────┘
```

### Contextual Hints

On pages relevant to current milestone:

```
┌─────────────────────────────────────────────────────────────┐
│ 💡 Step 3: Recruit organizers                              │
│                                                             │
│ Invite people you trust to help shape your campaign.       │
│ You need 3 members before you can make collective          │
│ decisions.                                                  │
│                                                     [Got it]│
└─────────────────────────────────────────────────────────────┘
```

### Celebration Modal

When milestone completes:

```
┌─────────────────────────────────────────────────────────────┐
│                          🎉                                 │
│                                                             │
│            Your first proposal passed!                      │
│                                                             │
│   You've experienced collective decision-making.            │
│   This is what organizing together looks like.              │
│                                                             │
│          ━━━━━━━━━━━━━━━━━━━━━●━━━━━━━━  70%               │
│                                                             │
│   Next: Launch a campaign                                   │
│                                                             │
│   [Start a Project]           [Continue]                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 5: Data Model

```prisma
// Add to User model
model User {
  // ... existing fields
  hasCompletedWelcome  Boolean  @default(false)
}

// New models
model BandOnboarding {
  id              String   @id @default(cuid())
  bandId          String   @unique
  band            Band     @relation(fields: [bandId], references: [id], onDelete: Cascade)

  templateId      String   // 'cause', 'community', 'creative', 'other'

  currentStep     Int      @default(1)
  completedSteps  Int[]    @default([])

  status          OnboardingStatus @default(ACTIVE)
  dismissedAt     DateTime?
  completedAt     DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([status])
}

enum OnboardingStatus {
  ACTIVE
  COMPLETED
  DISMISSED
}

// For analytics
model OnboardingEvent {
  id              String   @id @default(cuid())
  bandId          String

  eventType       String   // 'milestone_completed', 'milestone_skipped', 'dismissed'
  milestoneStep   Int?

  createdAt       DateTime @default(now())

  @@index([bandId])
  @@index([eventType, createdAt])
}
```

---

## Part 6: API Structure

```typescript
// onboardingRouter

// Get user welcome state
getUserWelcomeState: protectedProcedure
  .query(async ({ ctx }) => {
    const user = await getUser(ctx.userId);
    return {
      hasCompletedWelcome: user.hasCompletedWelcome,
      hasBands: user.bands.length > 0,
      pendingInvitations: await getPendingInvitations(ctx.userId),
    };
  }),

// Mark welcome complete
completeWelcome: protectedProcedure
  .mutation(async ({ ctx }) => {
    await prisma.user.update({
      where: { id: ctx.userId },
      data: { hasCompletedWelcome: true },
    });
  }),

// Get template options
getTemplates: publicProcedure
  .query(() => {
    return Object.values(TEMPLATES).map(t => ({
      id: t.id,
      name: t.name,
      emoji: t.emoji,
      description: t.description,
    }));
  }),

// Get template defaults (for band creation form)
getTemplateDefaults: publicProcedure
  .input(z.object({ templateId: z.string() }))
  .query(({ input }) => {
    const template = TEMPLATES[input.templateId];
    return {
      suggestedMission: template.suggestedMission,
      suggestedValues: template.suggestedValues,
      suggestedVotingMethod: template.suggestedVotingMethod,
      suggestedVotingPeriodDays: template.suggestedVotingPeriodDays,
    };
  }),

// Get band onboarding state
getBandOnboarding: protectedProcedure
  .input(z.object({ bandId: z.string() }))
  .query(async ({ input }) => {
    const onboarding = await prisma.bandOnboarding.findUnique({
      where: { bandId: input.bandId },
    });

    if (!onboarding) return null;

    const template = TEMPLATES[onboarding.templateId];
    const progress = await calculateProgress(input.bandId, template);

    return {
      ...onboarding,
      template,
      progress,
      currentMilestone: getMilestoneDetails(template, onboarding.currentStep),
    };
  }),

// Dismiss onboarding
dismissOnboarding: protectedProcedure
  .input(z.object({ bandId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    // Verify user is founder
    await verifyFounder(input.bandId, ctx.userId);

    await prisma.bandOnboarding.update({
      where: { bandId: input.bandId },
      data: {
        status: 'DISMISSED',
        dismissedAt: new Date(),
      },
    });

    await logOnboardingEvent(input.bandId, 'dismissed');
  }),
```

### Milestone Auto-Detection

Hook into existing mutations:

```typescript
// Helper called from relevant routers
export async function checkOnboardingProgress(bandId: string) {
  const onboarding = await prisma.bandOnboarding.findUnique({
    where: { bandId },
  });

  if (!onboarding || onboarding.status !== 'ACTIVE') return;

  const template = TEMPLATES[onboarding.templateId];
  const band = await getBandWithCounts(bandId);

  // Check current milestone
  const currentStep = onboarding.currentStep;
  const isComplete = checkMilestoneComplete(currentStep, band, template);

  if (isComplete && !onboarding.completedSteps.includes(currentStep)) {
    await prisma.bandOnboarding.update({
      where: { bandId },
      data: {
        completedSteps: [...onboarding.completedSteps, currentStep],
        currentStep: currentStep + 1,
      },
    });

    await logOnboardingEvent(bandId, 'milestone_completed', currentStep);
    await notifyFounder(bandId, currentStep); // Notification

    // Check if all complete
    if (currentStep === 10) {
      await prisma.bandOnboarding.update({
        where: { bandId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    }
  }
}

function checkMilestoneComplete(step: number, band: BandWithCounts, template: Template): boolean {
  switch (step) {
    case 1: return true; // Band exists
    case 2: return !!band.mission?.trim();
    case 3: return band._count.members >= template.memberThreshold;
    case 4: return band.channels.some(c => c._count.messages > 0);
    case 5: return band.governanceSettingsUpdated;
    case 6: return band._count.proposals >= 1;
    case 7: return band.proposals.some(p => p.status === 'PASSED');
    case 8: return band._count.projects >= 1;
    case 9: return band.tasks.some(t => t.status === 'COMPLETED');
    case 10: return band._count.documents >= 1;
    default: return false;
  }
}
```

### Integration Points

Add `checkOnboardingProgress(bandId)` calls to:

| Router | Mutation | Milestone |
|--------|----------|-----------|
| `band.create` | After creation | 1 (auto) |
| `band.updateDetails` | After mission update | 2 |
| `band.acceptInvitation` | After member joins | 3 |
| `message.create` | After first message | 4 |
| `band.updateGovernanceSettings` | After settings saved | 5 |
| `proposal.create` | After proposal created | 6 |
| `proposal.closeVoting` | When proposal passes | 7 |
| `project.create` | After project created | 8 |
| `task.updateStatus` | When task completed | 9 |
| `documents.uploadDocument` | After upload | 10 |

---

## Part 7: Files to Create

| File | Description |
|------|-------------|
| `apps/api/src/lib/onboarding/templates.ts` | Template definitions |
| `apps/api/src/lib/onboarding/milestones.ts` | Milestone checking logic |
| `apps/api/src/server/routers/onboarding.ts` | Onboarding API |
| `apps/web/src/app/welcome/page.tsx` | User welcome screen |
| `apps/web/src/components/ui/TemplateSelector.tsx` | Template cards |
| `apps/web/src/components/ui/OnboardingBanner.tsx` | Progress banner |
| `apps/web/src/components/ui/OnboardingProgress.tsx` | Full progress modal |
| `apps/web/src/components/ui/OnboardingHint.tsx` | Contextual hints |
| `apps/web/src/components/ui/OnboardingCelebration.tsx` | Milestone celebrations |

## Files to Modify

| File | Changes |
|------|---------|
| `schema.prisma` | Add User.hasCompletedWelcome, BandOnboarding, OnboardingEvent |
| `_app.ts` | Register onboarding router |
| `apps/web/src/app/bands/create/page.tsx` | Add template selection |
| `apps/web/src/components/ui/BandLayout.tsx` | Add OnboardingBanner |
| Various routers | Add milestone completion checks |
| Relevant pages | Add OnboardingHint components |

---

## Implementation Order

1. **Database** — Schema changes, migration
2. **Templates** — Define template data
3. **Welcome flow** — `/welcome` page, redirect logic
4. **Template selector** — Band creation integration
5. **Onboarding router** — API endpoints
6. **Progress banner** — BandLayout integration
7. **Progress modal** — Full milestone view
8. **Milestone hooks** — Auto-advancement in routers
9. **Contextual hints** — Add to relevant pages
10. **Celebrations** — Completion modals
11. **Notifications** — Founder alerts

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Welcome flow completion | >80% choose an option (not abandon) |
| Template selection | <10% pick "Something Else" |
| Onboarding completion rate | >50% reach milestone 7 (first passed proposal) |
| Time to first proposal passed | <14 days |
| Dismissal rate | <20% dismiss before milestone 5 |

---

## Open Questions — Resolved

| Question | Decision |
|----------|----------|
| "Something Else" milestones? | Yes, generic wording, same milestones |
| Existing bands? | No onboarding (new bands only) |
| Banner visibility? | Always visible until dismissed |
| Founder notifications? | Yes, on each milestone |
| Users without bands? | Redirected to welcome flow |
