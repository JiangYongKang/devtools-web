import { describe, it, expect } from 'vitest'
import {
  stripBOM,
  detectUTF8ReplacementChars,
  detectDelimiter,
  inferColumnType,
  parseCsvSync,
  createCancelToken,
  getFirstNLines,
  checkLargeFileStatus,
} from '../logic/index.js'
import {
  BOM_CHAR,
  UTF8_REPLACEMENT_CHAR,
  PRESET_DELIMITERS,
  ERROR_CODES,
} from '../logic/constants.js'

describe('stripBOM', () => {
  it('应正确剥离 BOM 标记', () => {
    const input = BOM_CHAR + 'id,name\n1,Alice'
    const result = stripBOM(input)
    expect(result.hadBOM).toBe(true)
    expect(result.stripped).toBe('id,name\n1,Alice')
  })

  it('无 BOM 时应保持原样', () => {
    const input = 'id,name\n1,Alice'
    const result = stripBOM(input)
    expect(result.hadBOM).toBe(false)
    expect(result.stripped).toBe(input)
  })

  it('空字符串应正确处理', () => {
    const result = stripBOM('')
    expect(result.hadBOM).toBe(false)
    expect(result.stripped).toBe('')
  })
})

describe('detectUTF8ReplacementChars', () => {
  it('应检测到 UTF-8 替换字符的位置', () => {
    const input = `id,name,value\n1,Alice,${UTF8_REPLACEMENT_CHAR}\n2,Bob,normal`
    const positions = detectUTF8ReplacementChars(input)
    expect(positions.length).toBeGreaterThan(0)
  })

  it('无替换字符时应返回空数组', () => {
    const input = 'id,name\n1,Alice'
    const positions = detectUTF8ReplacementChars(input)
    expect(positions).toEqual([])
  })

  it('应检测多个替换字符', () => {
    const input = `${UTF8_REPLACEMENT_CHAR},${UTF8_REPLACEMENT_CHAR}`
    const positions = detectUTF8ReplacementChars(input)
    expect(positions.length).toBe(2)
  })
})

describe('detectDelimiter', () => {
  it('应正确检测逗号分隔符', () => {
    const input = 'id,name,age\n1,Alice,25\n2,Bob,30'
    const result = detectDelimiter(input)
    expect(result.delimiter).toBe(PRESET_DELIMITERS.COMMA)
    expect(result.confidence).toBeGreaterThan(0.5)
  })

  it('应正确检测分号分隔符（欧洲格式）', () => {
    const input = 'id;name;age\n1;Alice;25\n2;Bob;30'
    const result = detectDelimiter(input)
    expect(result.delimiter).toBe(PRESET_DELIMITERS.SEMICOLON)
    expect(result.confidence).toBeGreaterThan(0.5)
  })

  it('应正确检测制表符分隔符', () => {
    const input = 'id\tname\tage\n1\tAlice\t25\n2\tBob\t30'
    const result = detectDelimiter(input)
    expect(result.delimiter).toBe(PRESET_DELIMITERS.TAB)
    expect(result.confidence).toBeGreaterThan(0.5)
  })

  it('单行输入应回退到默认值', () => {
    const input = 'id,name,age'
    const result = detectDelimiter(input)
    expect(result.wasFallback).toBe(result.confidence === 0)
  })

  it('空输入应回退到默认值', () => {
    const result = detectDelimiter('')
    expect(result.wasFallback).toBe(true)
  })
})

describe('getFirstNLines', () => {
  it('应返回指定数量的行', () => {
    const input = 'line1\nline2\nline3\nline4\nline5'
    const lines = getFirstNLines(input, 3)
    expect(lines.length).toBe(3)
    expect(lines[0]).toBe('line1')
    expect(lines[1]).toBe('line2')
    expect(lines[2]).toBe('line3')
  })

  it('行数不足时应返回全部', () => {
    const input = 'line1\nline2'
    const lines = getFirstNLines(input, 5)
    expect(lines.length).toBe(2)
  })

  it('应正确处理引号内的换行', () => {
    const input = 'id,name\n1,"Alice\nSmith"\n2,Bob'
    const lines = getFirstNLines(input, 2)
    expect(lines.length).toBe(2)
    expect(lines[1]).toContain('Alice')
    expect(lines[1]).toContain('Smith')
  })

  it('应正确处理回车换行', () => {
    const input = 'line1\r\nline2\r\nline3'
    const lines = getFirstNLines(input, 3)
    expect(lines.length).toBe(3)
  })
})

