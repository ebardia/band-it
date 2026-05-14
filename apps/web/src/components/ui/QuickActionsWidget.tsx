'use client'

import { trpc } from '@/lib/trpc'
import { useRouter } from 'next/navigation'
import { Text } from './Typography'
import {
  formatQuickActionSubtitle,
  formatQuickActionTitle,
  getQuickActionIcon,
  getQuickActionTypeLabel,
  type QuickActionShape,
} from '@/lib/quickActionPresentation'

interface QuickActionsWidgetProps {
  userId: string
}

export function QuickActionsWidget({ userId }: QuickActionsWidgetProps) {
  const router = useRouter()

  const { data, isLoading } = trpc.quick.getMyActions.useQuery(
    { userId, limit: 5 },
    {
      enabled: !!userId,
      refetchOnWindowFocus: true,
    }
  )

  const { data: myBandsData } = trpc.band.getMyBands.useQuery(
    { userId },
    { enabled: !!userId }
  )
  const activeBandCount = myBandsData?.bands.filter((b: any) => b.status === 'ACTIVE').length ?? 0

  // Don't show anything while loading or if no actions
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🔔</span>
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-gray-100 rounded-lg"></div>
          <div className="h-16 bg-gray-100 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (!data || data.actions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🔔</span>
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        </div>
        <div className="text-center py-6">
          <span className="text-3xl mb-2 block">✅</span>
          <Text weight="semibold" className="text-gray-700">You're all caught up!</Text>
          <Text color="muted" className="text-sm">No pending actions right now.</Text>
        </div>
        {activeBandCount <= 1 && (
          <button
            onClick={() => router.push('/discover')}
            className="w-full text-left bg-blue-50 hover:bg-blue-100 rounded-lg p-4 transition-colors border border-blue-200 hover:border-blue-300 mt-2"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔍</span>
                <div>
                  <p className="text-gray-900 font-medium">Find Your Band</p>
                  <p className="text-sm text-gray-500">Discover bands that match your skills and interests</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔔</span>
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        </div>
        <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
          {data.total}
        </span>
      </div>

      <div className="space-y-3">
        {data.actions.map((action) => (
          <ActionCard
            key={`${action.type}-${action.id}`}
            action={action as QuickActionShape}
            onClick={() => router.push(action.url)}
          />
        ))}
      </div>
    </div>
  )
}

interface ActionCardProps {
  action: QuickActionShape
  onClick: () => void
}

function ActionCard({ action, onClick }: ActionCardProps) {
  const getUrgencyIndicator = () => {
    if (action.urgency === 'high' && action.meta.timeRemaining) {
      return (
        <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
          {String(action.meta.timeRemaining)} left
        </span>
      )
    }
    if (action.urgency === 'medium' && action.meta.timeRemaining) {
      return (
        <span className="flex items-center gap-1 text-xs text-yellow-600 font-medium">
          <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
          {String(action.meta.timeRemaining)} left
        </span>
      )
    }
    return null
  }

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-gray-50 hover:bg-gray-100 rounded-lg p-4 transition-colors border border-gray-200 hover:border-gray-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-2xl flex-shrink-0">{getQuickActionIcon(action)}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-gray-600">{getQuickActionTypeLabel(action)}</span>
              {getUrgencyIndicator()}
            </div>
            <p className="text-gray-900 font-medium truncate">{formatQuickActionTitle(action)}</p>
            <p className="text-sm text-gray-500 truncate">{formatQuickActionSubtitle(action)}</p>
          </div>
        </div>
        <svg
          className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </button>
  )
}
