'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Button,
  Card,
  Container,
  Heading,
  Text,
  Stack,
  Flex,
  Footer,
} from '@/components/ui'

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

interface UsageData {
  totalTokens: number
  inputTokens: number
  outputTokens: number
  co2Grams: number
  waterMl: number
  electricityWh: number
  ledMinutes: number
}

function UsageCard({ title, data, description }: { title: string; data: UsageData; description?: string }) {
  const cost = calculateCost(data.inputTokens || 0, data.outputTokens || 0)

  return (
    <Card>
      <Stack spacing="md">
        <div>
          <Heading level={3}>{title}</Heading>
          {description && <Text variant="small" color="muted">{description}</Text>}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <Text variant="small" color="muted">Tokens</Text>
            <Text className="text-xl font-semibold text-blue-700">{fmt(data.totalTokens, 0)}</Text>
          </div>

          <div className="bg-green-50 rounded-lg p-3">
            <Text variant="small" color="muted">CO2 Emissions</Text>
            <Text className="text-xl font-semibold text-green-700">{fmt(data.co2Grams)}g</Text>
          </div>

          <div className="bg-cyan-50 rounded-lg p-3">
            <Text variant="small" color="muted">Water Usage</Text>
            <Text className="text-xl font-semibold text-cyan-700">{fmt(data.waterMl)}ml</Text>
          </div>

          <div className="bg-yellow-50 rounded-lg p-3">
            <Text variant="small" color="muted">Electricity</Text>
            <Text className="text-xl font-semibold text-yellow-700">{fmt(data.electricityWh)}Wh</Text>
          </div>

          <div className="bg-purple-50 rounded-lg p-3">
            <Text variant="small" color="muted">LED Equivalent</Text>
            <Text className="text-xl font-semibold text-purple-700">{fmt(data.ledMinutes)} min</Text>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <Text variant="small" color="muted">Est. Cost</Text>
            <Text className="text-xl font-semibold text-gray-700">{fmtCost(cost)}</Text>
          </div>
        </div>
      </Stack>
    </Card>
  )
}

export default function AIUsagePage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)

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

  // Platform-wide usage
  const { data: platformData, isLoading } = trpc.aiUsage.getPlatformUsage.useQuery({})

  // User's recent transaction
  const userRecentTransaction = platformData?.recentRecords?.find(
    (record: any) => record.userId === userId
  )

  const emptyUsage: UsageData = {
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    co2Grams: 0,
    waterMl: 0,
    electricityWh: 0,
    ledMinutes: 0,
  }

  const platformTotals = platformData?.totals || emptyUsage

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

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Top navigation bar */}
      <div className="p-4">
        <Flex justify="between" align="center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
          >
            Home
          </Button>
          <Flex gap="sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/register')}
            >
              Register
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push('/login')}
            >
              Sign In
            </Button>
          </Flex>
        </Flex>
      </div>

      <main className="flex-1">
        <Container size="lg" className="py-12">
          <Stack spacing="lg">
            <div className="text-center">
              <Heading level={1}>AI Usage Tracker</Heading>
              <Text variant="muted" className="mt-2">
                Transparency in AI resource consumption across the Band It platform
              </Text>
            </div>

            {/* Explanation Card */}
            <Card>
              <Stack spacing="md">
                <Heading level={3}>Why We Track This</Heading>
                <Text>
                  Band It uses AI to help with various features like proposal validation, task suggestions,
                  and content assistance. We believe in transparency about the environmental and financial
                  impact of these AI operations.
                </Text>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <Text className="font-medium">CO2 Emissions</Text>
                    <Text variant="small" color="muted">
                      Estimated carbon footprint based on data center energy usage
                    </Text>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <Text className="font-medium">Water Usage</Text>
                    <Text variant="small" color="muted">
                      Cooling water required by data centers to run AI models
                    </Text>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <Text className="font-medium">Electricity</Text>
                    <Text variant="small" color="muted">
                      Power consumption for processing AI requests
                    </Text>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <Text className="font-medium">LED Equivalent</Text>
                    <Text variant="small" color="muted">
                      How long a 10W LED bulb could run on the same energy
                    </Text>
                  </div>
                </div>
              </Stack>
            </Card>

            {isLoading ? (
              <Card>
                <div className="text-center py-8">
                  <Text color="muted">Loading usage data...</Text>
                </div>
              </Card>
            ) : (
              <>
                <UsageCard
                  title="Platform Total"
                  data={platformTotals}
                  description="Cumulative AI usage across all bands and users on Band It"
                />

                {userId && (
                  <UsageCard
                    title="Your Last AI Request"
                    data={recentTx}
                    description="Resource consumption from your most recent AI interaction"
                  />
                )}
              </>
            )}
          </Stack>
        </Container>
      </main>
      <Footer />
    </div>
  )
}
