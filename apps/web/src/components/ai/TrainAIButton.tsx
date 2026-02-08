'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { TrainAIModal } from './TrainAIModal'

interface TrainAIButtonProps {
  bandId: string
  userId: string
  /** User's role in the band - button only shows for FOUNDER, GOVERNOR, MODERATOR */
  userRole: string
  /** The AI operation that produced the output being trained on */
  contextOperation?: string
  /** Placeholder text for the instruction input */
  placeholder?: string
  /** Button size */
  size?: 'sm' | 'md' | 'lg'
  /** Button variant */
  variant?: 'ghost' | 'secondary'
  /** Optional callback when training is saved */
  onSuccess?: () => void
}

const CAN_TRAIN_AI = ['FOUNDER', 'GOVERNOR', 'MODERATOR']

export function TrainAIButton({
  bandId,
  userId,
  userRole,
  contextOperation,
  placeholder,
  size = 'sm',
  variant = 'ghost',
  onSuccess,
}: TrainAIButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Only show for roles that can train AI
  if (!CAN_TRAIN_AI.includes(userRole)) {
    return null
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsOpen(true)}
        title="Help the AI better understand your band's preferences"
      >
        🎓 Train AI
      </Button>

      <TrainAIModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        bandId={bandId}
        userId={userId}
        contextOperation={contextOperation}
        placeholder={placeholder}
        onSuccess={onSuccess}
      />
    </>
  )
}
