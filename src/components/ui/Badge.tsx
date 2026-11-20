import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface BadgeProps {
  children: ReactNode
  tone?: 'orange' | 'dark' | 'light' | 'green' | 'muted' | 'red'
  className?: string
}

const tones = {
  orange: 'border-orange-500/25 bg-orange-500/10 text-orange-700',
  dark: 'border-charcoal/15 bg-charcoal text-white',
  light: 'border-white/20 bg-white/10 text-white',
  green: 'border-emerald-600/20 bg-emerald-50 text-emerald-700',
  muted: 'border-charcoal/10 bg-charcoal/[0.04] text-charcoal/60',
  red: 'border-red-500/20 bg-red-50 text-red-700',
}

export function Badge({ children, tone = 'muted', className }: BadgeProps) {
  return <span className={cn('pill', tones[tone], className)}>{children}</span>
}
