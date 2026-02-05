'use client'

import { trpc } from '@/lib/trpc'
import { useRouter } from 'next/navigation'
import { Card } from './Card'
import { Text } from './Typography'

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
            action={action}
            onClick={() => router.push(action.url)}
          />
        ))}
      </div>
    </div>
  )
}

interface ActionCardProps {
  action: {
    type: string
    id: string
    title: string
    bandName: string
    url: string
    urgency: 'high' | 'medium' | 'low'
    meta: Record<string, any>
  }
  onClick: () => void
}

function ActionCard({ action, onClick }: ActionCardProps) {
  const getIcon = () => {
    switch (action.type) {
      case 'VOTE':
        return '🗳️'
      case 'CONFIRM_PAYMENT':
        return '💳'
      case 'EVENT_RSVP':
        return '📅'
      case 'BAND_INVITE':
        return '✉️'
      case 'MENTION':
        return '💬'
      case 'TASK':
        return '✋'
      case 'CHECKLIST':
        return '☑️'
      default:
        return '📌'
    }
  }

  const getTypeLabel = () => {
    switch (action.type) {
      case 'VOTE':
        return 'Vote'
      case 'CONFIRM_PAYMENT':
        return 'Confirm Payment'
      case 'EVENT_RSVP':
        return 'RSVP'
      case 'BAND_INVITE':
        return 'Invitation'
      case 'MENTION':
        return 'Mention'
      case 'TASK':
        return 'Claim Task'
      case 'CHECKLIST':
        return 'Claim Item'
      default:
        return action.type
    }
  }

  const getUrgencyIndicator = () => {
    if (action.urgency === 'high' && action.meta.timeRemaining) {
      return (
        <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
          {action.meta.timeRemaining} left
        </span>
      )
    }
    if (action.urgency === 'medium' && action.meta.timeRemaining) {
      return (
        <span className="flex items-center gap-1 text-xs text-yellow-600 font-medium">
          <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
          {action.meta.timeRemaining} left
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
          <span className="text-2xl flex-shrink-0">{getIcon()}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-gray-600">{getTypeLabel()}</span>
              {getUrgencyIndicator()}
            </div>
            <p className="text-gray-900 font-medium truncate">
              {action.type === 'CONFIRM_PAYMENT' && action.meta.from
                ? `${action.title} from ${action.meta.from}`
                : action.type === 'MENTION' && action.meta.channelName
                ? `in #${action.meta.channelName}`
                : action.type === 'BAND_INVITE'
                ? action.title
                : action.type === 'TASK'
                ? action.title
                : action.type === 'CHECKLIST'
                ? action.title
                : `"${action.title}"`}
            </p>
            <p className="text-sm text-gray-500 truncate">
              {action.type === 'TASK' && action.meta.projectName
                ? `${action.meta.projectName} • ${action.bandName}`
                : action.type === 'CHECKLIST' && action.meta.taskName
                ? `${action.meta.taskName} • ${action.bandName}`
                : action.bandName}
            </p>
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
