'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0)
}

interface MonthPickerProps {
  value: Date
  onChange: (value: Date) => void
  className?: string
}

export function MonthPicker({ value, onChange, className = '' }: MonthPickerProps) {
  const current = useMemo(() => startOfMonth(value), [value])
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(current.getFullYear())
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setViewYear(current.getFullYear())
  }, [current])

  useEffect(() => {
    if (!open) return
    const handler = (event: MouseEvent) => {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const label = `${MONTHS[current.getMonth()]} ${current.getFullYear()}`

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all min-h-touch text-left inline-flex items-center justify-between gap-2 whitespace-nowrap"
        title="Selecionar mês"
      >
        <span className="text-gray-100">{label}</span>
        <Calendar className="w-4 h-4 text-gray-500" />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-72 bg-dark-500 border border-dark-100 rounded-xl shadow-xl p-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              className="p-2 rounded-lg hover:bg-dark-400 text-gray-300"
              aria-label="Ano anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-sm font-semibold text-gray-200">{viewYear}</div>

            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              className="p-2 rounded-lg hover:bg-dark-400 text-gray-300"
              aria-label="Proximo ano"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
            {MONTHS.map((m, idx) => {
              const active = current.getFullYear() === viewYear && current.getMonth() === idx
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    onChange(new Date(viewYear, idx, 1, 12, 0, 0))
                    setOpen(false)
                  }}
                  className={`px-2 py-2 rounded-lg ${
                    active ? 'bg-brand/20 text-brand' : 'text-gray-300 hover:bg-dark-400'
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

