'use client'

import { useEffect, useRef, useState } from 'react'
import { trpc } from '@/lib/trpc'
import type { UsLocationOption } from '@/lib/endUserProfile'

type Props = {
  valueId: string
  valueLabel: string
  onChange: (location: UsLocationOption | null) => void
  disabled?: boolean
  required?: boolean
}

export function LocationAutocomplete({
  valueId,
  valueLabel,
  onChange,
  disabled = false,
  required = false,
}: Props) {
  const [query, setQuery] = useState(valueLabel)
  const [open, setOpen] = useState(false)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(valueLabel)
  }, [valueLabel])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 200)
    return () => clearTimeout(t)
  }, [query])

  const { data, isFetching } = trpc.profile.searchLocations.useQuery(
    { query: debouncedQuery, limit: 12 },
    { enabled: open && debouncedQuery.trim().length >= 1 && !disabled }
  )

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const locations = data?.locations ?? []

  return (
    <div className="np-location-wrap" ref={wrapRef}>
      <label className="np-label" htmlFor="profile-location">
        Place {required ? '(required)' : ''}
      </label>
      <input
        id="profile-location"
        className="np-field"
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        disabled={disabled}
        required={required}
        value={query}
        placeholder="City or ZIP — where your edition lands…"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          if (valueId) onChange(null)
        }}
      />
      {open && debouncedQuery.trim() && !disabled ? (
        <ul className="np-location-list" role="listbox">
          {isFetching ? (
            <li className="np-location-option np-location-option--muted">Searching…</li>
          ) : locations.length === 0 ? (
            <li className="np-location-option np-location-option--muted">No matches — try city or ZIP</li>
          ) : (
            locations.map((loc) => (
              <li key={loc.id}>
                <button
                  type="button"
                  className="np-location-option"
                  role="option"
                  aria-selected={loc.id === valueId}
                  onClick={() => {
                    onChange(loc)
                    setQuery(loc.label)
                    setOpen(false)
                  }}
                >
                  {loc.label}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
      <p className="np-field-hint">Pick from the list—we don&apos;t invent coordinates from thin air.</p>
    </div>
  )
}
