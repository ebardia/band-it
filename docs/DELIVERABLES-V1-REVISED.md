# DELIVERABLES-V1 — Simple Task Knowledge Capture

## Purpose

Capture task outputs to prevent knowledge loss. When tasks complete, require deliverables so work builds on previous efforts instead of starting from scratch.

## Scope

### IN SCOPE
- Required text summary when completing tasks (unless task marked as no deliverable needed)
- Optional file uploads (reusing existing File system)
- Optional links
- Project-level deliverable list with search
- Manual next-step suggestions
- Edit capability before confirmation and after rejection

### OUT OF SCOPE
- Folders/phases/organization
- Auto-creating next tasks
- Workflow design features
- Complex handoff mechanisms

---

## Data Model

### New: TaskDeliverable

```prisma
model TaskDeliverable {
  id              String   @id @default(uuid())
  taskId          String   @unique
  task            Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)

  summary         String   // Required, min 30 chars, max 2000 chars

  // Optional links stored as JSON array
  links           Json?    // Array of {url: string, title: string}

  // Optional next steps suggestion
  nextSteps       String?  // Max 1000 chars

  createdById     String
  createdBy       User     @relation(fields: [createdById], references: [id])

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([taskId])
}
```

### Update: File model

Add `deliverableId` to existing File model:

```prisma
model File {
  // ... existing fields ...

  deliverableId   String?
  deliverable     TaskDeliverable? @relation(fields: [deliverableId], references: [id], onDelete: SetNull)

  @@index([deliverableId])
}
```

### Update: Task model

```prisma
model Task {
  // ... existing fields ...

  requiresDeliverable  Boolean          @default(true)
  deliverable          TaskDeliverable?
}
```

---

## Task Completion Flow

### Before (current):
```
Mark task complete → Status changes to "pending confirmation" → Done
```

### After (new):
```
Mark task complete → Add deliverable (if required) → Status changes to "pending confirmation"
```

### If task rejected after review:
```
Task rejected → Assignee edits deliverable → Resubmit for review
```

---

## UI: Complete Task with Deliverable

```
┌─────────────────────────────────────────────────────────────┐
│ Complete Task: "Research venue options"                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ What did you produce? *                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Found 7 venues. Top 3 are Riverside Hall ($500),        │ │
│ │ Community Center ($300), and School Gym ($200).         │ │
│ │ All available for March 15th. Riverside has best        │ │
│ │ acoustics, Community Center has parking.                │ │
│ └─────────────────────────────────────────────────────────┘ │
│ Min 30 characters                                           │
│                                                             │
│ 📎 Files (optional)                    [Desktop recommended]│
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [+ Upload files]                                        │ │
│ │                                                         │ │
│ │ 📄 venue-comparison.xlsx (23 KB) [x]                    │ │
│ │ 📄 riverside-hall-contract.pdf (156 KB) [x]             │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 🔗 Links (optional)                                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [+ Add link]                                            │ │
│ │                                                         │ │
│ │ 🔗 Riverside Hall website [x]                           │ │
│ │    https://riversidehall.com/events                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ What should happen next? (optional)                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Someone should contact the top 3 venues to confirm      │ │
│ │ availability and negotiate pricing                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                              [Submit for Review]            │
└─────────────────────────────────────────────────────────────┘
```

### Validation:
- Summary required (min 30 characters, max 2000)
- Files optional (uses existing file upload system limits: images 5MB, docs 10MB)
- Links optional (must be valid URLs)
- Next steps optional (max 1000 characters)

### Mobile:
- Summary and links work fully on mobile
- File upload shows hint: "Use desktop for file attachments"
- Task can be completed on mobile without files

---

## UI: Task Creation - Deliverable Toggle

When creating a task, add checkbox:

```
┌─────────────────────────────────────────────────────────────┐
│ Create Task                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Title *                                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Buy coffee for meeting                                  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ... other fields ...                                        │
│                                                             │
│ ☑ Require deliverable on completion                        │
│   Uncheck for simple tasks with nothing to document         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Default: checked (deliverable required)

---

## Project Deliverables View

**Route:** `/bands/:slug/projects/:projectId/deliverables`

```
┌─────────────────────────────────────────────────────────────┐
│ Project: Q2 Fundraiser                                      │
│ ┌─────────┬──────────┬────────────┐                         │
│ │ Tasks   │ Timeline │Deliverables│                         │
│ └─────────┴──────────┴────────────┘                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 📦 All Deliverables (3)                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔍 Search summaries, tasks, files...                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📝 Research venue options                               │ │
│ │ by Sarah Chen · 2 hours ago                             │ │
│ │                                                         │ │
│ │ Found 7 venues. Top 3 are Riverside Hall ($500),        │ │
│ │ Community Center ($300), and School Gym ($200).         │ │
│ │ All available for March 15th...                         │ │
│ │                                                         │ │
│ │ 📄 venue-comparison.xlsx                                │ │
│ │ 🔗 Riverside Hall website                               │ │
│ │                                                         │ │
│ │ ➡️ Next: Contact top 3 venues to confirm availability   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📝 Research catering options                            │ │
│ │ by Mike Johnson · Yesterday                             │ │
│ │                                                         │ │
│ │ Called 12 caterers. Top 5 can handle 100+ people.       │ │
│ │ Prices range from $15-35 per person...                  │ │
│ │                                                         │ │
│ │ 📄 catering-quotes.pdf                                  │ │
│ │                                                         │ │
│ │ ➡️ Next: Need to decide on menu style and budget        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📋 Order supplies for booth                      [old]  │ │
│ │ Completed by Alex Kim · 1 week ago                      │ │
│ │                                                         │ │
│ │ ⚠️ No deliverable recorded                              │ │
│ │ (Completed before deliverables feature)                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Search:
- Searches across: summary text, task title, file names
- Simple text matching for V1

