/**
 * Finance Bucket Governance Effects (FINANCE_BUCKET_GOVERNANCE_V1)
 *
 * This module implements effect handlers for managing band finance buckets
 * and treasurer assignments through governance proposals.
 */

import { prisma } from '../../lib/prisma'
import {
  registerEffectHandler,
  registerSubtypeEffects,
  type EffectHandler,
  type EffectContext,
} from '../proposal-effects.service'

// ============================================
// EFFECT TYPE CONSTANTS
// ============================================

export const FINANCE_BUCKET_EFFECTS = {
  SET_BUCKET_MANAGEMENT_POLICY: 'SET_BUCKET_MANAGEMENT_POLICY',
  ADD_TREASURER: 'ADD_TREASURER',
  REMOVE_TREASURER: 'REMOVE_TREASURER',
  CREATE_BUCKET: 'CREATE_BUCKET',
  UPDATE_BUCKET: 'UPDATE_BUCKET',
  DEACTIVATE_BUCKET: 'DEACTIVATE_BUCKET',
} as const

// Execution order (lower = earlier)
export const EFFECT_EXECUTION_ORDER: Record<string, number> = {
  [FINANCE_BUCKET_EFFECTS.SET_BUCKET_MANAGEMENT_POLICY]: 1,
  [FINANCE_BUCKET_EFFECTS.ADD_TREASURER]: 2,
  [FINANCE_BUCKET_EFFECTS.REMOVE_TREASURER]: 3,
  [FINANCE_BUCKET_EFFECTS.CREATE_BUCKET]: 4,
  [FINANCE_BUCKET_EFFECTS.UPDATE_BUCKET]: 5,
  [FINANCE_BUCKET_EFFECTS.DEACTIVATE_BUCKET]: 6,
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getBandFinanceSettings(bandId: string) {
  return prisma.bandFinanceSettings.findUnique({
    where: { bandId },
  })
}

async function ensureBandFinanceSettings(bandId: string) {
  return prisma.bandFinanceSettings.upsert({
    where: { bandId },
    create: { bandId },
    update: {},
  })
}

async function countTreasurers(bandId: string): Promise<number> {
  return prisma.member.count({
    where: {
      bandId,
      isTreasurer: true,
      status: 'ACTIVE',
    },
  })
}

async function countOperatingBuckets(bandId: string): Promise<number> {
  return prisma.bucket.count({
    where: {
      bandId,
      type: 'OPERATING',
      isActive: true,
    },
  })
}

// ============================================
// EFFECT HANDLERS
// ============================================

/**
 * SET_BUCKET_MANAGEMENT_POLICY
 * Sets how bucket management is controlled (treasurers only vs officers)
 */
const setBucketManagementPolicyHandler: EffectHandler = {
  type: FINANCE_BUCKET_EFFECTS.SET_BUCKET_MANAGEMENT_POLICY,

  async validate(payload, context) {
    const errors: string[] = []
    const { value } = payload as { value?: string }

    if (!value) {
      errors.push('SET_BUCKET_MANAGEMENT_POLICY: value is required')
      return errors
    }

    if (value !== 'TREASURER_ONLY' && value !== 'OFFICER_TIER') {
      errors.push(`SET_BUCKET_MANAGEMENT_POLICY: value must be "TREASURER_ONLY" or "OFFICER_TIER", got "${value}"`)
    }

    return errors
  },

  async execute(payload, context) {
    const { value } = payload as { value: 'TREASURER_ONLY' | 'OFFICER_TIER' }

    await prisma.bandFinanceSettings.upsert({
      where: { bandId: context.bandId },
      create: {
        bandId: context.bandId,
        bucketManagementPolicy: value,
      },
      update: {
        bucketManagementPolicy: value,
      },
    })
  },
}

/**
 * ADD_TREASURER
 * Assigns treasurer role to a band member
 */
const addTreasurerHandler: EffectHandler = {
  type: FINANCE_BUCKET_EFFECTS.ADD_TREASURER,

  async validate(payload, context) {
    const errors: string[] = []
    const { userId } = payload as { userId?: string }

    if (!userId) {
      errors.push('ADD_TREASURER: userId is required')
      return errors
    }

    // Check if user is a band member
    const member = await prisma.member.findUnique({
      where: {
        userId_bandId: {
          userId,
          bandId: context.bandId,
        },
      },
    })

    if (!member) {
      errors.push(`ADD_TREASURER: User ${userId} is not a member of this band`)
      return errors
    }

    if (member.status !== 'ACTIVE') {
      errors.push(`ADD_TREASURER: User ${userId} is not an active member`)
      return errors
    }

    if (member.isTreasurer) {
      errors.push(`ADD_TREASURER: User ${userId} is already a treasurer`)
    }

    return errors
  },

  async execute(payload, context) {
    const { userId } = payload as { userId: string }

    await prisma.member.update({
      where: {
        userId_bandId: {
          userId,
          bandId: context.bandId,
        },
      },
      data: {
        isTreasurer: true,
      },
    })
  },
}

/**
 * REMOVE_TREASURER
 * Removes treasurer role from a band member
 */
const removeTreasurerHandler: EffectHandler = {
  type: FINANCE_BUCKET_EFFECTS.REMOVE_TREASURER,

  async validate(payload, context) {
    const errors: string[] = []
    const { userId } = payload as { userId?: string }

    if (!userId) {
      errors.push('REMOVE_TREASURER: userId is required')
      return errors
    }

    // Check if user is a treasurer
    const member = await prisma.member.findUnique({
      where: {
        userId_bandId: {
          userId,
          bandId: context.bandId,
        },
      },
    })

    if (!member) {
      errors.push(`REMOVE_TREASURER: User ${userId} is not a member of this band`)
      return errors
    }

    if (!member.isTreasurer) {
      errors.push(`REMOVE_TREASURER: User ${userId} is not a treasurer`)
      return errors
    }

    // Check if this is the last treasurer and policy is TREASURER_ONLY
    const settings = await getBandFinanceSettings(context.bandId)
    if (settings?.bucketManagementPolicy === 'TREASURER_ONLY') {
      const treasurerCount = await countTreasurers(context.bandId)
      if (treasurerCount <= 1) {
        errors.push('REMOVE_TREASURER: Cannot remove the last treasurer when policy is TREASURER_ONLY')
      }
    }

    return errors
  },

  async execute(payload, context) {
    const { userId } = payload as { userId: string }

    await prisma.member.update({
      where: {
        userId_bandId: {
          userId,
          bandId: context.bandId,
        },
      },
      data: {
        isTreasurer: false,
      },
    })
  },
}

/**
 * CREATE_BUCKET
 * Creates a new finance bucket for the band
 */
const createBucketHandler: EffectHandler = {
  type: FINANCE_BUCKET_EFFECTS.CREATE_BUCKET,

  async validate(payload, context) {
    const errors: string[] = []
    const { bucket } = payload as {
      bucket?: {
        name?: string
        type?: string
        visibility?: string
      }
    }

    if (!bucket) {
      errors.push('CREATE_BUCKET: bucket object is required')
      return errors
    }

    const { name, type, visibility } = bucket

    // Validate name
    if (!name) {
      errors.push('CREATE_BUCKET: bucket.name is required')
    } else if (name.length > 64) {
      errors.push('CREATE_BUCKET: bucket.name must be 64 characters or less')
    } else {
      // Check uniqueness
      const existing = await prisma.bucket.findUnique({
        where: {
          bandId_name: {
            bandId: context.bandId,
            name,
          },
        },
      })
      if (existing) {
        errors.push(`CREATE_BUCKET: A bucket named "${name}" already exists in this band`)
      }
    }

    // Validate type
    const validTypes = ['OPERATING', 'PROJECT', 'RESTRICTED', 'UNRESTRICTED', 'COMMITMENT']
    if (!type) {
      errors.push('CREATE_BUCKET: bucket.type is required')
    } else if (!validTypes.includes(type)) {
      errors.push(`CREATE_BUCKET: bucket.type must be one of: ${validTypes.join(', ')}`)
    } else if (type === 'OPERATING') {
      // Check if an OPERATING bucket already exists
      const operatingCount = await countOperatingBuckets(context.bandId)
      if (operatingCount > 0) {
        errors.push('CREATE_BUCKET: Only one OPERATING bucket is allowed per band')
      }
    }

    // Validate visibility
    const validVisibilities = ['OFFICERS_ONLY', 'MEMBERS']
    if (!visibility) {
      errors.push('CREATE_BUCKET: bucket.visibility is required')
    } else if (!validVisibilities.includes(visibility)) {
      errors.push(`CREATE_BUCKET: bucket.visibility must be one of: ${validVisibilities.join(', ')}`)
    }

    return errors
  },

  async execute(payload, context) {
    const { bucket } = payload as {
      bucket: {
        name: string
        type: 'OPERATING' | 'PROJECT' | 'RESTRICTED' | 'UNRESTRICTED' | 'COMMITMENT'
        visibility: 'OFFICERS_ONLY' | 'MEMBERS'
      }
    }

    await prisma.bucket.create({
      data: {
        bandId: context.bandId,
        name: bucket.name,
        type: bucket.type,
        visibility: bucket.visibility,
        createdByProposalId: context.proposalId,
      },
    })
  },
}

/**
 * UPDATE_BUCKET
 * Updates an existing bucket's properties (name, visibility, isActive)
 * Note: type is immutable
 */
const updateBucketHandler: EffectHandler = {
  type: FINANCE_BUCKET_EFFECTS.UPDATE_BUCKET,

  async validate(payload, context) {
    const errors: string[] = []
    const { bucketId, fields } = payload as {
      bucketId?: string
      fields?: {
        name?: string
        visibility?: string
        isActive?: boolean
      }
    }

    if (!bucketId) {
      errors.push('UPDATE_BUCKET: bucketId is required')
      return errors
    }

    if (!fields || Object.keys(fields).length === 0) {
      errors.push('UPDATE_BUCKET: fields object with at least one field is required')
      return errors
    }

    // Check bucket exists and belongs to band
    const bucket = await prisma.bucket.findUnique({
      where: { id: bucketId },
    })

    if (!bucket) {
      errors.push(`UPDATE_BUCKET: Bucket ${bucketId} not found`)
      return errors
    }

    if (bucket.bandId !== context.bandId) {
      errors.push(`UPDATE_BUCKET: Bucket ${bucketId} does not belong to this band`)
      return errors
    }

    // Validate allowed fields only
    const allowedFields = ['name', 'visibility', 'isActive']
    for (const key of Object.keys(fields)) {
      if (!allowedFields.includes(key)) {
        errors.push(`UPDATE_BUCKET: Field "${key}" is not allowed. Allowed fields: ${allowedFields.join(', ')}`)
      }
    }

    // Validate name if provided
    if (fields.name !== undefined) {
      if (fields.name.length > 64) {
        errors.push('UPDATE_BUCKET: name must be 64 characters or less')
      } else if (fields.name !== bucket.name) {
        // Check uniqueness
        const existing = await prisma.bucket.findUnique({
          where: {
            bandId_name: {
              bandId: context.bandId,
              name: fields.name,
            },
          },
        })
        if (existing) {
          errors.push(`UPDATE_BUCKET: A bucket named "${fields.name}" already exists in this band`)
        }
      }
    }

    // Validate visibility if provided
    if (fields.visibility !== undefined) {
      const validVisibilities = ['OFFICERS_ONLY', 'MEMBERS']
      if (!validVisibilities.includes(fields.visibility)) {
        errors.push(`UPDATE_BUCKET: visibility must be one of: ${validVisibilities.join(', ')}`)
      }
    }

    // Validate isActive if provided
    if (fields.isActive !== undefined && typeof fields.isActive !== 'boolean') {
      errors.push('UPDATE_BUCKET: isActive must be a boolean')
    }

    return errors
  },

  async execute(payload, context) {
    const { bucketId, fields } = payload as {
      bucketId: string
      fields: {
        name?: string
        visibility?: 'OFFICERS_ONLY' | 'MEMBERS'
        isActive?: boolean
      }
    }

    await prisma.bucket.update({
      where: { id: bucketId },
      data: fields,
    })
  },
}

/**
 * DEACTIVATE_BUCKET
 * Deactivates a bucket (sets isActive = false)
 */
const deactivateBucketHandler: EffectHandler = {
  type: FINANCE_BUCKET_EFFECTS.DEACTIVATE_BUCKET,

  async validate(payload, context) {
    const errors: string[] = []
    const { bucketId } = payload as { bucketId?: string }

    if (!bucketId) {
      errors.push('DEACTIVATE_BUCKET: bucketId is required')
      return errors
    }

    // Check bucket exists and belongs to band
    const bucket = await prisma.bucket.findUnique({
      where: { id: bucketId },
    })

    if (!bucket) {
      errors.push(`DEACTIVATE_BUCKET: Bucket ${bucketId} not found`)
      return errors
    }

    if (bucket.bandId !== context.bandId) {
      errors.push(`DEACTIVATE_BUCKET: Bucket ${bucketId} does not belong to this band`)
      return errors
    }

    if (!bucket.isActive) {
      errors.push(`DEACTIVATE_BUCKET: Bucket ${bucketId} is already inactive`)
      return errors
    }

    // Cannot deactivate the only OPERATING bucket
    if (bucket.type === 'OPERATING') {
      const operatingCount = await countOperatingBuckets(context.bandId)
      if (operatingCount <= 1) {
        errors.push('DEACTIVATE_BUCKET: Cannot deactivate the only OPERATING bucket')
      }
    }

    return errors
  },

  async execute(payload, context) {
    const { bucketId } = payload as { bucketId: string }

    await prisma.bucket.update({
      where: { id: bucketId },
      data: { isActive: false },
    })
  },
}

// ============================================
// REGISTRATION
// ============================================

/**
 * Register all finance bucket governance effect handlers
 */
export function registerFinanceBucketGovernanceEffects(): void {
  // Register handlers
  registerEffectHandler(setBucketManagementPolicyHandler)
  registerEffectHandler(addTreasurerHandler)
  registerEffectHandler(removeTreasurerHandler)
  registerEffectHandler(createBucketHandler)
  registerEffectHandler(updateBucketHandler)
  registerEffectHandler(deactivateBucketHandler)

  // Register subtype with allowed effects
  registerSubtypeEffects('FINANCE_BUCKET_GOVERNANCE_V1', [
    FINANCE_BUCKET_EFFECTS.SET_BUCKET_MANAGEMENT_POLICY,
    FINANCE_BUCKET_EFFECTS.ADD_TREASURER,
    FINANCE_BUCKET_EFFECTS.REMOVE_TREASURER,
    FINANCE_BUCKET_EFFECTS.CREATE_BUCKET,
    FINANCE_BUCKET_EFFECTS.UPDATE_BUCKET,
    FINANCE_BUCKET_EFFECTS.DEACTIVATE_BUCKET,
  ])

  console.log('Registered FINANCE_BUCKET_GOVERNANCE_V1 effect handlers')
}

// ============================================
// AUTHORIZATION
// ============================================

/**
 * Roles that can create FINANCE_BUCKET_GOVERNANCE_V1 proposals
 */
export const FINANCE_BUCKET_GOVERNANCE_ALLOWED_ROLES = [
  'CONDUCTOR',
  'MODERATOR',
  'GOVERNOR',
  'FOUNDER',
] as const

/**
 * Check if a member role can create finance bucket governance proposals
 */
export function canCreateFinanceBucketGovernanceProposal(role: string): boolean {
  return FINANCE_BUCKET_GOVERNANCE_ALLOWED_ROLES.includes(role as any)
}
