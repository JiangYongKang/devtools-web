import { describe, test, expect } from 'vitest'
import {
  SESSION_STORAGE_PREFIX,
  SESSION_STORAGE_KEYS,
  LAYOUT_TOPOLOGIES,
  OUTPUT_FORMATS,
  DEBOUNCE_DELAY_MS,
  RESPONSIVE_BREAKPOINTS,
  RESPONSIVE_CLASS_NAMES,
  DEFAULT_PARTITION_MIN_HEIGHTS,
  DEFAULT_PARTITION_RATIOS,
  OUTPUT_THRESHOLDS,
  EXAMPLE_SIZES,
  PARTITION_NAMES,
  DISPLAY_STATES,
  MARKDOWN_ALLOWED_TAGS,
  STREAMING_CHUNK_DEFAULTS,
} from '../logic/constants.js'

describe('constants.js', () => {
  describe('session storage', () => {
    test('should have prefix with version', () => {
      expect(SESSION_STORAGE_PREFIX).toBe('tool-workbench-v1')
    })

    test('should have all required keys prefixed', () => {
      expect(SESSION_STORAGE_KEYS.LAYOUT_TOPOLOGY).toContain(SESSION_STORAGE_PREFIX)
      expect(SESSION_STORAGE_KEYS.SIDEBAR_VISIBLE).toContain(SESSION_STORAGE_PREFIX)
      expect(SESSION_STORAGE_KEYS.OUTPUT_FORMAT).toContain(SESSION_STORAGE_PREFIX)
      expect(SESSION_STORAGE_KEYS.TREE_COLLAPSE_STATE).toContain(SESSION_STORAGE_PREFIX)
    })
  })

  describe('layout topologies', () => {
    test('should define side-by-side and stacked', () => {
      expect(LAYOUT_TOPOLOGIES.SIDE_BY_SIDE).toBe('side-by-side')
      expect(LAYOUT_TOPOLOGIES.STACKED).toBe('stacked')
    })
  })

  describe('output formats', () => {
    test('should define plain-text and json', () => {
      expect(OUTPUT_FORMATS.PLAIN_TEXT).toBe('plain-text')
      expect(OUTPUT_FORMATS.JSON).toBe('json')
    })
  })

  describe('debounce delays', () => {
    test('should have sensible defaults', () => {
      expect(DEBOUNCE_DELAY_MS.SMALL).toBe(150)
      expect(DEBOUNCE_DELAY_MS.MEDIUM).toBe(300)
      expect(DEBOUNCE_DELAY_MS.LARGE).toBe(500)
      expect(DEBOUNCE_DELAY_MS.DEFAULT).toBe(300)
    })

    test('default should equal medium', () => {
      expect(DEBOUNCE_DELAY_MS.DEFAULT).toEqual(DEBOUNCE_DELAY_MS.MEDIUM)
    })
  })

  describe('responsive breakpoints', () => {
    test('should be in ascending order', () => {
      expect(RESPONSIVE_BREAKPOINTS.NARROW).toBe(640)
      expect(RESPONSIVE_BREAKPOINTS.MEDIUM).toBe(1024)
      expect(RESPONSIVE_BREAKPOINTS.WIDE).toBe(1280)
      expect(RESPONSIVE_BREAKPOINTS.NARROW).toBeLessThan(RESPONSIVE_BREAKPOINTS.MEDIUM)
      expect(RESPONSIVE_BREAKPOINTS.MEDIUM).toBeLessThan(RESPONSIVE_BREAKPOINTS.WIDE)
    })
  })

  describe('partition defaults', () => {
    test('should have min heights defined', () => {
      expect(DEFAULT_PARTITION_MIN_HEIGHTS.input).toBe(120)
      expect(DEFAULT_PARTITION_MIN_HEIGHTS.output).toBe(120)
      expect(DEFAULT_PARTITION_MIN_HEIGHTS.sidebar).toBe(80)
      expect(DEFAULT_PARTITION_MIN_HEIGHTS.meta).toBe(60)
    })

    test('should have ratios defined', () => {
      expect(DEFAULT_PARTITION_RATIOS.input).toBeGreaterThan(0)
      expect(DEFAULT_PARTITION_RATIOS.output).toBeGreaterThan(0)
    })
  })

  describe('output thresholds', () => {
    test('should have warn size less than max display size', () => {
      expect(OUTPUT_THRESHOLDS.WARN_SIZE_BYTES).toBe(1024 * 1024)
      expect(OUTPUT_THRESHOLDS.MAX_DISPLAY_SIZE_BYTES).toBe(5 * 1024 * 1024)
      expect(OUTPUT_THRESHOLDS.WARN_SIZE_BYTES).toBeLessThan(OUTPUT_THRESHOLDS.MAX_DISPLAY_SIZE_BYTES)
    })
  })

  describe('display states', () => {
    test('should define all required states', () => {
      expect(DISPLAY_STATES.EMPTY).toBe('empty')
      expect(DISPLAY_STATES.LOADING).toBe('loading')
      expect(DISPLAY_STATES.READY).toBe('ready')
      expect(DISPLAY_STATES.ERROR).toBe('error')
      expect(DISPLAY_STATES.READ_ONLY).toBe('read-only')
    })
  })

  describe('markdown allowed tags', () => {
    test('should contain basic formatting tags', () => {
      expect(MARKDOWN_ALLOWED_TAGS).toContain('p')
      expect(MARKDOWN_ALLOWED_TAGS).toContain('code')
      expect(MARKDOWN_ALLOWED_TAGS).toContain('pre')
      expect(MARKDOWN_ALLOWED_TAGS).toContain('strong')
    })

    test('should not contain script tag', () => {
      expect(MARKDOWN_ALLOWED_TAGS).not.toContain('script')
      expect(MARKDOWN_ALLOWED_TAGS).not.toContain('iframe')
    })
  })

  describe('streaming defaults', () => {
    test('should have reasonable chunk size', () => {
      expect(STREAMING_CHUNK_DEFAULTS.MAX_CHUNK_SIZE).toBe(8192)
      expect(STREAMING_CHUNK_DEFAULTS.VIRTUAL_SCROLL_PAGE_SIZE).toBe(50)
    })
  })
})
