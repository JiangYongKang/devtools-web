import { describe, test, expect } from 'vitest'
import {
  CATEGORIES,
  CATEGORY_LABELS,
  UNIT_SYSTEMS,
  BYTE_UNITS,
  BIT_UNITS,
  BITRATE_UNITS,
  BYTE_PER_SECOND_UNITS,
  TIME_UNITS,
  ALL_UNITS,
  UNIT_MAP,
  ROUNDING_MODES,
  MAX_BATCH_SIZE,
  MAX_HISTORY_SIZE,
  MAX_DECIMALS,
  DEFAULT_DECIMALS,
  DEFAULT_BASE,
  DEFAULT_ROUNDING_MODE,
  EXAMPLES,
  FAQ_ITEMS,
  getUnitsByCategory,
  getUnitByCode,
} from '../logic/constants.js'

describe('CATEGORIES', () => {
  test('should define all required categories', () => {
    expect(CATEGORIES.BYTE).toBe('byte')
    expect(CATEGORIES.BIT).toBe('bit')
    expect(CATEGORIES.BITRATE).toBe('bitrate')
    expect(CATEGORIES.BYTE_PER_SECOND).toBe('byte_per_second')
    expect(CATEGORIES.TIME).toBe('time')
  })
})

describe('CATEGORY_LABELS', () => {
  test('should have labels for all categories', () => {
    Object.values(CATEGORIES).forEach((cat) => {
      expect(CATEGORY_LABELS[cat]).toBeDefined()
      expect(typeof CATEGORY_LABELS[cat]).toBe('string')
    })
  })
})

describe('UNIT_SYSTEMS', () => {
  test('should define IEC and SI systems', () => {
    expect(UNIT_SYSTEMS.IEC).toBe('iec')
    expect(UNIT_SYSTEMS.SI).toBe('si')
  })
})

describe('BYTE_UNITS', () => {
  test('should include base unit B', () => {
    const baseUnit = BYTE_UNITS.find((u) => u.code === 'B')
    expect(baseUnit).toBeDefined()
    expect(baseUnit.exponent).toBe(0)
    expect(baseUnit.category).toBe(CATEGORIES.BYTE)
  })

  test('should include IEC units (1024 base)', () => {
    const iecUnits = BYTE_UNITS.filter((u) => u.system === UNIT_SYSTEMS.IEC)
    expect(iecUnits.length).toBeGreaterThan(0)
    iecUnits.forEach((u) => {
      expect(u.base).toBe(1024)
      expect(u.code).toMatch(/KiB|MiB|GiB|TiB|PiB|EiB/)
    })
  })

  test('should include SI units (1000 base)', () => {
    const siUnits = BYTE_UNITS.filter((u) => u.system === UNIT_SYSTEMS.SI)
    expect(siUnits.length).toBeGreaterThan(0)
    siUnits.forEach((u) => {
      expect(u.base).toBe(1000)
      expect(u.code).toMatch(/KB|MB|GB|TB|PB|EB/)
    })
  })
})

describe('BIT_UNITS', () => {
  test('should include base unit bit', () => {
    const baseUnit = BIT_UNITS.find((u) => u.code === 'bit')
    expect(baseUnit).toBeDefined()
    expect(baseUnit.category).toBe(CATEGORIES.BIT)
  })

  test('should have correct category', () => {
    BIT_UNITS.forEach((u) => {
      expect(u.category).toBe(CATEGORIES.BIT)
    })
  })
})

describe('BITRATE_UNITS', () => {
  test('should have correct category', () => {
    BITRATE_UNITS.forEach((u) => {
      expect(u.category).toBe(CATEGORIES.BITRATE)
    })
  })

  test('should use SI base (1000)', () => {
    const siUnits = BITRATE_UNITS.filter((u) => u.exponent > 0)
    siUnits.forEach((u) => {
      expect(u.base).toBe(1000)
    })
  })
})

describe('TIME_UNITS', () => {
  test('should include seconds, minutes, hours', () => {
    expect(TIME_UNITS.some((u) => u.code === 's')).toBe(true)
    expect(TIME_UNITS.some((u) => u.code === 'min')).toBe(true)
    expect(TIME_UNITS.some((u) => u.code === 'h')).toBe(true)
  })

  test('should have correct time factors', () => {
    const second = TIME_UNITS.find((u) => u.code === 's')
    const minute = TIME_UNITS.find((u) => u.code === 'min')
    const hour = TIME_UNITS.find((u) => u.code === 'h')

    expect(second.factor).toBeUndefined()
    expect(minute.factor).toBe(60)
    expect(hour.factor).toBe(3600)
  })
})

