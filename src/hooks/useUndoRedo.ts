'use client'

import { useState, useEffect } from 'react'
import { undo, redo, subscribe, getUndoRedoState } from '@/lib/undo/undoStore'

export function useUndoRedo() {
  const [state, setState] = useState(() => getUndoRedoState())

  useEffect(() => {
    const update = () => setState(getUndoRedoState())
    update()
    return subscribe(update)
  }, [])

  return {
    ...state,
    undo,
    redo,
  }
}
