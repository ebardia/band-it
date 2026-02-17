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
  const html = getHtmlFromClipboard(clipboardData)

  if (html) {
    // Check if it's actually rich content (not just plain text wrapped in HTML)
    // Simple HTML like <meta><body>plain text</body> shouldn't be converted
    const hasRichContent = /<(strong|em|b|i|h[1-6]|ul|ol|li|table|a|code|pre|blockquote)[^>]*>/i.test(html)

    if (hasRichContent) {
      return htmlToMarkdown(html)
    }
  }

  return null
}
