"use client"

import * as React from "react"
import { flushSync } from "react-dom"
import { format, isSameDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

function parseYmdLocal(ymd: string | null | undefined): Date | undefined {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return undefined
  const [y, m, d] = ymd.split("-").map(Number)
  const dt = new Date(y, m - 1, d)
  return Number.isNaN(dt.getTime()) ? undefined : dt
}

function formatYmdLocal(d: Date): string {
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${mo}-${day}`
}

export function VendasDateRangePicker({
  defaultFrom,
  defaultTo,
  onApply,
}: {
  defaultFrom?: string | null
  defaultTo?: string | null
  onApply?: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState<DateRange | undefined>(() => {
    const from = parseYmdLocal(defaultFrom)
    const to = parseYmdLocal(defaultTo)
    if (from && to) return { from, to }
    if (from) return { from, to: undefined }
    return undefined
  })
  const appliedCompleteRef = React.useRef(false)
  const dateRef = React.useRef(date)
  React.useEffect(() => {
    dateRef.current = date
  }, [date])

  const fromInputRef = React.useRef<HTMLInputElement>(null)
  const toInputRef = React.useRef<HTMLInputElement>(null)

  const submitForm = React.useCallback(() => {
    const form = fromInputRef.current?.form
    if (form) form.requestSubmit()
    onApply?.()
  }, [onApply])

  const applyRangeToForm = React.useCallback(
    (next: DateRange | undefined) => {
      if (!fromInputRef.current || !toInputRef.current) return
      if (next?.from) {
        fromInputRef.current.value = formatYmdLocal(next.from)
      } else {
        fromInputRef.current.value = ""
      }
      if (next?.to) {
        toInputRef.current.value = formatYmdLocal(next.to)
      } else {
        toInputRef.current.value = ""
      }
    },
    []
  )

  const handleSelect = (next: DateRange | undefined) => {
    setDate(next)
    // Com `min={1}` no DayPicker, o 1.º clique fica só com `from` (não fecha).
    // Só aplicamos quando o intervalo está completo (inclui um dia único: from === to).
    if (!next?.from || !next?.to) return

    appliedCompleteRef.current = true
    flushSync(() => {
      applyRangeToForm(next)
    })
    submitForm()
    setOpen(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen && !appliedCompleteRef.current && dateRef.current?.from) {
      flushSync(() => {
        applyRangeToForm(dateRef.current)
      })
      submitForm()
    }
    if (!nextOpen) {
      appliedCompleteRef.current = false
    }
  }

  return (
    <Field className="w-full min-w-0">
      <FieldLabel htmlFor="vendas-periodo-trigger">Intervalo de datas</FieldLabel>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id="vendas-periodo-trigger"
            type="button"
            className="w-full justify-start px-2.5 font-normal"
          >
            <CalendarIcon className="mr-2 size-4 opacity-60" />
            {date?.from ? (
              date.to ? (
                isSameDay(date.from, date.to) ? (
                  format(date.from, "d 'de' MMM yyyy", { locale: ptBR })
                ) : (
                  <>
                    {format(date.from, "d 'de' MMM yyyy", { locale: ptBR })} –{" "}
                    {format(date.to, "d 'de' MMM yyyy", { locale: ptBR })}
                  </>
                )
              ) : (
                format(date.from, "d 'de' MMM yyyy", { locale: ptBR })
              )
            ) : (
              <span>Escolher datas</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            locale={ptBR}
            min={1}
            resetOnSelect
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
      <input
        ref={fromInputRef}
        type="hidden"
        name="from"
        defaultValue={defaultFrom ?? ""}
      />
      <input
        ref={toInputRef}
        type="hidden"
        name="to"
        defaultValue={defaultTo ?? ""}
      />
    </Field>
  )
}
