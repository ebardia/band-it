import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { prisma } from '../../lib/prisma'
import { ENVIRONMENTAL_FACTORS } from '../../lib/ai-client'

export const aiUsageRouter = router({
  /**
   * Get AI usage for a specific transaction/entity
   */
  getTransactionUsage: publicProcedure
    .input(z.object({
      entityType: z.string(),
      entityId: z.string(),
    }))
    .query(async ({ input }) => {
      const { entityType, entityId } = input

      const usage = await prisma.aIUsage.findMany({
        where: {
          entityType,
          entityId,
        },
        orderBy: { createdAt: 'desc' },
      })

      // Aggregate totals
      const totals = usage.reduce(
        (acc, record) => ({
          totalTokens: acc.totalTokens + record.totalTokens,
          inputTokens: acc.inputTokens + record.inputTokens,
          outputTokens: acc.outputTokens + record.outputTokens,
          co2Grams: acc.co2Grams + record.co2Grams,
          waterMl: acc.waterMl + record.waterMl,
          electricityWh: acc.electricityWh + record.electricityWh,
          ledMinutes: acc.ledMinutes + record.ledMinutes,
          count: acc.count + 1,
        }),
        {
          totalTokens: 0,
          inputTokens: 0,
          outputTokens: 0,
          co2Grams: 0,
          waterMl: 0,
          electricityWh: 0,
          ledMinutes: 0,
          count: 0,
        }
      )

      return {
        records: usage,
        totals,
      }
    }),

  /**
   * Get AI usage for a band (for band admins)
   */
  getBandUsage: publicProcedure
    .input(z.object({
      bandId: z.string(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
    }))
    .query(async ({ input }) => {
      const { bandId, startDate, endDate } = input

      const where: any = { bandId }
      if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) where.createdAt.gte = startDate
        if (endDate) where.createdAt.lte = endDate
      }

      const usage = await prisma.aIUsage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      })

      // Aggregate by operation type
      const byOperation = usage.reduce((acc, record) => {
        if (!acc[record.operation]) {
          acc[record.operation] = {
            count: 0,
            totalTokens: 0,
            co2Grams: 0,
            waterMl: 0,
            electricityWh: 0,
            ledMinutes: 0,
          }
        }
        acc[record.operation].count++
        acc[record.operation].totalTokens += record.totalTokens
        acc[record.operation].co2Grams += record.co2Grams
        acc[record.operation].waterMl += record.waterMl
        acc[record.operation].electricityWh += record.electricityWh
        acc[record.operation].ledMinutes += record.ledMinutes
        return acc
      }, {} as Record<string, any>)

      // Aggregate totals
      const totals = usage.reduce(
        (acc, record) => ({
          totalTokens: acc.totalTokens + record.totalTokens,
          inputTokens: acc.inputTokens + record.inputTokens,
          outputTokens: acc.outputTokens + record.outputTokens,
          co2Grams: acc.co2Grams + record.co2Grams,
          waterMl: acc.waterMl + record.waterMl,
          electricityWh: acc.electricityWh + record.electricityWh,
          ledMinutes: acc.ledMinutes + record.ledMinutes,
          count: acc.count + 1,
        }),
        {
          totalTokens: 0,
          inputTokens: 0,
          outputTokens: 0,
          co2Grams: 0,
          waterMl: 0,
          electricityWh: 0,
          ledMinutes: 0,
          count: 0,
        }
      )

      return {
        records: usage.slice(0, 100), // Limit recent records
        byOperation,
        totals,
      }
    }),

  /**
   * Get platform-wide AI usage (admin only)
   */
  getPlatformUsage: publicProcedure
    .input(z.object({
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
    }))
    .query(async ({ input }) => {
      const { startDate, endDate } = input

      const where: any = {}
      if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) where.createdAt.gte = startDate
        if (endDate) where.createdAt.lte = endDate
      }

      // Get aggregated stats
      const aggregation = await prisma.aIUsage.aggregate({
        where,
        _sum: {
          totalTokens: true,
          inputTokens: true,
          outputTokens: true,
          co2Grams: true,
          waterMl: true,
          electricityWh: true,
          ledMinutes: true,
          durationMs: true,
        },
        _count: true,
        _avg: {
          totalTokens: true,
          durationMs: true,
        },
      })

      // Get breakdown by operation type
      const byOperation = await prisma.aIUsage.groupBy({
        by: ['operation'],
        where,
        _sum: {
          totalTokens: true,
          co2Grams: true,
          waterMl: true,
          electricityWh: true,
          ledMinutes: true,
        },
        _count: true,
      })

      // Get breakdown by band
      const byBand = await prisma.aIUsage.groupBy({
        by: ['bandId'],
        where: { ...where, bandId: { not: null } },
        _sum: {
          totalTokens: true,
          co2Grams: true,
        },
        _count: true,
      })

      // Get recent records
      const recentRecords = await prisma.aIUsage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          band: {
            select: { id: true, name: true, slug: true },
          },
        },
      })

      return {
        totals: {
          count: aggregation._count,
          totalTokens: aggregation._sum.totalTokens || 0,
          inputTokens: aggregation._sum.inputTokens || 0,
          outputTokens: aggregation._sum.outputTokens || 0,
          co2Grams: aggregation._sum.co2Grams || 0,
          waterMl: aggregation._sum.waterMl || 0,
          electricityWh: aggregation._sum.electricityWh || 0,
          ledMinutes: aggregation._sum.ledMinutes || 0,
          totalDurationMs: aggregation._sum.durationMs || 0,
          avgTokens: aggregation._avg.totalTokens || 0,
          avgDurationMs: aggregation._avg.durationMs || 0,
        },
        byOperation: byOperation.map((op) => ({
          operation: op.operation,
          count: op._count,
          totalTokens: op._sum.totalTokens || 0,
          co2Grams: op._sum.co2Grams || 0,
          waterMl: op._sum.waterMl || 0,
          electricityWh: op._sum.electricityWh || 0,
          ledMinutes: op._sum.ledMinutes || 0,
        })),
        byBand: byBand.map((band) => ({
          bandId: band.bandId,
          count: band._count,
          totalTokens: band._sum.totalTokens || 0,
          co2Grams: band._sum.co2Grams || 0,
        })),
        recentRecords,
        environmentalFactors: ENVIRONMENTAL_FACTORS,
      }
    }),

  /**
   * Get environmental factors (for frontend display)
   */
  getEnvironmentalFactors: publicProcedure.query(async () => {
    return {
      factors: ENVIRONMENTAL_FACTORS,
      descriptions: {
        co2Grams: 'Grams of CO2 equivalent',
        waterMl: 'Milliliters of water',
        electricityWh: 'Watt-hours of electricity',
        ledMinutes: 'Minutes of 10W LED bulb equivalent',
      },
    }
  }),
})
