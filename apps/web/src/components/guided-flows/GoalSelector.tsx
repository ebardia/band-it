'use client'

import { useGuidedFlow, GuidedFlow } from './GuidedFlowContext'
import { Modal, Button, Text, Stack, Flex } from '@/components/ui'

interface GoalSelectorProps {
  flows: GuidedFlow[]
  title?: string
  subtitle?: string
}

export function GoalSelector({
  flows,
  title = "What would you like to do?",
  subtitle = "Select an option and we'll guide you through it step by step.",
}: GoalSelectorProps) {
  const { isGoalSelectorOpen, hideGoalSelector, startFlow, isFlowCompleted } = useGuidedFlow()

  // Group flows by category
  const groupedFlows = flows.reduce((acc, flow) => {
    const category = flow.category || 'general'
    if (!acc[category]) acc[category] = []
    acc[category].push(flow)
    return acc
  }, {} as Record<string, GuidedFlow[]>)

  const categoryLabels: Record<string, string> = {
    'getting-started': 'Getting Started',
    'bands': 'Managing Bands',
    'proposals': 'Proposals & Voting',
    'projects': 'Projects & Tasks',
    'admin': 'Administration',
    'general': 'General',
  }

  const categoryOrder = ['getting-started', 'bands', 'proposals', 'projects', 'admin', 'general']

  return (
    <Modal
      isOpen={isGoalSelectorOpen}
      onClose={hideGoalSelector}
      title={title}
      size="lg"
    >
      <div className="space-y-6">
        <Text color="muted">{subtitle}</Text>

        {categoryOrder.map(category => {
          const categoryFlows = groupedFlows[category]
          if (!categoryFlows || categoryFlows.length === 0) return null

          return (
            <div key={category}>
              <Text weight="semibold" className="text-xs uppercase text-gray-500 mb-2">
                {categoryLabels[category] || category}
              </Text>
              <div className="space-y-2">
                {categoryFlows.map(flow => {
                  const completed = isFlowCompleted(flow.id)
                  return (
                    <button
                      key={flow.id}
                      onClick={() => startFlow(flow)}
                      className={`w-full text-left p-4 rounded-lg border transition-all ${
                        completed
                          ? 'border-green-200 bg-green-50 hover:bg-green-100'
                          : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-blue-300'
                      }`}
                    >
                      <Flex align="start" gap="md">
                        <span className="text-2xl flex-shrink-0">{flow.icon || '📚'}</span>
                        <div className="flex-1 min-w-0">
                          <Flex align="center" gap="sm">
                            <Text weight="semibold">{flow.name}</Text>
                            {completed && (
                              <span className="text-green-600 text-sm">✓ Completed</span>
                            )}
                          </Flex>
                          <Text color="muted" className="text-sm mt-0.5">
                            {flow.description}
                          </Text>
                          <Text className="text-xs text-gray-400 mt-1">
                            {flow.steps.length} steps
                          </Text>
                        </div>
                        <span className="text-gray-400 flex-shrink-0">→</span>
                      </Flex>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}

        <div className="pt-4 border-t border-gray-200">
          <Flex justify="between" align="center">
            <Button variant="ghost" onClick={hideGoalSelector}>
              Maybe later
            </Button>
            <Text color="muted" className="text-xs">
              You can access this anytime from the help menu
            </Text>
          </Flex>
        </div>
      </div>
    </Modal>
  )
}
