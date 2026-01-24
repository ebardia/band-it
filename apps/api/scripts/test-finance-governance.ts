/**
 * Test script for FINANCE_BUCKET_GOVERNANCE_V1 proposals
 *
 * Run with: npx ts-node scripts/test-finance-governance.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧪 Testing Finance Bucket Governance...\n')

  // Find an active band with at least one FOUNDER or CONDUCTOR
  const band = await prisma.band.findFirst({
    where: { status: 'ACTIVE' },
    include: {
      members: {
        where: {
          status: 'ACTIVE',
          role: { in: ['FOUNDER', 'CONDUCTOR', 'GOVERNOR'] }
        },
        include: { user: true }
      }
    }
  })

  if (!band) {
    console.log('❌ No active band found. Please create a band first.')
    return
  }

  if (band.members.length === 0) {
    console.log('❌ No eligible members found (need FOUNDER, CONDUCTOR, or GOVERNOR).')
    return
  }

  const member = band.members[0]
  console.log(`📋 Using band: ${band.name} (${band.slug})`)
  console.log(`👤 Using member: ${member.user.name} (${member.role})`)

  // Calculate voting end date
  const votingEndsAt = new Date()
  votingEndsAt.setDate(votingEndsAt.getDate() + band.votingPeriodDays)

  // Create a FINANCE_BUCKET_GOVERNANCE_V1 proposal
  console.log('\n--- Creating Governance Proposal ---')

  const effects = [
    {
      type: 'SET_BUCKET_MANAGEMENT_POLICY',
      payload: { value: 'TREASURER_ONLY' }
    },
    {
      type: 'ADD_TREASURER',
      payload: { userId: member.userId }
    },
    {
      type: 'CREATE_BUCKET',
      payload: {
        bucket: {
          name: 'Operating Fund',
          type: 'OPERATING',
          visibility: 'MEMBERS'
        }
      }
    },
    {
      type: 'CREATE_BUCKET',
      payload: {
        bucket: {
          name: 'Project Reserve',
          type: 'PROJECT',
          visibility: 'OFFICERS_ONLY'
        }
      }
    }
  ]

  const proposal = await prisma.proposal.create({
    data: {
      bandId: band.id,
      createdById: member.userId,
      title: 'Initialize Band Finance Structure',
      description: 'This proposal sets up our initial finance structure with an operating fund, project reserve, and assigns our first treasurer.',
      type: 'POLICY',
      priority: 'HIGH',
      executionType: 'GOVERNANCE',
      executionSubtype: 'FINANCE_BUCKET_GOVERNANCE_V1',
      effects: effects,
      effectsValidatedAt: new Date(),
      votingEndsAt,
    }
  })

  console.log(`✅ Created proposal: ${proposal.id}`)
  console.log(`   Title: ${proposal.title}`)
  console.log(`   Execution Type: ${proposal.executionType}`)
  console.log(`   Subtype: ${proposal.executionSubtype}`)
  console.log(`   Effects: ${effects.length} effects`)

  // Vote YES on the proposal (from all active voting members)
  console.log('\n--- Voting on Proposal ---')

  const votingMembers = await prisma.member.findMany({
    where: {
      bandId: band.id,
      status: 'ACTIVE',
      role: { in: ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER'] }
    }
  })

  for (const voter of votingMembers) {
    await prisma.vote.create({
      data: {
        proposalId: proposal.id,
        userId: voter.userId,
        vote: 'YES',
        comment: 'Approving finance structure'
      }
    })
    console.log(`   ✓ ${voter.role} voted YES`)
  }

  // Close the proposal (this should trigger effect execution)
  console.log('\n--- Closing Proposal ---')

  // Import and initialize effect handlers
  const { initializeEffectHandlers } = await import('../src/services/effects')
  initializeEffectHandlers()

  // Import the execution service
  const { proposalEffectsService } = await import('../src/services/proposal-effects.service')

  // Manually execute what closeProposal does
  const votes = await prisma.vote.findMany({
    where: { proposalId: proposal.id }
  })

  const yesVotes = votes.filter(v => v.vote === 'YES').length
  const noVotes = votes.filter(v => v.vote === 'NO').length
  const totalVotes = yesVotes + noVotes
  const yesPercentage = totalVotes > 0 ? (yesVotes / totalVotes) * 100 : 0

  console.log(`   Votes: ${yesVotes} YES, ${noVotes} NO (${yesPercentage.toFixed(0)}% approval)`)

  const approved = yesPercentage > 50 // Simple majority

  if (approved) {
    console.log('   ✅ Proposal APPROVED!')

    // Update proposal status
    await prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        status: 'APPROVED',
        closedAt: new Date()
      }
    })

    // Execute effects
    console.log('\n--- Executing Effects ---')

    const result = await proposalEffectsService.executeAndLogEffects(
      {
        id: proposal.id,
        bandId: band.id,
        executionSubtype: proposal.executionSubtype,
        effects: proposal.effects
      },
      member.userId
    )

    if (result.success) {
      console.log(`   ✅ All ${result.effectsExecuted.length} effects executed successfully!`)
    } else {
      console.log(`   ❌ Execution failed: ${result.error}`)
    }
  } else {
    console.log('   ❌ Proposal REJECTED')
    await prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        status: 'REJECTED',
        closedAt: new Date()
      }
    })
  }

  // Verify results
  console.log('\n--- Verifying Results ---')

  // Check finance settings
  const settings = await prisma.bandFinanceSettings.findUnique({
    where: { bandId: band.id }
  })
  console.log(`   Finance Settings:`)
  console.log(`     - Policy: ${settings?.bucketManagementPolicy || 'NOT SET'}`)

  // Check treasurer
  const updatedMember = await prisma.member.findUnique({
    where: { userId_bandId: { userId: member.userId, bandId: band.id } }
  })
  console.log(`   Treasurer Status:`)
  console.log(`     - ${member.user.name}: isTreasurer=${updatedMember?.isTreasurer}`)

  // Check buckets
  const buckets = await prisma.bucket.findMany({
    where: { bandId: band.id }
  })
  console.log(`   Buckets Created: ${buckets.length}`)
  for (const bucket of buckets) {
    console.log(`     - ${bucket.name} (${bucket.type}, ${bucket.visibility})`)
  }

  // Check execution log
  const logs = await prisma.proposalExecutionLog.findMany({
    where: { proposalId: proposal.id }
  })
  console.log(`   Execution Logs: ${logs.length}`)
  for (const log of logs) {
    console.log(`     - Status: ${log.status}, Executed: ${(log.effectsExecuted as any[]).length} effects`)
  }

  console.log('\n✅ Test complete!')
}

main()
  .catch((e) => {
    console.error('Test failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
