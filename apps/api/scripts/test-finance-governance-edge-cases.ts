/**
 * Edge case tests for FINANCE_BUCKET_GOVERNANCE_V1 proposals
 *
 * Run with: npx ts-node scripts/test-finance-governance-edge-cases.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Initialize effect handlers
import { initializeEffectHandlers } from '../src/services/effects'
import { proposalEffectsService } from '../src/services/proposal-effects.service'
import { canCreateFinanceBucketGovernanceProposal } from '../src/services/effects/finance-bucket-governance.effects'

async function main() {
  console.log('🧪 Testing Finance Bucket Governance Edge Cases...\n')

  initializeEffectHandlers()

  // Find the band we used in the previous test
  const band = await prisma.band.findFirst({
    where: { status: 'ACTIVE' },
    include: {
      members: {
        where: { status: 'ACTIVE' },
        include: { user: true }
      },
      buckets: true,
      financeSettings: true
    }
  })

  if (!band) {
    console.log('❌ No active band found.')
    return
  }

  console.log(`📋 Using band: ${band.name}`)
  console.log(`   Current buckets: ${band.buckets.map(b => b.name).join(', ') || 'none'}`)
  console.log(`   Current policy: ${band.financeSettings?.bucketManagementPolicy || 'not set'}`)

  const founder = band.members.find(m => m.role === 'FOUNDER')
  const votingMember = band.members.find(m => m.role === 'VOTING_MEMBER')
  const treasurer = band.members.find(m => m.isTreasurer)

  console.log(`   Founder: ${founder?.user.name || 'none'}`)
  console.log(`   Voting Member: ${votingMember?.user.name || 'none'}`)
  console.log(`   Treasurer: ${treasurer?.user.name || 'none'}`)

  let passed = 0
  let failed = 0

  // ============================================
  // TEST 1: Invalid effects (missing required field)
  // ============================================
  console.log('\n' + '='.repeat(50))
  console.log('TEST 1: Invalid effects (missing required field)')
  console.log('='.repeat(50))

  try {
    const invalidEffects = [
      {
        type: 'CREATE_BUCKET',
        payload: {
          bucket: {
            name: 'Test Bucket',
            // Missing 'type' and 'visibility'
          }
        }
      }
    ]

    const result = await proposalEffectsService.validateEffects(
      invalidEffects,
      'GOVERNANCE',
      'FINANCE_BUCKET_GOVERNANCE_V1',
      { bandId: band.id }
    )

    if (!result.valid && result.errors.length > 0) {
      console.log('✅ PASSED: Validation correctly rejected invalid effects')
      console.log(`   Errors: ${result.errors.join('; ')}`)
      passed++
    } else {
      console.log('❌ FAILED: Should have rejected invalid effects')
      failed++
    }
  } catch (e: any) {
    console.log('❌ FAILED with exception:', e.message)
    failed++
  }

  // ============================================
  // TEST 2: Unknown effect type
  // ============================================
  console.log('\n' + '='.repeat(50))
  console.log('TEST 2: Unknown effect type')
  console.log('='.repeat(50))

  try {
    const unknownEffects = [
      {
        type: 'TRANSFER_MONEY', // This doesn't exist
        payload: { amount: 1000 }
      }
    ]

    const result = await proposalEffectsService.validateEffects(
      unknownEffects,
      'GOVERNANCE',
      'FINANCE_BUCKET_GOVERNANCE_V1',
      { bandId: band.id }
    )

    if (!result.valid && result.errors.some(e => e.includes('Unknown effect type'))) {
      console.log('✅ PASSED: Validation correctly rejected unknown effect type')
      console.log(`   Errors: ${result.errors.join('; ')}`)
      passed++
    } else {
      console.log('❌ FAILED: Should have rejected unknown effect type')
      console.log(`   Result: valid=${result.valid}, errors=${result.errors.join('; ')}`)
      failed++
    }
  } catch (e: any) {
    console.log('❌ FAILED with exception:', e.message)
    failed++
  }

  // ============================================
  // TEST 3: Duplicate OPERATING bucket
  // ============================================
  console.log('\n' + '='.repeat(50))
  console.log('TEST 3: Duplicate OPERATING bucket (should be blocked)')
  console.log('='.repeat(50))

  try {
    const duplicateOperatingEffects = [
      {
        type: 'CREATE_BUCKET',
        payload: {
          bucket: {
            name: 'Second Operating Fund',
            type: 'OPERATING', // Already have one!
            visibility: 'MEMBERS'
          }
        }
      }
    ]

    const result = await proposalEffectsService.validateEffects(
      duplicateOperatingEffects,
      'GOVERNANCE',
      'FINANCE_BUCKET_GOVERNANCE_V1',
      { bandId: band.id }
    )

    if (!result.valid && result.errors.some(e => e.includes('Only one OPERATING bucket'))) {
      console.log('✅ PASSED: Validation correctly blocked duplicate OPERATING bucket')
      console.log(`   Errors: ${result.errors.join('; ')}`)
      passed++
    } else {
      console.log('❌ FAILED: Should have blocked duplicate OPERATING bucket')
      console.log(`   Result: valid=${result.valid}, errors=${result.errors.join('; ')}`)
      failed++
    }
  } catch (e: any) {
    console.log('❌ FAILED with exception:', e.message)
    failed++
  }

  // ============================================
  // TEST 4: Duplicate bucket name
  // ============================================
  console.log('\n' + '='.repeat(50))
  console.log('TEST 4: Duplicate bucket name (should be blocked)')
  console.log('='.repeat(50))

  try {
    const existingBucket = band.buckets[0]
    if (!existingBucket) {
      console.log('⚠️  SKIPPED: No existing bucket to test duplicate name')
    } else {
      const duplicateNameEffects = [
        {
          type: 'CREATE_BUCKET',
          payload: {
            bucket: {
              name: existingBucket.name, // Duplicate name!
              type: 'PROJECT',
              visibility: 'MEMBERS'
            }
          }
        }
      ]

      const result = await proposalEffectsService.validateEffects(
        duplicateNameEffects,
        'GOVERNANCE',
        'FINANCE_BUCKET_GOVERNANCE_V1',
        { bandId: band.id }
      )

      if (!result.valid && result.errors.some(e => e.includes('already exists'))) {
        console.log('✅ PASSED: Validation correctly blocked duplicate bucket name')
        console.log(`   Errors: ${result.errors.join('; ')}`)
        passed++
      } else {
        console.log('❌ FAILED: Should have blocked duplicate bucket name')
        console.log(`   Result: valid=${result.valid}, errors=${result.errors.join('; ')}`)
        failed++
      }
    }
  } catch (e: any) {
    console.log('❌ FAILED with exception:', e.message)
    failed++
  }

  // ============================================
  // TEST 5: Remove last treasurer (TREASURER_ONLY policy)
  // ============================================
  console.log('\n' + '='.repeat(50))
  console.log('TEST 5: Remove last treasurer with TREASURER_ONLY policy')
  console.log('='.repeat(50))

  try {
    if (!treasurer) {
      console.log('⚠️  SKIPPED: No treasurer to test removal')
    } else {
      // Make sure we're on TREASURER_ONLY policy
      await prisma.bandFinanceSettings.upsert({
        where: { bandId: band.id },
        create: { bandId: band.id, bucketManagementPolicy: 'TREASURER_ONLY' },
        update: { bucketManagementPolicy: 'TREASURER_ONLY' }
      })

      // Count current treasurers
      const treasurerCount = await prisma.member.count({
        where: { bandId: band.id, isTreasurer: true, status: 'ACTIVE' }
      })

      console.log(`   Current treasurer count: ${treasurerCount}`)

      if (treasurerCount === 1) {
        const removeLastTreasurerEffects = [
          {
            type: 'REMOVE_TREASURER',
            payload: { userId: treasurer.userId }
          }
        ]

        const result = await proposalEffectsService.validateEffects(
          removeLastTreasurerEffects,
          'GOVERNANCE',
          'FINANCE_BUCKET_GOVERNANCE_V1',
          { bandId: band.id }
        )

        if (!result.valid && result.errors.some(e => e.includes('Cannot remove the last treasurer'))) {
          console.log('✅ PASSED: Validation correctly blocked removing last treasurer')
          console.log(`   Errors: ${result.errors.join('; ')}`)
          passed++
        } else {
          console.log('❌ FAILED: Should have blocked removing last treasurer')
          console.log(`   Result: valid=${result.valid}, errors=${result.errors.join('; ')}`)
          failed++
        }
      } else {
        console.log('⚠️  SKIPPED: More than one treasurer exists')
      }
    }
  } catch (e: any) {
    console.log('❌ FAILED with exception:', e.message)
    failed++
  }

  // ============================================
  // TEST 6: VOTING_MEMBER cannot create finance governance proposal
  // ============================================
  console.log('\n' + '='.repeat(50))
  console.log('TEST 6: VOTING_MEMBER authorization check')
  console.log('='.repeat(50))

  try {
    const canVotingMemberCreate = canCreateFinanceBucketGovernanceProposal('VOTING_MEMBER')
    const canFounderCreate = canCreateFinanceBucketGovernanceProposal('FOUNDER')
    const canConductorCreate = canCreateFinanceBucketGovernanceProposal('CONDUCTOR')
    const canObserverCreate = canCreateFinanceBucketGovernanceProposal('OBSERVER')

    console.log(`   VOTING_MEMBER can create: ${canVotingMemberCreate}`)
    console.log(`   OBSERVER can create: ${canObserverCreate}`)
    console.log(`   FOUNDER can create: ${canFounderCreate}`)
    console.log(`   CONDUCTOR can create: ${canConductorCreate}`)

    if (!canVotingMemberCreate && !canObserverCreate && canFounderCreate && canConductorCreate) {
      console.log('✅ PASSED: Authorization correctly restricts who can create finance proposals')
      passed++
    } else {
      console.log('❌ FAILED: Authorization check is incorrect')
      failed++
    }
  } catch (e: any) {
    console.log('❌ FAILED with exception:', e.message)
    failed++
  }

  // ============================================
  // TEST 7: Deactivate only OPERATING bucket
  // ============================================
  console.log('\n' + '='.repeat(50))
  console.log('TEST 7: Deactivate only OPERATING bucket (should be blocked)')
  console.log('='.repeat(50))

  try {
    const operatingBucket = band.buckets.find(b => b.type === 'OPERATING' && b.isActive)
    if (!operatingBucket) {
      console.log('⚠️  SKIPPED: No active OPERATING bucket to test')
    } else {
      const deactivateOnlyOperatingEffects = [
        {
          type: 'DEACTIVATE_BUCKET',
          payload: { bucketId: operatingBucket.id }
        }
      ]

      const result = await proposalEffectsService.validateEffects(
        deactivateOnlyOperatingEffects,
        'GOVERNANCE',
        'FINANCE_BUCKET_GOVERNANCE_V1',
        { bandId: band.id }
      )

      if (!result.valid && result.errors.some(e => e.includes('Cannot deactivate the only OPERATING bucket'))) {
        console.log('✅ PASSED: Validation correctly blocked deactivating only OPERATING bucket')
        console.log(`   Errors: ${result.errors.join('; ')}`)
        passed++
      } else {
        console.log('❌ FAILED: Should have blocked deactivating only OPERATING bucket')
        console.log(`   Result: valid=${result.valid}, errors=${result.errors.join('; ')}`)
        failed++
      }
    }
  } catch (e: any) {
    console.log('❌ FAILED with exception:', e.message)
    failed++
  }

  // ============================================
  // TEST 8: Add non-member as treasurer
  // ============================================
  console.log('\n' + '='.repeat(50))
  console.log('TEST 8: Add non-member as treasurer (should be blocked)')
  console.log('='.repeat(50))

  try {
    const addNonMemberEffects = [
      {
        type: 'ADD_TREASURER',
        payload: { userId: 'non-existent-user-id-12345' }
      }
    ]

    const result = await proposalEffectsService.validateEffects(
      addNonMemberEffects,
      'GOVERNANCE',
      'FINANCE_BUCKET_GOVERNANCE_V1',
      { bandId: band.id }
    )

    if (!result.valid && result.errors.some(e => e.includes('not a member'))) {
      console.log('✅ PASSED: Validation correctly blocked adding non-member as treasurer')
      console.log(`   Errors: ${result.errors.join('; ')}`)
      passed++
    } else {
      console.log('❌ FAILED: Should have blocked adding non-member as treasurer')
      console.log(`   Result: valid=${result.valid}, errors=${result.errors.join('; ')}`)
      failed++
    }
  } catch (e: any) {
    console.log('❌ FAILED with exception:', e.message)
    failed++
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n' + '='.repeat(50))
  console.log('SUMMARY')
  console.log('='.repeat(50))
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📊 Total: ${passed + failed}`)

  if (failed === 0) {
    console.log('\n🎉 All edge case tests passed!')
  } else {
    console.log('\n⚠️  Some tests failed. Please review.')
  }
}

main()
  .catch((e) => {
    console.error('Test failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