### Old tasks:
- Tasks completed before this feature show with "No deliverable recorded" note
- Sorted chronologically with other deliverables

---

## API Changes

### Update task completion:

```typescript
// task.complete mutation

complete: protectedProcedure
  .input(z.object({
    taskId: z.string(),
    deliverable: z.object({
      summary: z.string().min(30).max(2000),
      files: z.array(z.object({
        id: z.string() // Existing file IDs to attach
      })).optional(),
      links: z.array(z.object({
        url: z.string().url(),
        title: z.string().max(200)
      })).optional(),
      nextSteps: z.string().max(1000).optional()
    }).optional() // Optional if task.requiresDeliverable is false
  }))
  .mutation(async ({ input, ctx }) => {
    const task = await prisma.task.findUnique({
      where: { id: input.taskId }
    });

    // Validation
    if (!task) throw new TRPCError({ code: 'NOT_FOUND' });

    if (task.requiresDeliverable && !input.deliverable) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'This task requires a deliverable'
      });
    }

    // Create deliverable if provided
    if (input.deliverable) {
      const deliverable = await prisma.taskDeliverable.create({
        data: {
          taskId: input.taskId,
          summary: input.deliverable.summary,
          links: input.deliverable.links || [],
          nextSteps: input.deliverable.nextSteps,
          createdById: ctx.userId
        }
      });

      // Attach files to deliverable
      if (input.deliverable.files?.length) {
        await prisma.file.updateMany({
          where: {
            id: { in: input.deliverable.files.map(f => f.id) }
          },
          data: { deliverableId: deliverable.id }
        });
      }
    }

    // Update task status (existing logic)
    await prisma.task.update({
      where: { id: input.taskId },
      data: {
        isCompleted: true,
        completedAt: new Date(),
        confirmationStatus: 'PENDING',
        confirmationRequestedAt: new Date()
      }
    });

    // Audit log
    await logToAudit(task.bandId, 'TASK_COMPLETED', ctx.userId, {
      taskId: task.id,
      taskTitle: task.title,
      hasDeliverable: !!input.deliverable,
      deliverableSummary: input.deliverable?.summary?.substring(0, 100)
    });

    return { success: true };
  }),
```

### Update deliverable (for edits):

```typescript
// task.updateDeliverable mutation

updateDeliverable: protectedProcedure
  .input(z.object({
    taskId: z.string(),
    deliverable: z.object({
      summary: z.string().min(30).max(2000),
      files: z.array(z.object({
        id: z.string()
      })).optional(),
      links: z.array(z.object({
        url: z.string().url(),
        title: z.string().max(200)
      })).optional(),
      nextSteps: z.string().max(1000).optional()
    })
  }))
  .mutation(async ({ input, ctx }) => {
    const task = await prisma.task.findUnique({
      where: { id: input.taskId },
      include: { deliverable: true }
    });

    // Validation
    if (!task) throw new TRPCError({ code: 'NOT_FOUND' });
    if (!task.deliverable) throw new TRPCError({ code: 'NOT_FOUND', message: 'No deliverable exists' });

    // Only assignee can edit
    if (task.assigneeId !== ctx.userId) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    // Can only edit before confirmation or after rejection
    if (task.confirmationStatus === 'CONFIRMED') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot edit confirmed deliverable'
      });
    }

    // Update deliverable
    await prisma.taskDeliverable.update({
      where: { id: task.deliverable.id },
      data: {
        summary: input.deliverable.summary,
        links: input.deliverable.links || [],
        nextSteps: input.deliverable.nextSteps
      }
    });

    // Update file attachments
    // First, detach all existing files
    await prisma.file.updateMany({
      where: { deliverableId: task.deliverable.id },
      data: { deliverableId: null }
    });

    // Then attach new files
    if (input.deliverable.files?.length) {
      await prisma.file.updateMany({
        where: { id: { in: input.deliverable.files.map(f => f.id) } },
        data: { deliverableId: task.deliverable.id }
      });
    }

    return { success: true };
  }),
```

### Get project deliverables:

