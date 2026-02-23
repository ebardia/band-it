# Expense Reimbursement Feature Spec

**Date:** 2025-02-23
**Status:** Spec Complete / Ready for Implementation

## Overview

Track expenses and reimbursements tied to checklist items. When a member pays for something out of pocket (hosting, supplies, etc.), they can record the expense amount, upload a receipt, and track reimbursement status.

**Scope:** Expenses attach to ChecklistItems only. If a task needs an expense tracked, create a checklist item for it (e.g., "Purchase hosting plan").

### Key Principle
BandIT does NOT hold or move money. It tracks:
- What was spent (amount + receipt)
- That the expense was verified/approved
- That the member was reimbursed

Actual money moves externally (Venmo, Zelle, etc.).

---

## User Flow

### Scenario: Member pays $50 for website hosting

1. **Checklist item exists:** "Purchase 1-year hosting plan"

2. **Member completes the work:**
   - Pays $50 to hosting provider
   - Enters expense amount: $50
   - Uploads receipt as deliverable
   - Submits for verification

3. **Verifier approves:**
   - Reviews receipt and amount
   - Approves the item
   - `reimbursementStatus` automatically becomes `PENDING`

4. **Treasurer reimburses:**
   - Sees item in "Pending Reimbursements" list
   - Pays member $50 via Venmo/Zelle externally
   - Marks as reimbursed in BandIT

5. **Member confirms (optional):**
   - Confirms they received the money
   - Or auto-confirms after 7 days (reuse existing pattern)

6. **Complete:**
   - `reimbursementStatus` = `CONFIRMED`
   - Audit trail preserved

---

## Data Model Changes

```prisma
model ChecklistItem {
  // ... existing fields ...

  // Expense tracking
  expenseAmount             Int?      // Amount in cents (null = no expense)
  expenseCurrency           String    @default("usd")
  expenseNote               String?   // Optional note about the expense

  // Reimbursement tracking
  reimbursementStatus       ReimbursementStatus?  // null if no expense
  reimbursedAt              DateTime?
  reimbursedById            String?
  reimbursedBy              User?     @relation("ChecklistItemsReimbursed", ...)
  reimbursementConfirmedAt  DateTime?
  reimbursementNote         String?   // Note from treasurer when reimbursing
}

enum ReimbursementStatus {
  PENDING      // Expense approved, awaiting reimbursement
  REIMBURSED   // Treasurer marked as paid, awaiting confirmation
  CONFIRMED    // Member confirmed receipt (or auto-confirmed)
  DISPUTED     // Member disputes the reimbursement
}
```

### User (add relations)

```prisma
model User {
  // ... existing fields ...

  checklistItemsReimbursed  ChecklistItem[] @relation("ChecklistItemsReimbursed")
}
```

---

## API Endpoints

```typescript
// Record expense when completing item
checklist.submit
  // Extend existing input:
  + expenseAmount: z.number().min(1).optional()    // in cents
  + expenseNote: z.string().max(500).optional()

// Mark as reimbursed (Treasurer action)
checklist.reimburse
  input: {
    itemId: string
    userId: string           // who is marking it
    note: string?            // optional note
  }
  // Sets reimbursementStatus = REIMBURSED, reimbursedAt, reimbursedById

// Confirm reimbursement (Member action)
checklist.confirmReimbursement
  input: {
    itemId: string
    userId: string
  }
  // Sets reimbursementStatus = CONFIRMED, reimbursementConfirmedAt

// Dispute reimbursement (Member action)
checklist.disputeReimbursement
  input: {
    itemId: string
    userId: string
    reason: string
  }
  // Sets reimbursementStatus = DISPUTED
  // Notifies treasurer + governors

// Get pending reimbursements for a band (Treasurer view)
checklist.getPendingReimbursements
  input: {
    bandId: string
    userId: string
  }
  // Returns items where reimbursementStatus = PENDING

// Get my pending reimbursements (Member view)
checklist.getMyPendingReimbursements
  input: {
    userId: string
  }
  // Returns my items awaiting reimbursement or confirmation
```

---

## Permission Model

| Action | Who Can Do It |
|--------|---------------|
| Record expense amount | Assignee (when completing) |
| Approve expense (via verification) | Verifiers (Moderator+) |
| Mark as reimbursed | Treasurer, Founder, Governor |
| Confirm reimbursement | The member who is owed |
| Dispute reimbursement | The member who is owed |
| Resolve dispute | Founder, Governor |

---

## UI Changes

### Checklist Item Detail Page

When item has `requiresDeliverable` or expense:

