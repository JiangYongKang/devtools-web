import { SYNC_STATES, EVENT_TYPES, MAX_EVENT_LOG_ENTRIES } from './constants.js'
import { IdempotencyViolationError } from './errors.js'

const generateId = () => `mutation_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

const generateRevision = () => `rev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

const createInitialState = (items = []) => {
  const itemMap = {}
  items.forEach((item) => {
    itemMap[item.id] = {
      data: { ...item },
      baseRevision: generateRevision(),
      optimisticRevision: null,
      syncState: SYNC_STATES.SYNCED,
      error: null,
      pendingMutation: null,
      lastAppliedMutationId: null,
    }
  })

  return {
    items: itemMap,
    eventLog: [],
    pendingMutations: new Map(),
  }
}

const transitionState = (currentState, event, payload) => {
  const transitions = {
    [SYNC_STATES.SYNCED]: {
      [EVENT_TYPES.MUTATION_CREATED]: SYNC_STATES.PENDING,
    },
    [SYNC_STATES.PENDING]: {
      [EVENT_TYPES.MUTATION_APPLIED]: SYNC_STATES.SYNCED,
      [EVENT_TYPES.MUTATION_REJECTED]: SYNC_STATES.REJECTED,
      [EVENT_TYPES.CONFLICT_DETECTED]: SYNC_STATES.CONFLICT,
    },
    [SYNC_STATES.REJECTED]: {
      [EVENT_TYPES.RETRY_ATTEMPTED]: SYNC_STATES.PENDING,
      [EVENT_TYPES.ROLLBACK_PERFORMED]: SYNC_STATES.SYNCED,
    },
    [SYNC_STATES.CONFLICT]: {
      [EVENT_TYPES.CONFLICT_RESOLVED]: SYNC_STATES.PENDING,
      [EVENT_TYPES.ROLLBACK_PERFORMED]: SYNC_STATES.SYNCED,
    },
  }

  const validTransitions = transitions[currentState]
  if (!validTransitions) return currentState

  const nextState = validTransitions[event]
  return nextState || currentState
}

const createMutation = (itemId, changes, actorId) => {
  return {
    id: generateId(),
    itemId,
    changes: { ...changes },
    actorId,
    timestamp: Date.now(),
    retryCount: 0,
  }
}

const applyMutationToState = (state, mutation) => {
  const item = state.items[mutation.itemId]
  if (!item) return state

  if (item.pendingMutation && item.pendingMutation.id !== mutation.id) {
    if (item.lastAppliedMutationId === mutation.id) {
      throw new IdempotencyViolationError(
        `Mutation ${mutation.id} has already been applied`,
        mutation.id
      )
    }
  }

  const newData = { ...item.data, ...mutation.changes }
  const optimisticRevision = generateRevision()

  const newItem = {
    ...item,
    data: newData,
    optimisticRevision,
    syncState: SYNC_STATES.PENDING,
    pendingMutation: mutation,
    error: null,
  }

  const newState = {
    ...state,
    items: {
      ...state.items,
      [mutation.itemId]: newItem,
    },
    pendingMutations: new Map(state.pendingMutations).set(mutation.id, mutation),
  }

  return addEventToLog(newState, {
    type: EVENT_TYPES.MUTATION_CREATED,
    itemId: mutation.itemId,
    mutationId: mutation.id,
    actorId: mutation.actorId,
    changes: mutation.changes,
    timestamp: mutation.timestamp,
  })
}

const confirmMutationApplied = (state, mutationId, serverRevision) => {
  const mutation = state.pendingMutations.get(mutationId)
  if (!mutation) return state

  const item = state.items[mutation.itemId]
  if (!item) return state

  const newItem = {
    ...item,
    baseRevision: serverRevision,
    optimisticRevision: null,
    syncState: SYNC_STATES.SYNCED,
    pendingMutation: null,
    lastAppliedMutationId: mutationId,
    error: null,
  }

  const pendingMutations = new Map(state.pendingMutations)
  pendingMutations.delete(mutationId)

  const newState = {
    ...state,
    items: {
      ...state.items,
      [mutation.itemId]: newItem,
    },
    pendingMutations,
  }

  return addEventToLog(newState, {
    type: EVENT_TYPES.MUTATION_APPLIED,
    itemId: mutation.itemId,
    mutationId,
    serverRevision,
    timestamp: Date.now(),
  })
}

const markMutationRejected = (state, mutationId, error) => {
  const mutation = state.pendingMutations.get(mutationId)
  if (!mutation) return state

  const item = state.items[mutation.itemId]
  if (!item) return state

  const newItem = {
    ...item,
    syncState: SYNC_STATES.REJECTED,
    error,
  }

  const newState = {
    ...state,
    items: {
      ...state.items,
      [mutation.itemId]: newItem,
    },
  }

  return addEventToLog(newState, {
    type: EVENT_TYPES.MUTATION_REJECTED,
    itemId: mutation.itemId,
    mutationId,
    error: error?.code || error?.message,
    timestamp: Date.now(),
  })
}

const detectConflict = (state, mutationId, remoteData, remoteRevision) => {
  const mutation = state.pendingMutations.get(mutationId)
  if (!mutation) return state

  const item = state.items[mutation.itemId]
  if (!item) return state

  const newItem = {
    ...item,
    syncState: SYNC_STATES.CONFLICT,
    remoteDataSnapshot: remoteData,
    remoteRevision,
    error: {
      code: 'CONFLICT',
      message: '本地版本与服务器版本冲突',
      localRevision: item.optimisticRevision || item.baseRevision,
      remoteRevision,
    },
  }

  const newState = {
    ...state,
    items: {
      ...state.items,
      [mutation.itemId]: newItem,
    },
  }

  return addEventToLog(newState, {
    type: EVENT_TYPES.CONFLICT_DETECTED,
    itemId: mutation.itemId,
    mutationId,
    localRevision: item.optimisticRevision || item.baseRevision,
    remoteRevision,
    timestamp: Date.now(),
  })
}

