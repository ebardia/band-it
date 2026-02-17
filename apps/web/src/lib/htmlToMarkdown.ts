import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'

// Create a singleton turndown instance with GFM support
let turndownService: TurndownService | null = null

function getTurndownService(): TurndownService {
  if (!turndownService) {
    turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
      emDelimiter: '*',
      strongDelimiter: '**',
    })

    // Add GFM plugin for tables, strikethrough, task lists
    turndownService.use(gfm)

    // Custom rule for preserving line breaks in paragraphs
    turndownService.addRule('lineBreaks', {
      filter: 'br',
      replacement: () => '\n',
    })

    // Clean up excessive whitespace
    turndownService.addRule('cleanWhitespace', {
      filter: ['div', 'section', 'article'],
      replacement: (content) => content + '\n\n',
    })
  }

  return turndownService
}

/**
 * Convert HTML to Markdown
 */
export function htmlToMarkdown(html: string): string {
  const service = getTurndownService()
  let markdown = service.turndown(html)

  // Clean up excessive blank lines (more than 2 consecutive)
  markdown = markdown.replace(/\n{3,}/g, '\n\n')

  // Trim leading/trailing whitespace
  markdown = markdown.trim()

  return markdown
}

/**
 * Check if clipboard data contains HTML
 */
export function hasHtmlContent(clipboardData: DataTransfer): boolean {
  return clipboardData.types.includes('text/html')
}

/**
 * Get HTML content from clipboard
 */
export function getHtmlFromClipboard(clipboardData: DataTransfer): string | null {
  if (hasHtmlContent(clipboardData)) {
    return clipboardData.getData('text/html')
  }
  return null
}

/**
 * Handle paste event and convert HTML to markdown if present
 * Returns the markdown text to insert, or null if no conversion needed
 */
export function handleRichPaste(clipboardData: DataTransfer): string | null {
  // Debug: Log raw clipboard data access
  console.log('[Paste Debug] clipboardData object:', clipboardData)
  console.log('[Paste Debug] clipboardData.types:', clipboardData.types)

  // Try to get data directly first
  const rawHtml = clipboardData.getData('text/html')
  const rawPlain = clipboardData.getData('text/plain')

  console.log('[Paste Debug] Raw HTML length:', rawHtml?.length || 0)
  console.log('[Paste Debug] Raw HTML content:', rawHtml?.substring(0, 500) || '(empty)')
  console.log('[Paste Debug] Raw plain length:', rawPlain?.length || 0)
  console.log('[Paste Debug] Raw plain content:', rawPlain?.substring(0, 200) || '(empty)')

  // If we got HTML content, convert it
  if (rawHtml && rawHtml.length > 0) {
    console.log('[Paste Debug] Converting HTML to markdown...')
    const markdown = htmlToMarkdown(rawHtml)
    console.log('[Paste Debug] Converted markdown:', markdown?.substring(0, 300))

    // Only use the markdown if it's different from plain text
    if (markdown && markdown !== rawPlain && markdown.trim() !== rawPlain.trim()) {
      console.log('[Paste Debug] Using converted markdown!')
      return markdown
    } else {
      console.log('[Paste Debug] Markdown same as plain text, skipping conversion')
    }
  } else {
    console.log('[Paste Debug] No HTML content found, using default paste behavior')
  }

  return null
}
