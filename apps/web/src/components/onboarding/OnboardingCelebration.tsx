'use client'

import { useEffect, useState } from 'react'
import { Text, Button, Flex } from '@/components/ui'

interface OnboardingCelebrationProps {
  celebration: string
  completedStep: number
  nextStep?: number
  isFullyComplete?: boolean
  onClose: () => void
}

export function OnboardingCelebration({
  celebration,
  completedStep,
  nextStep,
  isFullyComplete,
  onClose,
}: OnboardingCelebrationProps) {
  const [showConfetti, setShowConfetti] = useState(true)

  useEffect(() => {
    // Auto-close after 5 seconds if not fully complete
    if (!isFullyComplete) {
      const timer = setTimeout(onClose, 5000)
      return () => clearTimeout(timer)
    }
  }, [isFullyComplete, onClose])

  useEffect(() => {
    // Hide confetti after animation
    const timer = setTimeout(() => setShowConfetti(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      {/* Confetti effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][i % 5],
              }}
            />
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-bounce-in">
        {/* Celebration header */}
        <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 p-8 text-center">
          <div className="text-6xl mb-4">
            {isFullyComplete ? '🎉' : '🌟'}
          </div>
          <Text weight="bold" className="text-2xl text-white">
            {isFullyComplete ? 'Congratulations!' : 'Milestone Complete!'}
          </Text>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <Text className="text-lg mb-4">
            {celebration}
          </Text>

          {isFullyComplete ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <Text variant="small" color="muted">
                You've completed all the onboarding milestones. Your band is fully set up and ready for collective action!
              </Text>
            </div>
          ) : nextStep && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <Text variant="small" weight="semibold" className="text-blue-700">
                Up next: Step {nextStep}
              </Text>
              <Text variant="small" color="muted">
                Keep up the momentum!
              </Text>
            </div>
          )}

          <Flex justify="center" gap="md">
            <Button variant="primary" onClick={onClose}>
              {isFullyComplete ? 'Celebrate!' : 'Continue'}
            </Button>
          </Flex>
        </div>
      </div>

      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes bounce-in {
          0% {
            transform: scale(0.3);
            opacity: 0;
          }
          50% {
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.95);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-confetti {
          width: 10px;
          height: 10px;
          animation: confetti 3s ease-out forwards;
        }

        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out;
        }
      `}</style>
    </div>
  )
}
