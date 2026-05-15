import { ERROR_CODES, ERROR_MESSAGES } from './constants.js'

function createError(code, details = null) {
  return {
    code,
    message: ERROR_MESSAGES[code] || '未知错误',
    details,
  }
}

function createRowError(code, rowIndex, columnKey = null, rawValue = null, details = null) {
  return {
    rowIndex,
    columnKey,
    code,
    message: ERROR_MESSAGES[code] || '未知错误',
    raw: rawValue,
    details,
  }
}

function getErrorMessage(code) {
  return ERROR_MESSAGES[code] || '未知错误'
}

function groupErrorsByColumn(errors) {
  const grouped = {}
  for (const error of errors) {
    const key = error.columnKey || '_unknown'
    if (!grouped[key]) {
      grouped[key] = []
    }
    grouped[key].push(error)
  }
  return grouped
}

function groupErrorsByCode(errors) {
  const grouped = {}
  for (const error of errors) {
    if (!grouped[error.code]) {
      grouped[error.code] = []
    }
    grouped[error.code].push(error)
  }
  return grouped
}

function exportErrorsToCsv(errors, delimiter = ',') {
  const headers = ['行号', '列名', '错误码', '错误信息', '原始值', '详情']
  const rows = [headers]

  for (const error of errors) {
    const row = [
      String(error.rowIndex + 1),
      error.columnKey || '',
      error.code,
      error.message,
      error.raw || '',
      error.details ? JSON.stringify(error.details) : '',
    ]
    rows.push(row.map(cell => {
      if (cell.includes(delimiter) || cell.includes('"') || cell.includes('\n')) {
        return `"${cell.replace(/"/g, '""')}"`
      }
      return cell
    }).join(delimiter))
  }

  return rows.join('\n')
}

export {
  ERROR_CODES,
  createError,
  createRowError,
  getErrorMessage,
  groupErrorsByColumn,
  groupErrorsByCode,
  exportErrorsToCsv,
}
