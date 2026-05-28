const RESUME_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
])

function normalizeMimeType(mimeType: string): string {
  // Strip parameters like "; charset=utf-8" and normalize case.
  return mimeType.split(';', 1)[0].trim().toLowerCase()
}

export function isResumeMimeType(mimeType: string): boolean {
  return RESUME_MIME_TYPES.has(normalizeMimeType(mimeType))
}

export function resumeMimeErrorMessage(): string {
  return 'Only PDF, DOCX, and TXT files are accepted for resume upload.'
}

export async function extractResumeText(mimeType: string, buffer: Buffer): Promise<string> {
  const normalizedMimeType = normalizeMimeType(mimeType)
  if (!isResumeMimeType(normalizedMimeType)) {
    throw new Error(resumeMimeErrorMessage())
  }

  if (normalizedMimeType === 'text/plain') {
    return buffer.toString('utf-8').trim()
  }

  if (normalizedMimeType === 'application/pdf') {
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer)
    return (data.text || '').trim()
  }

  if (normalizedMimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return (result.value || '').trim()
  }

  throw new Error(resumeMimeErrorMessage())
}
