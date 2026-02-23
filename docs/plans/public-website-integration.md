# Public Website Integration Feature Spec

**Date:** 2025-02-23
**Status:** Spec Complete / Ready for Implementation

## Overview

Enable bands/organizations to have a public-facing website (hosted anywhere) that automatically pulls content from BandIT. The website displays public information while keeping internal operations private. BandIT becomes the single source of truth.

### Key Principle
BandIT provides the API and controls what's public. The external website can be hosted anywhere (Dreamhost, Vercel, Netlify, shared hosting) and consumes BandIT's public APIs.

---

## Use Case: IPCO Public Website

**Domain:** IranPCO.com

### What Visitors See
- **Static Pages:** Home, About Us, Mission, Leadership, Contact
- **Decisions & Transparency:** Public record of approved proposals
- **Projects & Accomplishments:** Completed initiatives and outcomes
- **Meeting Minutes:** Notes and recordings from past meetings
- **Financials:** Budget summaries, donation info (if published)
- **Committees:** Sub-group information
- **Join Us:** Membership application form
- **Search:** Find topics across all public content

### What Stays Private
- Ongoing discussions and debates
- Proposals still being voted on
- Internal member communications
- Financial details (unless explicitly published)
- Member contact information
- Rejected proposals

---

## Data Model Changes

### Band (extend existing)

```prisma
model Band {
  // ... existing fields ...

  // Public website integration
  publicWebsiteEnabled      Boolean   @default(false)
  publicWebsiteUrl          String?   // e.g., "https://iranpco.com"
  publicApiKey              String?   // API key for website to authenticate
  publicApiKeyLastRotated   DateTime?

  // What to expose publicly
  publicShowProposals       Boolean   @default(true)
  publicShowProjects        Boolean   @default(true)
  publicShowMeetingMinutes  Boolean   @default(true)
  publicShowFinancials      Boolean   @default(false)
  publicShowCommittees      Boolean   @default(true)
  publicShowLeadership      Boolean   @default(true)
  publicShowVotingBreakdown Boolean   @default(false)  // Show vote counts or just outcome

  // Custom public content
  publicAbout               String?   // Rich text about page
  publicMission             String?   // Public mission statement
  publicContactEmail        String?
  publicContactPhone        String?
  publicAddress             String?
}
```

### Proposal (extend existing)

```prisma
model Proposal {
  // ... existing fields ...

  // Public visibility
  isPublic                  Boolean   @default(false)  // Auto-set on approval based on band settings
  publicTitle               String?   // Optional different title for public display
  publicSummary             String?   // Optional public-friendly summary
  publicPublishedAt         DateTime? // When it was made public
}
```

### Project (extend existing)

```prisma
model Project {
  // ... existing fields ...

  // Public visibility
  isPublic                  Boolean   @default(false)
  publicSummary             String?   // Public-friendly description
  publicPublishedAt         DateTime?
}
```

### Event (extend existing for meeting minutes)

```prisma
model Event {
  // ... existing fields ...

  // Public visibility for meeting minutes
  isPublic                  Boolean   @default(false)
  publicNotes               String?   // Sanitized/edited notes for public
  publicRecordingUrl        String?   // Public recording link (may differ from internal)
  publicPublishedAt         DateTime?
}
```

### New: PublicApplication

```prisma
model PublicApplication {
  id                String   @id @default(cuid())
  bandId            String
  band              Band     @relation(fields: [bandId], references: [id])

  // Applicant info
  name              String
  email             String
  phone             String?

  // Application content
  answers           Json     // Structured answers to band's questions
  message           String?  // Free-form message

  // Processing
  status            PublicApplicationStatus @default(PENDING)
  processedAt       DateTime?
  processedById     String?
  processedBy       User?    @relation(fields: [processedById], references: [id])
  memberId          String?  // If converted to member
  member            Member?  @relation(fields: [memberId], references: [id])
  rejectionReason   String?

  // Metadata
  ipAddress         String?
  userAgent         String?
  referrer          String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([bandId, status])
  @@index([email])
}

enum PublicApplicationStatus {
  PENDING
  UNDER_REVIEW
  APPROVED
  REJECTED
  WITHDRAWN
}
```

