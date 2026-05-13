import { describe, expect, test } from 'vitest'
import {
  parseUrlState,
  buildSearchParamsFromState,
  serializeSidebarState,
  deserializeSidebarState,
} from '../logic/urlState.js'
import { SORT_STRATEGIES, QUERY_PARAMS } from '../logic/constants.js'

describe('urlState module', () => {
  describe('parseUrlState', () => {
    test('should return default state for null/undefined', () => {
      const state = parseUrlState(null)
      expect(state.sidebarCollapsed).toBeNull()
      expect(state.searchQuery).toBe('')
      expect(state.sortStrategy).toBe(SORT_STRATEGIES.ID)
    })

    test('should parse sidebar parameter', () => {
      const params = new URLSearchParams(`${QUERY_PARAMS.SIDEBAR_COLLAPSED}=1`)
      const state = parseUrlState(params)
      expect(state.sidebarCollapsed).toBe(true)
    })

    test('should parse sidebar=false correctly', () => {
      const params = new URLSearchParams(`${QUERY_PARAMS.SIDEBAR_COLLAPSED}=0`)
      const state = parseUrlState(params)
      expect(state.sidebarCollapsed).toBe(false)
    })

    test('should parse search query', () => {
      const params = new URLSearchParams(`${QUERY_PARAMS.SEARCH_QUERY}=json`)
      const state = parseUrlState(params)
      expect(state.searchQuery).toBe('json')
    })

    test('should decode URL-encoded search query', () => {
      const params = new URLSearchParams(`${QUERY_PARAMS.SEARCH_QUERY}=${encodeURIComponent('JSON 格式化')}`)
      const state = parseUrlState(params)
      expect(state.searchQuery).toBe('JSON 格式化')
    })

    test('should parse sort strategy', () => {
      const params = new URLSearchParams(`${QUERY_PARAMS.SORT_STRATEGY}=${SORT_STRATEGIES.TITLE}`)
      const state = parseUrlState(params)
      expect(state.sortStrategy).toBe(SORT_STRATEGIES.TITLE)
    })

    test('should ignore invalid sort strategy', () => {
      const params = new URLSearchParams(`${QUERY_PARAMS.SORT_STRATEGY}=invalid`)
      const state = parseUrlState(params)
      expect(state.sortStrategy).toBe(SORT_STRATEGIES.ID)
    })

    test('should parse all parameters together', () => {
      const params = new URLSearchParams()
      params.set(QUERY_PARAMS.SIDEBAR_COLLAPSED, '1')
      params.set(QUERY_PARAMS.SEARCH_QUERY, 'test')
      params.set(QUERY_PARAMS.SORT_STRATEGY, SORT_STRATEGIES.CATEGORY)

      const state = parseUrlState(params)
      expect(state.sidebarCollapsed).toBe(true)
      expect(state.searchQuery).toBe('test')
      expect(state.sortStrategy).toBe(SORT_STRATEGIES.CATEGORY)
    })
  })

  describe('buildSearchParamsFromState', () => {
    test('should build empty params for empty state', () => {
      const params = buildSearchParamsFromState({})
      expect(params.toString()).toBe('')
    })

    test('should include sidebar=true', () => {
      const params = buildSearchParamsFromState({ sidebarCollapsed: true })
      expect(params.get(QUERY_PARAMS.SIDEBAR_COLLAPSED)).toBe('1')
    })

    test('should include sidebar=false', () => {
      const params = buildSearchParamsFromState({ sidebarCollapsed: false })
      expect(params.get(QUERY_PARAMS.SIDEBAR_COLLAPSED)).toBe('0')
    })

    test('should not include sidebar for null', () => {
      const params = buildSearchParamsFromState({ sidebarCollapsed: null })
      expect(params.has(QUERY_PARAMS.SIDEBAR_COLLAPSED)).toBe(false)
    })

    test('should include search query', () => {
      const params = buildSearchParamsFromState({ searchQuery: 'json' })
      expect(params.get(QUERY_PARAMS.SEARCH_QUERY)).toBe('json')
    })

    test('should not include search query for empty string', () => {
      const params = buildSearchParamsFromState({ searchQuery: '' })
      expect(params.has(QUERY_PARAMS.SEARCH_QUERY)).toBe(false)
    })

    test('should include sort strategy if not default', () => {
      const params = buildSearchParamsFromState({ sortStrategy: SORT_STRATEGIES.TITLE })
      expect(params.get(QUERY_PARAMS.SORT_STRATEGY)).toBe(SORT_STRATEGIES.TITLE)
    })

    test('should not include sort strategy for default', () => {
      const params = buildSearchParamsFromState({ sortStrategy: SORT_STRATEGIES.ID })
      expect(params.has(QUERY_PARAMS.SORT_STRATEGY)).toBe(false)
    })

    test('should build all params together', () => {
      const params = buildSearchParamsFromState({
        sidebarCollapsed: true,
        searchQuery: 'test',
        sortStrategy: SORT_STRATEGIES.TITLE,
      })

      expect(params.get(QUERY_PARAMS.SIDEBAR_COLLAPSED)).toBe('1')
      expect(params.get(QUERY_PARAMS.SEARCH_QUERY)).toBe('test')
      expect(params.get(QUERY_PARAMS.SORT_STRATEGY)).toBe(SORT_STRATEGIES.TITLE)
    })
  })

  describe('serializeSidebarState', () => {
    test('should serialize true to "1"', () => {
      expect(serializeSidebarState(true)).toBe('1')
    })

    test('should serialize false to "0"', () => {
      expect(serializeSidebarState(false)).toBe('0')
    })
  })

  describe('deserializeSidebarState', () => {
    test('should deserialize "1" to true', () => {
      expect(deserializeSidebarState('1')).toBe(true)
    })

    test('should deserialize "true" to true', () => {
      expect(deserializeSidebarState('true')).toBe(true)
    })

    test('should deserialize "0" to false', () => {
      expect(deserializeSidebarState('0')).toBe(false)
    })

    test('should deserialize "false" to false', () => {
      expect(deserializeSidebarState('false')).toBe(false)
    })

    test('should return null for invalid values', () => {
      expect(deserializeSidebarState('invalid')).toBeNull()
      expect(deserializeSidebarState('')).toBeNull()
      expect(deserializeSidebarState(null)).toBeNull()
    })
  })
})
