import { PrismaClient, ProfileTaxonomyKind } from '@prisma/client'
import { PROFILE_TAXONOMY_SEED } from '../data/profile-taxonomy.seed'
import { US_LOCATIONS_SEED } from '../data/us-locations.seed'
import { prisma } from '../lib/prisma'

let seedPromise: Promise<void> | null = null

async function seedTaxonomy(client: PrismaClient) {
  for (const kind of Object.keys(PROFILE_TAXONOMY_SEED) as ProfileTaxonomyKind[]) {
    const categories = PROFILE_TAXONOMY_SEED[kind]
    for (let ci = 0; ci < categories.length; ci++) {
      const cat = categories[ci]
      const category = await client.profileTaxonomyCategory.upsert({
        where: { kind_slug: { kind, slug: cat.slug } },
        create: { kind, slug: cat.slug, label: cat.label, sortOrder: ci },
        update: { label: cat.label, sortOrder: ci },
      })
      for (let ii = 0; ii < cat.items.length; ii++) {
        const item = cat.items[ii]
        await client.profileTaxonomyItem.upsert({
          where: { categoryId_slug: { categoryId: category.id, slug: item.slug } },
          create: {
            categoryId: category.id,
            slug: item.slug,
            label: item.label,
            sortOrder: ii,
          },
          update: { label: item.label, sortOrder: ii },
        })
      }
    }
  }
}

async function seedLocations(client: PrismaClient) {
  for (const entry of US_LOCATIONS_SEED) {
    await client.usLocation.upsert({
      where: {
        city_state_zip: { city: entry.city, state: entry.state, zip: entry.zip },
      },
      create: entry,
      update: { label: entry.label },
    })
  }
}

async function runSeed() {
  const [taxonomyCount, locationCount] = await Promise.all([
    prisma.profileTaxonomyCategory.count(),
    prisma.usLocation.count(),
  ])
  if (taxonomyCount === 0) await seedTaxonomy(prisma)
  if (locationCount === 0) await seedLocations(prisma)
}

/** Idempotent seed for taxonomy + US locations when tables are empty. */
export function ensureProfileSeedData(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeed().catch((err) => {
      seedPromise = null
      throw err
    })
  }
  return seedPromise
}
