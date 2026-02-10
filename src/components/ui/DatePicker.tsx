'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const MONTHS_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

function toInputDate(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseInputDate(value?: string): Date | null {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  const date = new Date(year, month - 1, day, 12, 0, 0)
  return Number.isNaN(date.getTime()) ? null : date
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1, 12, 0, 0)
}

function isSameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

interface DatePickerProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
}

export function DatePicker({ value, onChange, placeholder = 'Selecionar data' }: DatePickerProps) {
  const selected = useMemo(() => parseInputDate(value), [value])
  const initial = selected || new Date()
  const [open, setOpen] = useState(false)
  const [showMonthGrid, setShowMonthGrid] = useState(false)
  const [viewYear, setViewYear] = useState(initial.getFullYear())
  const [viewMonth, setViewMonth] = useState(initial.getMonth())
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const handler = (event: MouseEvent) => {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
        setShowMonthGrid(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!selected) return
    setViewYear(selected.getFullYear())
    setViewMonth(selected.getMonth())
  }, [selected])

  const days = useMemo(() => {
    const first = startOfMonth(viewYear, viewMonth)
    const startWeekday = first.getDay() // 0 Sunday
    const totalDays = getDaysInMonth(viewYear, viewMonth)

    const cells: Array<{ date: Date; current: boolean }> = []
    // Fill prev month
    if (startWeekday > 0) {
      const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear
      const prevDays = getDaysInMonth(prevYear, prevMonth)
      for (let i = startWeekday - 1; i >= 0; i--) {
        const d = new Date(prevYear, prevMonth, prevDays - i, 12, 0, 0)
        cells.push({ date: d, current: false })
      }
    }
    // Current month
    for (let d = 1; d <= totalDays; d++) {
      cells.push({ date: new Date(viewYear, viewMonth, d, 12, 0, 0), current: true })
    }
    // Next month to complete grid to 42 cells
    while (cells.length < 42) {
      const last = cells[cells.length - 1].date
      const next = new Date(last)
      next.setDate(last.getDate() + 1)
      cells.push({ date: next, current: false })
    }
    return cells
  }, [viewYear, viewMonth])

  const handleSelect = (date: Date) => {
    const next = toInputDate(date)
    onChange(next)
    setOpen(false)
    setShowMonthGrid(false)
  }

  const label = selected
    ? `${String(selected.getDate()).padStart(2, '0')}/${String(selected.getMonth() + 1).padStart(2, '0')}/${selected.getFullYear()}`
    : ''

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all min-h-touch text-left flex items-center justify-between"
      >
        <span className={label ? 'text-gray-100' : 'text-gray-500'}>{label || placeholder}</span>
        <Calendar className="w-4 h-4 text-gray-500" />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-72 bg-dark-500 border border-dark-100 rounded-xl shadow-xl p-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (showMonthGrid) {
                  setViewYear((y) => y - 1)
                } else {
                  const m = viewMonth - 1
                  if (m < 0) {
                    setViewMonth(11)
                    setViewYear((y) => y - 1)
                  } else {
                    setViewMonth(m)
                  }
                }
              }}
              className="p-2 rounded-lg hover:bg-dark-400 text-gray-300"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setShowMonthGrid((prev) => !prev)}
              className="text-sm font-semibold text-gray-200 hover:text-brand"
            >
              {MONTHS[viewMonth]} {viewYear}
            </button>

            <button
              type="button"
              onClick={() => {
                if (showMonthGrid) {
                  setViewYear((y) => y + 1)
                } else {
                  const m = viewMonth + 1
                  if (m > 11) {
                    setViewMonth(0)
                    setViewYear((y) => y + 1)
                  } else {
                    setViewMonth(m)
                  }
                }
              }}
              className="p-2 rounded-lg hover:bg-dark-400 text-gray-300"
              aria-label="Proximo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {showMonthGrid ? (
            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              {MONTHS_SHORT.map((m, idx) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setViewMonth(idx)
                    setShowMonthGrid(false)
                  }}
                  className={`px-2 py-2 rounded-lg ${
                    idx === viewMonth ? 'bg-brand/20 text-brand' : 'text-gray-300 hover:bg-dark-400'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-3">
              <div className="grid grid-cols-7 text-xs text-gray-500 mb-1">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d) => (
                  <div key={d} className="text-center">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((cell) => {
                  const isSelected = isSameDay(cell.date, selected)
                  const isCurrent = cell.current
                  return (
                    <button
                      key={`${cell.date.toISOString()}`}
                      type="button"
                      onClick={() => handleSelect(cell.date)}
                      className={`h-8 rounded-md text-xs ${
                        isSelected
                          ? 'bg-brand text-dark-800 font-semibold'
                          : isCurrent
                            ? 'text-gray-200 hover:bg-dark-400'
                            : 'text-gray-500 hover:bg-dark-400/50'
                      }`}
                    >
                      {cell.date.getDate()}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

