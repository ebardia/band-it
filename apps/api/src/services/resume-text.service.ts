const RESUME_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
])

export function isResumeMimeType(mimeType: string): boolean {
  return RESUME_MIME_TYPES.has(mimeType)
}

export function resumeMimeErrorMessage(): string {
  return 'Only PDF, DOCX, and TXT files are accepted for resume upload.'
}

export async function extractResumeText(mimeType: string, buffer: Buffer): Promise<string> {
  if (!isResumeMimeType(mimeType)) {
    throw new Error(resumeMimeErrorMessage())
  }

  if (mimeType === 'text/plain') {
    return buffer.toString('utf-8').trim()
  }

  if (mimeType === 'application/pdf') {
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer)
    return (data.text || '').trim()
  }

  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return (result.value || '').trim()
  }

  throw new Error(resumeMimeErrorMessage())
}
