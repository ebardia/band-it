import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { MemberRole } from '@prisma/client'
import { canAccessPostCategory, canCreatePost } from './posts.category'

// Roles that can pin/lock posts
const CAN_MODERATE: MemberRole[] = ['FOUNDER', 'GOVERNOR', 'MODERATOR']

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 200)
}

/**
 * List posts in a category
 */
export const listPosts = publicProcedure
  .input(z.object({
    bandId: z.string(),
    categoryId: z.string(),
    userId: z.string(),
    cursor: z.string().optional(), // For pagination
    limit: z.number().min(1).max(50).default(20),
  }))
  .query(async ({ input }) => {
    const { bandId, categoryId, userId, cursor, limit } = input

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
        message: 'You must be an active band member to view posts',
      })
    }

    const userRole = membership.role

    // Get category to check access
    const category = await prisma.postCategory.findUnique({
      where: { id: categoryId },
      select: { visibility: true, isArchived: true, name: true, slug: true },
    })

    if (!category) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Category not found',
      })
    }

    if (!canAccessPostCategory(userRole, category.visibility)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this category',
      })
    }

    // Get posts with pagination
    const posts = await prisma.post.findMany({
      where: {
        categoryId,
        deletedAt: null,
      },
      include: {
        author: {
          select: { id: true, name: true, deletedAt: true },
        },
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit + 1, // Get one extra to check for more
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    let hasMore = false
    if (posts.length > limit) {
      posts.pop()
      hasMore = true
    }

    const processedPosts = posts.map(post => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      isPinned: post.isPinned,
      isLocked: post.isLocked,
      responseCount: post.responseCount,
      lastResponseAt: post.lastResponseAt,
      author: post.author,
      createdAt: post.createdAt,
      isEdited: post.isEdited,
    }))

    return {
      posts: processedPosts,
      hasMore,
      nextCursor: hasMore ? posts[posts.length - 1].id : null,
      category: {
        name: category.name,
        slug: category.slug,
        isArchived: category.isArchived,
      },
      canCreatePost: canCreatePost(userRole) && !category.isArchived,
    }
  })

/**
 * Get a single post by slug with responses
 */
export const getPost = publicProcedure
  .input(z.object({
    bandId: z.string(),
    postSlug: z.string(),
    userId: z.string(),
  }))
  .query(async ({ input }) => {
    const { bandId, postSlug, userId } = input

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
        message: 'You must be an active band member to view posts',
      })
    }

    const userRole = membership.role

    const post = await prisma.post.findFirst({
      where: {
        bandId,
        slug: postSlug,
        deletedAt: null,
      },
      include: {
        author: {
          select: { id: true, name: true, deletedAt: true },
        },
        category: {
          select: { id: true, name: true, slug: true, visibility: true, isArchived: true },
        },
        responses: {
          where: { deletedAt: null },
          include: {
            author: {
              select: { id: true, name: true, deletedAt: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!post) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Post not found',
      })
    }

    if (!canAccessPostCategory(userRole, post.category.visibility)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this category',
      })
    }

    // Build threaded responses (depth limit = 3)
    const buildThreadedResponses = (responses: typeof post.responses) => {
      const responseMap = new Map<string | null, typeof responses>()

      // Group by parent
      responses.forEach(r => {
        const parentId = r.parentId
        if (!responseMap.has(parentId)) {
          responseMap.set(parentId, [])
        }
        responseMap.get(parentId)!.push(r)
      })

      // Build tree recursively
      const buildTree = (parentId: string | null): any[] => {
        const children = responseMap.get(parentId) || []
        return children.map(r => ({
          id: r.id,
          content: r.content,
          depth: r.depth,
          author: r.author,
          isEdited: r.isEdited,
          createdAt: r.createdAt,
          canReply: r.depth < 3, // Max depth of 3
          replies: buildTree(r.id),
        }))
      }

      return buildTree(null)
    }

    const threadedResponses = buildThreadedResponses(post.responses)

    return {
      post: {
        id: post.id,
        title: post.title,
        slug: post.slug,
        content: post.content,
        isPinned: post.isPinned,
        isLocked: post.isLocked,
        isEdited: post.isEdited,
        responseCount: post.responseCount,
        author: post.author,
        createdAt: post.createdAt,
        editedAt: post.editedAt,
      },
      responses: threadedResponses,
      category: post.category,
      canEdit: post.author.id === userId,
      canDelete: post.author.id === userId || CAN_MODERATE.includes(userRole),
      canModerate: CAN_MODERATE.includes(userRole),
      canRespond: !post.isLocked && !post.category.isArchived,
    }
  })

/**
 * Create a new post
 */