### New: PublicApplicationQuestion

```prisma
model PublicApplicationQuestion {
  id          String   @id @default(cuid())
  bandId      String
  band        Band     @relation(fields: [bandId], references: [id])

  question    String
  type        QuestionType  @default(TEXT)
  required    Boolean  @default(false)
  options     String[] // For SELECT/MULTISELECT types
  order       Int      @default(0)

  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([bandId, isActive])
}

enum QuestionType {
  TEXT
  TEXTAREA
  SELECT
  MULTISELECT
  CHECKBOX
  EMAIL
  PHONE
  URL
}
```

---

## API Endpoints

### Public API (No Auth Required - Rate Limited)

These endpoints are accessible by the external website using the band's public API key.

```typescript
// Get band public profile
GET /api/public/:bandSlug
Headers: X-Public-API-Key: <key>
Returns: {
  name, mission, about, contact, leadership[],
  settings: { showProposals, showProjects, ... }
}

// Get approved proposals (public only)
GET /api/public/:bandSlug/decisions
Query: { page?, limit?, search?, year?, type? }
Returns: {
  decisions: [{
    id, title, summary, type, approvedAt,
    votingBreakdown?: { for, against, abstain }  // if enabled
  }],
  pagination: { page, limit, total, hasMore }
}

// Get single decision detail
GET /api/public/:bandSlug/decisions/:id
Returns: { id, title, description, summary, type, approvedAt, ... }

// Get completed projects (public only)
GET /api/public/:bandSlug/projects
Query: { page?, limit?, search?, status? }
Returns: {
  projects: [{
    id, name, summary, status, completedAt, outcomes
  }],
  pagination
}

// Get single project detail
GET /api/public/:bandSlug/projects/:id
Returns: { id, name, description, summary, tasks?, milestones?, ... }

// Get meeting minutes (public only)
GET /api/public/:bandSlug/minutes
Query: { page?, limit?, year?, type? }
Returns: {
  minutes: [{
    id, title, date, summary, recordingUrl?
  }],
  pagination
}

// Get single meeting detail
GET /api/public/:bandSlug/minutes/:id
Returns: { id, title, date, notes, recordingUrl?, attendeeCount? }

// Get committees/sub-bands (if enabled)
GET /api/public/:bandSlug/committees
Returns: {
  committees: [{
    id, name, description, purpose, memberCount
  }]
}

// Get financial summary (if enabled)
GET /api/public/:bandSlug/financials
Returns: {
  summary: { totalBudget?, publicBuckets[] },
  reports: [{ period, summary }]
}

// Get application questions
GET /api/public/:bandSlug/apply/questions
Returns: {
  questions: [{ id, question, type, required, options }],
  bandInfo: { name, mission, memberCount }
}

// Submit application
POST /api/public/:bandSlug/apply
Body: {
  name, email, phone?,
  answers: { questionId: answer },
  message?
}
Returns: { success, applicationId, message }

// Search across all public content
GET /api/public/:bandSlug/search
Query: { q, types[]?, limit? }
Returns: {
  results: [{
    type: 'decision' | 'project' | 'minutes',
    id, title, excerpt, date, url
  }]
}
```

### Admin API (Authenticated - Band Officers)

```typescript
// Enable/configure public website
PUT /api/bands/:bandId/public-settings
Body: {
  publicWebsiteEnabled, publicWebsiteUrl,
  publicShowProposals, publicShowProjects, ...
}

// Regenerate API key
POST /api/bands/:bandId/public-api-key/rotate
Returns: { newApiKey }

// Toggle proposal public visibility
PUT /api/proposals/:id/public
Body: { isPublic, publicTitle?, publicSummary? }

// Toggle project public visibility
PUT /api/projects/:id/public
Body: { isPublic, publicSummary? }

// Toggle event/minutes public visibility
PUT /api/events/:id/public
Body: { isPublic, publicNotes?, publicRecordingUrl? }

// Manage application questions
GET /api/bands/:bandId/application-questions
POST /api/bands/:bandId/application-questions
PUT /api/bands/:bandId/application-questions/:id
DELETE /api/bands/:bandId/application-questions/:id

// View/process public applications
GET /api/bands/:bandId/public-applications
Query: { status?, page?, limit? }

PUT /api/bands/:bandId/public-applications/:id/review
Body: { status: 'UNDER_REVIEW' }

PUT /api/bands/:bandId/public-applications/:id/approve
Body: { role?, welcomeMessage? }
// Creates Member record, sends welcome email

PUT /api/bands/:bandId/public-applications/:id/reject
Body: { reason?, sendEmail? }
```

