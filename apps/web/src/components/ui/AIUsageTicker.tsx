'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'

// Cost factors per 1M tokens (Anthropic Sonnet pricing)
const COST_PER_M_INPUT = 3.00
const COST_PER_M_OUTPUT = 15.00

// Calculate cost from tokens
function calculateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1_000_000) * COST_PER_M_INPUT + (outputTokens / 1_000_000) * COST_PER_M_OUTPUT
}

// Format numbers compactly
function fmt(num: number, decimals = 1): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(decimals)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(decimals)}K`
  if (num < 0.01 && num > 0) return num.toExponential(1)
  return num.toFixed(decimals)
}

// Format currency
function fmtCost(num: number): string {
  if (num < 0.01 && num > 0) return `$${num.toFixed(4)}`
  return `$${num.toFixed(2)}`
}

interface UsageLineProps {
  label: string
  tokens: number
  inputTokens: number
  outputTokens: number
  co2: number
  water: number
  electricity: number
  led: number
}

function UsageLine({ label, tokens, inputTokens, outputTokens, co2, water, electricity, led }: UsageLineProps) {
  const cost = calculateCost(inputTokens, outputTokens)

  return (
    <div className="flex items-center gap-3 text-xs text-gray-500">
      <span className="font-medium w-24 shrink-0">{label}:</span>
      <span>{fmt(tokens, 0)} tokens</span>
      <span className="text-gray-300">|</span>
      <span>{fmt(co2)}g CO2</span>
      <span className="text-gray-300">|</span>
      <span>{fmt(water)}ml H2O</span>
      <span className="text-gray-300">|</span>
      <span>{fmt(electricity)}Wh</span>
      <span className="text-gray-300">|</span>
      <span>{fmt(led)} min LED</span>
      <span className="text-gray-300">|</span>
      <span>{fmtCost(cost)}</span>
    </div>
  )
}

export function AIUsageTicker() {
  const params = useParams()
  const bandSlug = params?.slug as string | undefined
  const [userId, setUserId] = useState<string | null>(null)
  const [bandId, setBandId] = useState<string | null>(null)

  // Get userId from token
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const decoded: any = jwtDecode(token)
        setUserId(decoded.userId)
      } catch (e) {
        // Ignore
      }
    }
  }, [])

  // Get bandId from slug if on a band page
  const { data: bandData } = trpc.band.getBySlug.useQuery(
    { slug: bandSlug || '' },
    { enabled: !!bandSlug }
  )

  useEffect(() => {
    if (bandData?.band?.id) {
      setBandId(bandData.band.id)
    } else {
      setBandId(null)
    }
  }, [bandData])

  // Platform-wide usage
  const { data: platformData } = trpc.aiUsage.getPlatformUsage.useQuery({})

  // Band usage (only if on a band page)
  const { data: bandUsageData } = trpc.aiUsage.getBandUsage.useQuery(
    { bandId: bandId || '' },
    { enabled: !!bandId }
  )

  // User's recent transaction - get from platform data's recent records filtered by userId
  const userRecentTransaction = platformData?.recentRecords?.find(
    (record: any) => record.userId === userId
  )

  // Default empty values
  const emptyUsage = {
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    co2Grams: 0,
    waterMl: 0,
    electricityWh: 0,
    ledMinutes: 0,
  }

  const platformTotals = platformData?.totals || emptyUsage
  const bandTotals = bandUsageData?.totals || emptyUsage

  const recentTx = userRecentTransaction
    ? {
        totalTokens: userRecentTransaction.totalTokens,
        inputTokens: userRecentTransaction.inputTokens,
        outputTokens: userRecentTransaction.outputTokens,
        co2Grams: userRecentTransaction.co2Grams,
        waterMl: userRecentTransaction.waterMl,
        electricityWh: userRecentTransaction.electricityWh,
        ledMinutes: userRecentTransaction.ledMinutes,
      }
    : emptyUsage

  // Don't render if no platform data yet
  if (!platformData) {
    return null
  }

  return (
    <div className="bg-gray-50 border-b border-gray-200 py-1 px-4">
      <div className="max-w-7xl mx-auto flex items-center gap-6">
        <span className="text-sm font-semibold text-gray-700 shrink-0">AI USAGE TRACKER</span>
        <div className="space-y-0.5">
          <UsageLine
            label="Platform Total"
            tokens={platformTotals.totalTokens}
            inputTokens={platformTotals.inputTokens || 0}
            outputTokens={platformTotals.outputTokens || 0}
            co2={platformTotals.co2Grams}
            water={platformTotals.waterMl}
            electricity={platformTotals.electricityWh}
            led={platformTotals.ledMinutes}
          />
          {bandId && (
            <UsageLine
              label="Band Total"
              tokens={bandTotals.totalTokens}
              inputTokens={bandTotals.inputTokens || 0}
              outputTokens={bandTotals.outputTokens || 0}
              co2={bandTotals.co2Grams}
              water={bandTotals.waterMl}
              electricity={bandTotals.electricityWh}
              led={bandTotals.ledMinutes}
            />
          )}
          <UsageLine
            label="Your Last AI"
            tokens={recentTx.totalTokens}
            inputTokens={recentTx.inputTokens}
            outputTokens={recentTx.outputTokens}
            co2={recentTx.co2Grams}
            water={recentTx.waterMl}
            electricity={recentTx.electricityWh}
            led={recentTx.ledMinutes}
          />
        </div>
      </div>
    </div>
  )
}

// Keep old exports for backwards compatibility but they're not used
export function BandUsageSummary({ bandId }: { bandId: string }) {
  return null
}
