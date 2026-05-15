import { ERROR_CODES, DEFAULT_CONFIG } from './constants.js'
import { createError } from './errors.js'

const serializeState = (state) => {
  return {
    ...state,
    expandedIds: state.expandedIds ? Array.from(state.expandedIds) : [],
  }
}

const deserializeState = (state) => {
  return {
    ...state,
    expandedIds: new Set(state.expandedIds || []),
  }
}

class UndoStack {
  constructor(maxSize = DEFAULT_CONFIG.maxUndoStackSize) {
    this.maxSize = maxSize
    this.undoStack = []
    this.redoStack = []
    this.currentState = null
  }

  pushState(state) {
    if (this.currentState !== null) {
      this.undoStack.push(this.currentState)
      if (this.undoStack.length > this.maxSize) {
        this.undoStack.shift()
      }
    }
    this.currentState = serializeState(state)
    this.redoStack = []
  }

  canUndo() {
    return this.undoStack.length > 0
  }

  canRedo() {
    return this.redoStack.length > 0
  }

  undo() {
    if (!this.canUndo()) {
      throw createError(ERROR_CODES.UNDO_STACK_EMPTY, 'Undo stack is empty')
    }

    this.redoStack.push(this.currentState)
    this.currentState = this.undoStack.pop()
    return deserializeState(this.currentState)
  }

  redo() {
    if (!this.canRedo()) {
      throw createError(ERROR_CODES.REDO_STACK_EMPTY, 'Redo stack is empty')
    }

    this.undoStack.push(this.currentState)
    this.currentState = this.redoStack.pop()
    return deserializeState(this.currentState)
  }

  getUndoCount() {
    return this.undoStack.length
  }

  getRedoCount() {
    return this.redoStack.length
  }

  clear() {
    this.undoStack = []
    this.redoStack = []
    this.currentState = null
  }

  toJSON() {
    return {
      maxSize: this.maxSize,
      undoStack: this.undoStack,
      redoStack: this.redoStack,
      currentState: this.currentState,
    }
  }

  static fromJSON(json) {
    const stack = new UndoStack(json.maxSize)
    stack.undoStack = json.undoStack || []
    stack.redoStack = json.redoStack || []
    stack.currentState = json.currentState
    return stack
  }
}

const createUndoStack = (maxSize) => new UndoStack(maxSize)

const debounce = (fn, delayMs = DEFAULT_CONFIG.debounceMs) => {
  let timeoutId = null
  return (...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delayMs)
  }
}

const throttle = (fn, delayMs) => {
  let lastCall = 0
  return (...args) => {
    const now = Date.now()
    if (now - lastCall >= delayMs) {
      fn(...args)
      lastCall = now
    }
  }
}

export { UndoStack, createUndoStack, debounce, throttle }
