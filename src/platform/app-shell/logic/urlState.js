import {
  QUERY_PARAMS,
  SORT_STRATEGIES,
} from './constants.js'

function parseUrlState(searchParams) {
  const state = {
    sidebarCollapsed: null,
    searchQuery: '',
    sortStrategy: SORT_STRATEGIES.ID,
  }

  if (!searchParams) return state

  const sidebarParam = searchParams.get(QUERY_PARAMS.SIDEBAR_COLLAPSED)
  if (sidebarParam !== null) {
    state.sidebarCollapsed = sidebarParam === '1' || sidebarParam === 'true'
  }

  const searchParam = searchParams.get(QUERY_PARAMS.SEARCH_QUERY)
  if (searchParam) {
    state.searchQuery = searchParam
  }

  const sortParam = searchParams.get(QUERY_PARAMS.SORT_STRATEGY)
  if (sortParam && Object.values(SORT_STRATEGIES).includes(sortParam)) {
    state.sortStrategy = sortParam
  }

  return state
}

function buildSearchParamsFromState(state) {
  const params = new URLSearchParams()

  if (state.sidebarCollapsed !== null && state.sidebarCollapsed !== undefined) {
    params.set(QUERY_PARAMS.SIDEBAR_COLLAPSED, state.sidebarCollapsed ? '1' : '0')
  }

  if (state.searchQuery) {
    params.set(QUERY_PARAMS.SEARCH_QUERY, state.searchQuery)
  }

  if (state.sortStrategy && state.sortStrategy !== SORT_STRATEGIES.ID) {
    params.set(QUERY_PARAMS.SORT_STRATEGY, state.sortStrategy)
  }

  return params
}

function updateUrlState(history, location, newState) {
  const currentParams = new URLSearchParams(location.search)
  const newParams = buildSearchParamsFromState(newState)

  for (const [key, value] of newParams.entries()) {
    currentParams.set(key, value)
  }

  const searchString = currentParams.toString()
  const newUrl = `${location.pathname}${searchString ? `?${searchString}` : ''}`

  if (history && history.pushState) {
    history.pushState({}, '', newUrl)
  }

  return newUrl
}

function serializeSidebarState(collapsed) {
  return collapsed ? '1' : '0'
}

function deserializeSidebarState(value) {
  if (value === '1' || value === 'true') return true
  if (value === '0' || value === 'false') return false
  return null
}

export {
  parseUrlState,
  buildSearchParamsFromState,
  updateUrlState,
  serializeSidebarState,
  deserializeSidebarState,
}
