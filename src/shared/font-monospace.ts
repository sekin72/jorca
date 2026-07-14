const MONOSPACE_KEYWORDS = [
  'mono',
  'courier',
  'consol',
  'menlo',
  'cascadia',
  'fira code',
  'jetbrains',
  'sarasa',
  'go mono',
  'iosevka',
  'hack',
  'source code',
  'ubuntu mono',
  'roboto mono',
  'inconsolata',
  'dejavu sans mono',
  'noto sans mono',
  'space mono',
  'ibm plex mono',
  'comic mono'
]

const KNOWN_PROPORTIONAL_HINTS = [
  'geist',
  'inter',
  'arial',
  'helvetica',
  'roboto',
  'system-ui',
  'sans',
  'serif',
  'times',
  'georgia',
  'verdana',
  'tahoma',
  'calibri',
  'Segoe UI',
  'san francisco',
  'lucida grande'
]

export function isLikelyMonospaceFont(fontFamily: string | undefined | null): boolean {
  if (!fontFamily) {
    return false
  }
  const normalized = fontFamily.trim().toLowerCase()
  if (!normalized) {
    return false
  }
  if (KNOWN_PROPORTIONAL_HINTS.some((hint) => normalized.includes(hint.toLowerCase()))) {
    return false
  }
  return MONOSPACE_KEYWORDS.some((keyword) => normalized.includes(keyword))
}
