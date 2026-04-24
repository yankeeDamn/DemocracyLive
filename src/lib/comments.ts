export const COMMENT_MIN_LENGTH = 2
export const COMMENT_MAX_LENGTH = 500

const DEFAULT_MASKED_TERMS = ['f***', 's***', 'b****', 'a******', 'i****']

function patternFromMaskedTerm(masked: string): RegExp {
  const escaped = masked
    .toLowerCase()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\\*/g, '\\w*')

  return new RegExp(`\\b${escaped}\\b`, 'i')
}

const envMaskedTerms = (process.env.COMMENT_BLOCKLIST ?? '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)

export const COMMENT_BLOCKLIST_PATTERNS = (envMaskedTerms.length > 0
  ? envMaskedTerms
  : DEFAULT_MASKED_TERMS
).map(patternFromMaskedTerm)

export function normalizeCommentText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[0@]/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/[^a-z\s]/g, '')
}
