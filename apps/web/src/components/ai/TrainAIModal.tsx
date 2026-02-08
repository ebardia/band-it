'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui'
import { Stack, Text, Button, Flex, Alert } from '@/components/ui'
import { trpc } from '@/lib/trpc'

// Operation types that users can select
const OPERATION_OPTIONS = [
  { value: '', label: 'All AI operations' },
  { value: 'task_suggestions', label: 'Task suggestions' },
  { value: 'checklist_suggestions', label: 'Checklist suggestions' },
  { value: 'project_suggestions', label: 'Project suggestions' },
  { value: 'proposal_draft', label: 'Proposal drafting' },
] as const

// Category options for broader scope
const CATEGORY_OPTIONS = [
  { value: '', label: 'All categories' },
  { value: 'generation', label: 'All generation (suggestions, drafting)' },
  { value: 'validation', label: 'All validation (checks)' },
  { value: 'help', label: 'Help questions' },
] as const

interface TrainAIModalProps {
  isOpen: boolean
  onClose: () => void
  bandId: string
  userId: string
  /** The operation that triggered this training (for context) */
  contextOperation?: string
  /** Optional placeholder text to guide the user */
  placeholder?: string
  /** Called when instruction is saved successfully */
  onSuccess?: () => void
}

export function TrainAIModal({
  isOpen,
  onClose,
  bandId,
  userId,
  contextOperation,
  placeholder,
  onSuccess,
}: TrainAIModalProps) {
  const [instruction, setInstruction] = useState('')
  const [scopeType, setScopeType] = useState<'operation' | 'category' | 'all'>('operation')
  const [operation, setOperation] = useState(contextOperation || '')
  const [category, setCategory] = useState('')
  const [error, setError] = useState<string | null>(null)

  const createMutation = trpc.band.createAIInstruction.useMutation({
    onSuccess: () => {
      setInstruction('')
      setOperation(contextOperation || '')
      setCategory('')
      setError(null)
      onSuccess?.()
      onClose()
    },
    onError: (err) => {
      setError(err.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!instruction.trim()) {
      setError('Please enter an instruction')
      return
    }
    if (instruction.trim().length < 10) {
      setError('Instruction must be at least 10 characters')
      return
    }

    createMutation.mutate({
      bandId,
      userId,
      instruction: instruction.trim(),
      operation: scopeType === 'operation' && operation ? operation as any : undefined,
      category: scopeType === 'category' && category ? category as any : undefined,
    })
  }

  const handleClose = () => {
    setInstruction('')
    setError(null)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Train AI" size="lg">
      <form onSubmit={handleSubmit}>
        <Stack spacing="lg">
          <Text className="text-gray-600">
            Help the AI better understand your band's preferences. This instruction will be applied to future AI interactions.
          </Text>

          {error && (
            <Alert variant="danger">
              <Text>{error}</Text>
            </Alert>
          )}

          <Stack spacing="sm">
            <label className="block text-sm font-medium text-gray-700">
              Instruction
            </label>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder={placeholder || "e.g., 'Always include a budget estimate when suggesting tasks' or 'Focus on tasks that can be done remotely'"}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
              maxLength={500}
            />
            <Text variant="small" className="text-gray-500">
              {instruction.length}/500 characters
            </Text>
          </Stack>

          <Stack spacing="sm">
            <label className="block text-sm font-medium text-gray-700">
              Apply to
            </label>
            <Flex gap="sm" className="flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="scopeType"
                  value="operation"
                  checked={scopeType === 'operation'}
                  onChange={() => setScopeType('operation')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm">Specific operation</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="scopeType"
                  value="category"
                  checked={scopeType === 'category'}
                  onChange={() => setScopeType('category')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm">Category</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="scopeType"
                  value="all"
                  checked={scopeType === 'all'}
                  onChange={() => setScopeType('all')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm">All AI</span>
              </label>
            </Flex>

            {scopeType === 'operation' && (
              <select
                value={operation}
                onChange={(e) => setOperation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {OPERATION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}

            {scopeType === 'category' && (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {CATEGORY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}
          </Stack>

          <Flex justify="end" gap="sm">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createMutation.isPending || !instruction.trim()}
            >
              {createMutation.isPending ? 'Saving...' : 'Save Instruction'}
            </Button>
          </Flex>
        </Stack>
      </form>
    </Modal>
  )
}
