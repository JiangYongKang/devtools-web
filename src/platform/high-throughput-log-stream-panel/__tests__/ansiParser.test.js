import { describe, expect, test } from 'vitest'
import { ansiTokenize, ansiToStyleObject, hasAnsi, stripAnsi } from '../logic/ansiParser.js'

describe('ansiTokenize', () => {
  test('应该处理普通文本', () => {
    const text = 'Hello, World!'
    const tokens = ansiTokenize(text)

    expect(tokens).toHaveLength(1)
    expect(tokens[0].type).toBe('text')
    expect(tokens[0].content).toBe('Hello, World!')
  })

  test('应该处理前景色', () => {
    const text = '\x1b[31mRed text\x1b[0mNormal'
    const tokens = ansiTokenize(text)

    expect(tokens).toHaveLength(2)
    expect(tokens[0].content).toBe('Red text')
    expect(tokens[0].styles.color).toBe(31)
    expect(tokens[1].content).toBe('Normal')
    expect(tokens[1].styles.color).toBeNull()
  })

  test('应该处理多种颜色', () => {
    const text = '\x1b[31mRed\x1b[32mGreen\x1b[34mBlue\x1b[0m'
    const tokens = ansiTokenize(text)

    expect(tokens).toHaveLength(3)
    expect(tokens[0].content).toBe('Red')
    expect(tokens[0].styles.color).toBe(31)
    expect(tokens[1].content).toBe('Green')
    expect(tokens[1].styles.color).toBe(32)
    expect(tokens[2].content).toBe('Blue')
    expect(tokens[2].styles.color).toBe(34)
  })

  test('应该处理背景色', () => {
    const text = '\x1b[41mRed background\x1b[0m'
    const tokens = ansiTokenize(text)

    expect(tokens).toHaveLength(1)
    expect(tokens[0].content).toBe('Red background')
    expect(tokens[0].styles.backgroundColor).toBe(41)
  })

  test('应该处理粗体样式', () => {
    const text = '\x1b[1mBold text\x1b[0m'
    const tokens = ansiTokenize(text)

    expect(tokens).toHaveLength(1)
    expect(tokens[0].content).toBe('Bold text')
    expect(tokens[0].styles.bold).toBe(true)
  })

  test('应该处理暗色样式', () => {
    const text = '\x1b[2mDim text\x1b[0m'
    const tokens = ansiTokenize(text)

    expect(tokens).toHaveLength(1)
    expect(tokens[0].content).toBe('Dim text')
    expect(tokens[0].styles.dim).toBe(true)
  })

  test('应该处理斜体样式', () => {
    const text = '\x1b[3mItalic text\x1b[0m'
    const tokens = ansiTokenize(text)

    expect(tokens).toHaveLength(1)
    expect(tokens[0].content).toBe('Italic text')
    expect(tokens[0].styles.italic).toBe(true)
  })

  test('应该处理下划线样式', () => {
    const text = '\x1b[4mUnderline text\x1b[0m'
    const tokens = ansiTokenize(text)

    expect(tokens).toHaveLength(1)
    expect(tokens[0].content).toBe('Underline text')
    expect(tokens[0].styles.underline).toBe(true)
  })

  test('应该处理删除线样式', () => {
    const text = '\x1b[9mStrikethrough text\x1b[0m'
    const tokens = ansiTokenize(text)

    expect(tokens).toHaveLength(1)
    expect(tokens[0].content).toBe('Strikethrough text')
    expect(tokens[0].styles.strikethrough).toBe(true)
  })

  test('应该处理组合样式', () => {
    const text = '\x1b[1;31;42mBold red on green\x1b[0m'
    const tokens = ansiTokenize(text)

    expect(tokens).toHaveLength(1)
    expect(tokens[0].content).toBe('Bold red on green')
    expect(tokens[0].styles.bold).toBe(true)
    expect(tokens[0].styles.color).toBe(31)
    expect(tokens[0].styles.backgroundColor).toBe(42)
  })

  test('应该处理重置代码', () => {
    const text = '\x1b[1;31mBold red\x1b[0mNormal text'
    const tokens = ansiTokenize(text)

    expect(tokens).toHaveLength(2)
    expect(tokens[0].content).toBe('Bold red')
    expect(tokens[0].styles.bold).toBe(true)
    expect(tokens[0].styles.color).toBe(31)
    expect(tokens[1].content).toBe('Normal text')
    expect(tokens[1].styles.bold).toBe(false)
    expect(tokens[1].styles.color).toBeNull()
  })

  test('应该处理亮色', () => {
    const text = '\x1b[91mBright red\x1b[0m'
    const tokens = ansiTokenize(text)

    expect(tokens).toHaveLength(1)
    expect(tokens[0].content).toBe('Bright red')
    expect(tokens[0].styles.color).toBe(91)
  })

  test('应该处理亮背景色', () => {
    const text = '\x1b[101mBright red background\x1b[0m'
    const tokens = ansiTokenize(text)

    expect(tokens).toHaveLength(1)
    expect(tokens[0].content).toBe('Bright red background')
    expect(tokens[0].styles.backgroundColor).toBe(101)
  })

  test('应该处理空字符串', () => {
    const tokens = ansiTokenize('')
    expect(tokens).toEqual([])
  })

  test('应该只处理ANSI代码', () => {
    const tokens = ansiTokenize('\x1b[1m\x1b[0m')
    expect(tokens).toEqual([])
  })
})

