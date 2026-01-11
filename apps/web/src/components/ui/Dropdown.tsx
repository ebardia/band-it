'use client'

import { useState, useRef, useEffect } from 'react'
import { theme } from '@band-it/shared'

interface DropdownProps {
  trigger: React.ReactNode
  children: React.ReactNode
}

export function Dropdown({ trigger, children }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={dropdownRef} className={theme.components.dropdown.wrapper}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={theme.components.dropdown.trigger}
      >
        {trigger}
      </button>
      
      {isOpen && (
        <div className={theme.components.dropdown.menu}>
          {children}
        </div>
      )}
    </div>
  )
}

interface DropdownItemProps {
  onClick: () => void
  children: React.ReactNode
}

export function DropdownItem({ onClick, children }: DropdownItemProps) {
  return (
    <button
      onClick={onClick}
      className={theme.components.dropdown.item}
    >
      {children}
    </button>
  )
}