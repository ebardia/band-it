# Band Documents Feature

## Summary
Add a document management system at the band level for storing bylaws, policies, and other band-specific documents. Features folder organization with file uploads.

## Design Decisions
- **Folder structure**: Flat for now, schema supports nesting for future
- **Document type**: File uploads only (PDFs, Word docs, etc.)
- **Permissions**: Configurable per band (new `whoCanManageDocuments` setting); all members can view/download
- **Default folders**: None - users create their own folders from scratch

---

## Database Schema

### New Models (add to `apps/api/prisma/schema.prisma`)

```prisma
// Document folder visibility levels
enum DocumentFolderVisibility {
  PUBLIC      // All members can view
  MODERATOR   // FOUNDER, GOVERNOR, MODERATOR only
  GOVERNANCE  // FOUNDER, GOVERNOR only
}

model DocumentFolder {
  id              String   @id @default(cuid())
  bandId          String
  parentFolderId  String?  // For future nesting - null = root level

  name            String   @db.VarChar(100)
  slug            String   @db.VarChar(150)
  description     String?  @db.VarChar(500)
  visibility      DocumentFolderVisibility @default(PUBLIC)
  sortOrder       Int      @default(0)
  isArchived      Boolean  @default(false)

  // Denormalized counts
  documentCount   Int      @default(0)
  lastDocumentAt  DateTime?

  createdById     String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  band            Band     @relation(fields: [bandId], references: [id], onDelete: Cascade)
  parentFolder    DocumentFolder? @relation("FolderHierarchy", fields: [parentFolderId], references: [id])
  subFolders      DocumentFolder[] @relation("FolderHierarchy")
  createdBy       User     @relation("DocumentFoldersCreated", fields: [createdById], references: [id])
  documents       Document[]

  @@unique([bandId, slug])
  @@index([bandId, isArchived])
  @@index([bandId, parentFolderId])
  @@index([bandId, sortOrder])
}

model Document {
  id              String   @id @default(cuid())
  bandId          String
  folderId        String
  uploadedById    String

  // File info
  title           String   @db.VarChar(200)
  slug            String   @db.VarChar(250)
  description     String?  @db.VarChar(1000)

  // Storage (linked to existing File model)
  fileId          String   @unique

  // Metadata
  isPinned        Boolean  @default(false)
  downloadCount   Int      @default(0)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?

  // Relations
  band            Band     @relation(fields: [bandId], references: [id], onDelete: Cascade)
  folder          DocumentFolder @relation(fields: [folderId], references: [id], onDelete: Cascade)
  uploadedBy      User     @relation("DocumentsUploaded", fields: [uploadedById], references: [id])
  file            File     @relation(fields: [fileId], references: [id])

  @@unique([bandId, slug])
  @@index([folderId, createdAt])
  @@index([bandId, isPinned])
  @@index([uploadedById])
}
```

### Update existing models

**Band model** - add relations:
```prisma
model Band {
  // ... existing fields
  whoCanManageDocuments MemberRole[] @default([FOUNDER, GOVERNOR, MODERATOR])
  documentFolders DocumentFolder[]
  documents       Document[]
}
```

**User model** - add relations:
```prisma
model User {
  // ... existing fields
  documentFoldersCreated DocumentFolder[] @relation("DocumentFoldersCreated")
  documentsUploaded      Document[]       @relation("DocumentsUploaded")
}
```

**File model** - add relation:
```prisma
model File {
  // ... existing fields
  document        Document?
}
```

---

## Backend Implementation

### Router Structure
Create `apps/api/src/server/routers/documents/`

```
documents/
├── index.ts              # Router aggregation
├── documents.folder.ts   # Folder CRUD
└── documents.document.ts # Document CRUD
```

### Folder Procedures (`documents.folder.ts`)

| Procedure | Type | Description |
|-----------|------|-------------|
| `listFolders` | query | List all folders for a band (with access check) |
| `getFolder` | query | Get folder details with documents |
| `createFolder` | mutation | Create new folder (admin only) |
| `updateFolder` | mutation | Update folder name/description/visibility |
| `deleteFolder` | mutation | Delete folder (must be empty) |
| `reorderFolders` | mutation | Update sortOrder for folders |

### Document Procedures (`documents.document.ts`)

| Procedure | Type | Description |
|-----------|------|-------------|
| `listDocuments` | query | List documents in a folder |
| `getDocument` | query | Get document details |
| `uploadDocument` | mutation | Upload new document (uses existing file.upload) |
| `updateDocument` | mutation | Update title/description |
| `deleteDocument` | mutation | Soft delete document |
| `togglePin` | mutation | Pin/unpin document |
| `incrementDownload` | mutation | Track download count |

### Permission Helpers
```typescript
// Read from band.whoCanManageDocuments (configurable per band)
// Default: ['FOUNDER', 'GOVERNOR', 'MODERATOR']

const VISIBILITY_ROLES = {
  PUBLIC: ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER', 'OBSERVER'],
  MODERATOR: ['FOUNDER', 'GOVERNOR', 'MODERATOR'],
  GOVERNANCE: ['FOUNDER', 'GOVERNOR'],
}

function canManageDocuments(userRole: string, band: Band): boolean {
  return band.whoCanManageDocuments.includes(userRole)
}
```

