/**
 * Fix script to recreate default channels for a band
 *
 * Usage:
 *   cd apps/api
 *   npx tsx scripts/fix-band-channels.ts <band-slug> <founder-user-id>
 *
 * Example:
 *   npx tsx scripts/fix-band-channels.ts band-it-development cmxxxxxx
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixChannels(bandSlug: string, founderUserId: string) {
  console.log('\n========================================')
  console.log(`FIXING CHANNELS FOR: ${bandSlug}`)
  console.log('========================================\n')

  // 1. Find the band
  const band = await prisma.band.findUnique({
    where: { slug: bandSlug },
  })

  if (!band) {
    console.log('❌ BAND NOT FOUND')
    return
  }

  console.log(`✅ Found band: ${band.name} (${band.id})`)

  // 2. Verify the founder user exists
  const founder = await prisma.user.findUnique({
    where: { id: founderUserId },
    select: { id: true, name: true, email: true },
  })

  if (!founder) {
    console.log('❌ FOUNDER USER NOT FOUND')
    console.log('   Please provide a valid user ID')
    return
  }

  console.log(`✅ Found founder: ${founder.name} (${founder.email})`)

  // 3. Check existing channels
  const existingChannels = await prisma.channel.findMany({
    where: { bandId: band.id },
  })

  console.log(`\n📋 Existing channels: ${existingChannels.length}`)

  // 4. Create default channels if they don't exist
  const defaultChannels = [
    {
      name: 'general',
      slug: 'general',
      description: 'General discussion for the band',
      visibility: 'PUBLIC' as const,
      isDefault: true,
    },
    {
      name: 'announcements',
      slug: 'announcements',
      description: 'Important announcements from leadership',
      visibility: 'PUBLIC' as const,
      isDefault: false,
    },
    {
      name: 'random',
      slug: 'random',
      description: 'Off-topic conversations and fun',
      visibility: 'PUBLIC' as const,
      isDefault: false,
    },
  ]

  for (const channelDef of defaultChannels) {
    const exists = existingChannels.find(
      c => c.name.toLowerCase() === channelDef.name.toLowerCase()
    )

    if (exists) {
      console.log(`   ⏭️  #${channelDef.name} already exists`)
      continue
    }

    const channel = await prisma.channel.create({
      data: {
        bandId: band.id,
        name: channelDef.name,
        slug: channelDef.slug,
        description: channelDef.description,
        visibility: channelDef.visibility,
        isDefault: channelDef.isDefault,
        createdById: founderUserId,
      },
    })

    console.log(`   ✅ Created #${channel.name}${channel.isDefault ? ' [DEFAULT]' : ''}`)
  }

  // 5. Ensure there's exactly one default channel
  const channelsAfter = await prisma.channel.findMany({
    where: { bandId: band.id },
  })

  const defaultChannelsAfter = channelsAfter.filter(c => c.isDefault)

  if (defaultChannelsAfter.length === 0) {
    // Make general the default
    const generalChannel = channelsAfter.find(c => c.name.toLowerCase() === 'general')
    if (generalChannel) {
      await prisma.channel.update({
        where: { id: generalChannel.id },
        data: { isDefault: true },
      })
      console.log(`   ✅ Set #general as default channel`)
    }
  } else if (defaultChannelsAfter.length > 1) {
    // Keep only one default
    console.log(`   ⚠️  Multiple default channels found, keeping first one`)
    for (let i = 1; i < defaultChannelsAfter.length; i++) {
      await prisma.channel.update({
        where: { id: defaultChannelsAfter[i].id },
        data: { isDefault: false },
      })
    }
  }

  console.log('\n========================================')
  console.log('DONE!')
  console.log('========================================')
  console.log('\nChannels now available:')

  const finalChannels = await prisma.channel.findMany({
    where: { bandId: band.id },
    orderBy: { createdAt: 'asc' },
  })

  finalChannels.forEach(c => {
    console.log(`   #${c.name}${c.isDefault ? ' [DEFAULT]' : ''}`)
  })

  console.log('\n✅ Users should now be able to access discussions!')
  console.log('\n')
}

async function findUserByEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true },
  })
  return user
}

async function main() {
  const slug = process.argv[2]
  let userIdOrEmail = process.argv[3]

  if (!slug || !userIdOrEmail) {
    console.log('Usage: npx tsx scripts/fix-band-channels.ts <band-slug> <user-id-or-email>')
    console.log('')
    console.log('Examples:')
    console.log('  npx tsx scripts/fix-band-channels.ts band-it-development bardia@ebardia.com')
    console.log('  npx tsx scripts/fix-band-channels.ts band-it-development cmxxxxxx')
    process.exit(1)
  }

  // Check if it's an email
  let userId = userIdOrEmail
  if (userIdOrEmail.includes('@')) {
    console.log(`Looking up user by email: ${userIdOrEmail}`)
    const user = await findUserByEmail(userIdOrEmail)
    if (!user) {
      console.log('❌ User not found with that email')
      process.exit(1)
    }
    console.log(`✅ Found user: ${user.name} (${user.id})`)
    userId = user.id
  }

  await fixChannels(slug, userId)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
