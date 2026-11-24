import type { ReactNode } from 'react'
import { CalendarRange, Info } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { MonitoringRange } from '../../features/ai-monitoring/useAIMonitoring'

export const RANGE_OPTIONS: { value: MonitoringRange; label: string }[] = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
]

export function MonitoringRangeControl({
  value,
  onChange,
  disabled,
}: {
  value: MonitoringRange
  onChange: (value: MonitoringRange) => void
  disabled?: boolean
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-charcoal/10 bg-white p-1">
      <CalendarRange className="ml-1.5 h-3.5 w-3.5 text-charcoal/35" />
      {RANGE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-md px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] transition',
            value === option.value
              ? 'bg-charcoal text-ivory'
              : 'text-charcoal/45 hover:bg-charcoal/[0.04] hover:text-charcoal/70',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function MonitoringScopeNotice({
  truncated,
  cappedAt,
  count,
  windowStart,
  noun = 'events',
}: {
  truncated: boolean
  cappedAt: number
  count: number
  windowStart: string
  noun?: string
}) {
  const since = new Date(windowStart)
  const sinceLabel = Number.isNaN(since.getTime()) ? 'the selected window' : since.toLocaleString()
  return (
    <div className="mb-4 flex items-start gap-2 rounded-xl border border-charcoal/10 bg-ivory/70 px-3.5 py-2.5 text-[10px] leading-relaxed text-charcoal/50">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-charcoal/30" />
      <p>
        Showing <span className="font-semibold text-charcoal/70">{count}</span> {noun} since{' '}
        <span className="font-medium text-charcoal/65">{sinceLabel}</span>. Queries are capped at{' '}
        <span className="font-medium text-charcoal/65">{cappedAt.toLocaleString()}</span>
        {truncated
          ? ' and this cap was reached — older records inside the window are not included.'
          : '; everything inside the window was read.'}
      </p>
    </div>
  )
}

export function MonitoringPill({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'info'
}) {
  const tones = {
    neutral: 'border-charcoal/10 bg-charcoal/[0.04] text-charcoal/50',
    good: 'border-emerald-600/20 bg-emerald-50 text-emerald-700',
    warn: 'border-amber-500/25 bg-amber-50 text-amber-700',
    bad: 'border-red-500/20 bg-red-50 text-red-700',
    info: 'border-blue-500/20 bg-blue-50 text-blue-700',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.1em]',
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}

export function MetricUnavailable({ label = 'Not measured yet' }: { label?: string }) {
  return <span className="text-[11px] italic text-charcoal/30">{label}</span>
}
