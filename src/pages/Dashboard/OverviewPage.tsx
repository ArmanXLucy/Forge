import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  Apple,
  ArrowRight,
  ArrowUpRight,
  Award,
  BedDouble,
  Brain,
  CalendarDays,
  Check,
  Clock3,
  Dumbbell,
  Flame,
  Footprints,
  Plus,
  Ruler,
  Scale,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  PageHeader,
  ProgressBar,
  SectionCard,
  SegmentedControl,
  SourceBadge,
  StatCard,
} from '../../components/dashboard/ui'
import { ProgressRing } from '../../components/ui/ProgressRing'
import { AnnouncementBanner } from '../../components/dashboard/AnnouncementBanner'
import { buttonClasses } from '../../components/ui/Button'
import { MISSION_ICONS } from '../../components/navigation/dashboardNav'
import { useProfileStore, useProfileStats } from '../../store/useProfileStore'
import { useActivityStore } from '../../store/useActivityStore'
import { useDataStatus } from '../../hooks/useDataStatus'
import { GOAL_LABELS, WEEKDAYS } from '../../lib/constants'
import { formatDate } from '../../lib/utils'
import { nextMission, unlockedAchievements } from '../../utils/missions'
import {
  computeStreak,
  formatMinutes,
  monthlySeries,
  relativeTime,
  weeklySeries,
  workoutsForWeek,
} from '../../utils/activity'
import { ACHIEVEMENTS, MISSIONS } from '../../data/missions'
import { WORKOUTS } from '../../data/dashboard'
import { MOTIVATION } from '../../data/dashboard'
import type { Achievement } from '../../types'
import { RecommendationSpotlight } from '../../features/workout-recommendation/components/RecommendationSpotlight'

const achievementIcons: Record<Achievement['icon'], typeof Award> = {
  footprints: Footprints,
  ruler: Ruler,
  dumbbell: Dumbbell,
  apple: Apple,
  flame: Flame,
  trophy: Trophy,
  brain: Target,
  shield: Award,
}

const GOAL_HEADLINES: Record<string, string> = {
  'fat-loss': 'Build a leaner, stronger base.',
  'build-muscle': 'Build muscle with a plan you can repeat.',
  'get-stronger': 'Build strength that carries into real life.',
  endurance: 'Build an engine that keeps going.',
  'general-health': 'Build health into your ordinary week.',
  longevity: 'Build strength for the long run.',
}

type ActivityRange = 'weekly' | 'monthly'

function ActivityTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; payload: { sessions?: number } }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-charcoal/10 bg-white px-3.5 py-2.5 shadow-soft">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-charcoal/40">{label}</p>
      <p className="mt-1 text-sm font-semibold text-charcoal">{payload[0].value} active min</p>
      {typeof payload[0].payload.sessions === 'number' && (
        <p className="text-[9px] text-charcoal/35">{payload[0].payload.sessions} sessions logged</p>
      )}
    </div>
  )
}

