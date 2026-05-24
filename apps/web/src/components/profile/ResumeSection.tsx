'use client'

import { useRef, useState } from 'react'
import type {
  CertificationEntry,
  EducationEntry,
  WorkExperienceEntry,
} from '@/lib/endUserProfile'

const RESUME_ACCEPT =
  'application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain'

const RESUME_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
])

type Props = {
  resumeText: string
  resumeFileName: string | null
  workExperience: WorkExperienceEntry[]
  education: EducationEntry[]
  certifications: CertificationEntry[]
  readOnly?: boolean
  isParsing?: boolean
  onResumeTextChange: (text: string) => void
  onFileSelect: (file: { fileName: string; mimeType: string; base64Data: string }) => void
  onParse: () => void
  onWorkChange: (entries: WorkExperienceEntry[]) => void
  onEducationChange: (entries: EducationEntry[]) => void
  onCertificationsChange: (entries: CertificationEntry[]) => void
}

function emptyWork(): WorkExperienceEntry {
  return { title: '', org: '', startDate: '', endDate: '', description: '' }
}

function emptyEducation(): EducationEntry {
  return { degree: '', institution: '', startDate: '', endDate: '' }
}

function emptyCert(): CertificationEntry {
  return { name: '', issuer: '', date: '' }
}

