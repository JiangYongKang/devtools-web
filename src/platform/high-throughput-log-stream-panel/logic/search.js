import { stripAnsi } from './ansiParser.js'

function createSearchWorker() {
  if (typeof Worker === 'undefined') {
    return null
  }

  const workerCode = `
    self.onmessage = function(e) {
      const { logs, query, caseSensitive, useRegex, id } = e.data
      const results = []
      
      try {
        const searchFn = useRegex 
          ? createRegexSearch(query, caseSensitive)
          : createTextSearch(query, caseSensitive)
        
        for (let i = 0; i < logs.length; i++) {
          const log = logs[i]
          const text = typeof log === 'object' ? (log.message || log.text || '') : String(log)
          const cleanText = stripAnsi(text)
          
          if (searchFn(cleanText)) {
            results.push({ index: i, log, matches: findMatchPositions(cleanText, query, caseSensitive, useRegex) })
          }
        }
        
        self.postMessage({ id, results, done: true })
      } catch (error) {
        self.postMessage({ id, error: error.message, done: true })
      }
    }
    
    function createTextSearch(query, caseSensitive) {
      const searchQuery = caseSensitive ? query : query.toLowerCase()
      return function(text) {
        const searchText = caseSensitive ? text : text.toLowerCase()
        return searchText.includes(searchQuery)
      }
    }
    
    function createRegexSearch(pattern, caseSensitive) {
      const flags = caseSensitive ? 'g' : 'gi'
      const regex = new RegExp(pattern, flags)
      return function(text) {
        return regex.test(text)
      }
    }
    
    function findMatchPositions(text, query, caseSensitive, useRegex) {
      const matches = []
      if (useRegex) {
        const flags = caseSensitive ? 'g' : 'gi'
        const regex = new RegExp(query, flags)
        let match
        while ((match = regex.exec(text)) !== null) {
          matches.push({ start: match.index, end: match.index + match[0].length, text: match[0] })
        }
      } else {
        const searchText = caseSensitive ? text : text.toLowerCase()
        const searchQuery = caseSensitive ? query : query.toLowerCase()
        let pos = searchText.indexOf(searchQuery)
        while (pos !== -1) {
          matches.push({ start: pos, end: pos + searchQuery.length, text: text.slice(pos, pos + searchQuery.length) })
          pos = searchText.indexOf(searchQuery, pos + 1)
        }
      }
      return matches
    }
    
    function stripAnsi(text) {
      return text.replace(/\\x1b\\[[0-9;]*m/g, '')
    }
  `

  const blob = new Blob([workerCode], { type: 'application/javascript' })
  return new Worker(URL.createObjectURL(blob))
}

function searchLogsSync(logs, query, options = {}) {
  const { caseSensitive = false, useRegex = false, signal } = options

  if (!query) {
    return logs.map((log, index) => ({ index, log, matches: [] }))
  }

  const results = []
  const searchFn = useRegex
    ? createRegexSearch(query, caseSensitive)
    : createTextSearch(query, caseSensitive)

  for (let i = 0; i < logs.length; i++) {
    if (signal?.aborted) {
      throw new Error('Search aborted')
    }

    const log = logs[i]
    const text = typeof log === 'object' ? (log.message || log.text || '') : String(log)
    const cleanText = stripAnsi(text)

    if (searchFn(cleanText)) {
      results.push({
        index: i,
        log,
        matches: findMatchPositions(cleanText, query, caseSensitive, useRegex),
      })
    }
  }

  return results
}

function createTextSearch(query, caseSensitive) {
  const searchQuery = caseSensitive ? query : query.toLowerCase()
  return function (text) {
    const searchText = caseSensitive ? text : text.toLowerCase()
    return searchText.includes(searchQuery)
  }
}

function createRegexSearch(pattern, caseSensitive) {
  const flags = caseSensitive ? 'g' : 'gi'
  const regex = new RegExp(pattern, flags)
  return function (text) {
    return regex.test(text)
  }
}

function findMatchPositions(text, query, caseSensitive, useRegex) {
  const matches = []
  if (useRegex) {
    const flags = caseSensitive ? 'g' : 'gi'
    const regex = new RegExp(query, flags)
    let match
    while ((match = regex.exec(text)) !== null) {
      matches.push({ start: match.index, end: match.index + match[0].length, text: match[0] })
    }
  } else {
    const searchText = caseSensitive ? text : text.toLowerCase()
    const searchQuery = caseSensitive ? query : query.toLowerCase()
    let pos = searchText.indexOf(searchQuery)
    while (pos !== -1) {
      matches.push({ start: pos, end: pos + searchQuery.length, text: text.slice(pos, pos + searchQuery.length) })
      pos = searchText.indexOf(searchQuery, pos + 1)
    }
  }
  return matches
}

function highlightText(text, matches, highlightClass = 'highlight') {
  if (!matches || matches.length === 0) {
    return [{ text, isHighlight: false }]
  }

  const sortedMatches = [...matches].sort((a, b) => a.start - b.start)
  const mergedMatches = []

  for (const match of sortedMatches) {
    if (mergedMatches.length === 0) {
      mergedMatches.push({ ...match })
    } else {
      const last = mergedMatches[mergedMatches.length - 1]
      if (match.start <= last.end) {
        last.end = Math.max(last.end, match.end)
        last.text = text.slice(last.start, last.end)
      } else {
        mergedMatches.push({ ...match })
      }
    }
  }

  const segments = []
  let lastIndex = 0

  for (const match of mergedMatches) {
    if (match.start > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.start), isHighlight: false })
    }
    segments.push({ text: match.text, isHighlight: true, className: highlightClass })
    lastIndex = match.end
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), isHighlight: false })
  }

  return segments
}

export {
  createSearchWorker,
  searchLogsSync,
  highlightText,
  findMatchPositions,
}
