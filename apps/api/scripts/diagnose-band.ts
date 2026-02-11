/**
 * Diagnostic script to check band data integrity
 *
 * Usage:
 *   cd apps/api
 *   npx tsx scripts/diagnose-band.ts <band-slug>
 *
 * Example:
 *   npx tsx scripts/diagnose-band.ts my-band-slug
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function diagnose(bandSlug: string) {
  console.log('\n========================================')
  console.log(`DIAGNOSING BAND: ${bandSlug}`)
  console.log('========================================\n')

  // 1. Find the band
  const band = await prisma.band.findUnique({
    where: { slug: bandSlug },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  })

  if (!band) {
    console.log('❌ BAND NOT FOUND')
    return
  }

  console.log('✅ BAND FOUND')
  console.log(`   ID: ${band.id}`)
  console.log(`   Name: ${band.name}`)
  console.log(`   Status: ${band.status}`)
  console.log(`   Created By: ${band.createdBy?.name || 'DELETED USER'} (${band.createdBy?.email || 'N/A'})`)
  console.log(`   Created At: ${band.createdAt}`)

  // 2. Check members
  const members = await prisma.member.findMany({
    where: { bandId: band.id },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { role: 'asc' },
  })

  console.log(`\n📋 MEMBERS (${members.length}):`)
  members.forEach(m => {
    console.log(`   - ${m.user.name} (${m.user.email}) - ${m.role} - ${m.status}`)
  })

  // 3. Check channels
  const channels = await prisma.channel.findMany({
    where: { bandId: band.id },
    include: { createdBy: { select: { id: true, name: true } } },
  })

  console.log(`\n💬 CHANNELS (${channels.length}):`)
  if (channels.length === 0) {
    console.log('   ⚠️  NO CHANNELS FOUND - This is the problem!')
  } else {
    channels.forEach(c => {
      const defaultMark = c.isDefault ? ' [DEFAULT]' : ''
      const archivedMark = c.isArchived ? ' [ARCHIVED]' : ''
      console.log(`   - #${c.name}${defaultMark}${archivedMark} (created by: ${c.createdBy?.name || 'DELETED'})`)
    })
  }

  // Check if there's a default channel
  const defaultChannel = channels.find(c => c.isDefault)
  if (!defaultChannel) {
    console.log('   ⚠️  NO DEFAULT CHANNEL - Need to create #general')
  }

  // 4. Check proposals
  const proposals = await prisma.proposal.findMany({
    where: { bandId: band.id },
    select: { id: true, title: true, status: true, createdById: true },
  })

  console.log(`\n📝 PROPOSALS (${proposals.length}):`)
  if (proposals.length === 0) {
    console.log('   ⚠️  NO PROPOSALS FOUND')
  } else {
    proposals.slice(0, 10).forEach(p => {
      console.log(`   - ${p.title} (${p.status})`)
    })
    if (proposals.length > 10) {
      console.log(`   ... and ${proposals.length - 10} more`)
    }
  }

  // 5. Check projects
  const projects = await prisma.project.findMany({
    where: { bandId: band.id },
    select: { id: true, name: true, status: true, createdById: true },
  })

  console.log(`\n📁 PROJECTS (${projects.length}):`)
  if (projects.length === 0) {
    console.log('   ⚠️  NO PROJECTS FOUND')
  } else {
    projects.slice(0, 10).forEach(p => {
      console.log(`   - ${p.name} (${p.status})`)
    })
    if (projects.length > 10) {
      console.log(`   ... and ${projects.length - 10} more`)
    }
  }

  // 6. Check tasks
  const tasks = await prisma.task.findMany({
    where: { bandId: band.id },
    select: { id: true, name: true, status: true },
  })

  console.log(`\n✅ TASKS (${tasks.length}):`)
  if (tasks.length === 0) {
    console.log('   ⚠️  NO TASKS FOUND')
  } else {
    console.log(`   Found ${tasks.length} tasks`)
  }

  // 7. Check messages
  const messageCount = await prisma.message.count({
    where: { channel: { bandId: band.id } },
  })

  console.log(`\n💬 MESSAGES: ${messageCount}`)
  if (messageCount === 0) {
    console.log('   ⚠️  NO MESSAGES (expected if no channels)')
  }

  // 8. Check post categories
  const postCategories = await prisma.postCategory.findMany({
    where: { bandId: band.id },
  })

  console.log(`\n📰 POST CATEGORIES (${postCategories.length}):`)
  if (postCategories.length === 0) {
    console.log('   (none)')
  } else {
    postCategories.forEach(pc => {
      console.log(`   - ${pc.name}`)
    })
  }

  // Summary
  console.log('\n========================================')
  console.log('SUMMARY')
  console.log('========================================')

  const issues: string[] = []
  if (channels.length === 0) issues.push('No channels - discussions will not work')
  if (!defaultChannel) issues.push('No default channel')
  if (proposals.length === 0) issues.push('No proposals')
  if (projects.length === 0) issues.push('No projects')

  if (issues.length === 0) {
    console.log('✅ No obvious issues found')
  } else {
    console.log('⚠️  ISSUES FOUND:')
    issues.forEach(i => console.log(`   - ${i}`))
  }

  console.log('\n')
}

// Run
const slug = process.argv[2]
if (!slug) {
  console.log('Usage: npx tsx scripts/diagnose-band.ts <band-slug>')
  process.exit(1)
}

diagnose(slug)
  .catch(console.error)
  .finally(() => prisma.$disconnect())
