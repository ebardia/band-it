'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { driver, Driver, DriveStep, Config } from 'driver.js'
import 'driver.js/dist/driver.css'
import './guided-flow.css'
import { getPageHelp, hasPageHelp, PageHelp } from './pageHelp'

interface PageHelpContextState {
  /** Whether help is available for the current page */
  hasHelp: boolean
  /** Whether help is currently running */
  isRunning: boolean
  /** Current page help info (if available) */
  currentPageHelp: PageHelp | null
  /** Start the help tour for the current page */
  startHelp: () => void
  /** Stop the current help tour */
  stopHelp: () => void
}

const PageHelpContext = createContext<PageHelpContextState | null>(null)

export function GuidedFlowProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [isRunning, setIsRunning] = useState(false)
  const [currentPageHelp, setCurrentPageHelp] = useState<PageHelp | null>(null)
  const driverRef = useRef<Driver | null>(null)

  // Update page help when pathname changes
  useEffect(() => {
    const help = getPageHelp(pathname)
    setCurrentPageHelp(help)

    // Stop any running help when navigating
    if (driverRef.current) {
      driverRef.current.destroy()
      driverRef.current = null
      setIsRunning(false)
    }
  }, [pathname])

  const stopHelp = useCallback(() => {
    if (driverRef.current) {
      driverRef.current.destroy()
      driverRef.current = null
    }
    setIsRunning(false)
  }, [])

  const startHelp = useCallback(() => {
    const pageHelp = getPageHelp(pathname)
    if (!pageHelp) return

    // Clean up any existing driver
    if (driverRef.current) {
      driverRef.current.destroy()
      driverRef.current = null
    }

    // Convert steps to driver format
    const driverSteps: DriveStep[] = pageHelp.steps.map(step => ({
      element: step.element,
      popover: {
        title: step.title,
        description: step.description,
        side: step.side || 'bottom',
        align: 'center' as const,
      },
    }))

    const config: Config = {
      showProgress: true,
      steps: driverSteps,
      progressText: '{{current}} of {{total}}',
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Done',
      popoverClass: 'bandit-guided-popover',
      stagePadding: 10,
      stageRadius: 8,
      allowClose: true,
      onCloseClick: () => {
        stopHelp()
      },
      onDestroyStarted: () => {
        setIsRunning(false)
        driverRef.current = null
      },
    }

    const newDriver = driver(config)
    driverRef.current = newDriver
    setIsRunning(true)

    // Start after a small delay for DOM to be ready
    setTimeout(() => {
      newDriver.drive()
    }, 200)
  }, [pathname, stopHelp])

  const hasHelp = hasPageHelp(pathname)

  return (
    <PageHelpContext.Provider
      value={{
        hasHelp,
        isRunning,
        currentPageHelp,
        startHelp,
        stopHelp,
      }}
    >
      {children}
    </PageHelpContext.Provider>
  )
}

export function usePageHelp() {
  const context = useContext(PageHelpContext)
  if (!context) {
    throw new Error('usePageHelp must be used within a GuidedFlowProvider')
  }
  return context
}

// Legacy export for backwards compatibility
export const useGuidedFlow = usePageHelp

// Re-export types for convenience
export type { PageHelp, HelpStep } from './pageHelp'
