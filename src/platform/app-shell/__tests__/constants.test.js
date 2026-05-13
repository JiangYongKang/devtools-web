import { describe, expect, test } from 'vitest'
import {
  VERSION,
  BREAKPOINTS,
  SORT_STRATEGIES,
  TOOL_STATUSES,
  ERROR_CODES,
  ERROR_MESSAGES,
  QUERY_PARAMS,
  DEFAULT_SIDEBAR_WIDTH,
  COLLAPSED_SIDEBAR_WIDTH,
  HEADER_HEIGHT,
  VIRTUALIZATION_CONFIG,
  STORAGE_KEYS,
  MAX_RECENT_TOOLS,
  DEMO_TOOLS_COUNT,
} from '../logic/constants.js'

describe('constants module', () => {
  test('VERSION should be a string', () => {
    expect(typeof VERSION).toBe('string')
    expect(VERSION.length).toBeGreaterThan(0)
  })

  test('BREAKPOINTS should have all required breakpoints', () => {
    expect(BREAKPOINTS.NARROW).toBe(640)
    expect(BREAKPOINTS.MEDIUM).toBe(1024)
    expect(BREAKPOINTS.WIDE).toBe(1440)
  })

  test('SORT_STRATEGIES should have all required strategies', () => {
    expect(SORT_STRATEGIES.CATEGORY).toBe('category')
    expect(SORT_STRATEGIES.TAG).toBe('tag')
    expect(SORT_STRATEGIES.RECENT).toBe('recent')
    expect(SORT_STRATEGIES.ID).toBe('id')
    expect(SORT_STRATEGIES.TITLE).toBe('title')
  })

  test('TOOL_STATUSES should have all required statuses', () => {
    expect(TOOL_STATUSES.STABLE).toBe('stable')
    expect(TOOL_STATUSES.BETA).toBe('beta')
    expect(TOOL_STATUSES.DEPRECATED).toBe('deprecated')
  })

  test('ERROR_CODES should have all required error codes', () => {
    expect(ERROR_CODES.INVALID_TOOL_ID).toBe('INVALID_TOOL_ID')
    expect(ERROR_CODES.TOOL_NOT_FOUND).toBe('TOOL_NOT_FOUND')
    expect(ERROR_CODES.LIST_LOAD_FAILED).toBe('LIST_LOAD_FAILED')
    expect(ERROR_CODES.EMPTY_LIST).toBe('EMPTY_LIST')
    expect(ERROR_CODES.SCHEMA_VALIDATION_FAILED).toBe('SCHEMA_VALIDATION_FAILED')
    expect(ERROR_CODES.INVALID_QUERY_PARAM).toBe('INVALID_QUERY_PARAM')
  })

  test('ERROR_MESSAGES should have messages for all error codes', () => {
    Object.values(ERROR_CODES).forEach((code) => {
      expect(ERROR_MESSAGES[code]).toBeDefined()
      expect(typeof ERROR_MESSAGES[code]).toBe('string')
      expect(ERROR_MESSAGES[code].length).toBeGreaterThan(0)
    })
  })

  test('QUERY_PARAMS should have all required params', () => {
    expect(QUERY_PARAMS.SIDEBAR_COLLAPSED).toBe('sidebar')
    expect(QUERY_PARAMS.SEARCH_QUERY).toBe('q')
    expect(QUERY_PARAMS.SORT_STRATEGY).toBe('sort')
  })

  test('layout constants should be valid', () => {
    expect(DEFAULT_SIDEBAR_WIDTH).toBe(280)
    expect(COLLAPSED_SIDEBAR_WIDTH).toBe(0)
    expect(HEADER_HEIGHT).toBe(56)
  })

  test('VIRTUALIZATION_CONFIG should be valid', () => {
    expect(VIRTUALIZATION_CONFIG.ITEM_HEIGHT).toBe(56)
    expect(VIRTUALIZATION_CONFIG.BUFFER_ITEMS).toBe(5)
    expect(VIRTUALIZATION_CONFIG.THRESHOLD).toBe(100)
  })

  test('STORAGE_KEYS should be valid', () => {
    expect(STORAGE_KEYS.RECENT_TOOLS).toBe('app_shell_recent_tools')
  })

  test('misc constants should be valid', () => {
    expect(MAX_RECENT_TOOLS).toBe(10)
    expect(DEMO_TOOLS_COUNT).toBe(20)
  })
})