const resolveConflict = (state, itemId, resolutionStrategy, mergedData) => {
  const item = state.items[itemId]
  if (!item) return state

  let newData
  switch (resolutionStrategy) {
    case 'keep_local':
      newData = item.data
      break
    case 'adopt_remote':
      newData = item.remoteDataSnapshot
      break
    case 'merge':
      newData = mergedData || item.data
      break
    default:
      newData = item.data
  }

  const mutation = item.pendingMutation
  const updatedMutation = mutation
    ? { ...mutation, changes: newData, retryCount: mutation.retryCount + 1 }
    : createMutation(itemId, newData, 'system')

  const optimisticRevision = generateRevision()

  const newItem = {
    ...item,
    data: newData,
    optimisticRevision,
    syncState: SYNC_STATES.PENDING,
    pendingMutation: updatedMutation,
    remoteDataSnapshot: undefined,
    remoteRevision: undefined,
    error: null,
  }

  const pendingMutations = new Map(state.pendingMutations)
  pendingMutations.set(updatedMutation.id, updatedMutation)

  const newState = {
    ...state,
    items: {
      ...state.items,
      [itemId]: newItem,
    },
    pendingMutations,
  }

  return addEventToLog(newState, {
    type: EVENT_TYPES.CONFLICT_RESOLVED,
    itemId,
    resolutionStrategy,
    mutationId: updatedMutation.id,
    timestamp: Date.now(),
  })
}

const rollbackToBase = (state, itemId) => {
  const item = state.items[itemId]
  if (!item) return state

  const baseData = {}
  Object.keys(item.data).forEach((key) => {
    if (item.pendingMutation?.changes && item.pendingMutation.changes.hasOwnProperty(key)) {
      const originalValue = findOriginalValue(state, itemId, key)
      baseData[key] = originalValue !== undefined ? originalValue : item.data[key]
    } else {
      baseData[key] = item.data[key]
    }
  })

  const mutationId = item.pendingMutation?.id
  const pendingMutations = new Map(state.pendingMutations)
  if (mutationId) {
    pendingMutations.delete(mutationId)
  }

  const newItem = {
    ...item,
    data: Object.keys(baseData).length > 0 ? baseData : item.data,
    optimisticRevision: null,
    syncState: SYNC_STATES.SYNCED,
    pendingMutation: null,
    remoteDataSnapshot: undefined,
    remoteRevision: undefined,
    error: null,
  }

  const newState = {
    ...state,
    items: {
      ...state.items,
      [itemId]: newItem,
    },
    pendingMutations,
  }

  return addEventToLog(newState, {
    type: EVENT_TYPES.ROLLBACK_PERFORMED,
    itemId,
    mutationId,
    timestamp: Date.now(),
  })
}

const findOriginalValue = (state, itemId, key) => {
  return null
}

const retryMutation = (state, itemId) => {
  const item = state.items[itemId]
  if (!item || !item.pendingMutation) return state

  const mutation = {
    ...item.pendingMutation,
    retryCount: item.pendingMutation.retryCount + 1,
  }

  const newItem = {
    ...item,
    syncState: SYNC_STATES.PENDING,
    pendingMutation: mutation,
    error: null,
  }

  const pendingMutations = new Map(state.pendingMutations)
  pendingMutations.set(mutation.id, mutation)

  const newState = {
    ...state,
    items: {
      ...state.items,
      [itemId]: newItem,
    },
    pendingMutations,
  }

  return addEventToLog(newState, {
    type: EVENT_TYPES.RETRY_ATTEMPTED,
    itemId,
    mutationId: mutation.id,
    retryCount: mutation.retryCount,
    timestamp: Date.now(),
  })
}

const addEventToLog = (state, event) => {
  const newEventLog = [...state.eventLog, event].slice(-MAX_EVENT_LOG_ENTRIES)
  return {
    ...state,
    eventLog: newEventLog,
  }
}

const getItemsArray = (state) => {
  return Object.values(state.items).map((itemState) => ({
    ...itemState.data,
    _sync: {
      state: itemState.syncState,
      baseRevision: itemState.baseRevision,
      optimisticRevision: itemState.optimisticRevision,
      error: itemState.error,
      hasPending: !!itemState.pendingMutation,
      lastAppliedMutationId: itemState.lastAppliedMutationId,
    },
  }))
}

const hasUnsavedChanges = (state) => {
  return Object.values(state.items).some(
    (item) => item.syncState !== SYNC_STATES.SYNCED
  )
}

const getPendingMutationsCount = (state) => {
  return state.pendingMutations.size
}

const getItemById = (state, itemId) => {
  return state.items[itemId]
}

const isMutationIdempotent = (state, mutationId) => {
  return Object.values(state.items).some(
    (item) => item.lastAppliedMutationId === mutationId
  )
}

export {
  generateId,
  generateRevision,
  createInitialState,
  transitionState,
  createMutation,
  applyMutationToState,
  confirmMutationApplied,
  markMutationRejected,
  detectConflict,
  resolveConflict,
  rollbackToBase,
  retryMutation,
  addEventToLog,
  getItemsArray,
  hasUnsavedChanges,
  getPendingMutationsCount,
  getItemById,
  isMutationIdempotent,
}
