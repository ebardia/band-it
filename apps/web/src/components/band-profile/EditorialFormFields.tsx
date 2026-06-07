'use client'

import type { ReactNode } from 'react'

export function EditorialFieldGroup({
  kicker,
  title,
  children,
}: {
  kicker?: string
  title: string
  children: ReactNode
}) {
  return (
    <section className="np-welcome-section">
      {kicker ? <p className="np-cat np-cat-left">{kicker}</p> : null}
      <h2 className="np-picks-header np-picks-header-left">{title}</h2>
      <div className="np-register-form">{children}</div>
    </section>
  )
}

export function EditorialLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <label className="np-label" htmlFor={htmlFor}>
      {children}
    </label>
  )
}

export function EditorialHint({ children }: { children: ReactNode }) {
  return <p className="np-field-hint">{children}</p>
}

export function EditorialError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="np-field-hint" style={{ color: '#b91c1c' }}>{message}</p>
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { error?: string }

export function EditorialInput({ error, className, ...props }: InputProps) {
  return (
    <>
      <input className={`np-field${className ? ` ${className}` : ''}`} {...props} />
      <EditorialError message={error} />
    </>
  )
}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }

export function EditorialTextarea({ error, className, ...props }: TextareaProps) {
  return (
    <>
      <textarea className={`np-field${className ? ` ${className}` : ''}`} {...props} />
      <EditorialError message={error} />
    </>
  )
}

export function EditorialSelect({
  error,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: string }) {
  return (
    <>
      <select className="np-field" {...props}>
        {children}
      </select>
      <EditorialError message={error} />
    </>
  )
}

export function EditorialChecklist({
  options,
  selected,
  onChange,
  otherValue,
  onOtherChange,
  otherLabel = 'Describe other',
}: {
  options: readonly { id: string; label: string }[]
  selected: string[]
  onChange: (ids: string[]) => void
  otherValue?: string
  onOtherChange?: (value: string) => void
  otherLabel?: string
}) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id))
    } else {
      onChange([...selected, id])
    }
  }

  return (
    <div className="np-checklist-grid">
      {options.map((option) => (
        <label key={option.id} className="np-consent-row">
          <input
            type="checkbox"
            checked={selected.includes(option.id)}
            onChange={() => toggle(option.id)}
          />
          <span>{option.label}</span>
        </label>
      ))}
      {selected.includes('OTHER') && onOtherChange ? (
        <div style={{ gridColumn: '1 / -1' }}>
          <EditorialLabel htmlFor="checklist-other">{otherLabel}</EditorialLabel>
          <EditorialInput
            id="checklist-other"
            type="text"
            value={otherValue ?? ''}
            onChange={(e) => onOtherChange(e.target.value)}
            placeholder="Tell us more…"
          />
        </div>
      ) : null}
    </div>
  )
}

export function EditorialAddressFields({
  values,
  onChange,
  errors = {},
}: {
  values: {
    addressLine1: string
    addressLine2: string
    city: string
    state: string
    zipcode: string
    country: string
  }
  onChange: (field: keyof typeof values, value: string) => void
  errors?: Partial<Record<keyof typeof values, string>>
}) {
  return (
    <>
      <div>
        <EditorialLabel htmlFor="address-line1">Street address</EditorialLabel>
        <EditorialInput
          id="address-line1"
          required
          value={values.addressLine1}
          onChange={(e) => onChange('addressLine1', e.target.value)}
          error={errors.addressLine1}
        />
      </div>
      <div>
        <EditorialLabel htmlFor="address-line2">Suite / unit (optional)</EditorialLabel>
        <EditorialInput
          id="address-line2"
          value={values.addressLine2}
          onChange={(e) => onChange('addressLine2', e.target.value)}
        />
      </div>
      <div className="np-form-row-2">
        <div>
          <EditorialLabel htmlFor="address-city">City</EditorialLabel>
          <EditorialInput
            id="address-city"
            required
            value={values.city}
            onChange={(e) => onChange('city', e.target.value)}
            error={errors.city}
          />
        </div>
        <div>
          <EditorialLabel htmlFor="address-state">State</EditorialLabel>
          <EditorialInput
            id="address-state"
            required
            value={values.state}
            onChange={(e) => onChange('state', e.target.value)}
            error={errors.state}
          />
        </div>
      </div>
      <div className="np-form-row-2">
        <div>
          <EditorialLabel htmlFor="address-zip">ZIP / postal code</EditorialLabel>
          <EditorialInput
            id="address-zip"
            required
            maxLength={10}
            value={values.zipcode}
            onChange={(e) => onChange('zipcode', e.target.value)}
            error={errors.zipcode}
          />
        </div>
        <div>
          <EditorialLabel htmlFor="address-country">Country</EditorialLabel>
          <EditorialInput
            id="address-country"
            value={values.country}
            onChange={(e) => onChange('country', e.target.value)}
          />
        </div>
      </div>
    </>
  )
}

export function EditorialSocialFields({
  values,
  onChange,
}: {
  values: {
    websiteUrl: string
    facebookUrl: string
    instagramUrl: string
    xUrl: string
    tiktokUrl: string
    youtubeUrl: string
  }
  onChange: (field: keyof typeof values, value: string) => void
}) {
  const fields: { key: keyof typeof values; label: string; placeholder: string }[] = [
    { key: 'websiteUrl', label: 'Business URL', placeholder: 'https://yoursite.com' },
    { key: 'facebookUrl', label: 'Facebook', placeholder: 'https://facebook.com/…' },
    { key: 'instagramUrl', label: 'Instagram', placeholder: 'https://instagram.com/…' },
    { key: 'xUrl', label: 'X', placeholder: 'https://x.com/…' },
    { key: 'tiktokUrl', label: 'TikTok', placeholder: 'https://tiktok.com/@…' },
    { key: 'youtubeUrl', label: 'YouTube', placeholder: 'https://youtube.com/…' },
  ]

  return (
    <>
      {fields.map(({ key, label, placeholder }) => (
        <div key={key}>
          <EditorialLabel htmlFor={`social-${key}`}>{label}</EditorialLabel>
          <EditorialInput
            id={`social-${key}`}
            type="url"
            value={values[key]}
            onChange={(e) => onChange(key, e.target.value)}
            placeholder={placeholder}
          />
        </div>
      ))}
    </>
  )
}

export function EditorialLogoUpload({
  logoUrl,
  uploadedName,
  isUploading,
  onUpload,
  onRemove,
}: {
  logoUrl: string
  uploadedName: string | null
  isUploading: boolean
  onUpload: (file: File) => void
  onRemove: () => void
}) {
  if (logoUrl) {
    return (
      <div className="np-logo-preview">
        <img src={logoUrl} alt="Logo preview" className="np-logo-preview-img" />
        <div>
          <p className="np-field-hint">{uploadedName || 'Logo uploaded'}</p>
          <button type="button" className="np-action np-action-left" onClick={onRemove}>
            Remove logo
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <label className="np-logo-upload-btn">
        {isUploading ? 'Uploading…' : 'Upload logo'}
        <input
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="sr-only"
          disabled={isUploading}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onUpload(file)
          }}
        />
      </label>
      <EditorialHint>JPEG, PNG, GIF, or WebP — max 5 MB</EditorialHint>
    </div>
  )
}
