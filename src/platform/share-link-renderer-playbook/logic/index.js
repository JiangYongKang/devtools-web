export * from './constants.js'
export * from './errors.js'
export * from './parser.js'
export * from './shortlink-expander.js'
export * from './examples.js'

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return { success: true }
  } catch (error) {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()

    try {
      document.execCommand('copy')
      document.body.removeChild(textarea)
      return { success: true }
    } catch (fallbackError) {
      document.body.removeChild(textarea)
      return { success: false, error: fallbackError }
    }
  }
}

function copyAsMarkdown(parsedLink, linkText = null) {
  const text = linkText || parsedLink.displayHost
  const url = parsedLink.canonical
  return `[${text}](${url})`
}

export {
  copyToClipboard,
  copyAsMarkdown,
}