describe('inferColumnType', () => {
  it('应推断字符串类型', () => {
    expect(inferColumnType('Hello World')).toBe('string')
    expect(inferColumnType('')).toBe('string')
    expect(inferColumnType(null)).toBe('string')
  })

  it('应推断数字类型', () => {
    expect(inferColumnType('123')).toBe('number')
    expect(inferColumnType('123.45')).toBe('number')
    expect(inferColumnType('-45.67')).toBe('number')
    expect(inferColumnType('1,234.56')).toBe('number')
  })

  it('应推断布尔类型', () => {
    expect(inferColumnType('true')).toBe('boolean')
    expect(inferColumnType('false')).toBe('boolean')
    expect(inferColumnType('TRUE')).toBe('boolean')
    expect(inferColumnType('yes')).toBe('boolean')
    expect(inferColumnType('no')).toBe('boolean')
    expect(inferColumnType('1')).toBe('boolean')
    expect(inferColumnType('0')).toBe('boolean')
  })

  it('应推断日期类型', () => {
    expect(inferColumnType('2023-01-15')).toBe('date')
    expect(inferColumnType('2023/01/15')).toBe('date')
    expect(inferColumnType('15-01-2023')).toBe('date')
    expect(inferColumnType('2023-01-15T10:30:00')).toBe('date')
  })
})

describe('parseCsvSync', () => {
  it('应正确解析标准 CSV', () => {
    const input = 'id,name,age\n1,Alice,25\n2,Bob,30'
    const result = parseCsvSync(input)
    expect(result.success).toBe(true)
    expect(result.headers).toEqual(['id', 'name', 'age'])
    expect(result.rows.length).toBe(2)
    expect(result.rows[0].id).toBe('1')
    expect(result.rows[0].name).toBe('Alice')
  })

  it('应解析带引号的字段', () => {
    const input = 'id,name,desc\n1,"Alice Smith","Hello, World!"'
    const result = parseCsvSync(input)
    expect(result.success).toBe(true)
    expect(result.rows[0].name).toBe('Alice Smith')
    expect(result.rows[0].desc).toBe('Hello, World!')
  })

  it('应检测列数不一致的错误', () => {
    const input = 'id,name,age\n1,Alice,25\n2,Bob\n3,Charlie,30,extra'
    const result = parseCsvSync(input)
    expect(result.success).toBe(true)
    const colErrors = result.errors.filter(e => e.code === ERROR_CODES.INCONSISTENT_COL_COUNT)
    expect(colErrors.length).toBeGreaterThan(0)
  })

  it('应检测 UTF-8 替换字符', () => {
    const input = `id,name\n1,${UTF8_REPLACEMENT_CHAR}\n2,Bob`
    const result = parseCsvSync(input)
    expect(result.success).toBe(true)
    const utfErrors = result.errors.filter(e => e.code === ERROR_CODES.UTF8_REPLACEMENT_CHAR)
    expect(utfErrors.length).toBeGreaterThan(0)
  })

  it('应检测重复的主键', () => {
    const input = 'id,name,age\n1,Alice,25\n1,Duplicate,30\n2,Bob,35'
    const result = parseCsvSync(input, { primaryKeyColumn: 'id' })
    expect(result.success).toBe(true)
    const pkErrors = result.errors.filter(e => e.code === ERROR_CODES.DUPLICATE_PRIMARY_KEY)
    expect(pkErrors.length).toBeGreaterThan(0)
  })

  it('应推断列类型', () => {
    const input = 'id,name,age,active,join_date\n1,Alice,25,true,2023-01-15'
    const result = parseCsvSync(input)
    expect(result.success).toBe(true)
    expect(result.columnSchema).toBeDefined()
    const types = result.columnSchema.map(c => c.type)
    expect(types).toContain('number')
    expect(types).toContain('boolean')
    expect(types).toContain('date')
  })

  it('应正确报告行数统计', () => {
    const input = 'id,name\n1,Alice\n2,Bob\n3,Charlie'
    const result = parseCsvSync(input)
    expect(result.success).toBe(true)
    expect(result.rawRowCount).toBe(4)
    expect(result.successRowCount).toBe(3)
  })

  it('应正确处理空文件', () => {
    const result = parseCsvSync('')
    expect(result.success).toBe(true)
    expect(result.rawRowCount).toBe(0)
  })

  it('应正确处理仅表头的情况', () => {
    const result = parseCsvSync('id,name,age')
    expect(result.success).toBe(true)
    expect(result.rawRowCount).toBe(1)
    expect(result.successRowCount).toBe(0)
  })

  it('应正确处理制表符分隔的 TSV', () => {
    const input = 'id\tname\tage\n1\tAlice\t25\n2\tBob\t30'
    const result = parseCsvSync(input)
    expect(result.success).toBe(true)
    expect(result.detectedDelimiter).toBe(PRESET_DELIMITERS.TAB)
  })
})