describe('ansiToStyleObject', () => {
  test('应该转换颜色代码为CSS颜色', () => {
    const styles = { color: 31, backgroundColor: null, bold: false, dim: false, italic: false, underline: false, strikethrough: false }
    const result = ansiToStyleObject(styles)

    expect(result.color).toBe('#dc2626')
  })

  test('应该转换背景色代码为CSS颜色', () => {
    const styles = { color: null, backgroundColor: 42, bold: false, dim: false, italic: false, underline: false, strikethrough: false }
    const result = ansiToStyleObject(styles)

    expect(result.backgroundColor).toBe('#bbf7d0')
  })

  test('应该转换粗体样式', () => {
    const styles = { color: null, backgroundColor: null, bold: true, dim: false, italic: false, underline: false, strikethrough: false }
    const result = ansiToStyleObject(styles)

    expect(result.fontWeight).toBe('bold')
  })

  test('应该转换斜体样式', () => {
    const styles = { color: null, backgroundColor: null, bold: false, dim: false, italic: true, underline: false, strikethrough: false }
    const result = ansiToStyleObject(styles)

    expect(result.fontStyle).toBe('italic')
  })

  test('应该转换下划线样式', () => {
    const styles = { color: null, backgroundColor: null, bold: false, dim: false, italic: false, underline: true, strikethrough: false }
    const result = ansiToStyleObject(styles)

    expect(result.textDecoration).toBe('underline')
  })

  test('应该转换删除线样式', () => {
    const styles = { color: null, backgroundColor: null, bold: false, dim: false, italic: false, underline: false, strikethrough: true }
    const result = ansiToStyleObject(styles)

    expect(result.textDecoration).toBe('line-through')
  })

  test('应该转换下划线和删除线组合样式', () => {
    const styles = { color: null, backgroundColor: null, bold: false, dim: false, italic: false, underline: true, strikethrough: true }
    const result = ansiToStyleObject(styles)

    expect(result.textDecoration).toBe('underline line-through')
  })

  test('应该转换暗色样式', () => {
    const styles = { color: null, backgroundColor: null, bold: false, dim: true, italic: false, underline: false, strikethrough: false }
    const result = ansiToStyleObject(styles)

    expect(result.opacity).toBe('0.6')
  })

  test('应该处理空样式对象', () => {
    const styles = { color: null, backgroundColor: null, bold: false, dim: false, italic: false, underline: false, strikethrough: false }
    const result = ansiToStyleObject(styles)

    expect(result).toEqual({})
  })
})

describe('stripAnsi', () => {
  test('应该移除ANSI代码', () => {
    const text = '\x1b[1;31mHello\x1b[0m World!'
    const result = stripAnsi(text)

    expect(result).toBe('Hello World!')
  })

  test('应该处理普通文本', () => {
    const text = 'Just plain text'
    const result = stripAnsi(text)

    expect(result).toBe('Just plain text')
  })

  test('应该处理多个ANSI代码', () => {
    const text = '\x1b[31mR\x1b[32mG\x1b[34mB\x1b[0m colors'
    const result = stripAnsi(text)

    expect(result).toBe('RGB colors')
  })

  test('应该处理空字符串', () => {
    expect(stripAnsi('')).toBe('')
  })
})

describe('hasAnsi', () => {
  test('应该检测ANSI代码', () => {
    expect(hasAnsi('\x1b[31mHello\x1b[0m')).toBe(true)
    expect(hasAnsi('Just plain text')).toBe(false)
  })

  test('应该处理空字符串', () => {
    expect(hasAnsi('')).toBe(false)
  })

  test('应该检测多种ANSI代码', () => {
    expect(hasAnsi('\x1b[1m\x1b[32m\x1b[41m')).toBe(true)
  })
})
