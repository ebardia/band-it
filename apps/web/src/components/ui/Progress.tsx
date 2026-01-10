import { theme } from '@band-it/shared'

interface Step {
  label: string
  status: 'complete' | 'active' | 'inactive'
}

interface ProgressProps {
  steps: Step[]
}

export function Progress({ steps }: ProgressProps) {
  return (
    <div className="mb-8">
      {/* Steps */}
      <div className={theme.components.progress.container}>
        {steps.map((step, index) => (
          <div key={index} className="flex items-center">
            {/* Step Circle */}
            <div
              className={
                step.status === 'complete'
                  ? theme.components.progress.stepComplete
                  : step.status === 'active'
                  ? theme.components.progress.stepActive
                  : theme.components.progress.stepInactive
              }
            >
              {step.status === 'complete' ? '✓' : index + 1}
            </div>
            
            {/* Line (if not last step) */}
            {index < steps.length - 1 && (
              <div
                className={
                  step.status === 'complete'
                    ? theme.components.progress.lineComplete
                    : theme.components.progress.lineIncomplete
                }
              />
            )}
          </div>
        ))}
      </div>
      
      {/* Labels */}
      <div className="flex justify-between mt-2 text-xs text-gray-600">
        {steps.map((step, index) => (
          <span
            key={index}
            className={step.status === 'active' ? 'font-bold text-blue-600' : ''}
          >
            {step.label}
          </span>
        ))}
      </div>
    </div>
  )
}