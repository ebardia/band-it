'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface HelpContextState {
  isOpen: boolean
  toggle: () => void
  close: () => void
}

const HelpContext = createContext<HelpContextState | null>(null)

export function HelpProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const toggle = useCallback(() => setIsOpen(prev => !prev), [])
  const close = useCallback(() => setIsOpen(false), [])

  return (
    <HelpContext.Provider value={{ isOpen, toggle, close }}>
      {children}
    </HelpContext.Provider>
  )
}

export function useHelp() {
  const context = useContext(HelpContext)
  if (!context) {
    throw new Error('useHelp must be used within a HelpProvider')
  }
  return context
}