export function ResumeSection({
  resumeText,
  resumeFileName,
  workExperience,
  education,
  certifications,
  readOnly = false,
  isParsing = false,
  onResumeTextChange,
  onFileSelect,
  onParse,
  onWorkChange,
  onEducationChange,
  onCertificationsChange,
}: Props) {
  const [uploadError, setUploadError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    setUploadError(null)
    if (!RESUME_MIMES.has(file.type)) {
      setUploadError('Only PDF, DOCX, and TXT files are accepted.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File too large. Maximum size: 10MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      onFileSelect({
        fileName: file.name,
        mimeType: file.type,
        base64Data: base64.split(',')[1],
      })
    }
    reader.readAsDataURL(file)
  }

  if (readOnly) {
    return (
      <>
        <p className="np-profile-read">
          {resumeText.trim()
            ? `${resumeText.trim().slice(0, 280)}${resumeText.length > 280 ? '…' : ''}`
            : resumeFileName
              ? `Uploaded: ${resumeFileName}`
              : '—'}
        </p>
        {workExperience.length > 0 ? (
          <div className="np-resume-block">
            <p className="np-cat np-cat-left">Experience</p>
            {workExperience.map((w, i) => (
              <div key={i} className="np-resume-entry">
                <p className="np-resume-entry-title">
                  {w.title || 'Role'} · {w.org || 'Organization'}
                </p>
                {(w.startDate || w.endDate) && (
                  <p className="np-field-hint">{[w.startDate, w.endDate].filter(Boolean).join(' – ')}</p>
                )}
                {w.description ? <p className="np-profile-read">{w.description}</p> : null}
              </div>
            ))}
          </div>
        ) : null}
        {education.length > 0 ? (
          <div className="np-resume-block">
            <p className="np-cat np-cat-left">Education</p>
            {education.map((e, i) => (
              <div key={i} className="np-resume-entry">
                <p className="np-resume-entry-title">
                  {e.degree || 'Degree'} · {e.institution || 'Institution'}
                </p>
              </div>
            ))}
          </div>
        ) : null}
        {certifications.length > 0 ? (
          <div className="np-resume-block">
            <p className="np-cat np-cat-left">Certifications</p>
            {certifications.map((c, i) => (
              <div key={i} className="np-resume-entry">
                <p className="np-resume-entry-title">{c.name}</p>
              </div>
            ))}
          </div>
        ) : null}
      </>
    )
  }

  return (
    <>
      <label className="np-label" htmlFor="resume-paste">
        Paste resume (required if no file)
      </label>
      <textarea
        id="resume-paste"
        className="np-field"
        rows={8}
        value={resumeText}
        placeholder="Paste your resume text here…"
        onChange={(e) => onResumeTextChange(e.target.value)}
      />

      <p className="np-label">Or upload</p>
      <div
        className="np-resume-upload"
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={RESUME_ACCEPT}
          className="np-resume-upload-input"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
            e.target.value = ''
          }}
        />
        <p className="np-profile-read" style={{ margin: 0 }}>
          {resumeFileName ? `Selected: ${resumeFileName}` : 'PDF, DOCX, or TXT — drop or click'}
        </p>
      </div>
      {uploadError ? <p className="np-field-hint" style={{ color: 'var(--np-accent)' }}>{uploadError}</p> : null}

      <div className="np-profile-actions np-profile-actions--inline">
        <button
          type="button"
          className="np-profile-btn np-profile-btn-primary"
          disabled={isParsing || (!resumeText.trim() && !resumeFileName)}
          onClick={onParse}
        >
          {isParsing ? 'Parsing…' : 'Parse resume with AI'}
        </button>
      </div>
      <p className="np-field-hint">
        Parsing fills work, education, certifications, and suggests skills. You can edit everything after.
      </p>

      <div className="np-resume-block">
        <div className="np-resume-block-head">
          <p className="np-cat np-cat-left">Work experience</p>
          <button
            type="button"
            className="np-profile-btn"
            onClick={() => onWorkChange([...workExperience, emptyWork()])}
          >
            Add role
          </button>
        </div>
        {workExperience.map((w, i) => (
          <div key={i} className="np-resume-edit-card">
            <input
              className="np-field"
              placeholder="Title"
              value={w.title}
              onChange={(e) => {
                const next = [...workExperience]
                next[i] = { ...w, title: e.target.value }
                onWorkChange(next)
              }}
            />
            <input
              className="np-field"
              placeholder="Organization"
              value={w.org}
              onChange={(e) => {
                const next = [...workExperience]
                next[i] = { ...w, org: e.target.value }
                onWorkChange(next)
              }}
            />
            <div className="np-resume-dates">
              <input
                className="np-field"
                placeholder="Start"
                value={w.startDate ?? ''}
                onChange={(e) => {
                  const next = [...workExperience]
                  next[i] = { ...w, startDate: e.target.value }
                  onWorkChange(next)
                }}
              />
              <input
                className="np-field"
                placeholder="End"
                value={w.endDate ?? ''}
                onChange={(e) => {
                  const next = [...workExperience]
                  next[i] = { ...w, endDate: e.target.value }
                  onWorkChange(next)
                }}
              />
            </div>
            <textarea
              className="np-field"
              rows={3}
              placeholder="Description"
              value={w.description ?? ''}
              onChange={(e) => {
                const next = [...workExperience]
                next[i] = { ...w, description: e.target.value }
                onWorkChange(next)
              }}
            />
            <button
              type="button"
              className="np-profile-btn"
              onClick={() => onWorkChange(workExperience.filter((_, j) => j !== i))}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="np-resume-block">
        <div className="np-resume-block-head">
          <p className="np-cat np-cat-left">Education</p>
          <button
            type="button"
            className="np-profile-btn"
            onClick={() => onEducationChange([...education, emptyEducation()])}
          >
            Add school
          </button>
        </div>
        {education.map((e, i) => (
          <div key={i} className="np-resume-edit-card">
            <input
              className="np-field"
              placeholder="Degree"
              value={e.degree}
              onChange={(ev) => {
                const next = [...education]
                next[i] = { ...e, degree: ev.target.value }
                onEducationChange(next)
              }}
            />
            <input
              className="np-field"
              placeholder="Institution"
              value={e.institution}
              onChange={(ev) => {
                const next = [...education]
                next[i] = { ...e, institution: ev.target.value }
                onEducationChange(next)
              }}
            />
            <button
              type="button"
              className="np-profile-btn"
              onClick={() => onEducationChange(education.filter((_, j) => j !== i))}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="np-resume-block">
        <div className="np-resume-block-head">
          <p className="np-cat np-cat-left">Certifications</p>
          <button
            type="button"
            className="np-profile-btn"
            onClick={() => onCertificationsChange([...certifications, emptyCert()])}
          >
            Add certification
          </button>
        </div>
        {certifications.map((c, i) => (
          <div key={i} className="np-resume-edit-card">
            <input
              className="np-field"
              placeholder="Name"
              value={c.name}
              onChange={(ev) => {
                const next = [...certifications]
                next[i] = { ...c, name: ev.target.value }
                onCertificationsChange(next)
              }}
            />
            <button
              type="button"
              className="np-profile-btn"
              onClick={() => onCertificationsChange(certifications.filter((_, j) => j !== i))}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
