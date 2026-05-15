import { describe, it, expect, beforeEach } from 'vitest'
import {
  createInitialState,
  createMutation,
  applyMutationToState,
  confirmMutationApplied,
  markMutationRejected,
  detectConflict,
  resolveConflict,
  rollbackToBase,
  retryMutation,
  getItemsArray,
  hasUnsavedChanges,
  getPendingMutationsCount,
  getItemById,
  generateRevision,
  SYNC_STATES,
  EVENT_TYPES,
} from '../logic/index.js'

const TEST_DATA = [
  { id: 'item_1', title: '测试项目1', status: 'todo', priority: 'high' },
  { id: 'item_2', title: '测试项目2', status: 'in_progress', priority: 'medium' },
]

describe('状态机核心测试', () => {
  describe('初始状态创建', () => {
    it('应该正确创建初始状态', () => {
      const state = createInitialState(TEST_DATA)
      
      expect(Object.keys(state.items)).toHaveLength(2)
      expect(state.eventLog).toEqual([])
      expect(state.pendingMutations.size).toBe(0)

      const item1 = state.items.item_1
      expect(item1.data.title).toBe('测试项目1')
      expect(item1.syncState).toBe(SYNC_STATES.SYNCED)
      expect(item1.baseRevision).toBeDefined()
      expect(item1.error).toBeNull()
    })
  })

  describe('状态转移', () => {
    it('创建变更创建', () => {
      const state = createInitialState(TEST_DATA)
      const mutation = createMutation('item_1', { title: '更新后的标题' }, 'user_1')

      expect(mutation.id).toBeDefined()
      expect(mutation.itemId).toBe('item_1')
      expect(mutation.changes).toEqual({ title: '更新后的标题' })
      expect(mutation.actorId).toBe('user_1')
    })

    it('应用变更后状态应为 PENDING', () => {
      const state = createInitialState(TEST_DATA)
      const mutation = createMutation('item_1', { title: '更新后的标题' }, 'user_1')
      const newState = applyMutationToState(state, mutation)

      const item = newState.items.item_1
      expect(item.syncState).toBe(SYNC_STATES.PENDING)
      expect(item.data.title).toBe('更新后的标题')
      expect(item.pendingMutation).toEqual(mutation)
      expect(newState.pendingMutations.has(mutation.id)).toBe(true)
    })

    it('确认应用变更后状态应为 SYNCED', () => {
      let state = createInitialState(TEST_DATA)
      const mutation = createMutation('item_1', { title: '更新后的标题' }, 'user_1')
      state = applyMutationToState(state, mutation)
      
      const newRevision = generateRevision()
      const newState = confirmMutationApplied(state, mutation.id, newRevision)

      const item = newState.items.item_1
      expect(item.syncState).toBe(SYNC_STATES.SYNCED)
      expect(item.baseRevision).toBe(newRevision)
      expect(item.pendingMutation).toBeNull()
      expect(newState.pendingMutations.has(mutation.id)).toBe(false)
    })

    it('标记变更为 REJECTED 状态', () => {
      let state = createInitialState(TEST_DATA)
      const mutation = createMutation('item_1', { title: '更新后的标题' }, 'user_1')
      state = applyMutationToState(state, mutation)
      
      const error = new Error('网络错误')
      const newState = markMutationRejected(state, mutation.id, error)

      const item = newState.items.item_1
      expect(item.syncState).toBe(SYNC_STATES.REJECTED)
      expect(item.error).toBe(error)
    })
  })

  describe('冲突处理', () => {
    it('检测到冲突状态', () => {
      let state = createInitialState(TEST_DATA)
      const mutation = createMutation('item_1', { title: '本地修改' }, 'user_1')
      state = applyMutationToState(state, mutation)

      const remoteData = { ...TEST_DATA[0], title: '远端修改' }
      const remoteRevision = generateRevision()
      const newState = detectConflict(state, mutation.id, remoteData, remoteRevision)

      const item = newState.items.item_1
      expect(item.syncState).toBe(SYNC_STATES.CONFLICT)
      expect(item.remoteDataSnapshot).toEqual(remoteData)
      expect(item.remoteRevision).toBe(remoteRevision)
    })

    it('使用 keep_local 策略解决冲突', () => {
      let state = createInitialState(TEST_DATA)
      const mutation = createMutation('item_1', { title: '本地修改' }, 'user_1')
      state = applyMutationToState(state, mutation)

      const remoteData = { ...TEST_DATA[0], title: '远端修改' }
      const remoteRevision = generateRevision()
      state = detectConflict(state, mutation.id, remoteData, remoteRevision)

      const mergedData = { ...state.items.item_1.data }
      const newState = resolveConflict(state, 'item_1', 'keep_local', mergedData)

      const item = newState.items.item_1
      expect(item.syncState).toBe(SYNC_STATES.PENDING)
      expect(item.data.title).toBe('本地修改')
    })

    it('使用 adopt_remote 策略回滚到远端', () => {
      let state = createInitialState(TEST_DATA)
      const mutation = createMutation('item_1', { title: '本地修改' }, 'user_1')
      state = applyMutationToState(state, mutation)

      const remoteData = { ...TEST_DATA[0], title: '远端修改' }
      const remoteRevision = generateRevision()
      state = detectConflict(state, mutation.id, remoteData, remoteRevision)

      const newState = resolveConflict(state, 'item_1', 'adopt_remote', remoteData)

      const item = newState.items.item_1
      expect(item.syncState).toBe(SYNC_STATES.PENDING)
    })
  })

  describe('回滚与重试', () => {
    it('回滚到基础版本', () => {
      let state = createInitialState(TEST_DATA)
      const originalTitle = state.items.item_1.data.title

      const mutation = createMutation('item_1', { title: '已修改标题' }, 'user_1')
      state = applyMutationToState(state, mutation)

      const newState = rollbackToBase(state, 'item_1')
      const item = newState.items.item_1

      expect(item.syncState).toBe(SYNC_STATES.SYNCED)
      expect(item.pendingMutation).toBeNull()
    })

    it('重试变更', () => {
      let state = createInitialState(TEST_DATA)
      const mutation = createMutation('item_1', { title: '更新' }, 'user_1')
      state = applyMutationToState(state, mutation)
      
      const error = new Error('网络错误')
      state = markMutationRejected(state, mutation.id, error)

      const newState = retryMutation(state, 'item_1')
      const item = newState.items.item_1

      expect(item.syncState).toBe(SYNC_STATES.PENDING)
      expect(item.error).toBeNull()
    })
  })

  describe('事件日志', () => {
    it('应该记录所有状态变更事件', () => {
      let state = createInitialState(TEST_DATA)
      const mutation = createMutation('item_1', { title: '更新' }, 'user_1')
      state = applyMutationToState(state, mutation)

      expect(state.eventLog).toHaveLength(1)
      expect(state.eventLog[0].type).toBe(EVENT_TYPES.MUTATION_CREATED)

      const newRevision = generateRevision()
      state = confirmMutationApplied(state, mutation.id, newRevision)

      expect(state.eventLog).toHaveLength(2)
      expect(state.eventLog[1].type).toBe(EVENT_TYPES.MUTATION_APPLIED)
    })
  })

  describe('辅助函数', () => {
    it('getItemsArray 正确返回项目数组', () => {
      const state = createInitialState(TEST_DATA)
      const items = getItemsArray(state)

      expect(items).toHaveLength(2)
      expect(items[0]._sync).toBeDefined()
      expect(items[0]._sync.state).toBe(SYNC_STATES.SYNCED)
    })

    it('hasUnsavedChanges 检测未保存的变更', () => {
      const state = createInitialState(TEST_DATA)
      expect(hasUnsavedChanges(state)).toBe(false)

      const mutation = createMutation('item_1', { title: '更新' }, 'user_1')
      const newState = applyMutationToState(state, mutation)
      expect(hasUnsavedChanges(newState)).toBe(true)
    })

    it('getPendingMutationsCount 返回正确计数', () => {
      const state = createInitialState(TEST_DATA)
      expect(getPendingMutationsCount(state)).toBe(0)

      const mutation = createMutation('item_1', { title: '更新' }, 'user_1')
      const newState = applyMutationToState(state, mutation)
      expect(getPendingMutationsCount(newState)).toBe(1)
    })

    it('getItemById 正确获取项目', () => {
      const state = createInitialState(TEST_DATA)
      const item = getItemById(state, 'item_1')

      expect(item).toBeDefined()
      expect(item.data.id).toBe('item_1')
    })
  })
})
