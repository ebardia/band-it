import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { MemberRole, ForumCategoryVisibility } from '@prisma/client'

// Role hierarchy for category visibility (same as channels)
const VISIBILITY_ROLES: Record<ForumCategoryVisibility, MemberRole[]> = {
  PUBLIC: ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER', 'OBSERVER'],
  MODERATOR: ['FOUNDER', 'GOVERNOR', 'MODERATOR'],
  GOVERNANCE: ['FOUNDER', 'GOVERNOR'],
}

// Roles that can create categories
const CAN_CREATE_CATEGORY: MemberRole[] = ['FOUNDER', 'GOVERNOR', 'MODERATOR']

// Roles that can create posts (based on spec + clarification)
const CAN_CREATE_POST: MemberRole[] = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER']

export function canAccessForumCategory(role: MemberRole, visibility: ForumCategoryVisibility): boolean {
  return VISIBILITY_ROLES[visibility].includes(role)
}

export function canCreateCategory(role: MemberRole): boolean {
  return CAN_CREATE_CATEGORY.includes(role)
}

export function canCreatePost(role: MemberRole): boolean {
  return CAN_CREATE_POST.includes(role)
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100)
}

// Default categories to create for new bands
const DEFAULT_CATEGORIES = [
  { name: 'General', description: 'General discussion for band members', visibility: 'PUBLIC' as const, sortOrder: 0 },
  { name: 'Announcements', description: 'Important announcements from leadership', visibility: 'PUBLIC' as const, sortOrder: 1 },
  { name: 'Ideas & Feedback', description: 'Share ideas and provide feedback', visibility: 'PUBLIC' as const, sortOrder: 2 },
]

/**
 * Create default categories for a band
 */
export async function createDefaultCategories(bandId: string, createdById: string) {
  const existingCategories = await prisma.forumCategory.count({ where: { bandId } })

  if (existingCategories > 0) {
    return // Categories already exist
  }

  await prisma.forumCategory.createMany({
    data: DEFAULT_CATEGORIES.map(cat => ({
      bandId,
      name: cat.name,
      slug: generateSlug(cat.name),
      description: cat.description,
      visibility: cat.visibility,
      sortOrder: cat.sortOrder,
      createdById,
    })),
  })
}

/**
 * List all categories for a band
 */
export const listCategories = publicProcedure
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
        message: 'You must be an active band member to view the forum',
      })
    }

    const userRole = membership.role

    // Create default categories if none exist (first access)
    await createDefaultCategories(bandId, userId)

    // Get all categories
    const categories = await prisma.forumCategory.findMany({
      where: {
        bandId,
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
    const processedCategories = categories.map((category) => {
      const hasAccess = canAccessForumCategory(userRole, category.visibility)

      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        visibility: category.visibility,
        sortOrder: category.sortOrder,
        isArchived: category.isArchived,
        hasAccess,
        postCount: hasAccess ? category.postCount : null,
        lastPostAt: hasAccess ? category.lastPostAt : null,
        createdBy: category.createdBy,
        createdAt: category.createdAt,
      }
    })

    return {
      categories: processedCategories,
      canCreateCategory: canCreateCategory(userRole),
      canCreatePost: canCreatePost(userRole),
    }
  })

/**
 * Get a single category by slug
 */
export const getCategory = publicProcedure
  .input(z.object({
    bandId: z.string(),
    categorySlug: z.string(),
    userId: z.string(),
  }))
  .query(async ({ input }) => {
    const { bandId, categorySlug, userId } = input

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
        message: 'You must be an active band member to view the forum',
      })
    }

    const userRole = membership.role

    const category = await prisma.forumCategory.findFirst({
      where: {
        bandId,
        slug: categorySlug,
      },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
    })

    if (!category) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Category not found',
      })
    }

    const hasAccess = canAccessForumCategory(userRole, category.visibility)

    if (!hasAccess) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this category',
      })
    }

    return {
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        visibility: category.visibility,
        sortOrder: category.sortOrder,
        isArchived: category.isArchived,
        postCount: category.postCount,
        lastPostAt: category.lastPostAt,
        createdBy: category.createdBy,
        createdAt: category.createdAt,
      },
      canCreatePost: canCreatePost(userRole),
    }
  })

/**
 * Create a new category
 */