---

## Permission Model

| Action | Who Can Do It |
|--------|---------------|
| Enable public website | Founder, Governor |
| Configure public settings | Founder, Governor |
| Rotate API key | Founder, Governor |
| Toggle proposal visibility | Founder, Governor, Moderator |
| Toggle project visibility | Founder, Governor, Moderator, Project Lead |
| Toggle event visibility | Founder, Governor, Moderator |
| Manage application questions | Founder, Governor |
| Review applications | Founder, Governor, Moderator |
| Approve applications | Founder, Governor |

---

## Auto-Publish Rules

When enabled, BandIT can automatically make content public:

```typescript
// Band settings for auto-publish
autoPublishApprovedProposals: boolean  // Proposals become public when approved
autoPublishCompletedProjects: boolean  // Projects become public when completed
autoPublishMeetingMinutes: boolean     // Events with notes become public after X days
autoPublishMinutesDelayDays: number    // e.g., 7 days delay before auto-publish
```

**Workflow:**
1. Proposal approved → if autoPublish enabled → `isPublic = true`
2. Project completed → if autoPublish enabled → `isPublic = true`
3. Event with notes → after delay → if autoPublish enabled → `isPublic = true`

Officers can always manually override (make private or make public early).

---

## UI Changes

### Band Settings Page

New "Public Website" section:

```
┌─────────────────────────────────────────────────┐
│ 🌐 Public Website Integration                   │
├─────────────────────────────────────────────────┤
│ ☑️ Enable public website integration            │
│                                                 │
│ Website URL: [https://iranpco.com        ]      │
│                                                 │
│ API Key: pk_live_abc123...  [Rotate] [Copy]     │
│ Last rotated: Feb 15, 2025                      │
│                                                 │
│ What to show publicly:                          │
│ ☑️ Approved decisions                           │
│ ☑️ Completed projects                           │
│ ☑️ Meeting minutes                              │
│ ☐ Financial summaries                           │
│ ☑️ Committees                                   │
│ ☑️ Leadership roster                            │
│ ☐ Voting breakdowns (show vote counts)          │
│                                                 │
│ Auto-publish:                                   │
│ ☑️ Auto-publish approved proposals              │
│ ☑️ Auto-publish completed projects              │
│ ☑️ Auto-publish meeting minutes after [7] days  │
└─────────────────────────────────────────────────┘
```

### Proposal/Project/Event Detail Pages

Add visibility toggle for officers:

```
┌─────────────────────────────────────────────────┐
│ 🌐 Public Visibility                    [Edit]  │
│ Status: 🟢 Public (since Feb 20, 2025)          │
│ Public title: "Q1 Budget Approved"              │
│ Public summary: "The board approved..."         │
│                                                 │
│ [Make Private]                                  │
└─────────────────────────────────────────────────┘
```

### Application Questions Manager

```
┌─────────────────────────────────────────────────┐
│ 📝 Application Questions                        │
├─────────────────────────────────────────────────┤
│ 1. Why do you want to join? [TEXTAREA] *        │
│ 2. How did you hear about us? [SELECT]          │
│    Options: Website, Social Media, Friend       │
│ 3. Skills you can contribute [MULTISELECT]      │
│    Options: Tech, Finance, Outreach, Events     │
│                                                 │
│ [+ Add Question]                                │
├─────────────────────────────────────────────────┤
│ Preview: [View Application Form]                │
└─────────────────────────────────────────────────┘
```

### Public Applications Queue

New page: `/bands/:slug/applications/public`

