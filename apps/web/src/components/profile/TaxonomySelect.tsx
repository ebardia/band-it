'use client'

import type { ProfileTaxonomyCategory, TaxonomySelection } from '@/lib/endUserProfile'

type Props = {
  categories: ProfileTaxonomyCategory[]
  value: TaxonomySelection
  onChange: (next: TaxonomySelection) => void
  readOnly?: boolean
  idPrefix: string
}

function toggleId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
}

function selectionSummary(cat: ProfileTaxonomyCategory, value: TaxonomySelection): string {
  if (value.categoryIds.includes(cat.id)) {
    return 'All in this category'
  }

  const labels = cat.items
    .filter((item) => value.itemIds.includes(item.id))
    .map((item) => item.label)

  if (labels.length === 0) return 'Choose…'
  if (labels.length <= 2) return labels.join(', ')
  return `${labels.slice(0, 2).join(', ')} +${labels.length - 2} more`
}

export function TaxonomySelect({ categories, value, onChange, readOnly = false, idPrefix }: Props) {
  const selectedEntries: Array<{ key: string; label: string }> = []

  for (const cat of categories) {
    if (value.categoryIds.includes(cat.id)) {
      selectedEntries.push({ key: `cat:${cat.id}`, label: cat.label })
    }
    for (const item of cat.items) {
      if (value.itemIds.includes(item.id)) {
        selectedEntries.push({ key: `item:${item.id}`, label: item.label })
      }
    }
  }

  if (readOnly) {
    if (selectedEntries.length === 0) {
      return <p className="np-profile-read">—</p>
    }
    return (
      <div className="np-chip-row np-chip-row-left" aria-label="Selected">
        {selectedEntries.map((entry) => (
          <span key={entry.key} className="np-chip">
            {entry.label}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="np-taxonomy">
      {categories.map((cat) => {
        const catChecked = value.categoryIds.includes(cat.id)
        const summary = selectionSummary(cat, value)

        return (
          <details key={cat.id} className="np-taxonomy-dropdown">
            <summary className="np-taxonomy-dropdown-trigger">
              <span className="np-taxonomy-dropdown-label">{cat.label}</span>
              <span className="np-taxonomy-dropdown-value">{summary}</span>
            </summary>
            <div className="np-taxonomy-dropdown-panel">
              <label className="np-taxonomy-check np-taxonomy-check--all">
                <input
                  type="checkbox"
                  id={`${idPrefix}-cat-${cat.id}`}
                  checked={catChecked}
                  onChange={() =>
                    onChange({
                      ...value,
                      categoryIds: toggleId(value.categoryIds, cat.id),
                    })
                  }
                />
                <span>All of {cat.label}</span>
              </label>
              {cat.items.map((item) => (
                <label key={item.id} className="np-taxonomy-check np-taxonomy-check--item">
                  <input
                    type="checkbox"
                    id={`${idPrefix}-item-${item.id}`}
                    checked={value.itemIds.includes(item.id)}
                    onChange={() =>
                      onChange({
                        ...value,
                        itemIds: toggleId(value.itemIds, item.id),
                      })
                    }
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </details>
        )
      })}
    </div>
  )
}
