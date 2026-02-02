'use client'

import { useState } from 'react'
import { FeedbackModal } from './FeedbackModal'

interface FeedbackButtonProps {
  className?: string
}

export function FeedbackButton({ className }: FeedbackButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 hover:text-amber-800 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${className || ''}`}
        title="Send Feedback"
      >
        <span>Feedback</span>
      </button>

      <FeedbackModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}
