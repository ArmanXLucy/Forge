import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  Lock,
  ShieldCheck,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { PageHeader, MissionStatusBadge, DemoDataBadge } from '../../components/dashboard/ui'
import { ProgressRing } from '../../components/ui/ProgressRing'
import { Badge } from '../../components/ui/Badge'
import { Button, buttonClasses } from '../../components/ui/Button'
import { MISSION_ICONS } from '../../components/navigation/dashboardNav'
import { useProfileStore, useProfileStats } from '../../store/useProfileStore'
import { useDataStatus } from '../../hooks/useDataStatus'
import { MISSIONS, ADVANCED_ASSESSMENTS, ACHIEVEMENTS } from '../../data/missions'
import { effectiveStatus, unlockedAchievements } from '../../utils/missions'
import { getMissionSettings } from '../../services/cloud/adminRepository'
import { cn } from '../../lib/utils'
import type { Achievement } from '../../types'
import {
  Apple,
  Award,
  Dumbbell,
  Flame,
  Footprints,
  Ruler,
  Target,
  Trophy as TrophyIcon,
} from 'lucide-react'

const achievementIcons: Record<Achievement['icon'], typeof Award> = {
  footprints: Footprints,
  ruler: Ruler,
  dumbbell: Dumbbell,
  apple: Apple,
  flame: Flame,
  trophy: TrophyIcon,
  brain: Target,
  shield: Award,
}