describe('createCancelToken', () => {
  it('应创建可取消的令牌', () => {
    const token = createCancelToken()
    expect(token.isCancelled()).toBe(false)
    token.cancel()
    expect(token.isCancelled()).toBe(true)
  })
})

describe('parseCsvSync - 大文件抽样模式', () => {
  it('小文件应正常解析不触发抽样', () => {
    const input = 'id,name,age\n1,Alice,25\n2,Bob,30\n3,Charlie,35'
    const result = parseCsvSync(input, {
      largeFileByteThreshold: 100000,
      largeFileRowThreshold: 1000,
    })
    expect(result.isLargeFile).toBe(false)
    expect(result.isSampled).toBe(false)
    expect(result.rows.length).toBe(3)
  })

  it('超过字节阈值应触发抽样模式', () => {
    const rows = []
    for (let i = 0; i < 100; i++) {
      rows.push(`${i},Name${i},${20 + (i % 30)}`)
    }
    const input = 'id,name,age\n' + rows.join('\n')

    const result = parseCsvSync(input, {
      largeFileByteThreshold: 100,
      largeFileRowThreshold: 10000,
      previewRows: 50,
    })
    expect(result.isLargeFile).toBe(true)
    expect(result.isSampled).toBe(true)
    expect(result.fileSize).toBeGreaterThan(0)
    expect(result.estimatedTotalRows).toBeGreaterThan(0)
    expect(result.exceededThreshold).toBe('byte')
  })

  it('抽样模式应限制返回的行数', () => {
    const rows = []
    for (let i = 0; i < 200; i++) {
      rows.push(`${i},Name${i},${20 + (i % 30)}`)
    }
    const input = 'id,name,age\n' + rows.join('\n')

    const previewRows = 50
    const result = parseCsvSync(input, {
      largeFileByteThreshold: 100,
      largeFileRowThreshold: 10000,
      previewRows,
    })
    expect(result.isSampled).toBe(true)
    expect(result.rows.length).toBeLessThanOrEqual(previewRows)
  })

  it('抽样模式应正确设置采样间隔', () => {
    const rows = []
    for (let i = 0; i < 200; i++) {
      rows.push(`${i},Name${i},${20 + (i % 30)}`)
    }
    const input = 'id,name,age\n' + rows.join('\n')

    const result = parseCsvSync(input, {
      largeFileByteThreshold: 100,
      largeFileRowThreshold: 10000,
      previewRows: 50,
    })
    expect(result.sampleInterval).toBe(10)
    expect(result.sampledRowsCount).toBeGreaterThan(0)
  })
})
