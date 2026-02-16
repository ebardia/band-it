import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { MemberRole, DocumentFolderVisibility } from '@prisma/client'
import { canAccessDocumentFolder, canManageDocuments } from './documents.folder'
import { checkAndAdvanceOnboarding } from '../../../lib/onboarding/milestones'

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 250)
}

/**
 * List documents in a folder
 */
export const listDocuments = publicProcedure
  .input(z.object({
    bandId: z.string(),
    folderId: z.string(),
    userId: z.string(),
    limit: z.number().min(1).max(100).optional().default(50),
    cursor: z.string().optional(),
  }))
  .query(async ({ input }) => {
    const { bandId, folderId, userId, limit, cursor } = input

    // Get user's membership
    const membership = await prisma.member.findUnique({
      where: {
        userId_bandId: { userId, bandId },
      },
      select: { role: true, status: true },
    })

    if (!membership || membership.status !== 'ACTIVE') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be an active band member to view documents',
      })
    }

    const userRole = membership.role

    // Get folder and check access
    const folder = await prisma.documentFolder.findUnique({
      where: { id: folderId },
      select: { bandId: true, visibility: true },
    })

    if (!folder || folder.bandId !== bandId) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Folder not found',
      })
    }

    if (!canAccessDocumentFolder(userRole, folder.visibility)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this folder',
      })
    }

    // Get documents
    const documents = await prisma.document.findMany({
      where: {
        folderId,
        deletedAt: null,
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true },
        },
        file: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            mimeType: true,
            size: true,
            url: true,
          },
        },
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    let nextCursor: string | undefined
    if (documents.length > limit) {
      const nextItem = documents.pop()
      nextCursor = nextItem?.id
    }

    // Check if user can manage documents
    const { canManage } = await canManageDocuments(bandId, userId)

    return {
      documents: documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        slug: doc.slug,
        description: doc.description,
        isPinned: doc.isPinned,
        downloadCount: doc.downloadCount,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        uploadedBy: doc.uploadedBy,
        file: doc.file,
      })),
      nextCursor,
      canManageDocuments: canManage,
    }
  })

/**
 * Get a single document
 */
export const getDocument = publicProcedure
  .input(z.object({
    bandId: z.string(),
    documentSlug: z.string(),
    userId: z.string(),
  }))
  .query(async ({ input }) => {
    const { bandId, documentSlug, userId } = input

    // Get user's membership
    const membership = await prisma.member.findUnique({
      where: {
        userId_bandId: { userId, bandId },
      },
      select: { role: true, status: true },
    })

    if (!membership || membership.status !== 'ACTIVE') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be an active band member to view documents',
      })
    }

    const userRole = membership.role

    const document = await prisma.document.findFirst({
      where: {
        bandId,
        slug: documentSlug,
        deletedAt: null,
      },
      include: {
        folder: {
          select: { id: true, name: true, slug: true, visibility: true },
        },
        uploadedBy: {
          select: { id: true, name: true },
        },
        file: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            mimeType: true,
            size: true,
            url: true,
          },
        },
      },
    })

    if (!document) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Document not found',
      })
    }

    if (!canAccessDocumentFolder(userRole, document.folder.visibility)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this document',
      })
    }

    // Check if user can manage documents
    const { canManage } = await canManageDocuments(bandId, userId)

    return {
      document: {
        id: document.id,
        title: document.title,
        slug: document.slug,
        description: document.description,
        isPinned: document.isPinned,
        downloadCount: document.downloadCount,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        uploadedBy: document.uploadedBy,
        file: document.file,
        folder: document.folder,
      },
      canManageDocuments: canManage,
    }
  })

/**
 * Upload a new document (create document record linked to an existing file)
 */
