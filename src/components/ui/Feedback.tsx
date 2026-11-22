import { Clock3, ShieldCheck, Sparkles } from 'lucide-react'
import type { MissionDefinition } from '../../types'
import { Badge } from './Badge'

export function DemoNotice({
  className = '',
  sensitive = false,
}: {
  className?: string
  sensitive?: boolean
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border border-orange-500/25 bg-orange-50 p-4 text-sm text-orange-900 ${className}`}
    >
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="leading-relaxed">
        <strong className="font-semibold">Frontend demo.</strong>{' '}
        {sensitive
          ? 'Mission answers, including health and nutrition fields, are saved to your account and cached in this browser so your plan can respect them. Do not enter medical document numbers or prescriptions.'
          : 'Mission answers and progress are saved to your account and cached in this browser for personalisation.'}
      </p>
    </div>
  )
}

export function MissionMeta({ mission }: { mission: MissionDefinition }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone="muted">
        <Clock3 className="h-3 w-3" aria-hidden="true" /> {mission.estimatedMinutes} min
      </Badge>
      <Badge tone="orange">
        <Sparkles className="h-3 w-3" aria-hidden="true" /> +{mission.xp} XP
      </Badge>
      {mission.sensitive && (
        <Badge tone="red">
          <ShieldCheck className="h-3 w-3" aria-hidden="true" /> Sensitive
        </Badge>
      )}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-charcoal/15 bg-white/60 px-6 py-14 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-charcoal text-white">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-charcoal">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-charcoal/55">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