export const createCategory = publicProcedure
  .input(z.object({
    bandId: z.string(),
    userId: z.string(),
    name: z.string().min(1).max(80),
    description: z.string().max(500).optional(),
    visibility: z.enum(['PUBLIC', 'MODERATOR', 'GOVERNANCE']).default('PUBLIC'),
  }))
  .mutation(async ({ input }) => {
    const { bandId, userId, name, description, visibility } = input

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
        message: 'You must be an active band member',
      })
    }

    if (!canCreateCategory(membership.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to create categories',
      })
    }

    // Generate slug
    let slug = generateSlug(name)

    // Check for existing slug and make unique if needed
    const existing = await prisma.forumCategory.findFirst({
      where: { bandId, slug },
    })

    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`
    }

    // Get next sort order
    const maxSort = await prisma.forumCategory.aggregate({
      where: { bandId },
      _max: { sortOrder: true },
    })
    const sortOrder = (maxSort._max.sortOrder || 0) + 1

    const category = await prisma.forumCategory.create({
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

    return { category }
  })

/**
 * Update a category
 */
export const updateCategory = publicProcedure
  .input(z.object({
    categoryId: z.string(),
    userId: z.string(),
    name: z.string().min(1).max(80).optional(),
    description: z.string().max(500).optional().nullable(),
    visibility: z.enum(['PUBLIC', 'MODERATOR', 'GOVERNANCE']).optional(),
    sortOrder: z.number().optional(),
  }))
  .mutation(async ({ input }) => {
    const { categoryId, userId, ...updates } = input

    const category = await prisma.forumCategory.findUnique({
      where: { id: categoryId },
      select: { bandId: true },
    })

    if (!category) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Category not found',
      })
    }

    // Get user's membership
    const membership = await prisma.member.findUnique({
      where: {
        userId_bandId: { userId, bandId: category.bandId },
      },
      select: { role: true, status: true },
    })

    if (!membership || membership.status !== 'ACTIVE') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be an active band member',
      })
    }

    if (!canCreateCategory(membership.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to edit categories',
      })
    }

    // Update slug if name changed
    const updateData: any = { ...updates }
    if (updates.name) {
      updateData.slug = generateSlug(updates.name)

      // Check for conflicts
      const existing = await prisma.forumCategory.findFirst({
        where: {
          bandId: category.bandId,
          slug: updateData.slug,
          id: { not: categoryId },
        },
      })

      if (existing) {
        updateData.slug = `${updateData.slug}-${Date.now().toString(36)}`
      }
    }

    const updated = await prisma.forumCategory.update({
      where: { id: categoryId },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
    })

    return { category: updated }
  })

/**
 * Archive a category
 */
export const archiveCategory = publicProcedure
  .input(z.object({
    categoryId: z.string(),
    userId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { categoryId, userId } = input

    const category = await prisma.forumCategory.findUnique({
      where: { id: categoryId },
      select: { bandId: true },
    })

    if (!category) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Category not found',
      })
    }

    // Get user's membership
    const membership = await prisma.member.findUnique({
      where: {
        userId_bandId: { userId, bandId: category.bandId },
      },
      select: { role: true, status: true },
    })

    if (!membership || membership.status !== 'ACTIVE') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be an active band member',
      })
    }

    if (!canCreateCategory(membership.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to archive categories',
      })
    }

    const updated = await prisma.forumCategory.update({
      where: { id: categoryId },
      data: { isArchived: true },
    })

    return { category: updated }
  })

/**
 * Unarchive a category
 */
export const unarchiveCategory = publicProcedure
  .input(z.object({
    categoryId: z.string(),
    userId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { categoryId, userId } = input

    const category = await prisma.forumCategory.findUnique({
      where: { id: categoryId },
      select: { bandId: true },
    })

    if (!category) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Category not found',
      })
    }

    // Get user's membership
    const membership = await prisma.member.findUnique({
      where: {
        userId_bandId: { userId, bandId: category.bandId },
      },
      select: { role: true, status: true },
    })

    if (!membership || membership.status !== 'ACTIVE') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be an active band member',
      })
    }

    if (!canCreateCategory(membership.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to unarchive categories',
      })
    }

    const updated = await prisma.forumCategory.update({
      where: { id: categoryId },
      data: { isArchived: false },
    })

    return { category: updated }
  })

/**
 * Delete a category (only if empty)
 */
export const deleteCategory = publicProcedure
  .input(z.object({
    categoryId: z.string(),
    userId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { categoryId, userId } = input

    const category = await prisma.forumCategory.findUnique({
      where: { id: categoryId },
      select: { bandId: true, postCount: true, name: true },
    })

    if (!category) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Category not found',
      })
    }

    // Get user's membership
    const membership = await prisma.member.findUnique({
      where: {
        userId_bandId: { userId, bandId: category.bandId },
      },
      select: { role: true, status: true },
    })

    if (!membership || membership.status !== 'ACTIVE') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be an active band member',
      })
    }

    if (!canCreateCategory(membership.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to delete categories',
      })
    }

    // Only allow deletion if category is empty
    if (category.postCount > 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot delete category "${category.name}" because it contains ${category.postCount} post(s). Please delete or move all posts first.`,
      })
    }

    await prisma.forumCategory.delete({
      where: { id: categoryId },
    })

    return { success: true }
  })
