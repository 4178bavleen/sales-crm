import { prisma } from '../../src/config/database.js'

export async function seedTargets() {
  console.log('🌱 Checking / seeding sample sales targets...')

  // Find admin user
  const admin = await prisma.user.findFirst({
    where: { role: { name: 'ADMIN' } },
    select: { id: true },
  })

  if (!admin) {
    console.log('No admin found for target creation, skipping.')
    return
  }

  // Find users and teams
  const priya = await prisma.user.findFirst({
    where: { email: { contains: 'priya' } },
    select: { id: true, name: true },
  })

  const marcus = await prisma.user.findFirst({
    where: { email: { contains: 'marcus' } },
    select: { id: true, name: true },
  })

  const team = await prisma.team.findFirst({
    select: { id: true, name: true },
  })

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-based

  // Current month bounds
  const currentMonthStart = new Date(Date.UTC(year, month, 1))
  const currentMonthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999))

  // Current quarter bounds
  const qStartMonth = Math.floor(month / 3) * 3
  const currentQuarterStart = new Date(Date.UTC(year, qStartMonth, 1))
  const currentQuarterEnd = new Date(Date.UTC(year, qStartMonth + 3, 0, 23, 59, 59, 999))

  // 1. Target for Priya (Monthly)
  if (priya) {
    const existing = await prisma.revenueTarget.findFirst({
      where: {
        userId: priya.id,
        periodType: 'MONTHLY',
        periodStart: currentMonthStart,
      },
    })

    if (!existing) {
      const target = await prisma.revenueTarget.create({
        data: {
          userId: priya.id,
          periodType: 'MONTHLY',
          periodStart: currentMonthStart,
          periodEnd: currentMonthEnd,
          amount: 60000,
          createdById: admin.id,
        },
      })

      await prisma.targetChange.create({
        data: {
          targetId: target.id,
          oldAmount: 0,
          newAmount: 60000,
          changedById: admin.id,
          reason: 'Initial monthly quota assignment',
        },
      })
      console.log(`✅ Seeded monthly target for ${priya.name}`)
    }
  }

  // 2. Target for Marcus (Quarterly)
  if (marcus) {
    const existing = await prisma.revenueTarget.findFirst({
      where: {
        userId: marcus.id,
        periodType: 'QUARTERLY',
        periodStart: currentQuarterStart,
      },
    })

    if (!existing) {
      const target = await prisma.revenueTarget.create({
        data: {
          userId: marcus.id,
          periodType: 'QUARTERLY',
          periodStart: currentQuarterStart,
          periodEnd: currentQuarterEnd,
          amount: 150000,
          createdById: admin.id,
        },
      })

      await prisma.targetChange.create({
        data: {
          targetId: target.id,
          oldAmount: 0,
          newAmount: 150000,
          changedById: admin.id,
          reason: 'Initial Q4 expansion quota',
        },
      })
      console.log(`✅ Seeded quarterly target for ${marcus.name}`)
    }
  }

  // 3. Team target if team exists
  if (team) {
    const existing = await prisma.revenueTarget.findFirst({
      where: {
        teamId: team.id,
        periodType: 'MONTHLY',
        periodStart: currentMonthStart,
      },
    })

    if (!existing) {
      const target = await prisma.revenueTarget.create({
        data: {
          teamId: team.id,
          periodType: 'MONTHLY',
          periodStart: currentMonthStart,
          periodEnd: currentMonthEnd,
          amount: 180000,
          createdById: admin.id,
        },
      })

      await prisma.targetChange.create({
        data: {
          targetId: target.id,
          oldAmount: 0,
          newAmount: 180000,
          changedById: admin.id,
          reason: 'Team aggregate target for enterprise sales',
        },
      })
      console.log(`✅ Seeded team monthly target for ${team.name}`)
    }
  }
}
