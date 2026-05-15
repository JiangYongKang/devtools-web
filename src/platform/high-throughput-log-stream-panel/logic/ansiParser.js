import {
  ANSI_COLORS,
  ANSI_BG_COLORS,
  ANSI_STYLES,
} from './constants.js'

const ANSI_ESCAPE_REGEX = /\x1b\[([0-9;]*)m/g

function ansiTokenize(text) {
  const tokens = []
  let currentStyles = {
    color: null,
    backgroundColor: null,
    bold: false,
    dim: false,
    italic: false,
    underline: false,
    blink: false,
    inverse: false,
    hidden: false,
    strikethrough: false,
  }

  let lastIndex = 0
  let match

  while ((match = ANSI_ESCAPE_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
        styles: { ...currentStyles },
      })
    }

    const codes = match[1].split(';').filter(Boolean).map(Number)

    for (let i = 0; i < codes.length; i++) {
      const code = codes[i]

      if (code === ANSI_STYLES.RESET) {
        currentStyles = {
          color: null,
          backgroundColor: null,
          bold: false,
          dim: false,
          italic: false,
          underline: false,
          blink: false,
          inverse: false,
          hidden: false,
          strikethrough: false,
        }
      } else if (code === ANSI_STYLES.BOLD) {
        currentStyles.bold = true
      } else if (code === ANSI_STYLES.DIM) {
        currentStyles.dim = true
      } else if (code === ANSI_STYLES.ITALIC) {
        currentStyles.italic = true
      } else if (code === ANSI_STYLES.UNDERLINE) {
        currentStyles.underline = true
      } else if (code === ANSI_STYLES.BLINK) {
        currentStyles.blink = true
      } else if (code === ANSI_STYLES.INVERSE) {
        currentStyles.inverse = true
      } else if (code === ANSI_STYLES.HIDDEN) {
        currentStyles.hidden = true
      } else if (code === ANSI_STYLES.STRIKETHROUGH) {
        currentStyles.strikethrough = true
      } else if (code === 22) {
        currentStyles.bold = false
        currentStyles.dim = false
      } else if (code === 23) {
        currentStyles.italic = false
      } else if (code === 24) {
        currentStyles.underline = false
      } else if (code === 25) {
        currentStyles.blink = false
      } else if (code === 27) {
        currentStyles.inverse = false
      } else if (code === 28) {
        currentStyles.hidden = false
      } else if (code === 29) {
        currentStyles.strikethrough = false
      } else if (code >= 30 && code <= 37) {
        currentStyles.color = code
      } else if (code >= 90 && code <= 97) {
        currentStyles.color = code
      } else if (code === 39) {
        currentStyles.color = null
      } else if (code >= 40 && code <= 47) {
        currentStyles.backgroundColor = code
      } else if (code >= 100 && code <= 107) {
        currentStyles.backgroundColor = code
      } else if (code === 49) {
        currentStyles.backgroundColor = null
      } else if (code === 38 && codes[i + 1] === 5) {
        currentStyles.color = codes[i + 2]
        i += 2
      } else if (code === 48 && codes[i + 1] === 5) {
        currentStyles.backgroundColor = codes[i + 2]
        i += 2
      }
    }

    lastIndex = ANSI_ESCAPE_REGEX.lastIndex
  }

  if (lastIndex < text.length) {
    tokens.push({
      type: 'text',
      content: text.slice(lastIndex),
      styles: { ...currentStyles },
    })
  }

  return tokens
}

function ansiToStyleObject(styles) {
  const style = {}

  if (styles.color !== null) {
    const colorMap = {
      [ANSI_COLORS.BLACK]: '#000000',
      [ANSI_COLORS.RED]: '#dc2626',
      [ANSI_COLORS.GREEN]: '#16a34a',
      [ANSI_COLORS.YELLOW]: '#ca8a04',
      [ANSI_COLORS.BLUE]: '#2563eb',
      [ANSI_COLORS.MAGENTA]: '#9333ea',
      [ANSI_COLORS.CYAN]: '#0891b2',
      [ANSI_COLORS.WHITE]: '#ffffff',
      [ANSI_COLORS.BRIGHT_BLACK]: '#6b7280',
      [ANSI_COLORS.BRIGHT_RED]: '#ef4444',
      [ANSI_COLORS.BRIGHT_GREEN]: '#22c55e',
      [ANSI_COLORS.BRIGHT_YELLOW]: '#eab308',
      [ANSI_COLORS.BRIGHT_BLUE]: '#3b82f6',
      [ANSI_COLORS.BRIGHT_MAGENTA]: '#a855f7',
      [ANSI_COLORS.BRIGHT_CYAN]: '#06b6d4',
      [ANSI_COLORS.BRIGHT_WHITE]: '#f3f4f6',
    }
    style.color = colorMap[styles.color] || null
  }

  if (styles.backgroundColor !== null) {
    const bgColorMap = {
      [ANSI_BG_COLORS.BLACK]: '#000000',
      [ANSI_BG_COLORS.RED]: '#fecaca',
      [ANSI_BG_COLORS.GREEN]: '#bbf7d0',
      [ANSI_BG_COLORS.YELLOW]: '#fef08a',
      [ANSI_BG_COLORS.BLUE]: '#bfdbfe',
      [ANSI_BG_COLORS.MAGENTA]: '#e9d5ff',
      [ANSI_BG_COLORS.CYAN]: '#a5f3fc',
      [ANSI_BG_COLORS.WHITE]: '#ffffff',
      [ANSI_BG_COLORS.BRIGHT_BLACK]: '#d1d5db',
      [ANSI_BG_COLORS.BRIGHT_RED]: '#fee2e2',
      [ANSI_BG_COLORS.BRIGHT_GREEN]: '#dcfce7',
      [ANSI_BG_COLORS.BRIGHT_YELLOW]: '#fef9c3',
      [ANSI_BG_COLORS.BRIGHT_BLUE]: '#dbeafe',
      [ANSI_BG_COLORS.BRIGHT_MAGENTA]: '#f3e8ff',
      [ANSI_BG_COLORS.BRIGHT_CYAN]: '#cffafe',
      [ANSI_BG_COLORS.BRIGHT_WHITE]: '#f9fafb',
    }
    style.backgroundColor = bgColorMap[styles.backgroundColor] || null
  }

  if (styles.bold) {
    style.fontWeight = 'bold'
  }

  if (styles.italic) {
    style.fontStyle = 'italic'
  }

  if (styles.underline || styles.strikethrough) {
    const decorations = []
    if (styles.underline) decorations.push('underline')
    if (styles.strikethrough) decorations.push('line-through')
    style.textDecoration = decorations.join(' ')
  }

  if (styles.dim) {
    style.opacity = '0.6'
  }

  return style
}

function stripAnsi(text) {
  return text.replace(ANSI_ESCAPE_REGEX, '')
}

function hasAnsi(text) {
  return ANSI_ESCAPE_REGEX.test(text)
}

export {
  ansiTokenize,
  ansiToStyleObject,
  stripAnsi,
  hasAnsi,
}