```typescript
// project.getDeliverables query

getDeliverables: publicProcedure
  .input(z.object({
    projectId: z.string(),
    search: z.string().optional()
  }))
  .query(async ({ input }) => {
    const { projectId, search } = input;

    // Get all completed tasks for the project
    const tasks = await prisma.task.findMany({
      where: {
        projectId,
        isCompleted: true,
        confirmationStatus: 'CONFIRMED'
      },
      include: {
        deliverable: {
          include: {
            createdBy: {
              select: { id: true, name: true }
            }
          }
        },
        assignee: {
          select: { id: true, name: true }
        }
      },
      orderBy: { completedAt: 'desc' }
    });

    // Get files for deliverables
    const deliverableIds = tasks
      .filter(t => t.deliverable)
      .map(t => t.deliverable!.id);

    const files = await prisma.file.findMany({
      where: {
        deliverableId: { in: deliverableIds },
        deletedAt: null
      }
    });

    // Map files to deliverables
    const filesByDeliverable = files.reduce((acc, file) => {
      if (!acc[file.deliverableId!]) acc[file.deliverableId!] = [];
      acc[file.deliverableId!].push(file);
      return acc;
    }, {} as Record<string, typeof files>);

    // Build response
    let results = tasks.map(task => ({
      taskId: task.id,
      taskTitle: task.title,
      completedAt: task.completedAt,
      completedBy: task.assignee,
      hasDeliverable: !!task.deliverable,
      deliverable: task.deliverable ? {
        id: task.deliverable.id,
        summary: task.deliverable.summary,
        links: task.deliverable.links,
        nextSteps: task.deliverable.nextSteps,
        createdBy: task.deliverable.createdBy,
        createdAt: task.deliverable.createdAt,
        updatedAt: task.deliverable.updatedAt,
        files: filesByDeliverable[task.deliverable.id] || []
      } : null
    }));

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      results = results.filter(r =>
        r.taskTitle.toLowerCase().includes(searchLower) ||
        r.deliverable?.summary.toLowerCase().includes(searchLower) ||
        r.deliverable?.files.some(f => f.filename.toLowerCase().includes(searchLower))
      );
    }

    return { deliverables: results };
  }),
```

---

## Mobile Quick Actions

When viewing a completed task from quick actions, show deliverable summary:

```
┌─────────────────────────────────────────┐
│ ✅ Task Complete                        │
│ "Research venue options"                │
├─────────────────────────────────────────┤
│                                         │
│ 📝 Deliverable                          │
│ Found 7 venues. Top 3 are Riverside     │
│ Hall ($500), Community Center ($300),   │
│ School Gym ($200)...                    │
│                                         │
│ 📄 venue-comparison.xlsx                │
│ 🔗 Riverside Hall website               │
│                                         │
│ ➡️ Next: Contact top 3 venues           │
│                                         │
│         [View Full Details]             │
└─────────────────────────────────────────┘
```

---

## Permissions Summary

| Action | Who Can Do It |
|--------|---------------|
| View deliverables | Anyone (public) |
| Create deliverable | Task assignee |
| Edit deliverable | Task assignee (before confirmation or after rejection) |
| Delete deliverable | Not allowed (tied to task) |
| Toggle requiresDeliverable | Task creator (at creation time) |

---

## Audit Logging

```typescript
// Task completed with deliverable
await logToAudit(bandId, 'TASK_COMPLETED', userId, {
  taskId: task.id,
  taskTitle: task.title,
  hasDeliverable: true,
  deliverableSummary: summary.substring(0, 100)
});

// Deliverable edited
await logToAudit(bandId, 'DELIVERABLE_UPDATED', userId, {
  taskId: task.id,
  taskTitle: task.title,
  deliverableId: deliverable.id
});
```

---

## Implementation Checklist

### Database
- [ ] Create TaskDeliverable table
- [ ] Add deliverableId to File model
- [ ] Add requiresDeliverable to Task model
- [ ] Run migration

### Backend
- [ ] Update task.complete to handle deliverable
- [ ] Add task.updateDeliverable mutation
- [ ] Add project.getDeliverables query
- [ ] Update audit logging

### Frontend
- [ ] Update task completion modal with deliverable fields
- [ ] Add deliverable editing UI (when task rejected or before confirmation)
- [ ] Add "requires deliverable" toggle to task creation form
- [ ] Create project deliverables tab/page
- [ ] Add search to deliverables page
- [ ] Update mobile quick task view to show deliverable
- [ ] Mobile: hint to use desktop for file uploads

### Validation
- [ ] Summary: min 30 chars, max 2000 chars
- [ ] Links: valid URLs, title max 200 chars
- [ ] Next steps: max 1000 chars
- [ ] Files: use existing file upload limits

---

## Success Metrics

After 2 weeks:
- % of completed tasks with deliverables (target: 90%+ for tasks that require them)
- Avg deliverable summary length (target: >100 chars)
- File/link attachment rate
- User feedback: "Can you find what you need from previous tasks?"