describe('ALL_UNITS', () => {
  test('should combine all unit categories', () => {
    const total =
      BYTE_UNITS.length +
      BIT_UNITS.length +
      BITRATE_UNITS.length +
      BYTE_PER_SECOND_UNITS.length +
      TIME_UNITS.length
    expect(ALL_UNITS.length).toBe(total)
  })
})

describe('UNIT_MAP', () => {
  test('should map unit codes to units', () => {
    expect(UNIT_MAP['B']).toBeDefined()
    expect(UNIT_MAP['GB']).toBeDefined()
    expect(UNIT_MAP['GiB']).toBeDefined()
    expect(UNIT_MAP['Mbps']).toBeDefined()
    expect(UNIT_MAP['bit']).toBeDefined()
  })

  test('should map aliases', () => {
    expect(UNIT_MAP['byte']).toBeDefined()
    expect(UNIT_MAP['KB']).toBeDefined()
    expect(UNIT_MAP['kb']).toBeDefined()
  })
})

describe('ROUNDING_MODES', () => {
  test('should include all four rounding modes', () => {
    const codes = ROUNDING_MODES.map((m) => m.code)
    expect(codes).toContain('round')
    expect(codes).toContain('floor')
    expect(codes).toContain('ceil')
    expect(codes).toContain('bankers')
  })

  test('each mode should have label and description', () => {
    ROUNDING_MODES.forEach((mode) => {
      expect(mode.code).toBeDefined()
      expect(mode.label).toBeDefined()
      expect(mode.description).toBeDefined()
    })
  })
})

describe('constants', () => {
  test('should have reasonable limits', () => {
    expect(MAX_BATCH_SIZE).toBeGreaterThan(0)
    expect(MAX_HISTORY_SIZE).toBeGreaterThan(0)
    expect(MAX_DECIMALS).toBeGreaterThan(0)
    expect(DEFAULT_DECIMALS).toBeGreaterThanOrEqual(0)
    expect(DEFAULT_BASE).toBe(1000)
    expect(DEFAULT_ROUNDING_MODE).toBe('round')
  })
})

describe('EXAMPLES', () => {
  test('should have multiple examples', () => {
    expect(EXAMPLES.length).toBeGreaterThan(0)
  })

  test('each example should have required fields', () => {
    EXAMPLES.forEach((example) => {
      expect(example.value).toBeDefined()
      expect(example.sourceUnit).toBeDefined()
      expect(example.targetUnits).toBeDefined()
      expect(Array.isArray(example.targetUnits)).toBe(true)
      expect(example.description).toBeDefined()
    })
  })
})

describe('FAQ_ITEMS', () => {
  test('should have multiple FAQ items', () => {
    expect(FAQ_ITEMS.length).toBeGreaterThan(0)
  })

  test('each FAQ should have question and answer', () => {
    FAQ_ITEMS.forEach((item) => {
      expect(item.question).toBeDefined()
      expect(item.answer).toBeDefined()
    })
  })
})

describe('getUnitsByCategory', () => {
  test('should return units for byte category', () => {
    const units = getUnitsByCategory(CATEGORIES.BYTE)
    expect(units.length).toBe(BYTE_UNITS.length)
    units.forEach((u) => {
      expect(u.category).toBe(CATEGORIES.BYTE)
    })
  })

  test('should return units for bit category', () => {
    const units = getUnitsByCategory(CATEGORIES.BIT)
    expect(units.length).toBe(BIT_UNITS.length)
  })

  test('should return empty array for unknown category', () => {
    const units = getUnitsByCategory('unknown')
    expect(units).toEqual([])
  })
})

describe('getUnitByCode', () => {
  test('should return unit for valid code', () => {
    const unit = getUnitByCode('GB')
    expect(unit).toBeDefined()
    expect(unit.code).toBe('GB')
  })

  test('should return null for invalid code', () => {
    const unit = getUnitByCode('INVALID')
    expect(unit).toBeNull()
  })

  test('should be case sensitive for exact codes', () => {
    const gb = getUnitByCode('GB')
    const gib = getUnitByCode('GiB')
    expect(gb).not.toEqual(gib)
  })
})
