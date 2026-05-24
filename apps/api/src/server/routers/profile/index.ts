import { z } from 'zod'
import { ProfileTaxonomyKind, Prisma } from '@prisma/client'
import { router, publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { parseResumeWithAI } from '../../../services/resume-parse.service'
import { extractResumeText, isResumeMimeType, resumeMimeErrorMessage } from '../../../services/resume-text.service'
import { storageService, getFileSizeLimit } from '../../../services/storage.service'
import { ensureProfileSeedData } from '../../../services/ensure-profile-seed.service'
import { searchUsLocations, resolveProfileLocation } from '../../../services/us-location.service'
import { inferSkillsFromProfile } from '../../../services/skill-infer.service'

const workExperienceSchema = z.object({
  title: z.string(),
  org: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
})

const educationSchema = z.object({
  degree: z.string(),
  institution: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

const certificationSchema = z.object({
  name: z.string(),
  issuer: z.string().optional(),
  date: z.string().optional(),
})

const taxonomySelectionSchema = z.object({
  categoryIds: z.array(z.string()),
  itemIds: z.array(z.string()),
})

function profileIsComplete(data: {
  locationId: string | null
  resumeText: string | null
  resumeFileId: string | null
}): boolean {
  const hasPlace = !!data.locationId
  const hasResume = !!(data.resumeText?.trim() || data.resumeFileId)
  return hasPlace && hasResume
}

async function getProfilePayload(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      zipcode: true,
      locationId: true,
      location: true,
      resumeText: true,
      resumeFileId: true,
      resumeFile: {
        select: { id: true, originalName: true, mimeType: true, url: true },
      },
      workExperience: true,
      education: true,
      certifications: true,
      profileCompleted: true,
      createdAt: true,
      profileTaxonomySelections: {
        select: {
          categoryId: true,
          itemId: true,
          category: { select: { id: true, kind: true, label: true } },
          item: {
            select: {
              id: true,
              label: true,
              categoryId: true,
              category: { select: { kind: true } },
            },
          },
        },
      },
    },
  })

  if (!user) {
    throw new Error('User not found')
  }

  const skillSelections = { categoryIds: [] as string[], itemIds: [] as string[] }
  const causeSelections = { categoryIds: [] as string[], itemIds: [] as string[] }
  const playSelections = { categoryIds: [] as string[], itemIds: [] as string[] }

  const bucketForKind = (kind: ProfileTaxonomyKind) => {
    if (kind === 'SKILL') return skillSelections
    if (kind === 'CAUSE') return causeSelections
    return playSelections
  }

  for (const sel of user.profileTaxonomySelections) {
    if (sel.categoryId && sel.category) {
      bucketForKind(sel.category.kind).categoryIds.push(sel.categoryId)
    } else if (sel.itemId && sel.item?.category) {
      bucketForKind(sel.item.category.kind).itemIds.push(sel.itemId)
    }
  }

  return {
    ...user,
    workExperience: (user.workExperience as unknown[]) ?? [],
    education: (user.education as unknown[]) ?? [],
    certifications: (user.certifications as unknown[]) ?? [],
    skills: skillSelections,
    causes: causeSelections,
    playInterests: playSelections,
  }
}

