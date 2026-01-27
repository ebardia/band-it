'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react'
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
  activeFlow: GuidedFlow | null
  currentStep: number
  isRunning: boolean
  completedFlows: string[]
  startFlow: (flow: GuidedFlow) => void
  stopFlow: () => void
  markFlowCompleted: (flowId: string) => void
  isFlowCompleted: (flowId: string) => boolean
  resetCompletedFlows: () => void
  showGoalSelector: () => void
  hideGoalSelector: () => void
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
  const driverRef = useRef<Driver | null>(null)
  const originalUrlRef = useRef<string>('')
  const isInitialized = useRef(false)

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
    isInitialized.current = true
  }, [])

  // Save completed flows to localStorage
  useEffect(() => {
    if (isInitialized.current) {
      localStorage.setItem(COMPLETED_FLOWS_KEY, JSON.stringify(completedFlows))
    }
  }, [completedFlows])

  const markFlowCompleted = useCallback((flowId: string) => {
    setCompletedFlows(prev => {
      if (prev.includes(flowId)) return prev
      return [...prev, flowId]
    })
  }, [])

  const cleanupAndReturn = useCallback((shouldReturn: boolean = true) => {
    if (driverRef.current) {
      driverRef.current.destroy()
      driverRef.current = null
    }
    setActiveFlow(null)
    setCurrentStep(0)
    setIsRunning(false)

    const origUrl = originalUrlRef.current
    sessionStorage.removeItem(ACTIVE_FLOW_KEY)
    originalUrlRef.current = ''

    if (shouldReturn && origUrl && origUrl !== window.location.pathname) {
      router.push(origUrl)
    }
  }, [router])

  const stopFlow = useCallback(() => {
    cleanupAndReturn(true)
  }, [cleanupAndReturn])

  // Run driver for a specific step (and subsequent steps on same page)
  const runFromStep = useCallback((flow: GuidedFlow, stepIdx: number, origUrl: string) => {
    // Clean up any existing driver
    if (driverRef.current) {
      driverRef.current.destroy()
      driverRef.current = null
    }

    // Find consecutive steps on current page
    const currentPath = window.location.pathname
    const stepsOnThisPage: { step: FlowStep; globalIndex: number }[] = []

    for (let i = stepIdx; i < flow.steps.length; i++) {
      const step = flow.steps[i]
      const stepPath = step.navigateTo || currentPath
      if (stepPath === currentPath) {
        stepsOnThisPage.push({ step, globalIndex: i })
      } else {
        break // Stop at first step that needs navigation
      }
    }

    if (stepsOnThisPage.length === 0) {
      // No steps for this page, need to navigate
      const nextStep = flow.steps[stepIdx]
      if (nextStep?.navigateTo) {
        const state: StoredFlowState = { flow, currentStepIndex: stepIdx, originalUrl: origUrl }
        sessionStorage.setItem(ACTIVE_FLOW_KEY, JSON.stringify(state))
        router.push(nextStep.navigateTo)
      }
      return
    }

    // Build driver steps
    const driverSteps: DriveStep[] = stepsOnThisPage.map(({ step }) => ({
      element: step.element,
      popover: {
        title: step.title,
        description: step.description,
        side: step.side || 'bottom',
        align: step.align || 'center',
      },
    }))

    // Calculate if there are more steps after this page
    const lastStepOnPage = stepsOnThisPage[stepsOnThisPage.length - 1]
    const hasMoreSteps = lastStepOnPage.globalIndex < flow.steps.length - 1
    const isLastPage = !hasMoreSteps

    const config: Config = {
      showProgress: true,
      steps: driverSteps,
      progressText: `Step ${stepIdx + 1}-{{current}} of ${flow.steps.length}`,
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Done',
      popoverClass: 'bandit-guided-popover',
      stagePadding: 10,
      stageRadius: 8,
      allowClose: true,
      onCloseClick: () => {
        cleanupAndReturn(true)
      },
      onNextClick: () => {
        const driverIndex = newDriver.getActiveIndex() || 0
        const isLastStepOnPage = driverIndex === driverSteps.length - 1

        if (isLastStepOnPage) {
          const currentGlobalIndex = stepsOnThisPage[driverIndex].globalIndex
          const nextGlobalIndex = currentGlobalIndex + 1

          if (nextGlobalIndex >= flow.steps.length) {
            // Flow complete
            markFlowCompleted(flow.id)
            cleanupAndReturn(true)
          } else {
            // Navigate to next step
            const nextStep = flow.steps[nextGlobalIndex]
            if (nextStep.navigateTo && nextStep.navigateTo !== currentPath) {
              // Need to navigate
              const state: StoredFlowState = { flow, currentStepIndex: nextGlobalIndex, originalUrl: origUrl }
              sessionStorage.setItem(ACTIVE_FLOW_KEY, JSON.stringify(state))
              newDriver.destroy()
              driverRef.current = null
              router.push(nextStep.navigateTo)
            } else {
              // Shouldn't happen but handle it
              newDriver.moveNext()
            }
          }
        } else {
          newDriver.moveNext()
        }
      },
      onPrevClick: () => {
        const driverIndex = newDriver.getActiveIndex() || 0

        if (driverIndex === 0) {
          const currentGlobalIndex = stepsOnThisPage[0].globalIndex
          const prevGlobalIndex = currentGlobalIndex - 1

          if (prevGlobalIndex >= 0) {
            const prevStep = flow.steps[prevGlobalIndex]
            if (prevStep.navigateTo && prevStep.navigateTo !== currentPath) {
              // Need to navigate back
              const state: StoredFlowState = { flow, currentStepIndex: prevGlobalIndex, originalUrl: origUrl }
              sessionStorage.setItem(ACTIVE_FLOW_KEY, JSON.stringify(state))
              newDriver.destroy()
              driverRef.current = null
              router.push(prevStep.navigateTo)
            } else {
              newDriver.movePrevious()
            }
          }
        } else {
          newDriver.movePrevious()
        }
      },
    }

    const newDriver = driver(config)
    driverRef.current = newDriver
    setActiveFlow(flow)
    setCurrentStep(stepIdx)
    setIsRunning(true)
    originalUrlRef.current = origUrl

    // Start after a delay for DOM to be ready
    setTimeout(() => {
      newDriver.drive()
    }, 400)
  }, [router, markFlowCompleted, cleanupAndReturn])

  const startFlow = useCallback((flow: GuidedFlow) => {
    // Hide goal selector
    setIsGoalSelectorOpen(false)

    // Save original URL
    const origUrl = window.location.pathname

    // Check if first step needs navigation
    const firstStep = flow.steps[0]
    if (firstStep.navigateTo && firstStep.navigateTo !== pathname) {
      // Save state and navigate
      const state: StoredFlowState = { flow, currentStepIndex: 0, originalUrl: origUrl }
      sessionStorage.setItem(ACTIVE_FLOW_KEY, JSON.stringify(state))
      router.push(firstStep.navigateTo)
    } else {
      // Start immediately
      runFromStep(flow, 0, origUrl)
    }
  }, [pathname, router, runFromStep])

  // Resume flow after navigation
  useEffect(() => {
    if (!isInitialized.current) return
    if (isRunning) return

    const stored = sessionStorage.getItem(ACTIVE_FLOW_KEY)
    if (!stored) return

    try {
      const state: StoredFlowState = JSON.parse(stored)
      const currentStepNav = state.flow.steps[state.currentStepIndex]?.navigateTo

      // Check if we're on the right page
      if (!currentStepNav || currentStepNav === pathname) {
        // Small delay to let page render
        const timer = setTimeout(() => {
          runFromStep(state.flow, state.currentStepIndex, state.originalUrl)
        }, 600)
        return () => clearTimeout(timer)
      }
    } catch (e) {
      console.error('Failed to resume flow:', e)
      sessionStorage.removeItem(ACTIVE_FLOW_KEY)
    }
  }, [pathname, isRunning, runFromStep])

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
