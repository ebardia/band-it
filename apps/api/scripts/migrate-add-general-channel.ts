/**
 * Migration script: Add General channel to all existing bands
 *
 * This script creates the default "General" channel for any band
 * that doesn't already have one.
 *
 * Usage: npx ts-node scripts/migrate-add-general-channel.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateAddGeneralChannel() {
  console.log('Starting migration: Add General channel to existing bands...')

  // Get all bands
  const bands = await prisma.band.findMany({
    include: {
      channels: {
        where: { slug: 'general' },
      },
      members: {
        where: { role: 'FOUNDER' },
        take: 1,
      },
    },
  })

  console.log(`Found ${bands.length} bands`)

  let created = 0
  let skipped = 0
  let errors = 0

  for (const band of bands) {
    // Skip if General channel already exists
    if (band.channels.length > 0) {
      console.log(`Skipping band "${band.name}" - General channel already exists`)
      skipped++
      continue
    }

    // Get the founder to set as channel creator
    const founder = band.members[0]
    if (!founder) {
      console.error(`Error: Band "${band.name}" has no founder`)
      errors++
      continue
    }

    try {
      await prisma.channel.create({
        data: {
          bandId: band.id,
          name: 'General',
          slug: 'general',
          description: 'General discussion for all band members',
          visibility: 'PUBLIC',
          isDefault: true,
          createdById: founder.userId,
        },
      })
      console.log(`Created General channel for band "${band.name}"`)
      created++
    } catch (error) {
      console.error(`Error creating General channel for band "${band.name}":`, error)
      errors++
    }
  }

  console.log('\nMigration complete!')
  console.log(`Created: ${created}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Errors: ${errors}`)
}

migrateAddGeneralChannel()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
