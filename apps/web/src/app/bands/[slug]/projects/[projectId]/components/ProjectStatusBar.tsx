'use client'

import { Heading, Stack, Flex, Card, Button } from '@/components/ui'

type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'

interface ProjectStatusBarProps {
  currentStatus: ProjectStatus
  onStatusChange: (status: ProjectStatus) => void
  isUpdating: boolean
}

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'PLANNING', label: 'Planning' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export function ProjectStatusBar({
  currentStatus,
  onStatusChange,
  isUpdating,
}: ProjectStatusBarProps) {
  return (
    <Card>
      <Stack spacing="md">
        <Heading level={3}>Update Status</Heading>
        <Flex gap="sm" className="flex-wrap">
          {STATUS_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={currentStatus === option.value ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onStatusChange(option.value)}
              disabled={isUpdating || currentStatus === option.value}
            >
              {option.label}
            </Button>
          ))}
        </Flex>
      </Stack>
    </Card>
  )
}