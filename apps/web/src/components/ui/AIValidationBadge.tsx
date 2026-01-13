'use client'

import { useState } from 'react'
import { Badge, Stack, Text, Button, Card } from '@/components/ui'

interface ValidationIssue {
  type: string
  severity: 'INFO' | 'WARNING' | 'CONCERN'
  message: string
  suggestion: string
}

interface ValidationResult {
  status: 'PASS' | 'WARNING' | 'CONCERN'
  checkedAt: string
  issues: ValidationIssue[]
}

interface AIValidationBadgeProps {
  validation: ValidationResult | null
  onValidate?: () => void
  isValidating?: boolean
  compact?: boolean
}

export function AIValidationBadge({ 
  validation, 
  onValidate, 
  isValidating = false,
  compact = false 
}: AIValidationBadgeProps) {
  const [showDetails, setShowDetails] = useState(false)

  if (!validation && !onValidate) {
    return null
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PASS':
        return <Badge variant="success">✓ AI Validated</Badge>
      case 'WARNING':
        return <Badge variant="warning">⚠ AI Warning</Badge>
      case 'CONCERN':
        return <Badge variant="danger">⚠ AI Concern</Badge>
      default:
        return null
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'INFO':
        return 'text-blue-600 bg-blue-50'
      case 'WARNING':
        return 'text-yellow-700 bg-yellow-50'
      case 'CONCERN':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  if (!validation) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onValidate}
        disabled={isValidating}
      >
        {isValidating ? '🔄 Validating...' : '🤖 AI Validate'}
      </Button>
    )
  }

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2">
        {getStatusBadge(validation.status)}
        {validation.issues.length > 0 && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-blue-600 hover:underline"
          >
            {showDetails ? 'Hide' : `${validation.issues.length} issue(s)`}
          </button>
        )}
      </div>
    )
  }

  return (
    <Stack spacing="sm">
      <div className="flex items-center gap-2">
        {getStatusBadge(validation.status)}
        {validation.issues.length > 0 && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-600 hover:underline"
          >
            {showDetails ? 'Hide details' : `View ${validation.issues.length} issue(s)`}
          </button>
        )}
        {onValidate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onValidate}
            disabled={isValidating}
          >
            {isValidating ? '🔄' : '🔄 Re-check'}
          </Button>
        )}
      </div>

      {showDetails && validation.issues.length > 0 && (
        <Card className="bg-gray-50">
          <Stack spacing="sm">
            <Text variant="small" weight="semibold">AI Validation Issues</Text>
            {validation.issues.map((issue, index) => (
              <div 
                key={index}
                className={`p-3 rounded-lg ${getSeverityColor(issue.severity)}`}
              >
                <Text variant="small" weight="semibold">
                  {issue.type}: {issue.message}
                </Text>
                <Text variant="small" className="mt-1">
                  💡 {issue.suggestion}
                </Text>
              </div>
            ))}
            <Text variant="small" className="text-gray-500">
              Checked: {new Date(validation.checkedAt).toLocaleString()}
            </Text>
          </Stack>
        </Card>
      )}
    </Stack>
  )
}