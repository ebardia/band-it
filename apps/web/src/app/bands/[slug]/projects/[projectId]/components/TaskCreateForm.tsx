'use client'

import { useState } from 'react'
import { Heading, Text, Stack, Flex, Card, Button, Input } from '@/components/ui'

type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

interface TaskCreateFormProps {
  bandMembers: any[]
  onSubmit: (data: any) => void
  onCancel: () => void
  isSubmitting: boolean
}

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
]

export function TaskCreateForm({
  bandMembers,
  onSubmit,
  onCancel,
  isSubmitting,
}: TaskCreateFormProps) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    priority: 'MEDIUM',
    assigneeId: '',
    dueDate: '',
    estimatedHours: '',
    estimatedCost: '',
    requiresVerification: true,
    tags: '',
  })

  const handleSubmit = () => {
    onSubmit({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      priority: form.priority as TaskPriority,
      assigneeId: form.assigneeId || undefined,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
      estimatedHours: form.estimatedHours ? parseInt(form.estimatedHours) : undefined,
      estimatedCost: form.estimatedCost ? parseFloat(form.estimatedCost) : undefined,
      requiresVerification: form.requiresVerification,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
    })
  }

  const reset = () => {
    setForm({
      name: '',
      description: '',
      priority: 'MEDIUM',
      assigneeId: '',
      dueDate: '',
      estimatedHours: '',
      estimatedCost: '',
      requiresVerification: true,
      tags: '',
    })
  }

  const selectClassName = "w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  const textareaClassName = "w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  const dateInputClassName = "w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  const numberInputClassName = "w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"

  return (
    <Card className="bg-gray-50">
      <Stack spacing="md">
        <Heading level={3}>New Task</Heading>
        
        <Input
          label="Task Name *"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g., Research suppliers"
        />

        <Stack spacing="xs">
          <Text variant="small" weight="semibold">Description</Text>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What needs to be done?"
            className={textareaClassName}
            rows={2}
          />
        </Stack>

        <Flex gap="md">
          <Stack spacing="xs" className="flex-1">
            <Text variant="small" weight="semibold">Priority</Text>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className={selectClassName}
            >
              {PRIORITY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </Stack>
          <Stack spacing="xs" className="flex-1">
            <Text variant="small" weight="semibold">Assign To</Text>
            <select
              value={form.assigneeId}
              onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
              className={selectClassName}
            >
              <option value="">Unassigned</option>
              {bandMembers.map((member: any) => (
                <option key={member.user.id} value={member.user.id}>
                  {member.user.name}
                </option>
              ))}
            </select>
          </Stack>
        </Flex>

        <Flex gap="md">
          <Stack spacing="xs" className="flex-1">
            <Text variant="small" weight="semibold">Due Date</Text>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className={dateInputClassName}
            />
          </Stack>
          <Stack spacing="xs" className="flex-1">
            <Text variant="small" weight="semibold">Estimated Hours</Text>
            <input
              type="number"
              min="0"
              value={form.estimatedHours}
              onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })}
              className={numberInputClassName}
            />
          </Stack>
        </Flex>

        <Flex gap="sm" align="center">
          <input
            type="checkbox"
            id="requiresVerification"
            checked={form.requiresVerification}
            onChange={(e) => setForm({ ...form, requiresVerification: e.target.checked })}
            className="w-4 h-4"
          />
          <Text variant="small" as="label" htmlFor="requiresVerification">
            Requires verification (proof, receipts, etc.)
          </Text>
        </Flex>

        <Flex gap="sm">
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={isSubmitting || !form.name.trim()}
          >
            {isSubmitting ? 'Creating...' : 'Create Task'}
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={() => {
              reset()
              onCancel()
            }}
          >
            Cancel
          </Button>
        </Flex>
      </Stack>
    </Card>
  )
}