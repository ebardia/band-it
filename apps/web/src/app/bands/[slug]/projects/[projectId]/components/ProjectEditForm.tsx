'use client'

import { useState, useEffect } from 'react'
import { Heading, Text, Stack, Flex, Card, Button, Input } from '@/components/ui'

type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

interface ProjectEditFormProps {
  project: any
  bandMembers: any[]
  onSave: (data: any) => void
  onCancel: () => void
  isSaving: boolean
}

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
]

export function ProjectEditForm({
  project,
  bandMembers,
  onSave,
  onCancel,
  isSaving,
}: ProjectEditFormProps) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    priority: 'MEDIUM',
    startDate: '',
    targetDate: '',
    estimatedBudget: '',
    estimatedHours: '',
    deliverables: '',
    successCriteria: '',
    tags: '',
    leadId: '',
  })

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name || '',
        description: project.description || '',
        priority: project.priority || 'MEDIUM',
        startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
        targetDate: project.targetDate ? new Date(project.targetDate).toISOString().split('T')[0] : '',
        estimatedBudget: project.estimatedBudget ? String(project.estimatedBudget) : '',
        estimatedHours: project.estimatedHours ? String(project.estimatedHours) : '',
        deliverables: project.deliverables || '',
        successCriteria: project.successCriteria || '',
        tags: project.tags?.join(', ') || '',
        leadId: project.lead?.id || '',
      })
    }
  }, [project])

  const handleSave = () => {
    onSave({
      name: form.name || undefined,
      description: form.description || undefined,
      priority: form.priority as ProjectPriority,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      targetDate: form.targetDate ? new Date(form.targetDate).toISOString() : null,
      estimatedBudget: form.estimatedBudget ? parseFloat(form.estimatedBudget) : null,
      estimatedHours: form.estimatedHours ? parseInt(form.estimatedHours) : null,
      deliverables: form.deliverables || null,
      successCriteria: form.successCriteria || null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      leadId: form.leadId || null,
    })
  }

  const selectClassName = "w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  const textareaClassName = "w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  const dateInputClassName = "w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  const numberInputClassName = "w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"

  return (
    <Card>
      <Stack spacing="lg">
        <Heading level={3}>Edit Project</Heading>
        
        <Stack spacing="md">
          <Input
            label="Project Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          
          <Stack spacing="xs">
            <Text variant="small" weight="semibold">Description</Text>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={textareaClassName}
              rows={3}
            />
          </Stack>

          <Stack spacing="xs">
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
        </Stack>

        <Stack spacing="md">
          <Text weight="semibold">Timeline</Text>
          <Flex gap="md">
            <Stack spacing="xs" className="flex-1">
              <Text variant="small" weight="semibold">Start Date</Text>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className={dateInputClassName}
              />
            </Stack>
            <Stack spacing="xs" className="flex-1">
              <Text variant="small" weight="semibold">Target Date</Text>
              <input
                type="date"
                value={form.targetDate}
                onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                className={dateInputClassName}
              />
            </Stack>
          </Flex>
        </Stack>

        <Stack spacing="md">
          <Text weight="semibold">Budget & Effort</Text>
          <Flex gap="md">
            <Stack spacing="xs" className="flex-1">
              <Text variant="small" weight="semibold">Estimated Budget ($)</Text>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.estimatedBudget}
                onChange={(e) => setForm({ ...form, estimatedBudget: e.target.value })}
                className={numberInputClassName}
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
        </Stack>

        <Stack spacing="md">
          <Text weight="semibold">Deliverables & Success Criteria</Text>
          <Stack spacing="xs">
            <Text variant="small" weight="semibold">Deliverables</Text>
            <textarea
              value={form.deliverables}
              onChange={(e) => setForm({ ...form, deliverables: e.target.value })}
              placeholder="What will this project produce?"
              className={textareaClassName}
              rows={2}
            />
          </Stack>
          <Stack spacing="xs">
            <Text variant="small" weight="semibold">Success Criteria</Text>
            <textarea
              value={form.successCriteria}
              onChange={(e) => setForm({ ...form, successCriteria: e.target.value })}
              placeholder="How will we know this project is complete?"
              className={textareaClassName}
              rows={2}
            />
          </Stack>
        </Stack>

        <Stack spacing="md">
          <Text weight="semibold">Organization</Text>
          <Flex gap="md">
            <Stack spacing="xs" className="flex-1">
              <Text variant="small" weight="semibold">Tags (comma separated)</Text>
              <Input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="e.g., planning, research"
              />
            </Stack>
            <Stack spacing="xs" className="flex-1">
              <Text variant="small" weight="semibold">Project Lead</Text>
              <select
                value={form.leadId}
                onChange={(e) => setForm({ ...form, leadId: e.target.value })}
                className={selectClassName}
              >
                <option value="">No lead assigned</option>
                {bandMembers.map((member: any) => (
                  <option key={member.user.id} value={member.user.id}>
                    {member.user.name} ({member.role})
                  </option>
                ))}
              </select>
            </Stack>
          </Flex>
        </Stack>

        <Flex gap="sm">
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </Flex>
      </Stack>
    </Card>
  )
}