---

## Frontend Implementation

### Route Structure
Create `apps/web/src/app/bands/[slug]/documents/`

```
documents/
├── page.tsx                    # Main page - folder list
└── [folderSlug]/
    └── page.tsx                # Folder detail - document list
```

### Sidebar Integration

**File: `apps/web/src/components/ui/BandSidebar.tsx`**

Add to `mainNav` array (after Posts):
```typescript
{ label: '📄 Documents', path: `/bands/${bandSlug}/documents`, guide: 'band-documents' },
```

**File: `apps/web/src/components/ui/BandLayout.tsx`**

Add to `mobileNavItems` array:
```typescript
{ label: 'Documents', path: `/bands/${bandSlug}/documents`, emoji: '📄' },
```

### Main Documents Page (`page.tsx`)

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Documents                    [+ New Folder] │
├─────────────────────────────────────────────┤
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 📁 Bylaws                         3 docs│ │
│ │    Official band bylaws and charter     │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 📁 Policies                       5 docs│ │
│ │    Band policies and guidelines         │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 📁 Resources                      2 docs│ │
│ │    General resources and reference      │ │
│ └─────────────────────────────────────────┘ │
│                                             │
└─────────────────────────────────────────────┘
```

**Features:**
- List all folders with document count
- Click folder to navigate to folder detail
- "New Folder" button (users with `whoCanManageDocuments` permission)
- Edit/Delete folder actions (users with permission)
- Empty state: "No folders yet. Create your first folder to organize your band's documents."

### Folder Detail Page (`[folderSlug]/page.tsx`)

**Layout:**
```
┌─────────────────────────────────────────────┐
│ ← Back to Documents                         │
│ Bylaws                       [+ Upload Doc] │
│ Official band bylaws and charter documents  │
├─────────────────────────────────────────────┤
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 📌 Band Charter v2.pdf           PDF    │ │
│ │    Uploaded by John • Jan 15, 2024      │ │
│ │    [Download] [Delete]                  │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Voting Procedures.docx           DOCX   │ │
│ │    Uploaded by Jane • Dec 3, 2023       │ │
│ │    [Download] [Delete]                  │ │
│ └─────────────────────────────────────────┘ │
│                                             │
└─────────────────────────────────────────────┘
```

**Features:**
- Breadcrumb back to folder list
- List documents with file type badges
- Pinned documents at top
- Download button (tracks count)
- Upload modal with drag-drop (users with permission)
- Edit/Delete actions (users with permission)

### Upload Modal Component

Reuse existing `FileUpload` component from `apps/web/src/components/ui/FileUpload.tsx`

**Fields:**
- Title (auto-filled from filename, editable)
- Description (optional)
- File upload (drag-drop or click)

**Allowed types:** PDF, DOC, DOCX, XLS, XLSX, TXT (same as existing document types)

---

## Files to Create/Modify

### New Files

| File | Description |
|------|-------------|
| `apps/api/src/server/routers/documents/index.ts` | Router aggregation |
| `apps/api/src/server/routers/documents/documents.folder.ts` | Folder CRUD procedures |
| `apps/api/src/server/routers/documents/documents.document.ts` | Document CRUD procedures |
| `apps/web/src/app/bands/[slug]/documents/page.tsx` | Main documents page |
| `apps/web/src/app/bands/[slug]/documents/[folderSlug]/page.tsx` | Folder detail page |

### Modified Files

| File | Changes |
|------|---------|
| `apps/api/prisma/schema.prisma` | Add DocumentFolder, Document models, Band.whoCanManageDocuments |
| `apps/api/src/server/routers/_app.ts` | Import and add documentsRouter |
| `apps/api/src/server/routers/band/band.settings.ts` | Add whoCanManageDocuments to settings update |
| `apps/web/src/components/ui/BandSidebar.tsx` | Add Documents nav item |
| `apps/web/src/components/ui/BandLayout.tsx` | Add Documents to mobile nav |
| `apps/web/src/app/bands/[slug]/settings/page.tsx` | Add "Who can manage documents" setting |

---

## Implementation Order

1. **Database**: Add schema models, run migration
2. **Backend**: Create documents router with folder/document procedures
3. **Frontend - Sidebar**: Add Documents menu item
4. **Frontend - Main Page**: Folder list with CRUD
5. **Frontend - Folder Page**: Document list with upload/download
6. **Testing**: Verify permissions, uploads, downloads

---

## Verification

### Manual Testing
1. Navigate to `/bands/{slug}/documents` - should see empty state with "Create folder" prompt
2. Create a new folder (users with permission)
3. Upload a document to a folder
4. Download the document
5. Pin/unpin a document
6. Delete a document
7. Go to Settings, change "Who can manage documents" to a different role set
8. Verify users without permission cannot create folders or upload

### Commands
```bash
cd apps/api && npx prisma migrate dev --name add_documents
cd apps/api && npm run build
cd apps/web && npm run build
```

---

## Future Enhancements (Not in This Phase)
- Nested folders (schema ready, UI not implemented)
- Document versioning/history
- Full-text search within documents
- Document tagging
- Bulk upload
- Share links for external access