```
┌─────────────────────────────────────────────────┐
│ ☑️ Purchase hosting plan                        │
│ Assigned: John  |  Completed  |  ✓ Verified     │
├─────────────────────────────────────────────────┤
│ Deliverable                                     │
│ [Summary of work done...]                       │
│ 📎 receipt.pdf                                  │
├─────────────────────────────────────────────────┤
│ Expense                                         │
│ Amount: $50.00                                  │
│ Status: ⏳ Awaiting Reimbursement               │
│                                                 │
│ [Mark as Reimbursed]  (treasurer sees this)     │
└─────────────────────────────────────────────────┘
```

After treasurer marks reimbursed:

```
│ Expense                                         │
│ Amount: $50.00                                  │
│ Status: 💸 Reimbursed by Sarah (2/23)           │
│ Note: "Paid via Venmo"                          │
│                                                 │
│ [Confirm Receipt]  [Dispute]  (member sees)    │
```

### Treasurer Dashboard / Quick Actions

New quick action type: `REIMBURSE`

```
┌─────────────────────────────────────────────────┐
│ 💸 Reimburse                                    │
│ "Purchase hosting plan" - $50.00                │
│ John • BandName                                 │
└─────────────────────────────────────────────────┘
```

### Member Dashboard

"My Pending Reimbursements" section or quick action:

```
┌─────────────────────────────────────────────────┐
│ 💰 Confirm Reimbursement                        │
│ "Purchase hosting plan" - $50.00                │
│ Paid by Sarah via Venmo                         │
│ BandName                                        │
└─────────────────────────────────────────────────┘
```

---

## Notifications

| Event | Recipients | Priority | Type |
|-------|------------|----------|------|
| Expense submitted (after verification) | Treasurer(s) | Medium | REIMBURSEMENT_NEEDED |
| Reimbursement marked paid | Member owed | Medium | REIMBURSEMENT_SENT |
| Reimbursement confirmed | Treasurer | Low | REIMBURSEMENT_CONFIRMED |
| Reimbursement disputed | Treasurer + Governors | High | REIMBURSEMENT_DISPUTED |
| Auto-confirm warning (day 5) | Member | Medium | REIMBURSEMENT_AUTO_CONFIRM_WARNING |
| Auto-confirmed (day 7) | Member + Treasurer | Low | REIMBURSEMENT_AUTO_CONFIRMED |

---

## Auto-Confirm Logic

Reuse existing manual payment pattern:
- After treasurer marks reimbursed, member has 7 days to confirm or dispute
- Day 5: Warning notification sent
- Day 7: Auto-confirms if no action

Cron job: `runReimbursementAutoConfirm()` (add to billing-cron.ts)

---

## Audit Log Actions

```typescript
CHECKLIST_EXPENSE_ADDED      // Member added expense amount
CHECKLIST_REIMBURSED         // Treasurer marked as reimbursed
CHECKLIST_REIMBURSEMENT_CONFIRMED
CHECKLIST_REIMBURSEMENT_DISPUTED
CHECKLIST_REIMBURSEMENT_AUTO_CONFIRMED
```

---

## Reporting / Queries

### Band Expense Summary

```typescript
// Get total expenses and reimbursement status for a band
expense.getBandSummary
  input: { bandId, dateFrom?, dateTo? }
  returns: {
    totalExpenses: number       // sum of all expense amounts
    pendingReimbursement: number
    reimbursed: number
    disputed: number
    byCategory: [...]           // if we add categories later
    byProject: [...]
    byMember: [...]
  }
```

---

## Edge Cases

1. **Expense added but item not yet verified**
   - `reimbursementStatus` stays null until verification
   - On verification approval, auto-set to PENDING

2. **Item rejected after expense added**
   - `reimbursementStatus` stays null (no reimbursement owed)
   - Member can resubmit with updated expense

3. **Expense amount changed after submission**
   - Only allow changes before verification
   - After verification, amount is locked

4. **Multiple expenses per task**
   - For now: one expense per checklist item
   - If task needs multiple expenses, create multiple checklist items

5. **Partial reimbursement**
   - Not supported initially
   - Full amount or nothing

6. **Zero-dollar expense**
   - Allowed (e.g., "got it for free")
   - No reimbursement needed, status stays null

---

## Implementation Order

1. **Schema changes** - Add expense/reimbursement fields to ChecklistItem
2. **Backend: Submit with expense** - Extend checklist.submit
3. **Backend: Reimbursement mutations** - reimburse, confirm, dispute
4. **Backend: Queries** - getPendingReimbursements
5. **Frontend: Expense input** - Add to deliverable form
6. **Frontend: Reimbursement UI** - Status display, buttons
7. **Quick actions** - REIMBURSE type for treasurers
8. **Notifications** - Add notification types
9. **Auto-confirm cron** - Add to billing-cron.ts
10. **Audit logging** - Add action types

---

## Future Enhancements (not in v1)

- Expense categories (hosting, supplies, travel, etc.)
- Budget tracking per project (compare actual vs estimated)
- Batch reimbursement (pay multiple at once)
- Expense reports / export
- Receipt OCR (auto-extract amount)
