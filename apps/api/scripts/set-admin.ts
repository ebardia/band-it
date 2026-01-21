/**
 * Script to set a user as admin
 *
 * Usage:
 *   npx ts-node scripts/set-admin.ts <email>
 *
 * Example:
 *   npx ts-node scripts/set-admin.ts hajbaj@yahoo.com
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function setAdmin(email: string) {
  const normalizedEmail = email.toLowerCase().trim()

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })

  if (!user) {
    console.error(`User with email "${email}" not found`)
    process.exit(1)
  }

  if (user.isAdmin) {
    console.log(`User "${user.name}" (${user.email}) is already an admin`)
    process.exit(0)
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { isAdmin: true },
    select: {
      id: true,
      name: true,
      email: true,
      isAdmin: true,
    },
  })

  console.log(`Successfully set user as admin:`)
  console.log(`  Name: ${updatedUser.name}`)
  console.log(`  Email: ${updatedUser.email}`)
  console.log(`  Admin: ${updatedUser.isAdmin}`)
}

const email = process.argv[2]

if (!email) {
  console.error('Usage: npx ts-node scripts/set-admin.ts <email>')
  process.exit(1)
}

setAdmin(email)
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
