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

export function TaxonomySelect({ categories, value, onChange, readOnly = false, idPrefix }: Props) {
  const selectedLabels: string[] = []

  for (const cat of categories) {
    if (value.categoryIds.includes(cat.id)) selectedLabels.push(cat.label)
    for (const item of cat.items) {
      if (value.itemIds.includes(item.id)) selectedLabels.push(item.label)
    }
  }

  if (readOnly) {
    if (selectedLabels.length === 0) {
      return <p className="np-profile-read">—</p>
    }
    return (
      <div className="np-chip-row np-chip-row-left" aria-label="Selected">
        {selectedLabels.map((label) => (
          <span key={label} className="np-chip">
            {label}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="np-taxonomy">
      {categories.map((cat) => {
        const catChecked = value.categoryIds.includes(cat.id)
        return (
          <fieldset key={cat.id} className="np-taxonomy-group">
            <legend className="np-taxonomy-cat">
              <label className="np-taxonomy-check">
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
                <span>{cat.label}</span>
              </label>
            </legend>
            <div className="np-taxonomy-items">
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
          </fieldset>
        )
      })}
    </div>
  )
}
