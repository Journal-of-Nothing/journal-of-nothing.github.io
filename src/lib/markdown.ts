import DOMPurify from 'dompurify'
import { marked } from 'marked'

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'code',
  'pre',
  'blockquote',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'a',
  'img',
  'hr',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
]

const ALLOWED_ATTR = ['href', 'title', 'target', 'rel', 'src', 'alt']

export const renderMarkdown = (markdown: string): string => {
  const html = marked.parse(markdown || '', {
    gfm: true,
    breaks: true,
    async: false,
  }) as string

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  })
}