export default function MissionsPage() {
  const { isCloud, label } = useDataStatus()
  const progress = useProfileStore((s) => s.progress)
  const profile = useProfileStore((s) => s.profile)
  const { completion, xp, completedMissions } = useProfileStats()
  const [missionSettings, setMissionSettings] = useState<Record<string, boolean>>({})
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const visibleMissions = MISSIONS.filter((mission) => missionSettings[mission.id] !== false)
  const next = visibleMissions.find((mission) => progress[mission.id]?.status !== 'completed') ?? null
  const visibleCompleted = visibleMissions.filter((mission) => progress[mission.id]?.status === 'completed').length
  const achievements = unlockedAchievements(profile, progress)
  const unlockedIds = new Set(achievements.map((achievement) => achievement.id))
  const allComplete = settingsLoaded && visibleMissions.length > 0 && visibleCompleted === visibleMissions.length

  useEffect(() => {
    let cancelled = false
    getMissionSettings()
      .then((settings) => {
        if (!cancelled) setMissionSettings(settings)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setSettingsLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div>
      <PageHeader
        eyebrow="Profile path"
        title="My missions"
        subtitle="Complete missions in any order. Each one sharpens the plan your coach can build for you — no giant questionnaire required."
        actions={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/25 bg-orange-500/5 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-orange-700">
              <Sparkles className="h-3.5 w-3.5" /> {xp} XP
            </span>
            <span className="rounded-full border border-charcoal/12 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/50">
              {visibleCompleted}/{visibleMissions.length} done
            </span>
          </div>
        }
      />

      <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-5">
            <ProgressRing value={completion} size={100} strokeWidth={8}>
              <span className="font-display uppercase text-2xl leading-none text-charcoal">{completion}%</span>
              <span className="mt-0.5 text-[8px] uppercase tracking-[0.12em] text-charcoal/35">
                complete
              </span>
            </ProgressRing>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-charcoal/35">
                Profile strength
              </p>
              <p className="mt-1 font-display uppercase text-xl leading-tight text-charcoal">
                {allComplete ? 'Complete athlete' : `${visibleMissions.length - visibleCompleted} missions to go`}
              </p>
              <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-charcoal/45">
                {allComplete
                  ? 'Every profile dimension is covered. Your advanced assessments are unlocked.'
                  : 'The more missions you complete, the more precise your training and nutrition support can become.'}
              </p>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-charcoal/35">
              <span>Next recommended</span>
              <span>{next ? `Mission ${next.number}` : 'All complete'}</span>
            </div>
            <div className="mt-2 flex flex-col gap-2 rounded-xl bg-ivory p-3.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[13px] font-semibold text-charcoal">
                {next ? next.title : 'Advanced assessments unlocked'}
              </p>
              {next ? (
                <Link
                  to={`/dashboard/missions/${next.id}`}
                  className={buttonClasses('dark', 'sm', 'shrink-0')}
                >
                  Continue <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                  <Trophy className="h-3.5 w-3.5" /> Well done
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-50 p-4 text-[12px] leading-relaxed text-amber-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <strong className="font-semibold">Safety first.</strong> No personalised exercise or
          nutrition recommendations are generated until the Health Profile mission has been reviewed by
          your coach. Sensitive answers are never stored or sent anywhere by this build.
        </p>
      </div>

      <section className="mt-6" aria-labelledby="mission-grid-heading">
        <div className="mb-3 flex items-end justify-between">
          <h2 id="mission-grid-heading" className="text-[13px] font-bold uppercase tracking-[0.14em] text-charcoal">
            Profile dimensions
          </h2>
          <DemoDataBadge label={isCloud ? 'Status synced' : label} />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleMissions.map((mission) => {
            const status = effectiveStatus(mission.id, progress)
            const Icon = MISSION_ICONS[mission.id] ?? Target
            const isCompleted = status === 'completed'
            const isInProgress = status === 'in_progress'
            const totalFields = mission.sections.reduce((sum, section) => sum + section.fields.length, 0)
            const answeredFields = progress[mission.id]?.answeredFields ?? 0
            const percent = isCompleted
              ? 100
              : status === 'available'
                ? 0
                : totalFields
                  ? Math.round((answeredFields / totalFields) * 100)
                  : 0
            return (
              <article
                key={mission.id}
                className={cn(
                  'group relative flex flex-col rounded-2xl border bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-soft',
                  isCompleted ? 'border-emerald-600/15' : 'border-charcoal/10',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-xl',
                      isCompleted
                        ? 'bg-emerald-600 text-white'
                        : isInProgress
                          ? 'bg-amber-500 text-white'
                          : 'bg-charcoal text-white',
                    )}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-charcoal/20">
                      {mission.number}
                    </span>
                    <MissionStatusBadge status={status} />
                  </div>
                </div>
                <h3 className="mt-4 font-display uppercase text-xl leading-none text-charcoal">
                  {mission.title}
                </h3>
                <p className="mt-2 flex-1 text-[12px] leading-relaxed text-charcoal/50">
                  {mission.description}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge tone="muted">
                    <Clock3 className="h-3 w-3" /> {mission.estimatedMinutes} min
                  </Badge>
                  <Badge tone="orange">
                    <Sparkles className="h-3 w-3" /> {mission.xp} XP
                  </Badge>
                  {mission.sensitive && <Badge tone="red">Sensitive</Badge>}
                </div>
                <div className="mt-4 flex items-center gap-3 border-t border-charcoal/5 pt-4">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-charcoal/[0.06]">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        isCompleted ? 'bg-emerald-500' : isInProgress ? 'bg-amber-500' : 'bg-orange-500',
                      )}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.08em] text-charcoal/30">
                    {isCompleted ? '100%' : totalFields ? `${answeredFields}/${totalFields}` : '0%'}
                  </span>
                  <Link
                    to={`/dashboard/missions/${mission.id}`}
                    className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/55 transition-colors hover:text-orange-600"
                  >
                    {isCompleted ? 'Review' : isInProgress ? 'Resume' : 'Start'}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="advanced-heading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="advanced-heading" className="text-[13px] font-bold uppercase tracking-[0.14em] text-charcoal">
              Advanced assessments
            </h2>
            <p className="mt-1 text-[11px] text-charcoal/40">
              Deeper optional diagnostics, unlocked after all seven missions.
            </p>
          </div>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.14em]',
              allComplete
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-charcoal/[0.04] text-charcoal/35',
            )}
          >
            {allComplete ? <Check className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
            {allComplete ? 'Unlocked' : 'Locked'}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ADVANCED_ASSESSMENTS.map((assessment) => (
            <div
              key={assessment.id}
              className={cn(
                'rounded-xl border p-4',
                allComplete ? 'border-charcoal/10 bg-white' : 'border-charcoal/5 bg-charcoal/[0.02]',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p
                  className={cn(
                    'text-[12px] font-semibold',
                    allComplete ? 'text-charcoal' : 'text-charcoal/40',
                  )}
                >
                  {assessment.title}
                </p>
                <Lock className={cn('h-3.5 w-3.5 shrink-0', allComplete ? 'text-orange-500' : 'text-charcoal/20')} />
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-charcoal/35">{assessment.description}</p>
              <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.12em] text-charcoal/25">
                {assessment.minutes} min · {allComplete ? 'Book with coach' : 'Requires 7/7 missions'}
              </p>
              {allComplete && (
                <a
                  href={`mailto:hello@forge-athletic.ch?subject=${encodeURIComponent(
                    `Advanced assessment: ${assessment.title}`,
                  )}`}
                  className="mt-3 inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-charcoal px-3 text-[9px] font-bold uppercase tracking-[0.1em] text-white"
                >
                  Request booking <ArrowRight className="h-3 w-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="achievements-heading">
        <div className="mb-3 flex items-end justify-between">
          <h2 id="achievements-heading" className="text-[13px] font-bold uppercase tracking-[0.14em] text-charcoal">
            Achievements
          </h2>
          <span className="text-[10px] text-charcoal/35">
            {unlockedIds.size} of {ACHIEVEMENTS.length} unlocked
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ACHIEVEMENTS.map((achievement) => {
            const Icon = achievementIcons[achievement.icon]
            const unlocked = unlockedIds.has(achievement.id)
            return (
              <div
                key={achievement.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3.5',
                  unlocked ? 'border-orange-500/25 bg-orange-500/[0.04]' : 'border-charcoal/8 bg-white',
                )}
              >
                <span
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                    unlocked ? 'bg-orange-500 text-white' : 'bg-ivory text-charcoal/20',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p
                    className={cn(
                      'text-[12px] font-semibold',
                      unlocked ? 'text-charcoal' : 'text-charcoal/40',
                    )}
                  >
                    {achievement.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-charcoal/35">
                    {achievement.description}
                  </p>
                </div>
                <span
                  className={cn(
                    'ml-auto shrink-0 text-[9px] font-bold uppercase tracking-[0.1em]',
                    unlocked ? 'text-orange-600' : 'text-charcoal/20',
                  )}
                >
                  +{achievement.xp}
                </span>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
