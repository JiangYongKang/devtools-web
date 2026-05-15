import { describe, it, expect } from 'vitest'
import {
  createError,
  createRowError,
  getErrorMessage,
  groupErrorsByColumn,
  groupErrorsByCode,
  exportErrorsToCsv,
} from '../logic/index.js'
import { ERROR_CODES, ERROR_MESSAGES } from '../logic/constants.js'

describe('createError', () => {
  it('应创建标准错误对象', () => {
    const error = createError(ERROR_CODES.INCONSISTENT_COL_COUNT, { expected: 3, actual: 2 })
    expect(error.code).toBe(ERROR_CODES.INCONSISTENT_COL_COUNT)
    expect(error.message).toBe(ERROR_MESSAGES[ERROR_CODES.INCONSISTENT_COL_COUNT])
    expect(error.details).toEqual({ expected: 3, actual: 2 })
  })

  it('无详情时应正确创建', () => {
    const error = createError(ERROR_CODES.EMPTY_FILE)
    expect(error.code).toBe(ERROR_CODES.EMPTY_FILE)
    expect(error.message).toBeDefined()
    expect(error.details).toBeNull()
  })
})

describe('createRowError', () => {
  it('应创建行级错误对象', () => {
    const error = createRowError(
      ERROR_CODES.INCONSISTENT_COL_COUNT,
      5,
      'name',
      'raw_value',
      { extra: 'data' }
    )
    expect(error.rowIndex).toBe(5)
    expect(error.columnKey).toBe('name')
    expect(error.code).toBe(ERROR_CODES.INCONSISTENT_COL_COUNT)
    expect(error.message).toBeDefined()
    expect(error.raw).toBe('raw_value')
    expect(error.details).toEqual({ extra: 'data' })
  })

  it('无列和原始值时应正确创建', () => {
    const error = createRowError(ERROR_CODES.UNTERMINATED_QUOTE, 10)
    expect(error.rowIndex).toBe(10)
    expect(error.columnKey).toBeNull()
    expect(error.raw).toBeNull()
  })
})

describe('getErrorMessage', () => {
  it('应返回正确的错误消息', () => {
    expect(getErrorMessage(ERROR_CODES.INCONSISTENT_COL_COUNT)).toBeDefined()
    expect(getErrorMessage(ERROR_CODES.EMPTY_FILE)).toBeDefined()
    expect(getErrorMessage(ERROR_CODES.UTF8_REPLACEMENT_CHAR)).toBeDefined()
  })

  it('未知错误码应返回默认消息', () => {
    expect(getErrorMessage('UNKNOWN_ERROR')).toBeDefined()
  })
})

describe('groupErrorsByColumn', () => {
  it('应按列分组错误', () => {
    const errors = [
      { rowIndex: 1, columnKey: 'name', code: ERROR_CODES.INCONSISTENT_COL_COUNT },
      { rowIndex: 2, columnKey: 'name', code: ERROR_CODES.UTF8_REPLACEMENT_CHAR },
      { rowIndex: 3, columnKey: 'age', code: ERROR_CODES.NUMBER_OVERFLOW },
      { rowIndex: 4, columnKey: null, code: ERROR_CODES.UNTERMINATED_QUOTE },
    ]

    const grouped = groupErrorsByColumn(errors)
    expect(grouped.name).toBeDefined()
    expect(grouped.name.length).toBe(2)
    expect(grouped.age).toBeDefined()
    expect(grouped.age.length).toBe(1)
    expect(grouped._unknown).toBeDefined()
  })

  it('空错误列表应返回空对象', () => {
    const grouped = groupErrorsByColumn([])
    expect(grouped).toEqual({})
  })
})

describe('groupErrorsByCode', () => {
  it('应按错误码分组', () => {
    const errors = [
      { rowIndex: 1, code: ERROR_CODES.INCONSISTENT_COL_COUNT },
      { rowIndex: 2, code: ERROR_CODES.INCONSISTENT_COL_COUNT },
      { rowIndex: 3, code: ERROR_CODES.UTF8_REPLACEMENT_CHAR },
    ]

    const grouped = groupErrorsByCode(errors)
    expect(grouped[ERROR_CODES.INCONSISTENT_COL_COUNT]).toBeDefined()
    expect(grouped[ERROR_CODES.INCONSISTENT_COL_COUNT].length).toBe(2)
    expect(grouped[ERROR_CODES.UTF8_REPLACEMENT_CHAR]).toBeDefined()
    expect(grouped[ERROR_CODES.UTF8_REPLACEMENT_CHAR].length).toBe(1)
  })

  it('空错误列表应返回空对象', () => {
    const grouped = groupErrorsByCode([])
    expect(grouped).toEqual({})
  })
})

describe('exportErrorsToCsv', () => {
  it('应导出错误为 CSV 格式', () => {
    const errors = [
      createRowError(ERROR_CODES.INCONSISTENT_COL_COUNT, 1, 'name', 'raw1', { expected: 3 }),
      createRowError(ERROR_CODES.UTF8_REPLACEMENT_CHAR, 2, 'desc', 'raw2', null),
    ]

    const csv = exportErrorsToCsv(errors)
    expect(csv).toContain('行号')
    expect(csv).toContain('列名')
    expect(csv).toContain('错误码')
    expect(csv).toContain('错误信息')
    expect(csv).toContain('原始值')
    expect(csv).toContain('详情')
    expect(csv).toContain(ERROR_CODES.INCONSISTENT_COL_COUNT)
    expect(csv).toContain(ERROR_CODES.UTF8_REPLACEMENT_CHAR)
  })

  it('空错误列表应只包含表头', () => {
    const csv = exportErrorsToCsv([])
    const lines = csv.split('\n')
    expect(lines.length).toBe(1)
  })

  it('应正确处理特殊字符', () => {
    const errors = [
      createRowError(ERROR_CODES.INCONSISTENT_COL_COUNT, 1, 'col,with,comma', 'value,with"quotes', null),
    ]

    const csv = exportErrorsToCsv(errors)
    expect(csv).toContain('"col,with,comma"')
    expect(csv).toContain('"value,with""quotes"')
  })
})
