'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
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
  /** URL to navigate to before showing this step */
  navigateTo?: string
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
}

// Stored flow state for cross-page navigation
interface StoredFlowState {
  flow: GuidedFlow
  currentStepIndex: number
  originalUrl: string
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
const ACTIVE_FLOW_KEY = 'bandit_active_flow'

export function GuidedFlowProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [activeFlow, setActiveFlow] = useState<GuidedFlow | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [completedFlows, setCompletedFlows] = useState<string[]>([])
  const [isGoalSelectorOpen, setIsGoalSelectorOpen] = useState(false)
  const [driverInstance, setDriverInstance] = useState<Driver | null>(null)
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)

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

  const markFlowCompleted = useCallback((flowId: string) => {
    setCompletedFlows(prev => {
      if (prev.includes(flowId)) return prev
      return [...prev, flowId]
    })
  }, [])

  // Return to original URL and clean up
  const returnToOriginal = useCallback(() => {
    const stored = sessionStorage.getItem(ACTIVE_FLOW_KEY)
    if (stored) {
      try {
        const state: StoredFlowState = JSON.parse(stored)
        sessionStorage.removeItem(ACTIVE_FLOW_KEY)
        if (state.originalUrl && state.originalUrl !== pathname) {
          router.push(state.originalUrl)
        }
      } catch (e) {
        console.error('Failed to return to original URL:', e)
      }
    }
    sessionStorage.removeItem(ACTIVE_FLOW_KEY)
  }, [router, pathname])

  const stopFlow = useCallback(() => {
    if (driverInstance) {
      driverInstance.destroy()
      setDriverInstance(null)
    }
    setActiveFlow(null)
    setCurrentStep(0)
    setIsRunning(false)
    returnToOriginal()
  }, [driverInstance, returnToOriginal])

  // Run the driver for current step
  const runDriverFromStep = useCallback((flow: GuidedFlow, stepIndex: number, origUrl: string) => {
    // Build steps from current index onwards
    const remainingSteps = flow.steps.slice(stepIndex)

    const driverSteps: DriveStep[] = remainingSteps.map((step, idx) => ({
      element: step.element,
      popover: {
        title: step.title,
        description: step.description,
        side: step.side || 'bottom',
        align: step.align || 'center',
      },
    }))

    const config: Config = {
      showProgress: true,
      steps: driverSteps,
      onCloseClick: () => {
        // User clicked X - stop the flow and return to original
        newDriver.destroy()
        setIsRunning(false)
        setActiveFlow(null)
        setDriverInstance(null)
        sessionStorage.removeItem(ACTIVE_FLOW_KEY)
        if (origUrl && origUrl !== window.location.pathname) {
          router.push(origUrl)
        }
      },
      onDestroyStarted: () => {
        // Check if we're on the last step
        const currentDriverStep = newDriver.getActiveIndex()
        const isLastStep = currentDriverStep === driverSteps.length - 1

        if (isLastStep) {
          // Completed the flow
          markFlowCompleted(flow.id)
          sessionStorage.removeItem(ACTIVE_FLOW_KEY)
          setIsRunning(false)
          setActiveFlow(null)
          // Return to original URL
          if (origUrl && origUrl !== window.location.pathname) {
            router.push(origUrl)
          }
        }
      },
      onNextClick: () => {
        const currentDriverStep = newDriver.getActiveIndex() || 0
        const actualStepIndex = stepIndex + currentDriverStep
        const nextStepIndex = actualStepIndex + 1

        if (nextStepIndex >= flow.steps.length) {
          // This is the last step - done
          markFlowCompleted(flow.id)
          newDriver.destroy()
          setIsRunning(false)
          setActiveFlow(null)
          setDriverInstance(null)
          sessionStorage.removeItem(ACTIVE_FLOW_KEY)
          // Return to original URL
          if (origUrl && origUrl !== window.location.pathname) {
            router.push(origUrl)
          }
          return
        }

        const nextStep = flow.steps[nextStepIndex]

        // Check if next step needs navigation
        if (nextStep.navigateTo && nextStep.navigateTo !== window.location.pathname) {
          // Save state and navigate
          const state: StoredFlowState = {
            flow,
            currentStepIndex: nextStepIndex,
            originalUrl: origUrl,
          }
          sessionStorage.setItem(ACTIVE_FLOW_KEY, JSON.stringify(state))
          newDriver.destroy()
          router.push(nextStep.navigateTo)
        } else {
          // Same page, continue to next step
          newDriver.moveNext()
          setCurrentStep(nextStepIndex)
        }
      },
      onPrevClick: () => {
        const currentDriverStep = newDriver.getActiveIndex() || 0
        const actualStepIndex = stepIndex + currentDriverStep
        const prevStepIndex = actualStepIndex - 1

        if (prevStepIndex < 0) {
          return
        }

        const prevStep = flow.steps[prevStepIndex]

        // Check if prev step needs navigation
        if (prevStep.navigateTo && prevStep.navigateTo !== window.location.pathname) {
          // Save state and navigate
          const state: StoredFlowState = {
            flow,
            currentStepIndex: prevStepIndex,
            originalUrl: origUrl,
          }
          sessionStorage.setItem(ACTIVE_FLOW_KEY, JSON.stringify(state))
          newDriver.destroy()
          router.push(prevStep.navigateTo)
        } else {
          // Same page, go to prev step
          newDriver.movePrevious()
          setCurrentStep(prevStepIndex)
        }
      },
      progressText: `${stepIndex + 1}-{{current}} of ${flow.steps.length}`,
      nextBtnText: stepIndex + driverSteps.length >= flow.steps.length ? 'Done' : 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Done',
      popoverClass: 'bandit-guided-popover',
      stagePadding: 10,
      stageRadius: 8,
      allowClose: true,
    }

    const newDriver = driver(config)
    setDriverInstance(newDriver)
    setActiveFlow(flow)
    setIsRunning(true)
    setCurrentStep(stepIndex)
    setOriginalUrl(origUrl)

    // Small delay to ensure DOM is ready
    setTimeout(() => {
      newDriver.drive()
    }, 300)
  }, [router, markFlowCompleted])

  const startFlow = useCallback((flow: GuidedFlow) => {
    // Stop any existing flow
    if (driverInstance) {
      driverInstance.destroy()
    }

    // Hide goal selector if open
    setIsGoalSelectorOpen(false)

    // Save original URL
    const origUrl = window.location.pathname

    // Check if first step needs navigation
    const firstStep = flow.steps[0]
    if (firstStep.navigateTo && firstStep.navigateTo !== pathname) {
      // Save state and navigate
      const state: StoredFlowState = {
        flow,
        currentStepIndex: 0,
        originalUrl: origUrl,
      }
      sessionStorage.setItem(ACTIVE_FLOW_KEY, JSON.stringify(state))
      router.push(firstStep.navigateTo)
      return
    }

    // Start immediately
    runDriverFromStep(flow, 0, origUrl)
  }, [driverInstance, pathname, router, runDriverFromStep])

  // Check for pending flow after navigation
  useEffect(() => {
    const stored = sessionStorage.getItem(ACTIVE_FLOW_KEY)
    if (stored && !isRunning) {
      try {
        const state: StoredFlowState = JSON.parse(stored)
        const currentStepNav = state.flow.steps[state.currentStepIndex]?.navigateTo

        // Check if we're on the right page
        if (!currentStepNav || currentStepNav === pathname) {
          // We're on the right page, start the driver
          setTimeout(() => {
            runDriverFromStep(state.flow, state.currentStepIndex, state.originalUrl)
          }, 500)
        }
      } catch (e) {
        console.error('Failed to resume flow:', e)
        sessionStorage.removeItem(ACTIVE_FLOW_KEY)
      }
    }
  }, [pathname, isRunning, runDriverFromStep])

  const isFlowCompleted = useCallback((flowId: string) => {
    return completedFlows.includes(flowId)
  }, [completedFlows])

  const resetCompletedFlows = useCallback(() => {
    setCompletedFlows([])
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