export default function OverviewPage() {
  const { source, label, isCloud } = useDataStatus()
  const profile = useProfileStore((s) => s.profile)
  const progress = useProfileStore((s) => s.progress)
  const { completion, xp, completedMissions } = useProfileStats()
  const workouts = useActivityStore((s) => s.workouts)
  const aiSessions = useActivityStore((s) => s.aiSessions)
  const [range, setRange] = useState<ActivityRange>('weekly')

  const upcoming = nextMission(progress)
  const achievements = unlockedAchievements(profile, progress)
  const unlockedIds = new Set(achievements.map((achievement) => achievement.id))
  const motivation = MOTIVATION[new Date().getDay() % MOTIVATION.length]

  const todayWeekday = new Date().getDay()
  const plannedWorkout =
    WORKOUTS.find((workout) => workout.weekday === todayWeekday) ??
    WORKOUTS.find((workout) => profile?.workoutDays.includes(workout.weekday)) ??
    WORKOUTS[0]
  const isTodaySession = plannedWorkout.weekday === todayWeekday
  const todayLabel = isTodaySession
    ? 'Today’s session'
    : `Next planned · ${WEEKDAYS.find((day) => day.value === plannedWorkout.weekday)?.short ?? 'Next'}`

  const weekWorkouts = workoutsForWeek(workouts)
  const weekMinutes = formatMinutes(
    weekWorkouts.reduce((sum, workout) => sum + workout.durationSeconds, 0),
  )
  const streak = computeStreak(workouts, aiSessions, progress)
  const totalMinutes = formatMinutes(workouts.reduce((sum, workout) => sum + workout.durationSeconds, 0))
  const weeklyData = weeklySeries(workouts, 7)
  const monthlyData = monthlySeries(workouts, 4)
  const chartData = range === 'weekly' ? weeklyData : monthlyData
  const chartMinutes = chartData.reduce((sum, point) => sum + point.minutes, 0)
  const chartSessions =
    range === 'weekly'
      ? weekWorkouts.length
      : monthlyData.reduce((sum, point) => sum + point.sessions, 0)
  const hasActivity = workouts.length > 0

  const recentActivity = [
    ...Object.values(progress)
      .filter((mission) => mission.status === 'completed' && mission.completedAt)
      .map((mission) => {
        const definition = MISSIONS.find((item) => item.id === mission.missionId)
        return {
          id: `mission-${mission.missionId}`,
          at: mission.completedAt as string,
          title: `${definition?.title ?? 'Mission'} completed`,
          detail: 'Profile mission',
          type: 'mission' as const,
        }
      }),
    ...workouts.map((workout) => ({
      id: workout.id,
      at: workout.completedAt,
      title: workout.title,
      detail: `${formatMinutes(workout.durationSeconds)} min · ${workout.exercisesCompleted}/${workout.totalExercises} exercises`,
      type: 'workout' as const,
    })),
    ...aiSessions.map((session) => ({
      id: session.id,
      at: session.completedAt,
      title: `${session.exerciseLabel} AI session`,
      detail: `${session.reps} reps · ${formatMinutes(session.durationSeconds)} min`,
      type: 'ai' as const,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 5)

  const nextMilestones = Object.values(progress)
    .filter((mission) => mission.status !== 'completed')
    .slice(0, 3)
    .map((mission) => ({ ...mission, definition: MISSION_ICONS[mission.missionId] }))

  return (
    <div>
      <PageHeader
        eyebrow={`${formatDate(new Date())} · Overview`}
        title={
          <>
            Today&apos;s command center<span className="text-orange-500">.</span>
          </>
        }
        subtitle="Your training, recovery and profile in one place. Start with the one action that matters today."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/dashboard/ai-coach" className={buttonClasses('primary', 'sm')}>
              <Sparkles className="h-3.5 w-3.5" /> Start AI coach
            </Link>
            <Link to="/dashboard/workouts" className={buttonClasses('outline', 'sm')}>
              View plan <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        }
      />

      <AnnouncementBanner />

      <section className="relative overflow-hidden rounded-2xl bg-charcoal p-6 text-white sm:p-8">
        <div className="absolute inset-0">
          <img
            src="/images/woman-strong.jpg"
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover object-center opacity-20"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal via-charcoal/95 to-charcoal/45" />
        </div>
        <div className="relative z-10 grid gap-7 lg:grid-cols-[1.5fr_1fr] lg:items-center">
          <div>
            <p className="eyebrow-light">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" /> Your current chapter
            </p>
            <h2 className="mt-3 max-w-xl font-display uppercase text-3xl leading-[0.94] sm:text-4xl xl:text-5xl">
              {profile?.goal ? GOAL_HEADLINES[profile.goal] : 'Build your stronger self.'}
            </h2>
            <p className="mt-3 max-w-lg text-[13px] leading-relaxed text-white/55">
              {completedMissions === 0
                ? 'Your foundation starts with one profile mission. Every answer makes the next recommendation more relevant.'
                : `${completedMissions} of 7 profile missions complete. ${streak > 0 ? `You are on a ${streak}-day activity streak.` : 'One logged session restarts the momentum.'}`}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.13em] text-white/65">
                <Target className="h-3 w-3 text-orange-400" />
                {profile ? GOAL_LABELS[profile.goal] : 'Goal not set'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.13em] text-white/65">
                <Dumbbell className="h-3 w-3 text-orange-400" />
                {profile ? `${profile.workoutDays.length} planned days` : 'Set your rhythm'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.13em] text-orange-400">
                <Sparkles className="h-3 w-3" /> {xp} XP
              </span>
            </div>
          </div>

          <div className="flex items-center gap-5 rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur-sm sm:p-5">
            <ProgressRing value={completion} size={94} strokeWidth={7} trackClassName="text-white/10">
              <span className="font-display uppercase text-2xl leading-none text-white">{completion}%</span>
              <span className="mt-1 text-[8px] uppercase tracking-[0.12em] text-white/40">Profile</span>
            </ProgressRing>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">
                Next profile step
              </p>
              <p className="mt-1 truncate text-[14px] font-semibold text-white">
                {upcoming ? upcoming.title : 'All missions complete'}
              </p>
              <p className="mt-1 text-[10px] text-white/40">
                {upcoming ? `+${upcoming.xp} XP · ${upcoming.estimatedMinutes} min` : 'Advanced path unlocked'}
              </p>
              <Link
                to={upcoming ? `/dashboard/missions/${upcoming.id}` : '/dashboard/missions'}
                className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-orange-400 hover:text-orange-300"
              >
                {upcoming ? 'Continue mission' : 'View missions'} <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <RecommendationSpotlight className="mt-4" />

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <section className="relative overflow-hidden rounded-2xl bg-orange-500 p-5 text-white sm:p-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full border-[28px] border-white/10"
          />
          <div className="relative z-10 flex h-full flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.14em]">
                {todayLabel}
              </span>
              <span className="rounded-full border border-white/25 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.14em] text-white/75">
                {plannedWorkout.intensity} intensity
              </span>
              <span className="ml-auto rounded-full border border-white/25 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.14em] text-white/75">
                Sample plan
              </span>
            </div>
            <h2 className="mt-4 max-w-xl font-display uppercase text-3xl leading-none sm:text-4xl">
              {plannedWorkout.title}
            </h2>
            <p className="mt-2 text-[12px] text-white/75">{plannedWorkout.focus}</p>
            <div className="mt-5 grid max-w-md grid-cols-3 gap-3 border-t border-white/20 pt-4">
              <div>
                <p className="text-[8px] uppercase tracking-[0.14em] text-white/55">Exercises</p>
                <p className="mt-1 font-display text-xl">{plannedWorkout.exercises.length}</p>
              </div>
              <div>
                <p className="text-[8px] uppercase tracking-[0.14em] text-white/55">Duration</p>
                <p className="mt-1 font-display text-xl">{plannedWorkout.duration}m</p>
              </div>
              <div>
                <p className="text-[8px] uppercase tracking-[0.14em] text-white/55">Last logged</p>
                <p className="mt-1 font-display text-xl">{workouts.length ? relativeTime(workouts[0].completedAt) : '—'}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                to={`/dashboard/workouts?start=${plannedWorkout.id}`}
                className={buttonClasses('dark', 'sm')}
              >
                <Dumbbell className="h-3.5 w-3.5" /> Start workout
              </Link>
              <Link
                to="/dashboard/workouts"
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-full border border-white/35 px-4 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-white hover:text-orange-700"
              >
                Full week <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        <SectionCard
          eyebrow="Quick actions"
          title="Keep the day moving."
          action={<SourceBadge source={source} label={isCloud ? 'Cloud account' : 'Local actions'} />}
        >
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: 'AI Coach', detail: 'Live form check', to: '/dashboard/ai-coach', icon: Brain },
              { label: 'Log meal', detail: 'Nutrition', to: '/dashboard/nutrition', icon: Apple },
              { label: 'Log weight', detail: 'Progress', to: '/dashboard/progress', icon: Scale },
              { label: 'Recovery', detail: 'Sleep & habits', to: '/dashboard/lifestyle', icon: BedDouble },
            ].map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className="group flex min-h-[96px] flex-col justify-between rounded-xl border border-charcoal/10 bg-ivory/50 p-3.5 transition-all hover:-translate-y-0.5 hover:border-orange-500/30 hover:bg-orange-500/[0.04] hover:shadow-soft"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-charcoal/55 shadow-sm transition-colors group-hover:bg-orange-500 group-hover:text-white">
                  <action.icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-[11px] font-semibold text-charcoal">{action.label}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-[9px] uppercase tracking-[0.08em] text-charcoal/35">
                    {action.detail} <ArrowUpRight className="h-2.5 w-2.5" />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>

      <section className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          icon={Dumbbell}
          label="Workouts logged"
          value={workouts.length}
          suffix="total"
          note={`${totalMinutes} min recorded`}
          source={workouts.length ? source : 'empty'}
        />
        <StatCard
          icon={Activity}
          label="This week"
          value={weekMinutes}
          suffix="min"
          note={`${weekWorkouts.length} sessions · ${isCloud ? 'synced' : 'saved locally'}`}
          accent
          source={weekWorkouts.length ? source : 'empty'}
        />
        <StatCard
          icon={Flame}
          label="Activity streak"
          value={streak}
          suffix={streak === 1 ? 'day' : 'days'}
          note={streak ? 'Workouts, missions or AI sessions' : 'Complete one action today'}
          source={streak ? source : 'empty'}
        />
        <StatCard
          icon={Target}
          label="Profile readiness"
          value={completion}
          suffix="%"
          note={`${completedMissions} of 7 missions complete`}
          source={source}
        />
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.65fr_1fr]">
        <SectionCard
          eyebrow="Training load"
          title={`${chartMinutes} active minutes`}
          action={
            <SegmentedControl
              value={range}
              onChange={setRange}
              label="Activity range"
              options={[
                { value: 'weekly', label: 'This week' },
                { value: 'monthly', label: '4 weeks' },
              ]}
            />
          }
        >
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-[11px] text-charcoal/40">
              {chartSessions} {chartSessions === 1 ? 'session' : 'sessions'} logged · {isCloud ? 'synced to your account' : 'saved on this device'}
            </span>
          </div>
          <div className="mt-4 h-[230px] w-full min-w-0">
            {hasActivity ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 4, right: 0, bottom: 0, left: -16 }}
                >
                  <CartesianGrid vertical={false} stroke="#171717" strokeOpacity={0.06} />
                  <XAxis
                    dataKey={range === 'weekly' ? 'day' : 'label'}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#8A857D' }}
                    dy={6}
                  />
                  <YAxis hide />
                  <Tooltip content={<ActivityTooltip />} cursor={{ fill: '#F97316', opacity: 0.06 }} />
                  <Bar dataKey="minutes" fill="#F97316" radius={[6, 6, 0, 0]} maxBarSize={34} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-charcoal/15 bg-ivory/40 px-5 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-charcoal text-white">
                  <Activity className="h-5 w-5" />
                </span>
                <p className="mt-3 text-[13px] font-semibold text-charcoal">No training logged yet.</p>
                <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-charcoal/45">
                  Start a workout and your weekly activity will build from real sessions, not sample numbers.
                </p>
                <Link
                  to={`/dashboard/workouts?start=${plannedWorkout.id}`}
                  className={buttonClasses('dark', 'sm', 'mt-4')}
                >
                  Start first session <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-charcoal/5 pt-3">
            <span className="text-[10px] text-charcoal/35">
              Plan target: {profile?.workoutDays.length ?? 3} sessions per week
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-charcoal/45">
              <Flame className="h-3 w-3 text-orange-500" /> {streak}-day streak
            </span>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Goal progress"
          title={profile ? GOAL_LABELS[profile.goal] : 'Set your goal'}
          action={<SourceBadge source={source} label="Profile" />}
        >
          <div className="flex items-center gap-4">
            <ProgressRing value={completion} size={82} strokeWidth={7}>
              <span className="font-display uppercase text-xl leading-none text-charcoal">{completion}%</span>
              <span className="mt-0.5 text-[7px] uppercase tracking-[0.1em] text-charcoal/35">ready</span>
            </ProgressRing>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] leading-relaxed text-charcoal/50">
                {completedMissions === 7
                  ? 'Your profile is complete. Keep logging training to make trends meaningful.'
                  : `${7 - completedMissions} missions remain before your profile is complete.`}
              </p>
              <div className="mt-2">
                <ProgressBar value={(completedMissions / 7) * 100} />
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {nextMilestones.length ? (
              nextMilestones.map((milestone) => {
                const definition = MISSIONS.find((item) => item.id === milestone.missionId)
                return (
                  <Link
                    key={milestone.missionId}
                    to={`/dashboard/missions/${milestone.missionId}`}
                    className="flex items-center gap-2.5 rounded-lg border border-charcoal/8 bg-ivory/40 px-3 py-2.5 text-[10px] transition-colors hover:border-orange-500/25 hover:bg-orange-500/[0.04]"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-charcoal/40">
                      {milestone.definition ? (
                        <milestone.definition className="h-3 w-3" />
                      ) : (
                        <Target className="h-3 w-3" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-charcoal/65">
                      {definition?.title ?? milestone.missionId}
                    </span>
                    <ArrowRight className="h-3 w-3 shrink-0 text-charcoal/25" />
                  </Link>
                )
              })
            ) : (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-3 text-[10px] font-semibold text-emerald-800">
                <Check className="h-3.5 w-3.5" /> All seven profile missions complete.
              </div>
            )}
          </div>
          <Link
            to="/dashboard/missions"
            className="mt-4 flex items-center justify-center gap-1 border-t border-charcoal/5 pt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/45 hover:text-orange-600"
          >
            Open mission path <ArrowUpRight className="h-3 w-3" />
          </Link>
        </SectionCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <SectionCard
          eyebrow="Recent activity"
          title="What you have done lately."
          action={<SourceBadge source={recentActivity.length ? source : 'empty'} />}
        >
          {recentActivity.length ? (
            <ul className="divide-y divide-charcoal/5">
              {recentActivity.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      item.type === 'workout'
                        ? 'bg-orange-500/10 text-orange-600'
                        : item.type === 'ai'
                          ? 'bg-charcoal text-white'
                          : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {item.type === 'workout' ? (
                      <Dumbbell className="h-4 w-4" />
                    ) : item.type === 'ai' ? (
                      <Sparkles className="h-4 w-4" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-charcoal">{item.title}</p>
                    <p className="mt-0.5 text-[10px] text-charcoal/40">{item.detail}</p>
                  </div>
                  <span className="shrink-0 text-[9px] uppercase tracking-[0.08em] text-charcoal/30">
                    {relativeTime(item.at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-charcoal/15 bg-ivory/40 px-5 py-9 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-charcoal text-white">
                <CalendarDays className="h-5 w-5" />
              </span>
              <p className="mt-3 text-[13px] font-semibold text-charcoal">Your timeline starts here.</p>
              <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-charcoal/45">
                Complete a mission, finish a workout or run an AI form check. Activity will appear here.
              </p>
            </div>
          )}
        </SectionCard>

        <div className="space-y-4">
          <section className="relative overflow-hidden rounded-2xl bg-charcoal p-5 text-white sm:p-6">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full border-[18px] border-orange-500/15"
            />
            <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-orange-400">
              <Sparkles className="h-3 w-3" /> Today&apos;s reminder
            </p>
            <p className="mt-3 max-w-sm font-display uppercase text-xl leading-tight sm:text-2xl">
              “{motivation}”
            </p>
            <p className="mt-3 text-[10px] leading-relaxed text-white/40">
              {streak > 0
                ? `You are ${streak} ${streak === 1 ? 'day' : 'days'} into your current streak. Protect the next one.`
                : 'One honest session is enough to restart the pattern.'}
            </p>
          </section>

          <SectionCard
            eyebrow="Achievements"
            title={`${unlockedIds.size} of ${ACHIEVEMENTS.length} unlocked`}
          >
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 xl:grid-cols-3">
              {ACHIEVEMENTS.map((achievement) => {
                const Icon = achievementIcons[achievement.icon]
                const unlocked = unlockedIds.has(achievement.id)
                return (
                  <div
                    key={achievement.id}
                    title={`${achievement.title} — ${achievement.description}`}
                    className="flex flex-col items-center text-center"
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                        unlocked
                          ? 'border-orange-500/30 bg-orange-500/10 text-orange-600'
                          : 'border-charcoal/10 bg-ivory text-charcoal/20'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span
                      className={`mt-1.5 line-clamp-2 text-[8px] font-semibold leading-tight ${
                        unlocked ? 'text-charcoal/65' : 'text-charcoal/30'
                      }`}
                    >
                      {achievement.title}
                    </span>
                  </div>
                )
              })}
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[9px] uppercase tracking-[0.1em] text-charcoal/25">
        <span className="inline-flex items-center gap-1.5">
          <Plus className="h-3 w-3" /> {isCloud ? 'Workouts, meals, measurements and AI sessions sync to Firestore.' : 'Workouts, meals, measurements and AI sessions save on this device only.'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="h-3 w-3" /> Profile missions and preferences update immediately.
        </span>
      </div>
    </div>
  )
}
