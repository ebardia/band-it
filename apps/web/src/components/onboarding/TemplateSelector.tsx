'use client'

import { trpc } from '@/lib/trpc'
import { Text, Loading } from '@/components/ui'

interface TemplateSelectorProps {
  selectedTemplate: string | null
  onSelect: (templateId: string) => void
}

export function TemplateSelector({ selectedTemplate, onSelect }: TemplateSelectorProps) {
  const { data: templatesData, isLoading } = trpc.onboarding.getTemplates.useQuery()

  if (isLoading) {
    return <Loading message="Loading templates..." />
  }

  const templates = templatesData?.templates || []

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {templates.map((template: any) => (
        <button
          key={template.id}
          type="button"
          onClick={() => onSelect(template.id)}
          className={`p-4 border-2 rounded-lg text-left transition-all ${
            selectedTemplate === template.id
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">{template.emoji}</span>
            <div className="flex-1">
              <Text weight="semibold">{template.name}</Text>
              <Text variant="small" color="muted">{template.description}</Text>
            </div>
            {selectedTemplate === template.id && (
              <span className="text-blue-500 text-xl">✓</span>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}
