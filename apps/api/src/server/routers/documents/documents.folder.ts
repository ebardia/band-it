import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { MemberRole, DocumentFolderVisibility } from '@prisma/client'

// Role hierarchy for folder visibility
const VISIBILITY_ROLES: Record<DocumentFolderVisibility, MemberRole[]> = {
  PUBLIC: ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER', 'OBSERVER'],
  MODERATOR: ['FOUNDER', 'GOVERNOR', 'MODERATOR'],
  GOVERNANCE: ['FOUNDER', 'GOVERNOR'],
}

export function canAccessDocumentFolder(role: MemberRole, visibility: DocumentFolderVisibility): boolean {
  return VISIBILITY_ROLES[visibility].includes(role)
}

export async function canManageDocuments(bandId: string, userId: string): Promise<{ canManage: boolean; role: MemberRole | null }> {
  const membership = await prisma.member.findUnique({
    where: {
      userId_bandId: { userId, bandId },
    },
    select: { role: true, status: true },
  })

  if (!membership || membership.status !== 'ACTIVE') {
    return { canManage: false, role: null }
  }

  const band = await prisma.band.findUnique({
    where: { id: bandId },
    select: { whoCanManageDocuments: true },
  })

  if (!band) {
    return { canManage: false, role: membership.role }
  }

  return {
    canManage: band.whoCanManageDocuments.includes(membership.role),
    role: membership.role,
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 150)
}

/**
 * List all folders for a band
 */
export const listFolders = publicProcedure
  .input(z.object({
    bandId: z.string(),
    userId: z.string(),
    includeArchived: z.boolean().optional().default(false),
  }))
  .query(async ({ input }) => {
    const { bandId, userId, includeArchived } = input

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

    // Check if user can manage documents
    const { canManage } = await canManageDocuments(bandId, userId)

    // Get all folders
    const folders = await prisma.documentFolder.findMany({
      where: {
        bandId,
        parentFolderId: null, // Only root level folders for now
        ...(includeArchived ? {} : { isArchived: false }),
      },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    })

    // Process with access info
    const processedFolders = folders.map((folder) => {
      const hasAccess = canAccessDocumentFolder(userRole, folder.visibility)

      return {
        id: folder.id,
        name: folder.name,
        slug: folder.slug,
        description: folder.description,
        visibility: folder.visibility,
        sortOrder: folder.sortOrder,
        isArchived: folder.isArchived,
        hasAccess,
        documentCount: hasAccess ? folder.documentCount : null,
        lastDocumentAt: hasAccess ? folder.lastDocumentAt : null,
        createdBy: folder.createdBy,
        createdAt: folder.createdAt,
      }
    })

    return {
      folders: processedFolders,
      canManageDocuments: canManage,
    }
  })

/**
 * Get a single folder by slug
 */
export const getFolder = publicProcedure
  .input(z.object({
    bandId: z.string(),
    folderSlug: z.string(),
    userId: z.string(),
  }))
  .query(async ({ input }) => {
    const { bandId, folderSlug, userId } = input

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

    const folder = await prisma.documentFolder.findFirst({
      where: {
        bandId,
        slug: folderSlug,
      },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
    })

    if (!folder) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Folder not found',
      })
    }

    const hasAccess = canAccessDocumentFolder(userRole, folder.visibility)

    if (!hasAccess) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this folder',
      })
    }

    // Check if user can manage documents
    const { canManage } = await canManageDocuments(bandId, userId)

    return {
      folder: {
        id: folder.id,
        name: folder.name,
        slug: folder.slug,
        description: folder.description,
        visibility: folder.visibility,
        sortOrder: folder.sortOrder,
        isArchived: folder.isArchived,
        documentCount: folder.documentCount,
        lastDocumentAt: folder.lastDocumentAt,
        createdBy: folder.createdBy,
        createdAt: folder.createdAt,
      },
      canManageDocuments: canManage,
    }
  })

/**
 * Create a new folder
 */
export const createFolder = publicProcedure
  .input(z.object({
    bandId: z.string(),
    userId: z.string(),
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    visibility: z.enum(['PUBLIC', 'MODERATOR', 'GOVERNANCE']).default('PUBLIC'),
  }))
  .mutation(async ({ input }) => {
    const { bandId, userId, name, description, visibility } = input

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

    // Generate slug
    let slug = generateSlug(name)

    // Check for existing slug and make unique if needed
    const existing = await prisma.documentFolder.findFirst({
      where: { bandId, slug },
    })

    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`
    }

    // Get next sort order
    const maxSort = await prisma.documentFolder.aggregate({
      where: { bandId, parentFolderId: null },
      _max: { sortOrder: true },
    })
    const sortOrder = (maxSort._max.sortOrder || 0) + 1

    const folder = await prisma.documentFolder.create({
      data: {
        bandId,
        name,
        slug,
        description,
        visibility,
        sortOrder,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
    })

    return { folder }
  })

/**
 * Update a folder
 */
export const updateFolder = publicProcedure
  .input(z.object({
    folderId: z.string(),
    userId: z.string(),
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional().nullable(),
    visibility: z.enum(['PUBLIC', 'MODERATOR', 'GOVERNANCE']).optional(),
    sortOrder: z.number().optional(),
  }))
  .mutation(async ({ input }) => {
    const { folderId, userId, ...updates } = input

    const folder = await prisma.documentFolder.findUnique({
      where: { id: folderId },
      select: { bandId: true },
    })

    if (!folder) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Folder not found',
      })
    }

    // Check permission
    const { canManage, role } = await canManageDocuments(folder.bandId, userId)

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

    // Update slug if name changed
    const updateData: any = { ...updates }
    if (updates.name) {
      updateData.slug = generateSlug(updates.name)

      // Check for conflicts
      const existing = await prisma.documentFolder.findFirst({
        where: {
          bandId: folder.bandId,
          slug: updateData.slug,
          id: { not: folderId },
        },
      })

      if (existing) {
        updateData.slug = `${updateData.slug}-${Date.now().toString(36)}`
      }
    }

    const updated = await prisma.documentFolder.update({
      where: { id: folderId },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
    })

    return { folder: updated }
  })

/**
 * Delete a folder (only if empty)
 */
export const deleteFolder = publicProcedure
  .input(z.object({
    folderId: z.string(),
    userId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { folderId, userId } = input

    const folder = await prisma.documentFolder.findUnique({
      where: { id: folderId },
      select: { bandId: true, documentCount: true, name: true },
    })

    if (!folder) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Folder not found',
      })
    }

    // Check permission
    const { canManage, role } = await canManageDocuments(folder.bandId, userId)

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

    // Only allow deletion if folder is empty
    if (folder.documentCount > 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot delete folder "${folder.name}" because it contains ${folder.documentCount} document(s). Please delete all documents first.`,
      })
    }

    await prisma.documentFolder.delete({
      where: { id: folderId },
    })

    return { success: true }
  })

/**
 * Reorder folders
 */
export const reorderFolders = publicProcedure
  .input(z.object({
    bandId: z.string(),
    userId: z.string(),
    folderOrders: z.array(z.object({
      folderId: z.string(),
      sortOrder: z.number(),
    })),
  }))
  .mutation(async ({ input }) => {
    const { bandId, userId, folderOrders } = input

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

    // Update all folders in a transaction
    await prisma.$transaction(
      folderOrders.map(({ folderId, sortOrder }) =>
        prisma.documentFolder.update({
          where: { id: folderId },
          data: { sortOrder },
        })
      )
    )

    return { success: true }
  })
