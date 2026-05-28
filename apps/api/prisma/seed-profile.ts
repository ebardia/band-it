import { PrismaClient, ProfileTaxonomyKind } from '@prisma/client'
import { PROFILE_TAXONOMY_SEED } from '../src/data/profile-taxonomy.seed'
import { US_LOCATIONS_SEED } from '../src/data/us-locations.seed'

const prisma = new PrismaClient()

async function seedTaxonomy() {
  for (const kind of Object.keys(PROFILE_TAXONOMY_SEED) as ProfileTaxonomyKind[]) {
    const categories = PROFILE_TAXONOMY_SEED[kind]
    for (let ci = 0; ci < categories.length; ci++) {
      const cat = categories[ci]
      const category = await prisma.profileTaxonomyCategory.upsert({
        where: { kind_slug: { kind, slug: cat.slug } },
        create: {
          kind,
          slug: cat.slug,
          label: cat.label,
          sortOrder: ci,
        },
        update: {
          label: cat.label,
          sortOrder: ci,
        },
      })

      for (let ii = 0; ii < cat.items.length; ii++) {
        const item = cat.items[ii]
        await prisma.profileTaxonomyItem.upsert({
          where: { categoryId_slug: { categoryId: category.id, slug: item.slug } },
          create: {
            categoryId: category.id,
            slug: item.slug,
            label: item.label,
            sortOrder: ii,
          },
          update: {
            label: item.label,
            sortOrder: ii,
          },
        })
      }
    }
  }
}

async function seedLocations() {
  for (const entry of US_LOCATIONS_SEED) {
    await prisma.usLocation.upsert({
      where: {
        city_state_zip: {
          city: entry.city,
          state: entry.state,
          zip: entry.zip,
        },
      },
      create: entry,
      update: { label: entry.label },
    })
  }
}

async function main() {
  console.log('Seeding profile taxonomy…')
  await seedTaxonomy()
  console.log('Seeding US locations…')
  await seedLocations()
  console.log('Profile seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
