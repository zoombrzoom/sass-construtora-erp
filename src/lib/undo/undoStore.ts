/**
 * Store global de Desfazer/Refazer.
 * Permite registrar ações reversíveis e navegar no tempo (undo/redo).
 * Usa window para garantir singleton único (evita instâncias duplicadas no bundler).
 */

export interface UndoableAction {
  description: string
  undo: () => Promise<void>
  redo: () => Promise<void>
}

const MAX_STACK_SIZE = 50
type Listener = () => void

const STORE_KEY = '__majollo_undo_store'

function getStore() {
  if (typeof window === 'undefined') {
    return {
      undoStack: [] as UndoableAction[],
      redoStack: [] as UndoableAction[],
      listeners: new Set<Listener>(),
    }
  }
  let store = (window as any)[STORE_KEY]
  if (!store) {
    store = {
      undoStack: [] as UndoableAction[],
      redoStack: [] as UndoableAction[],
      listeners: new Set<Listener>(),
    }
    ;(window as any)[STORE_KEY] = store
  }
  return store
}

function notify() {
  const { listeners } = getStore()
  listeners.forEach((fn: Listener) => fn())
}

function truncateStack<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr
  return arr.slice(-max)
}

export function pushUndoable(action: UndoableAction): void {
  const store = getStore()
  store.redoStack.length = 0
  store.undoStack.push(action)
  const truncated = truncateStack(store.undoStack, MAX_STACK_SIZE)
  store.undoStack.length = 0
  store.undoStack.push(...truncated)
  notify()
}

function dispatchUndoRedoComplete() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('undoredo:complete'))
  }
}

export async function undo(): Promise<void> {
  const store = getStore()
  if (store.undoStack.length === 0) return
  const action = store.undoStack.pop()!
  try {
    await action.undo()
    store.redoStack.push(action)
    dispatchUndoRedoComplete()
  } catch (err) {
    console.error('Erro ao desfazer:', err)
    if (typeof window !== 'undefined') {
      window.alert('Não foi possível desfazer. Verifique o console para detalhes.')
    }
    store.undoStack.push(action)
  }
  notify()
}

export async function redo(): Promise<void> {
  const store = getStore()
  if (store.redoStack.length === 0) return
  const action = store.redoStack.pop()!
  try {
    await action.redo()
    store.undoStack.push(action)
    dispatchUndoRedoComplete()
  } catch (err) {
    console.error('Erro ao refazer:', err)
    if (typeof window !== 'undefined') {
      window.alert('Não foi possível refazer. Verifique o console para detalhes.')
    }
    store.redoStack.push(action)
  }
  notify()
}

export function subscribe(listener: Listener): () => void {
  const store = getStore()
  store.listeners.add(listener)
  return () => store.listeners.delete(listener)
}

export function getUndoRedoState() {
  const store = getStore()
  return {
    canUndo: store.undoStack.length > 0,
    canRedo: store.redoStack.length > 0,
    undoLabel: store.undoStack.length > 0 ? store.undoStack[store.undoStack.length - 1].description : '',
    redoLabel: store.redoStack.length > 0 ? store.redoStack[store.redoStack.length - 1].description : '',
    undoCount: store.undoStack.length,
    redoCount: store.redoStack.length,
  }
}
