# BAND IT - Audit System Specification

## Goal
Implement automatic audit logging for all meaningful database changes. Every create, update, and delete operation on tracked entities goes through a "gate" that records what happened, who did it, and what changed.

This supports Band It's core principle: **Public Transparency** - nothing happens in the dark.

---

## Architecture Overview

```
User Request
    ↓
tRPC Router (mutation)
    ↓
tRPC Middleware → Stores userId in AsyncLocalStorage
    ↓
Service/Business Logic
    ↓
Prisma Client
    ↓
Prisma Middleware → AUDIT GATE (automatic logging)
    ↓
Database
```

---

## Entities to Track

| Entity | Track? | Notes |
|--------|--------|-------|
| Band | ✅ | All changes |
| Member | ✅ | Join, role change, removal |
| Proposal | ✅ | Create, edit, status changes |
| Vote | ✅ | All votes recorded |
| Project | ✅ | Create, status changes |
| Task | ✅ | Assignment, status, verification |
| ChecklistItem | ✅ | Toggle, edit, delete |
| Comment | ✅ | Create, edit, delete |
| File | ✅ | Upload, delete |
| User | ❌ | Skip - personal data |
| Session | ❌ | Skip - system noise |
| Notification | ❌ | Skip - system generated |
| NotificationPreference | ❌ | Skip - user settings |
| NotificationTemplate | ❌ | Skip - system config |

---

## Schema Addition

Add this to `apps/api/prisma/schema.prisma`:

```prisma
// ============================================
// AUDIT LOG
// ============================================

model AuditLog {
  id          String   @id @default(cuid())
  
  // Context - which band (null for non-band entities)
  bandId      String?
  
  // What happened
  action      String   // "created", "updated", "deleted"
  entityType  String   // "Band", "Task", "Proposal", etc.
  entityId    String   // ID of the affected record
  entityName  String?  // Human-readable name (e.g., task name, proposal title)
  
  // Who did it
  actorId     String?  // User ID (null if system action)
  actorType   String   @default("user") // "user", "system"
  
  // What changed (for updates)
  changes     Json?    // { "status": { "from": "TODO", "to": "DONE" } }
  
  // Request context
  ipAddress   String?
  userAgent   String?
  
  createdAt   DateTime @default(now())
  
  // Relations
  band        Band?    @relation(fields: [bandId], references: [id], onDelete: Cascade)
  
  @@index([bandId, createdAt])
  @@index([entityType, entityId])
  @@index([actorId])
  @@index([createdAt])
}
```

Also add the relation to the Band model:

```prisma
// In the Band model, add to relations:
auditLogs   AuditLog[]
```

---

## Files to Create

### 1. `apps/api/src/lib/auditContext.ts`

Purpose: Store request context (userId, IP, userAgent) that Prisma middleware can access.

```typescript
import { AsyncLocalStorage } from 'async_hooks'

export interface AuditContext {
  userId?: string
  ipAddress?: string
  userAgent?: string
}

export const auditStorage = new AsyncLocalStorage<AuditContext>()

export function getAuditContext(): AuditContext {
  return auditStorage.getStore() || {}
}

export function runWithAuditContext<T>(context: AuditContext, fn: () => T): T {
  return auditStorage.run(context, fn)
}
```

### 2. `apps/api/src/lib/auditMiddleware.ts`

Purpose: Prisma middleware that automatically logs all changes.