export const profileRouter = router({
  getTaxonomy: publicProcedure
    .input(
      z.object({
        kind: z.nativeEnum(ProfileTaxonomyKind).optional(),
      })
    )
    .query(async ({ input }) => {
      await ensureProfileSeedData()
      const categories = await prisma.profileTaxonomyCategory.findMany({
        where: input.kind ? { kind: input.kind } : undefined,
        orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }],
        include: {
          items: { orderBy: { sortOrder: 'asc' } },
        },
      })

      return { categories }
    }),

  searchLocations: publicProcedure
    .input(
      z.object({
        query: z.string().max(80),
        limit: z.number().min(1).max(25).default(12),
      })
    )
    .query(async ({ input }) => {
      const q = input.query.trim()
      if (q.length < 1) return { locations: [] }

      const fromZip = searchUsLocations(q, input.limit)
      if (fromZip.length > 0) {
        return { locations: fromZip }
      }

      await ensureProfileSeedData()
      const locations = await prisma.usLocation.findMany({
        where: {
          OR: [
            { label: { contains: q, mode: 'insensitive' } },
            { city: { contains: q, mode: 'insensitive' } },
            { zip: { startsWith: q } },
            { state: { equals: q.toUpperCase(), mode: 'insensitive' } },
          ],
        },
        take: input.limit,
        orderBy: { label: 'asc' },
      })

      return {
        locations: locations.map((loc) => ({
          id: loc.id,
          city: loc.city,
          state: loc.state,
          zip: loc.zip,
          label: loc.label,
        })),
      }
    }),

  get: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const profile = await getProfilePayload(input.userId)
      return { success: true, profile }
    }),

  parseResume: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        resumeText: z.string().optional(),
        fileName: z.string().optional(),
        mimeType: z.string().optional(),
        base64Data: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      let text = input.resumeText?.trim() ?? ''

      if (input.base64Data && input.mimeType) {
        if (!isResumeMimeType(input.mimeType)) {
          throw new Error(resumeMimeErrorMessage())
        }
        const buffer = Buffer.from(input.base64Data, 'base64')
        const limit = getFileSizeLimit(input.mimeType)
        if (buffer.length > limit) {
          throw new Error(`File too large. Maximum size: ${Math.round(limit / (1024 * 1024))}MB`)
        }
        text = await extractResumeText(input.mimeType, buffer)
      }

      if (!text) {
        throw new Error('Paste resume text or upload a PDF, DOCX, or TXT file.')
      }

      const parsed = await parseResumeWithAI(text, input.userId)
      return { success: true, resumeText: text, parsed }
    }),

  suggestSkills: publicProcedure
    .input(
      z.object({
        workExperience: z.array(workExperienceSchema).default([]),
        education: z.array(educationSchema).default([]),
        resumeText: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      await ensureProfileSeedData()
      const match = await inferSkillsFromProfile({
        workExperience: input.workExperience,
        education: input.education,
        resumeText: input.resumeText ?? '',
      })
      return { success: true, skills: match }
    }),

  update: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        locationId: z.string().min(1, 'Place is required'),
        locationCity: z.string().optional(),
        locationState: z.string().optional(),
        locationZip: z.string().optional(),
        resumeText: z.string().optional(),
        resumeFileId: z.string().optional().nullable(),
        resumeUpload: z
          .object({
            fileName: z.string(),
            mimeType: z.string(),
            base64Data: z.string(),
          })
          .optional(),
        workExperience: z.array(workExperienceSchema).default([]),
        education: z.array(educationSchema).default([]),
        certifications: z.array(certificationSchema).default([]),
        skills: taxonomySelectionSchema.default({ categoryIds: [], itemIds: [] }),
        causes: taxonomySelectionSchema.default({ categoryIds: [], itemIds: [] }),
        playInterests: taxonomySelectionSchema.default({ categoryIds: [], itemIds: [] }),
      })
    )
    .mutation(async ({ input }) => {
      const location = await resolveProfileLocation(input.locationId, {
        city: input.locationCity ?? '',
        state: input.locationState ?? '',
        zip: input.locationZip ?? '',
      })
      if (!location) {
        throw new Error('Invalid location selected — pick a city or ZIP from the list.')
      }

      let resumeText = input.resumeText?.trim() ?? ''
      let resumeFileId = input.resumeFileId ?? null

      if (input.resumeUpload) {
        if (!isResumeMimeType(input.resumeUpload.mimeType)) {
          throw new Error(resumeMimeErrorMessage())
        }
        const buffer = Buffer.from(input.resumeUpload.base64Data, 'base64')
        const limit = getFileSizeLimit(input.resumeUpload.mimeType)
        if (buffer.length > limit) {
          throw new Error(`File too large. Maximum size: ${Math.round(limit / (1024 * 1024))}MB`)
        }

        const extracted = await extractResumeText(input.resumeUpload.mimeType, buffer)
        if (extracted) resumeText = extracted

        const upload = await storageService.upload(
          buffer,
          input.resumeUpload.fileName,
          input.resumeUpload.mimeType
        )

        const file = await prisma.file.create({
          data: {
            filename: upload.filename,
            originalName: input.resumeUpload.fileName,
            mimeType: input.resumeUpload.mimeType,
            size: buffer.length,
            category: 'DOCUMENT',
            storageKey: upload.storageKey,
            url: upload.url,
            uploadedById: input.userId,
            description: 'User resume',
          },
        })
        resumeFileId = file.id
      }

      const hasResume = !!(resumeText || resumeFileId)
      if (!hasResume) {
        throw new Error('Resume is required — paste text or upload a PDF, DOCX, or TXT file.')
      }

      const allCategoryIds = [
        ...input.skills.categoryIds,
        ...input.causes.categoryIds,
        ...input.playInterests.categoryIds,
      ]
      const allItemIds = [
        ...input.skills.itemIds,
        ...input.causes.itemIds,
        ...input.playInterests.itemIds,
      ]

      const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.userProfileTaxonomySelection.deleteMany({ where: { userId: input.userId } })

        const selectionRows: { userId: string; categoryId?: string; itemId?: string }[] = []
        for (const categoryId of allCategoryIds) {
          selectionRows.push({ userId: input.userId, categoryId })
        }
        for (const itemId of allItemIds) {
          selectionRows.push({ userId: input.userId, itemId })
        }

        if (selectionRows.length > 0) {
          await tx.userProfileTaxonomySelection.createMany({ data: selectionRows })
        }

        return tx.user.update({
          where: { id: input.userId },
          data: {
            locationId: location.id,
            zipcode: location.zip,
            resumeText: resumeText || null,
            resumeFileId,
            workExperience: input.workExperience,
            education: input.education,
            certifications: input.certifications,
            profileCompleted: profileIsComplete({
              locationId: location.id,
              resumeText: resumeText || null,
              resumeFileId,
            }),
          },
          select: {
            id: true,
            profileCompleted: true,
          },
        })
      })

      const profile = await getProfilePayload(input.userId)

      return {
        success: true,
        message: 'Profile updated successfully',
        user,
        profile,
      }
    }),
})