export const uploadDocument = publicProcedure
  .input(z.object({
    bandId: z.string(),
    folderId: z.string(),
    userId: z.string(),
    fileId: z.string(),
    title: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
  }))
  .mutation(async ({ input }) => {
    const { bandId, folderId, userId, fileId, title, description } = input

    // Check permission
    const { canManage, role } = await canManageDocuments(bandId, userId)

    if (!role) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be an active band member',
      })
    }

    if (!canManage) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to manage documents',
      })
    }

    // Verify folder exists and belongs to band
    const folder = await prisma.documentFolder.findUnique({
      where: { id: folderId },
      select: { bandId: true, isArchived: true },
    })

    if (!folder || folder.bandId !== bandId) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Folder not found',
      })
    }

    if (folder.isArchived) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot upload to an archived folder',
      })
    }

    // Verify file exists and is not already linked to a document
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: { document: true },
    })

    if (!file) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'File not found',
      })
    }

    if (file.document) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'File is already linked to a document',
      })
    }

    // Generate slug
    let slug = generateSlug(title)

    // Check for existing slug and make unique if needed
    const existing = await prisma.document.findFirst({
      where: { bandId, slug },
    })

    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`
    }

    // Create document and update folder counts in a transaction
    const document = await prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          bandId,
          folderId,
          uploadedById: userId,
          fileId,
          title,
          slug,
          description,
        },
        include: {
          uploadedBy: {
            select: { id: true, name: true },
          },
          file: {
            select: {
              id: true,
              filename: true,
              originalName: true,
              mimeType: true,
              size: true,
              url: true,
            },
          },
        },
      })

      // Update folder counts
      await tx.documentFolder.update({
        where: { id: folderId },
        data: {
          documentCount: { increment: 1 },
          lastDocumentAt: new Date(),
        },
      })

      return doc
    })

    // Check onboarding progress (document upload = milestone 10)
    checkAndAdvanceOnboarding(bandId).catch(err =>
      console.error('Error checking onboarding:', err)
    )

    return { document }
  })

/**
 * Update a document
 */
export const updateDocument = publicProcedure
  .input(z.object({
    documentId: z.string(),
    userId: z.string(),
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional().nullable(),
  }))
  .mutation(async ({ input }) => {
    const { documentId, userId, ...updates } = input

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { bandId: true, deletedAt: true },
    })

    if (!document || document.deletedAt) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Document not found',
      })
    }

    // Check permission
    const { canManage, role } = await canManageDocuments(document.bandId, userId)

    if (!role) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be an active band member',
      })
    }

    if (!canManage) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to manage documents',
      })
    }

    // Update slug if title changed
    const updateData: any = { ...updates }
    if (updates.title) {
      updateData.slug = generateSlug(updates.title)

      // Check for conflicts
      const existing = await prisma.document.findFirst({
        where: {
          bandId: document.bandId,
          slug: updateData.slug,
          id: { not: documentId },
        },
      })

      if (existing) {
        updateData.slug = `${updateData.slug}-${Date.now().toString(36)}`
      }
    }

    const updated = await prisma.document.update({
      where: { id: documentId },
      data: updateData,
      include: {
        uploadedBy: {
          select: { id: true, name: true },
        },
        file: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            mimeType: true,
            size: true,
            url: true,
          },
        },
      },
    })

    return { document: updated }
  })

/**
 * Delete a document (soft delete)
 */
export const deleteDocument = publicProcedure
  .input(z.object({
    documentId: z.string(),
    userId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { documentId, userId } = input

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { bandId: true, folderId: true, deletedAt: true },
    })

    if (!document || document.deletedAt) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Document not found',
      })
    }

    // Check permission
    const { canManage, role } = await canManageDocuments(document.bandId, userId)

    if (!role) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be an active band member',
      })
    }

    if (!canManage) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to manage documents',
      })
    }

    // Soft delete and update folder counts in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.document.update({
        where: { id: documentId },
        data: { deletedAt: new Date() },
      })

      await tx.documentFolder.update({
        where: { id: document.folderId },
        data: {
          documentCount: { decrement: 1 },
        },
      })
    })

    return { success: true }
  })

/**
 * Toggle pin status of a document
 */
export const togglePin = publicProcedure
  .input(z.object({
    documentId: z.string(),
    userId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { documentId, userId } = input

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { bandId: true, isPinned: true, deletedAt: true },
    })

    if (!document || document.deletedAt) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Document not found',
      })
    }

    // Check permission
    const { canManage, role } = await canManageDocuments(document.bandId, userId)

    if (!role) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be an active band member',
      })
    }

    if (!canManage) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to manage documents',
      })
    }

    const updated = await prisma.document.update({
      where: { id: documentId },
      data: { isPinned: !document.isPinned },
      select: { id: true, isPinned: true },
    })

    return { document: updated }
  })

/**
 * Increment download count
 */
export const incrementDownload = publicProcedure
  .input(z.object({
    documentId: z.string(),
    userId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { documentId, userId } = input

    // Verify user has access
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        folder: {
          select: { visibility: true },
        },
      },
    })

    if (!document || document.deletedAt) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Document not found',
      })
    }

    // Get user's membership
    const membership = await prisma.member.findUnique({
      where: {
        userId_bandId: { userId, bandId: document.bandId },
      },
      select: { role: true, status: true },
    })

    if (!membership || membership.status !== 'ACTIVE') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be an active band member',
      })
    }

    if (!canAccessDocumentFolder(membership.role, document.folder.visibility)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this document',
      })
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { downloadCount: { increment: 1 } },
    })

    return { success: true }
  })