```typescript
import { Prisma } from '@prisma/client'
import { getAuditContext } from './auditContext'

// Entities we want to audit
const AUDITED_ENTITIES = [
  'Band',
  'Member', 
  'Proposal',
  'Vote',
  'Project',
  'Task',
  'ChecklistItem',
  'Comment',
  'File',
]

// Fields to exclude from change tracking (noisy/sensitive)
const EXCLUDED_FIELDS = [
  'updatedAt',
  'createdAt',
  'password',
]

// Map entity to its band relationship
const BAND_ID_FIELD: Record<string, string | null> = {
  'Band': 'id',           // Band's own ID
  'Member': 'bandId',
  'Proposal': 'bandId',
  'Vote': null,           // Get from proposal
  'Project': 'bandId',
  'Task': 'bandId',
  'ChecklistItem': null,  // Get from task
  'Comment': 'bandId',
  'File': 'bandId',
}

// Fields to use as human-readable name
const NAME_FIELD: Record<string, string> = {
  'Band': 'name',
  'Member': 'id',
  'Proposal': 'title',
  'Vote': 'id',
  'Project': 'name',
  'Task': 'name',
  'ChecklistItem': 'description',
  'Comment': 'id',
  'File': 'originalName',
}

function computeChanges(before: any, after: any): Record<string, { from: any; to: any }> | null {
  if (!before || !after) return null
  
  const changes: Record<string, { from: any; to: any }> = {}
  
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)])
  
  for (const key of allKeys) {
    if (EXCLUDED_FIELDS.includes(key)) continue
    if (key.startsWith('_')) continue // Prisma internal fields
    
    const fromVal = before[key]
    const toVal = after[key]
    
    // Skip if both are objects (relations) - we only track scalar changes
    if (typeof fromVal === 'object' && fromVal !== null && !Array.isArray(fromVal)) continue
    if (typeof toVal === 'object' && toVal !== null && !Array.isArray(toVal)) continue
    
    // Compare values
    const fromStr = JSON.stringify(fromVal)
    const toStr = JSON.stringify(toVal)
    
    if (fromStr !== toStr) {
      changes[key] = { from: fromVal, to: toVal }
    }
  }
  
  return Object.keys(changes).length > 0 ? changes : null
}

export function createAuditMiddleware(prismaClient: any): Prisma.Middleware {
  return async (params, next) => {
    const { model, action } = params
    
    // Skip non-audited models
    if (!model || !AUDITED_ENTITIES.includes(model)) {
      return next(params)
    }
    
    // Skip read operations
    if (!['create', 'update', 'delete', 'updateMany', 'deleteMany'].includes(action)) {
      return next(params)
    }
    
    // Get context
    const context = getAuditContext()
    
    // For update/delete, get the before state
    let beforeState: any = null
    if ((action === 'update' || action === 'delete') && params.args?.where) {
      try {
        beforeState = await (prismaClient as any)[model].findUnique({
          where: params.args.where,
        })
      } catch (e) {
        // Ignore - might not exist
      }
    }
    
    // Execute the actual operation
    const result = await next(params)
    
    // Build audit log entry
    try {
      let auditAction: string
      let entityId: string
      let entityName: string | null = null
      let bandId: string | null = null
      let changes: any = null
      
      switch (action) {
        case 'create':
          auditAction = 'created'
          entityId = result.id
          entityName = result[NAME_FIELD[model]] || null
          bandId = getBandId(model, result)
          break
          
        case 'update':
          auditAction = 'updated'
          entityId = result.id
          entityName = result[NAME_FIELD[model]] || null
          bandId = getBandId(model, result)
          changes = computeChanges(beforeState, result)
          // Skip if nothing meaningful changed
          if (!changes) return result
          break
          
        case 'delete':
          auditAction = 'deleted'
          entityId = beforeState?.id || params.args?.where?.id || 'unknown'
          entityName = beforeState?.[NAME_FIELD[model]] || null
          bandId = getBandId(model, beforeState)
          break
          
        case 'updateMany':
        case 'deleteMany':
          // For bulk operations, log a summary
          auditAction = action === 'updateMany' ? 'bulk_updated' : 'bulk_deleted'
          entityId = 'multiple'
          break
          
        default:
          return result
      }
      
      // Create audit log (fire and forget - don't block the main operation)
      prismaClient.auditLog.create({
        data: {
          bandId,
          action: auditAction,
          entityType: model,
          entityId,
          entityName,
          actorId: context.userId || null,
          actorType: context.userId ? 'user' : 'system',
          changes,
          ipAddress: context.ipAddress || null,
          userAgent: context.userAgent || null,
        },
      }).catch((err: any) => {
        console.error('Failed to create audit log:', err)
      })
      
    } catch (err) {
      // Don't let audit failures break the main operation
      console.error('Audit middleware error:', err)
    }
    
    return result
  }
}

function getBandId(model: string, record: any): string | null {
  if (!record) return null
  
  const field = BAND_ID_FIELD[model]
  if (field === null) return null
  if (field === 'id') return record.id // For Band model itself
  
  return record[field] || null
}
```

---

## Files to Modify

### 1. `apps/api/prisma/schema.prisma`

Add the AuditLog model (see schema above).

Add `auditLogs AuditLog[]` to the Band model relations.

### 2. `apps/api/src/lib/prisma.ts`

Update to include the audit middleware:

```typescript
import { PrismaClient } from '@prisma/client'
import { createAuditMiddleware } from './auditMiddleware'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

// Add audit middleware
prisma.$use(createAuditMiddleware(prisma))

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

### 3. `apps/api/src/server/trpc.ts`

Wrap procedures to inject audit context. Find where the procedures are defined and ensure user context flows through.

This may require updating how the tRPC context is created. Look for `createContext` or similar and ensure it extracts:
- `userId` from the JWT token
- `ipAddress` from request headers
- `userAgent` from request headers

Then wrap the actual procedure execution with `runWithAuditContext`.

**Example modification** (adapt to existing code structure):

```typescript
import { runWithAuditContext } from '../lib/auditContext'

// In the procedure middleware or context creation:
const auditContext = {
  userId: ctx.userId, // from JWT
  ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
  userAgent: req.headers['user-agent'],
}

// Wrap the procedure execution
return runWithAuditContext(auditContext, () => {
  // ... existing procedure logic
})
```

---

## Commands to Run After Implementation

```bash
cd apps/api
npx prisma generate
npx prisma db push
```

Then restart the API server and test by:
1. Creating a task
2. Updating a task status
3. Check the database: `SELECT * FROM "AuditLog" ORDER BY "createdAt" DESC LIMIT 10;`

---

## Future Enhancements (Not in this spec)

1. **Audit Log UI** - Page to view band activity feed
2. **Filtering** - By date, entity type, actor
3. **Export** - Download audit logs as CSV
4. **Retention policy** - Auto-delete logs older than X months
5. **Vote/ChecklistItem tracking** - Lookup bandId via parent entity

---

## Testing Checklist

- [ ] Creating a Band creates an audit log
- [ ] Updating a Task creates an audit log with changes
- [ ] Deleting a Comment creates an audit log
- [ ] Audit logs have correct bandId
- [ ] Audit logs have correct actorId (userId)
- [ ] Changes field shows field-level diffs
- [ ] Session/Notification changes are NOT logged
- [ ] Audit failures don't break main operations

---

## Notes for Claude Code

1. First examine the current `apps/api/src/lib/prisma.ts` and `apps/api/src/server/trpc.ts` files to understand the existing structure
2. The key challenge is injecting the audit context - the exact implementation depends on how tRPC is currently set up
3. Use `AsyncLocalStorage` - it's the clean Node.js way to pass context through async operations
4. The Prisma middleware should be fire-and-forget (don't await the audit log creation)
5. Follow existing code patterns in the project