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
  const html = clipboardData.getData('text/html')
  const plainText = clipboardData.getData('text/plain')

  // If we got HTML content, convert it to markdown
  if (html && html.length > 0) {
    const markdown = htmlToMarkdown(html)

    // Only use the markdown if it's different from plain text
    // This avoids unnecessary conversion when pasting plain text
    // that browsers wrap in minimal HTML
    if (markdown && markdown !== plainText && markdown.trim() !== plainText.trim()) {
      return markdown
    }
  }

  return null
}