export const createPost = publicProcedure
  .input(z.object({
    bandId: z.string(),
    categoryId: z.string(),
    userId: z.string(),
    title: z.string().min(5).max(200),
    content: z.string().min(20).max(50000), // Markdown content
  }))
  .mutation(async ({ input }) => {
    const { bandId, categoryId, userId, title, content } = input

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

    if (!canCreatePost(membership.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to create posts',
      })
    }

    // Get category to check access
    const category = await prisma.postCategory.findUnique({
      where: { id: categoryId },
      select: { bandId: true, visibility: true, isArchived: true },
    })

    if (!category) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Category not found',
      })
    }

    if (category.bandId !== bandId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Category does not belong to this band',
      })
    }

    if (!canAccessPostCategory(membership.role, category.visibility)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this category',
      })
    }

    if (category.isArchived) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot create posts in archived categories',
      })
    }

    // Generate unique slug
    let slug = generateSlug(title)

    // Check for existing slug and make unique if needed
    const existing = await prisma.post.findFirst({
      where: { bandId, slug },
    })

    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`
    }

    // Create post and update category stats in transaction
    const post = await prisma.$transaction(async (tx) => {
      const newPost = await tx.post.create({
        data: {
          categoryId,
          bandId,
          authorId: userId,
          title,
          slug,
          content,
        },
        include: {
          author: {
            select: { id: true, name: true },
          },
          category: {
            select: { id: true, name: true, slug: true },
          },
        },
      })

      // Update category stats
      await tx.postCategory.update({
        where: { id: categoryId },
        data: {
          postCount: { increment: 1 },
          lastPostAt: new Date(),
        },
      })

      return newPost
    })

    return { post }
  })

/**
 * Update a post
 */
export const updatePost = publicProcedure
  .input(z.object({
    postId: z.string(),
    userId: z.string(),
    title: z.string().min(5).max(200).optional(),
    content: z.string().min(20).max(50000).optional(),
  }))
  .mutation(async ({ input }) => {
    const { postId, userId, title, content } = input

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true, bandId: true, deletedAt: true },
    })

    if (!post || post.deletedAt) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Post not found',
      })
    }

    // Only author can edit
    if (post.authorId !== userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only the author can edit this post',
      })
    }

    // Build update data
    const updateData: any = {
      isEdited: true,
      editedAt: new Date(),
    }

    if (title) {
      updateData.title = title
      // Update slug too
      let slug = generateSlug(title)
      const existing = await prisma.post.findFirst({
        where: { bandId: post.bandId, slug, id: { not: postId } },
      })
      if (existing) {
        slug = `${slug}-${Date.now().toString(36)}`
      }
      updateData.slug = slug
    }

    if (content) {
      updateData.content = content
    }

    const updated = await prisma.post.update({
      where: { id: postId },
      data: updateData,
      include: {
        author: {
          select: { id: true, name: true, deletedAt: true },
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    })

    return { post: updated }
  })

/**
 * Delete a post (soft delete)
 */
export const deletePost = publicProcedure
  .input(z.object({
    postId: z.string(),
    userId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { postId, userId } = input

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true, bandId: true, categoryId: true, deletedAt: true },
    })

    if (!post || post.deletedAt) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Post not found',
      })
    }

    // Get user's membership
    const membership = await prisma.member.findUnique({
      where: {
        userId_bandId: { userId, bandId: post.bandId },
      },
      select: { role: true, status: true },
    })

    if (!membership || membership.status !== 'ACTIVE') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be an active band member',
      })
    }

    // Author or moderators can delete
    const canDelete = post.authorId === userId || CAN_MODERATE.includes(membership.role)

    if (!canDelete) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to delete this post',
      })
    }

    // Soft delete and update category stats
    await prisma.$transaction(async (tx) => {
      await tx.post.update({
        where: { id: postId },
        data: { deletedAt: new Date() },
      })

      await tx.postCategory.update({
        where: { id: post.categoryId },
        data: {
          postCount: { decrement: 1 },
        },
      })
    })

    return { success: true }
  })

/**
 * Pin/unpin a post (moderators only)
 */
export const togglePinPost = publicProcedure
  .input(z.object({
    postId: z.string(),
    userId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { postId, userId } = input

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { bandId: true, isPinned: true, deletedAt: true },
    })

    if (!post || post.deletedAt) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Post not found',
      })
    }

    // Get user's membership
    const membership = await prisma.member.findUnique({
      where: {
        userId_bandId: { userId, bandId: post.bandId },
      },
      select: { role: true, status: true },
    })

    if (!membership || membership.status !== 'ACTIVE') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be an active band member',
      })
    }

    if (!CAN_MODERATE.includes(membership.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only moderators can pin posts',
      })
    }

    const updated = await prisma.post.update({
      where: { id: postId },
      data: { isPinned: !post.isPinned },
    })

    return { post: updated }
  })

/**
 * Lock/unlock a post (moderators only)
 */
export const toggleLockPost = publicProcedure
  .input(z.object({
    postId: z.string(),
    userId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { postId, userId } = input

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { bandId: true, isLocked: true, deletedAt: true },
    })

    if (!post || post.deletedAt) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Post not found',
      })
    }

    // Get user's membership
    const membership = await prisma.member.findUnique({
      where: {
        userId_bandId: { userId, bandId: post.bandId },
      },
      select: { role: true, status: true },
    })

    if (!membership || membership.status !== 'ACTIVE') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be an active band member',
      })
    }

    if (!CAN_MODERATE.includes(membership.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only moderators can lock posts',
      })
    }

    const updated = await prisma.post.update({
      where: { id: postId },
      data: { isLocked: !post.isLocked },
    })

    return { post: updated }
  })
