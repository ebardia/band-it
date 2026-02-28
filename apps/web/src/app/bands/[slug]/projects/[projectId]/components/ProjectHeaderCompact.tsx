'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Text, Stack, Flex, Badge, Button } from '@/components/ui'

type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'

interface ProjectHeaderCompactProps {
  project: any
  proposal: any
  bandSlug: string
  canUpdateProject: boolean
  onEdit: () => void
  onValidate: () => void
  isValidating: boolean
  onStatusChange: (status: ProjectStatus) => void
  isUpdatingStatus: boolean
}

const STATUS_OPTIONS: { value: ProjectStatus; label: string; icon: string }[] = [
  { value: 'PLANNING', label: 'Planning', icon: '📋' },
  { value: 'ACTIVE', label: 'Active', icon: '🚀' },
  { value: 'ON_HOLD', label: 'On Hold', icon: '⏸️' },
  { value: 'COMPLETED', label: 'Completed', icon: '✅' },
  { value: 'CANCELLED', label: 'Cancelled', icon: '❌' },
]

export function ProjectHeaderCompact({
  project,
  proposal,
  bandSlug,
  canUpdateProject,
  onEdit,
  onValidate,
  isValidating,
  onStatusChange,
  isUpdatingStatus,
}: ProjectHeaderCompactProps) {
  const router = useRouter()
  const [showMore, setShowMore] = useState(true)
  const [showStatusMenu, setShowStatusMenu] = useState(false)

  const progressPercent = project.totalTasks > 0
    ? Math.round((project.completedTasks / project.totalTasks) * 100)
    : 0

  const getStatusIcon = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.icon || '○'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-red-600'
      case 'HIGH': return 'text-orange-600'
      case 'MEDIUM': return 'text-blue-600'
      default: return 'text-gray-500'
    }
  }

  return (
    <div className="space-y-2">
      {/* Line 1: Title + badges + actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-lg">{getStatusIcon(project.status)}</span>
          <h1 className="text-xl font-bold truncate">{project.name}</h1>
          {project.aiGenerated && (
            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">AI</span>
          )}
          <span className={`text-xs font-medium ${getPriorityColor(project.priority)}`}>
            {project.priority}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {canUpdateProject && (
            <>
              <button
                onClick={onValidate}
                disabled={isValidating}
                className="text-xs px-2 py-1 text-purple-600 hover:bg-purple-50 rounded"
              >
                {isValidating ? '...' : '🤖 Validate'}
              </button>
              <button
                onClick={onEdit}
                className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"
              >
                Edit
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"
                >
                  Status ▼
                </button>
                {showStatusMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-10 py-1 min-w-[120px]">
                    {STATUS_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          onStatusChange(option.value)
                          setShowStatusMenu(false)
                        }}
                        disabled={isUpdatingStatus || project.status === option.value}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2 ${
                          project.status === option.value ? 'bg-blue-50 text-blue-700' : ''
                        }`}
                      >
                        <span>{option.icon}</span>
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Line 2: Metadata row */}
      <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
        <button
          onClick={() => router.push(`/bands/${bandSlug}/proposals/${proposal.id}`)}
          className="hover:text-blue-600 hover:underline"
        >
          from {proposal.title}
        </button>
        <span className="text-gray-300">|</span>
        {project.lead && (
          <>
            <span>Lead: {project.lead.name}</span>
            <span className="text-gray-300">|</span>
          </>
        )}
        <span>{project.completedTasks}/{project.totalTasks} tasks</span>
        {project.targetDate && (
          <>
            <span className="text-gray-300">|</span>
            <span>Target: {new Date(project.targetDate).toLocaleDateString()}</span>
          </>
        )}
        {progressPercent > 0 && (
          <>
            <span className="text-gray-300">|</span>
            <span className="text-green-600">{progressPercent}%</span>
          </>
        )}
        <button
          onClick={() => setShowMore(!showMore)}
          className="text-blue-600 hover:underline ml-auto"
        >
          {showMore ? '▲ Less' : '▼ More'}
        </button>
      </div>

      {/* Line 3+: Expandable details */}
      {showMore && (
        <div className="pt-2 border-t border-gray-100 space-y-2 text-sm">
          {project.description && (
            <p className="text-gray-700">{project.description}</p>
          )}
          <div className="flex gap-4 flex-wrap text-gray-500">
            <span>Created by {project.createdBy.name}</span>
            {project.startDate && (
              <span>Start: {new Date(project.startDate).toLocaleDateString()}</span>
            )}
            {project.estimatedBudget && (
              <span>Budget: ${project.estimatedBudget.toLocaleString()}</span>
            )}
            {project.estimatedHours && (
              <span>Est: {project.estimatedHours}h</span>
            )}
          </div>
          {project.deliverables && (
            <div>
              <span className="font-medium text-gray-700">Deliverables:</span>{' '}
              <span className="text-gray-600">{project.deliverables}</span>
            </div>
          )}
          {project.successCriteria && (
            <div>
              <span className="font-medium text-gray-700">Success Criteria:</span>{' '}
              <span className="text-gray-600">{project.successCriteria}</span>
            </div>
          )}
          {progressPercent > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Progress:</span>
              <div className="flex-1 max-w-xs h-2 bg-gray-200 rounded overflow-hidden">
                <div className="h-full bg-green-500 rounded" style={{ width: `${progressPercent}%` }} />
              </div>
              <span className="text-gray-600">{progressPercent}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
