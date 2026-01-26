'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { driver, Driver, DriveStep, Config } from 'driver.js'
import 'driver.js/dist/driver.css'
import './guided-flow.css'

// Flow step definition
export interface FlowStep {
  /** CSS selector for the element to highlight */
  element?: string
  /** Title shown in the popover */
  title: string
  /** Description/instruction text */
  description: string
  /** Which side to show the popover */
  side?: 'top' | 'bottom' | 'left' | 'right'
  /** Alignment of the popover */
  align?: 'start' | 'center' | 'end'
  /** Action to perform when this step is shown */
  onShow?: () => void
  /** Action to perform when moving to next step */
  onNext?: () => void
}

// Flow definition
export interface GuidedFlow {
  /** Unique identifier for this flow */
  id: string
  /** Display name */
  name: string
  /** Description of what this flow teaches */
  description: string
  /** Icon or emoji for the flow */
  icon?: string
  /** The steps in this flow */
  steps: FlowStep[]
  /** Category for grouping flows */
  category?: 'getting-started' | 'bands' | 'proposals' | 'projects' | 'admin'
  /** URL to navigate to before starting (optional) */
  startUrl?: string
}

// Context state
interface GuidedFlowState {
  /** Currently active flow */
  activeFlow: GuidedFlow | null
  /** Current step index */
  currentStep: number
  /** Whether a flow is running */
  isRunning: boolean
  /** Flows the user has completed */
  completedFlows: string[]
  /** Start a guided flow */
  startFlow: (flow: GuidedFlow) => void
  /** Stop the current flow */
  stopFlow: () => void
  /** Mark a flow as completed */
  markFlowCompleted: (flowId: string) => void
  /** Check if a flow is completed */
  isFlowCompleted: (flowId: string) => boolean
  /** Reset all completed flows */
  resetCompletedFlows: () => void
  /** Show the goal selector modal */
  showGoalSelector: () => void
  /** Hide the goal selector modal */
  hideGoalSelector: () => void
  /** Whether goal selector is visible */
  isGoalSelectorOpen: boolean
}

const GuidedFlowContext = createContext<GuidedFlowState | null>(null)

const COMPLETED_FLOWS_KEY = 'bandit_completed_flows'
const HAS_SEEN_WELCOME_KEY = 'bandit_has_seen_welcome'

export function GuidedFlowProvider({ children }: { children: ReactNode }) {
  const [activeFlow, setActiveFlow] = useState<GuidedFlow | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [completedFlows, setCompletedFlows] = useState<string[]>([])
  const [isGoalSelectorOpen, setIsGoalSelectorOpen] = useState(false)
  const [driverInstance, setDriverInstance] = useState<Driver | null>(null)

  // Load completed flows from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(COMPLETED_FLOWS_KEY)
    if (saved) {
      try {
        setCompletedFlows(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse completed flows:', e)
      }
    }
  }, [])

  // Save completed flows to localStorage
  useEffect(() => {
    localStorage.setItem(COMPLETED_FLOWS_KEY, JSON.stringify(completedFlows))
  }, [completedFlows])

  const stopFlow = useCallback(() => {
    if (driverInstance) {
      driverInstance.destroy()
      setDriverInstance(null)
    }
    setActiveFlow(null)
    setCurrentStep(0)
    setIsRunning(false)
  }, [driverInstance])

  const markFlowCompleted = useCallback((flowId: string) => {
    setCompletedFlows(prev => {
      if (prev.includes(flowId)) return prev
      return [...prev, flowId]
    })
  }, [])

  const startFlow = useCallback((flow: GuidedFlow) => {
    // Stop any existing flow
    if (driverInstance) {
      driverInstance.destroy()
    }

    // Hide goal selector if open
    setIsGoalSelectorOpen(false)

    // Navigate to start URL if specified
    if (flow.startUrl && typeof window !== 'undefined') {
      window.location.href = flow.startUrl
      // Store flow to start after navigation
      sessionStorage.setItem('pending_flow', JSON.stringify(flow))
      return
    }

    // Convert our steps to Driver.js format
    const driverSteps: DriveStep[] = flow.steps.map((step, index) => ({
      element: step.element,
      popover: {
        title: step.title,
        description: step.description,
        side: step.side || 'bottom',
        align: step.align || 'center',
        onNextClick: () => {
          step.onNext?.()
          if (index === flow.steps.length - 1) {
            // Last step - mark as completed
            markFlowCompleted(flow.id)
            newDriver.destroy()
            setIsRunning(false)
            setActiveFlow(null)
          } else {
            newDriver.moveNext()
          }
        },
        onPrevClick: () => {
          newDriver.movePrevious()
        },
      },
    }))

    const config: Config = {
      showProgress: true,
      steps: driverSteps,
      onDestroyed: () => {
        setIsRunning(false)
        setActiveFlow(null)
        setDriverInstance(null)
      },
      onHighlightStarted: (element, step) => {
        const stepIndex = driverSteps.indexOf(step)
        setCurrentStep(stepIndex)
        const flowStep = flow.steps[stepIndex]
        flowStep?.onShow?.()
      },
      progressText: '{{current}} of {{total}}',
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Done',
      popoverClass: 'bandit-guided-popover',
      stagePadding: 10,
      stageRadius: 8,
    }

    const newDriver = driver(config)
    setDriverInstance(newDriver)
    setActiveFlow(flow)
    setIsRunning(true)
    setCurrentStep(0)

    // Small delay to ensure DOM is ready
    setTimeout(() => {
      newDriver.drive()
    }, 100)
  }, [driverInstance, markFlowCompleted])

  // Check for pending flow after navigation
  useEffect(() => {
    const pendingFlow = sessionStorage.getItem('pending_flow')
    if (pendingFlow) {
      sessionStorage.removeItem('pending_flow')
      try {
        const flow = JSON.parse(pendingFlow) as GuidedFlow
        // Don't navigate again, just start the flow
        const flowWithoutUrl = { ...flow, startUrl: undefined }
        setTimeout(() => startFlow(flowWithoutUrl), 500)
      } catch (e) {
        console.error('Failed to parse pending flow:', e)
      }
    }
  }, [startFlow])

  const isFlowCompleted = useCallback((flowId: string) => {
    return completedFlows.includes(flowId)
  }, [completedFlows])

  const resetCompletedFlows = useCallback(() => {
    setCompletedFlows([])
    localStorage.removeItem(HAS_SEEN_WELCOME_KEY)
  }, [])

  const showGoalSelector = useCallback(() => {
    setIsGoalSelectorOpen(true)
  }, [])

  const hideGoalSelector = useCallback(() => {
    setIsGoalSelectorOpen(false)
  }, [])

  return (
    <GuidedFlowContext.Provider
      value={{
        activeFlow,
        currentStep,
        isRunning,
        completedFlows,
        startFlow,
        stopFlow,
        markFlowCompleted,
        isFlowCompleted,
        resetCompletedFlows,
        showGoalSelector,
        hideGoalSelector,
        isGoalSelectorOpen,
      }}
    >
      {children}
    </GuidedFlowContext.Provider>
  )
}

export function useGuidedFlow() {
  const context = useContext(GuidedFlowContext)
  if (!context) {
    throw new Error('useGuidedFlow must be used within a GuidedFlowProvider')
  }
  return context
}
