'use client'

import { useState } from 'react'
import { Undo2, Redo2 } from 'lucide-react'
import { useUndoRedo } from '@/hooks/useUndoRedo'

export function UndoRedoButton() {
  const { canUndo, canRedo, undoLabel, redoLabel, undo, redo } = useUndoRedo()
  const [undoing, setUndoing] = useState(false)

  const handleUndo = async () => {
    if (!canUndo || undoing) return
    setUndoing(true)
    try {
      await undo()
    } finally {
      setUndoing(false)
    }
  }

  const handleRedo = async () => {
    if (!canRedo || undoing) return
    setUndoing(true)
    try {
      await redo()
    } finally {
      setUndoing(false)
    }
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-40 flex items-center gap-1 rounded-full border border-dark-100 bg-dark-500/95 shadow-lg backdrop-blur-sm"
      role="group"
    >
      <button
        type="button"
        onClick={handleUndo}
        disabled={!canUndo || undoing}
        title={canUndo ? `Desfazer: ${undoLabel}` : 'Nada para desfazer'}
        className="flex h-10 w-10 items-center justify-center rounded-l-full text-gray-400 transition-colors hover:bg-dark-400 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400"
      >
        <Undo2 className="h-5 w-5" />
      </button>
      <div className="h-5 w-px bg-dark-200" />
      <button
        type="button"
        onClick={handleRedo}
        disabled={!canRedo || undoing}
        title={canRedo ? `Refazer: ${redoLabel}` : 'Nada para refazer'}
        className="flex h-10 w-10 items-center justify-center rounded-r-full text-gray-400 transition-colors hover:bg-dark-400 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400"
      >
        <Redo2 className="h-5 w-5" />
      </button>
    </div>
  )
}