```
┌─────────────────────────────────────────────────┐
│ 📥 Public Applications                          │
│ [Pending: 3] [Under Review: 1] [All]            │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │ John Smith • john@email.com                 │ │
│ │ Applied: Feb 22, 2025 (2 days ago)          │ │
│ │ "I'm passionate about the mission..."       │ │
│ │ [Review] [Quick Approve] [Quick Reject]     │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │ Jane Doe • jane@email.com                   │ │
│ │ Applied: Feb 21, 2025 (3 days ago)          │ │
│ │ "Found you through social media..."         │ │
│ │ [Review] [Quick Approve] [Quick Reject]     │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

## Rate Limiting & Security

### Rate Limits (per API key)

| Endpoint | Limit |
|----------|-------|
| GET endpoints | 100 requests/minute |
| POST /apply | 10 requests/minute |
| Search | 30 requests/minute |

### Security Measures

1. **API Key Validation** - All public endpoints require valid API key
2. **CORS** - Configure allowed origins per band
3. **IP Logging** - Track application submissions
4. **Honeypot Fields** - Spam protection on application form
5. **Rate Limiting** - Prevent abuse
6. **Content Sanitization** - Strip sensitive data before public response

---

## Notifications

| Event | Recipients | Type |
|-------|------------|------|
| New public application | Officers with review permission | PUBLIC_APPLICATION_RECEIVED |
| Application approved | Applicant (email) | PUBLIC_APPLICATION_APPROVED |
| Application rejected | Applicant (email, if opted in) | PUBLIC_APPLICATION_REJECTED |
| API key rotated | Band governors | PUBLIC_API_KEY_ROTATED |

---

## External Website Implementation Guide

### For Website Developers

The band's public website can be built with any technology:

**Option A: Static Site (Recommended for simple sites)**
- Use Next.js, Gatsby, Hugo, or any static site generator
- Fetch data at build time from BandIT API
- Rebuild on schedule (daily) or via webhook
- Host on Vercel, Netlify, Dreamhost, etc.

**Option B: Dynamic Site**
- Fetch data on each request from BandIT API
- Cache responses appropriately
- Host anywhere (Dreamhost, AWS, etc.)

**Option C: Hybrid**
- Static pages for About, Contact, etc.
- Dynamic pages for Decisions, Projects, Search
- Best of both worlds

### Example: Next.js Integration

```typescript
// lib/bandit.ts
const BANDIT_API = 'https://app.bandit.com/api/public'
const API_KEY = process.env.BANDIT_PUBLIC_API_KEY

export async function getDecisions(page = 1) {
  const res = await fetch(`${BANDIT_API}/ipco/decisions?page=${page}`, {
    headers: { 'X-Public-API-Key': API_KEY }
  })
  return res.json()
}

export async function submitApplication(data: ApplicationData) {
  const res = await fetch(`${BANDIT_API}/ipco/apply`, {
    method: 'POST',
    headers: {
      'X-Public-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  return res.json()
}
```

### Webhook Support (Future)

BandIT can notify the website when content changes:

```typescript
POST https://iranpco.com/api/webhook/bandit
Body: {
  event: 'proposal.published' | 'project.published' | 'minutes.published',
  id: string,
  bandId: string
}
```

Website can then rebuild or invalidate cache.

---

## Implementation Order

1. **Schema changes** - Add public visibility fields, PublicApplication model
2. **Public API endpoints** - Read-only endpoints for content
3. **API key management** - Generate, rotate, validate keys
4. **Admin UI: Settings** - Enable and configure public website
5. **Admin UI: Visibility toggles** - Per-item public/private controls
6. **Application questions** - CRUD for customizing application form
7. **Public applications queue** - Review and process applications
8. **Auto-publish logic** - Automatic visibility based on rules
9. **Rate limiting & security** - Protect public endpoints
10. **Notifications** - Application alerts
11. **Webhook support** - Notify external sites of changes

---

## Future Enhancements (not in v1)

- **Donation integration** - Accept donations via Stripe/PayPal
- **Newsletter signup** - Collect emails for updates
- **Event calendar** - Public view of upcoming events
- **Blog/news** - Organization announcements
- **Multi-language** - i18n support for content
- **Custom themes** - BandIT-hosted website option
- **Analytics** - Track public page views
- **SEO tools** - Meta tags, sitemaps, structured data
