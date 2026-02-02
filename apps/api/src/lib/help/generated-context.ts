// AUTO-GENERATED from docs/help-context.yaml - DO NOT EDIT DIRECTLY
// Generated at: 2026-02-02T20:49:03.355Z
// To update, edit docs/help-context.yaml and run: npm run generate-help-context

export const PLATFORM_CONTEXT = `
# Band It
Transparency-focused platform for community organizations like PACs, advocacy groups, clubs, and committees. Helps groups organize, discuss, make decisions through proposals, and track projects with full transparency and accountability.

## BANDS
Groups/organizations on the platform. Each band has members with different roles, channels for discussion, and proposals for decision-making.

### Activation Requirements
- Requires at least the minimum members (currently 1 for testing, normally 3) to activate
- In test mode, bands auto-activate when minimum members reached (no payment required)
- In production mode, founder must pay subscription after reaching minimum members
- Band status changes from PENDING to ACTIVE after activation

### Subscription Pricing
- Up to 20 members: $20/month
- 21+ members: $100/month
- Auto-upgrades when reaching 21 members
- Auto-downgrades when going below 21 members
- Founder is responsible for subscription payment (when enabled)

### Roles (highest to lowest authority)
- FOUNDER: Created the band, full control
- GOVERNOR: Leadership role, can manage most settings and review proposals
- MODERATOR: Can moderate discussions, members, and review proposals
- CONDUCTOR: Can lead projects and tasks, but cannot review proposals
- VOTING_MEMBER: Standard participation with voting rights
- OBSERVER: Can view content but cannot vote or post

### Key Workflows
- Create a band: Overview → Create Band → Fill details (name, mission, values) → Invite members → Reach minimum members → Band is Active (in test mode, no payment needed)
- Join a band: Discover Bands → Browse/search → Click Apply → Wait for approval → See band in Overview
- Dissolve (under minimum members): Only founder can dissolve directly
- Dissolve (at or above minimum members): Requires a dissolution proposal with unanimous approval from all voting members

## PROPOSALS
Decisions voted on by band members. All significant decisions go through the proposal process for transparency.

### Proposal Types
- GENERAL: General decisions or announcements
- BUDGET: Financial decisions and budget allocations
- PROJECT: Creates a project with tasks when approved
- POLICY: Policy changes for the band
- MEMBERSHIP: Member-related decisions (roles, removals)
- DISSOLUTION: Proposal to dissolve the band (requires unanimous vote)

### Proposal Statuses
- DRAFT: Author is still editing, not submitted
- PENDING_REVIEW: Submitted, waiting for moderator/governor review
- OPEN: Approved by reviewer, open for voting
- CLOSED: Voting ended without reaching approval threshold
- APPROVED: Passed the vote
- REJECTED: Failed vote or rejected by reviewer
- WITHDRAWN: Author withdrew from review

### Proposal Workflow
Create proposal → Submit → Review (if required) → Voting period → Pass/Fail → Execute (if applicable)

### Voting
- Vote options: YES, NO, or ABSTAIN
- Default voting period: 7 days (configurable)
- Voting methods:
  - SIMPLE_MAJORITY: More than 50% yes votes
  - SUPERMAJORITY_66: More than 66% yes votes
  - SUPERMAJORITY_75: More than 75% yes votes
  - UNANIMOUS: 100% yes votes (required for dissolution)

### Proposal Rules
- Proposals may require moderator/governor review before voting (band setting)
- Only MODERATOR, GOVERNOR, or FOUNDER can review proposals
- Reviewers cannot review their own proposals
- Voting members and above can vote
- Observers cannot vote

## DISCUSSIONS
Communication within bands happens in channels. Supports threaded conversations, reactions, and mentions.

### Channel Visibility Levels
- PUBLIC: All band members can access
- MODERATOR: Moderators, Governors, and Founders only
- GOVERNANCE: Governors and Founders only

### Features
- Threaded replies to messages
- Pin important messages
- React to messages (thumbs up, heart, celebrate, thinking)
- Mention users with @username or roles like @everyone, @governors, @moderators, @conductors, @channel

## BILLING

### Band Subscription
- What: Monthly fee paid by founder to keep band active (when enabled)
- Who pays: Founder
- Pricing: $20/month (up to 20 members) or $100/month (21+ members)

### Member Dues
- What: Optional recurring payments from members to the band
- Required: Configurable per band - can be required or optional

### Payment Methods
- Stripe: Automated payments via credit card
- Manual options: ZELLE, VENMO, CASHAPP, CASH, CHECK, OTHER

### Manual Payment Flow
Record payment → Other party confirms → Payment recorded. If no confirmation in 7 days, auto-confirms.

## QUICK ACTIONS
Mobile-friendly pages for fast actions from digest emails or notifications

### Available Pages
- vote: /quick/vote/[proposalId] - Cast vote on a proposal
- read: /quick/read/[postId] - Read a post
- reply: /quick/reply/[contentType]/[contentId] - Reply to content
- confirm_payment: /quick/confirm-payment/[paymentId] - Confirm a manual payment

## PROJECTS
Work items created from approved PROJECT proposals

### Project Statuses
- PLANNING: Project is being planned
- ACTIVE: Work is in progress
- ON_HOLD: Temporarily paused
- COMPLETED: Successfully finished
- CANCELLED: Project was cancelled

### Tasks
Individual work items within a project
Task statuses: TODO, IN_PROGRESS, IN_REVIEW, COMPLETED, BLOCKED

## EVENTS
Scheduled gatherings for band members

### Event Types
- ONLINE_MEETING: Virtual meeting
- IN_PERSON_MEETING: Physical location meeting
- SOCIAL: Social gathering
- HYBRID: Both online and in-person

### RSVP Options
- GOING: Will attend
- NOT_GOING: Cannot attend
- MAYBE: Uncertain

## COMMON QUESTIONS

### How do I create a band?
Go to Overview → Click 'Create Band' → Fill in name, mission, values → Invite members → Once you reach the minimum member requirement, pay the subscription → Band is active

### How do I join a band?
Go to 'Discover Bands' → Browse or search → Click 'Apply' on a band → Wait for approval → Band appears in your Overview

### How do I create a proposal?
Go to band's Proposals section → Click 'New Proposal' → Select type → Fill in details → Set voting period → Submit

### Why cant i vote?
You may not have voting rights (Observer role), or you're not an active member of the band, or the voting period has ended

### Why cant i post?
Check your role permissions and channel visibility. Observers cannot post. Some channels are restricted to certain roles

### Why is my band not active?
Bands require the minimum member count to activate. In test mode, bands auto-activate when reaching the minimum members. In production, the founder must also pay the subscription.

### How do I pay dues?
Go to band's Billing section → Click 'Pay Dues' → Complete payment via Stripe, or use manual payment if your band accepts it

### How do I confirm a payment?
Go to band's Billing → Manual Payments tab → Find the pending payment → Click Confirm

### What are the different roles?
Founder (full control), Governor (leadership), Moderator (moderate discussions), Conductor (lead projects), Voting Member (standard participation), Observer (view only)

### how do mentions work?
Type @ followed by a name or role. Select from dropdown. Mentioned users get notified. Roles: @everyone, @governors, @moderators, @conductors, @channel

## TROUBLESHOOTING

### I can't see a channel
The channel may have restricted visibility. PUBLIC channels are visible to all. MODERATOR channels require Moderator+ role. GOVERNANCE channels require Governor+ role.

### My proposal is stuck in review
Proposals in PENDING_REVIEW status need approval from a Moderator, Governor, or Founder. Contact your band leadership.

### I can't dissolve my band
With the minimum number of members or more, dissolution requires a unanimous vote via proposal. With fewer than the minimum, only the founder can dissolve directly.

### Payment not showing up
Manual payments require confirmation from the other party. Check the Manual Payments tab for pending confirmations.

### I'm not receiving notifications
Check your notification settings in your profile. Also check your email spam folder for digest emails.

### Digest email not arriving
Digest emails are sent daily at 8 AM UTC. Check your digest frequency settings and spam folder.


`
