import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BedDouble,
  Check,
  Footprints,
  HeartPulse,
  MoonStar,
  Plus,
  Sparkles,
  Sun,
  Wind,
} from 'lucide-react'
import { toast } from 'sonner'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  PageHeader,
  ProgressBar,
  SectionCard,
  SourceBadge,
  StatCard,
} from '../../components/dashboard/ui'
import { Button, buttonClasses } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { useActivityStore } from '../../store/useActivityStore'
import { useDataStatus } from '../../hooks/useDataStatus'
import { average, dateKey, lifestyleForDate, sleepSeries } from '../../utils/activity'
import { cn } from '../../lib/utils'

const habits = [
  { id: 'sleep', label: 'In bed before 23:00', detail: 'Sleep window' },
  { id: 'walk', label: '20-minute walk', detail: 'Daily movement' },
  { id: 'mobility', label: '8-minute mobility flow', detail: 'Recovery' },
  { id: 'screen', label: 'No screens 30 min before bed', detail: 'Sleep hygiene' },
  { id: 'breath', label: '5-minute breathing practice', detail: 'Stress downshift' },
]

const recoveryOptions = ['walking', 'mobility', 'sauna', 'massage', 'none']

function LifestyleDialog({
  open,
  onClose,
  initialDate,
}: {
  open: boolean
  onClose: () => void
  initialDate: string
}) {
  const saveEntry = useActivityStore((s) => s.saveLifestyleEntry)
  const [form, setForm] = useState({
    date: initialDate,
    sleepHours: '',
    sleepQuality: '75',
    steps: '',
    stress: '4',
    recoveryHabits: [] as string[],
  })

  const save = () => {
    const sleepHours = Number(form.sleepHours)
    if (!Number.isFinite(sleepHours) || sleepHours < 0 || sleepHours > 16) {
      toast.error('Enter sleep hours between 0 and 16.')
      return
    }
    saveEntry({
      date: form.date,
      sleepHours: Math.round(sleepHours * 10) / 10,
      sleepQuality: Math.max(0, Math.min(100, Number(form.sleepQuality) || 0)),
      steps: Math.max(0, Math.round(Number(form.steps) || 0)),
      stress: Math.max(1, Math.min(10, Number(form.stress) || 1)),
      recoveryHabits: form.recoveryHabits,
    })
    toast.success('Recovery check-in saved.')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log recovery"
      description="A simple daily check-in. This is not a medical assessment."
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={save}>
            <Check className="h-3.5 w-3.5" /> Save check-in
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="recovery-date" className="field-label">
            Date
          </label>
          <input
            id="recovery-date"
            type="date"
            value={form.date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(event) => setForm((value) => ({ ...value, date: event.target.value }))}
            className="field-input"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'sleepHours' as const, label: 'Sleep', unit: 'h' },
            { key: 'steps' as const, label: 'Steps', unit: 'steps' },
            { key: 'sleepQuality' as const, label: 'Sleep quality', unit: '%' },
            { key: 'stress' as const, label: 'Stress', unit: '/ 10' },
          ].map((field) => (
            <div key={field.key}>
              <label htmlFor={`recovery-${field.key}`} className="field-label">
                {field.label}
              </label>
              <div className="relative">
                <input
                  id={`recovery-${field.key}`}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={form[field.key]}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, [field.key]: event.target.value }))
                  }
                  className="field-input pr-14"
                  placeholder="0"
                />
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[9px] uppercase tracking-[0.08em] text-charcoal/30">
                  {field.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div>
          <p className="field-label">Recovery habits</p>
          <div className="flex flex-wrap gap-2">
            {recoveryOptions.map((option) => {
              const active = form.recoveryHabits.includes(option)
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setForm((value) => ({
                      ...value,
                      recoveryHabits: active
                        ? value.recoveryHabits.filter((item) => item !== option)
                        : [...value.recoveryHabits, option],
                    }))
                  }
                  className={cn(
                    'min-h-[38px] rounded-full border px-3 text-[10px] font-semibold capitalize transition-colors',
                    active
                      ? 'border-orange-500 bg-orange-500 text-white'
                      : 'border-charcoal/15 bg-white text-charcoal/55',
                  )}
                >
                  {option}
                </button>
              )
            })}
          </div>
        </div>
        <p className="rounded-xl bg-ivory p-3 text-[10px] leading-relaxed text-charcoal/40">
          Recovery entries are non-sensitive records saved to your account. They are not medical
          advice and are not sent to a clinician.
        </p>
      </div>
    </Modal>
  )
}

function SleepTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; payload: { quality: number; logged: boolean } }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-charcoal/10 bg-white px-3.5 py-2.5 shadow-soft">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-charcoal/35">{label}</p>
      {payload[0].payload.logged ? (
        <>
          <p className="mt-1 text-sm font-semibold text-charcoal">{payload[0].value} h sleep</p>
          <p className="text-[9px] text-charcoal/35">Quality {payload[0].payload.quality}%</p>
        </>
      ) : (
        <p className="mt-1 text-[11px] text-charcoal/40">No check-in logged.</p>
      )}
    </div>
  )
}

export default function LifestylePage() {
  const { source, label, isCloud } = useDataStatus()
  const lifestyle = useActivityStore((s) => s.lifestyle)
  const habitsByDate = useActivityStore((s) => s.habitsByDate)
  const toggleHabit = useActivityStore((s) => s.toggleHabit)
  const [dialogOpen, setDialogOpen] = useState(false)

  const today = dateKey(new Date())
  const todayEntry = lifestyleForDate(lifestyle, today)
  const todayHabits = habitsByDate[today] ?? []
  const lastSeven = lifestyle.filter((entry) => {
    const time = new Date(`${entry.date}T12:00:00`).getTime()
    return time >= Date.now() - 7 * 24 * 60 * 60 * 1000
  })
  const avgSleep = average(lastSeven.map((entry) => entry.sleepHours))
  const avgSteps = average(lastSeven.map((entry) => entry.steps).filter((value) => value > 0))
  const avgStress = average(lastSeven.map((entry) => entry.stress))
  const habitPercent = Math.round((todayHabits.length / habits.length) * 100)
  const chart = sleepSeries(lifestyle, 7)
  const loggedNights = chart.filter((point) => point.logged).length

  const setHabits = habits.map((habit) => ({
    ...habit,
    checked: todayHabits.includes(habit.id),
  }))

  return (
    <div>
      <PageHeader
        eyebrow="Recovery"
        title="Lifestyle"
        subtitle="Sleep, stress, daily movement and recovery habits — logged from what actually happened."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/dashboard/missions/lifestyle-check" className={buttonClasses('outline', 'sm')}>
              Lifestyle mission
            </Link>
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className={buttonClasses('primary', 'sm')}
            >
              <Plus className="h-3.5 w-3.5" /> Log recovery
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          icon={BedDouble}
          label="Avg. sleep"
          value={avgSleep !== null ? avgSleep.toFixed(1) : '—'}
          suffix={avgSleep !== null ? 'h' : undefined}
          note={`${lastSeven.length} check-ins · last 7 days`}
          accent
          source={lastSeven.length ? source : 'empty'}
        />
        <StatCard
          icon={Footprints}
          label="Daily movement"
          value={avgSteps !== null ? Math.round(avgSteps).toLocaleString() : '—'}
          suffix={avgSteps !== null ? 'steps' : undefined}
          note={avgSteps !== null ? 'average from check-ins' : 'no step data yet'}
          source={avgSteps !== null ? source : 'empty'}
        />
        <StatCard
          icon={Wind}
          label="Stress load"
          value={avgStress !== null ? avgStress.toFixed(1) : '—'}
          suffix={avgStress !== null ? '/ 10' : undefined}
          note={avgStress !== null ? 'self-reported average' : 'no check-ins yet'}
          source={avgStress !== null ? source : 'empty'}
        />
        <StatCard
          icon={HeartPulse}
          label="Today’s habits"
          value={todayHabits.length}
          suffix={`/ ${habits.length}`}
          note={`${habitPercent}% of today's checklist`}
          source={todayHabits.length ? source : 'empty'}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-charcoal/10 bg-white px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-charcoal/45">
            <Sun className="h-3 w-3 text-orange-500" /> {todayEntry ? 'Today logged' : 'Today not logged'}
          </span>
          {todayEntry && (
            <span className="text-[10px] text-charcoal/40">
              {todayEntry.sleepHours} h sleep · {todayEntry.steps.toLocaleString()} steps · stress{' '}
              {todayEntry.stress}/10
            </span>
          )}
        </div>
        <SourceBadge source={lifestyle.length ? source : 'empty'} label={label} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <SectionCard
          eyebrow="Sleep last week"
          title={`${avgSleep !== null ? `${avgSleep.toFixed(1)} h average` : 'No sleep logged yet'}`}
          action={<SourceBadge source={loggedNights ? source : 'empty'} label={`${loggedNights}/7 nights`} />}
        >
          <div className="h-[250px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid vertical={false} stroke="#171717" strokeOpacity={0.06} />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#8A857D' }}
                  dy={6}
                />
                <YAxis
                  domain={[0, 10]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: '#B5AFA5' }}
                  width={36}
                />
                <Tooltip content={<SleepTooltip />} cursor={{ fill: '#F97316', opacity: 0.05 }} />
                <Bar dataKey="hours" fill="#F97316" radius={[6, 6, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {!loggedNights && (
            <div className="mt-2 rounded-xl border border-dashed border-charcoal/15 bg-ivory/40 px-4 py-4 text-center">
              <p className="text-[11px] font-semibold text-charcoal">Log a night to start the chart.</p>
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className={buttonClasses('dark', 'sm', 'mt-3')}
              >
                <Plus className="h-3.5 w-3.5" /> Log first check-in
              </button>
            </div>
          )}
          <div className="mt-3 grid grid-cols-3 gap-3 border-t border-charcoal/5 pt-4">
            <div>
              <p className="text-[9px] uppercase tracking-[0.1em] text-charcoal/30">Best night</p>
              <p className="mt-1 text-[12px] font-semibold text-charcoal">
                {chart.some((point) => point.logged)
                  ? `${Math.max(...chart.filter((point) => point.logged).map((point) => point.hours)).toFixed(1)} h`
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.1em] text-charcoal/30">Nights logged</p>
              <p className="mt-1 text-[12px] font-semibold text-charcoal">{loggedNights} / 7</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.1em] text-charcoal/30">Check-ins</p>
              <p className="mt-1 text-[12px] font-semibold text-emerald-600">{lifestyle.length} saved</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Today’s recovery habits"
          title={`${todayHabits.length} of ${habits.length} complete`}
          action={<span className="text-[10px] font-bold text-orange-600">{habitPercent}%</span>}
        >
          <ProgressBar value={habitPercent} />
          <ul className="mt-4 space-y-2">
            {setHabits.map((habit) => (
              <li key={habit.id}>
                <button
                  type="button"
                  onClick={() => toggleHabit(today, habit.id)}
                  aria-pressed={habit.checked}
                  className={cn(
                    'flex min-h-[48px] w-full items-center gap-3 rounded-xl border px-3 text-left transition-colors',
                    habit.checked
                      ? 'border-orange-500/25 bg-orange-500/[0.04]'
                      : 'border-charcoal/10 hover:border-charcoal/25',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                      habit.checked ? 'border-orange-500 bg-orange-500 text-white' : 'border-charcoal/20',
                    )}
                  >
                    {habit.checked && <Check className="h-3 w-3" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'block text-[11px] font-semibold',
                        habit.checked ? 'text-charcoal' : 'text-charcoal/60',
                      )}
                    >
                      {habit.label}
                    </span>
                    <span className="block text-[9px] uppercase tracking-[0.08em] text-charcoal/30">
                      {habit.detail}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[9px] text-charcoal/25">Habits are saved for today {isCloud ? 'to your account' : 'on this device'}.</p>
        </SectionCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl bg-charcoal p-5 text-white sm:p-6">
          <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-orange-400">
            <MoonStar className="h-3 w-3" /> Sleep anchor
          </p>
          <p className="mt-2 font-display uppercase text-xl leading-tight">
            Protect the last hour before bed.
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-white/50">
            Dim lights, park the phone outside the bedroom, and keep a consistent wake time even after
            a poor night. These are general recovery habits, not medical advice.
          </p>
        </section>
        <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
          <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-charcoal/35">
            <Sun className="h-3 w-3 text-orange-500" /> Movement snack
          </p>
          <p className="mt-2 font-display uppercase text-xl leading-tight text-charcoal">
            Ten minutes outside, after lunch.
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-charcoal/45">
            Daylight and low-intensity walking support recovery, appetite regulation and afternoon
            focus. It also counts toward your weekly active minutes.
          </p>
        </section>
        <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
          <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-charcoal/35">
            <Sparkles className="h-3 w-3 text-orange-500" /> Coach note
          </p>
          <p className="mt-2 font-display uppercase text-xl leading-tight text-charcoal">
            Recovery is a training variable.
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-charcoal/45">
            When sleep drops below six hours for several nights, reduce intensity before performance
            drops for you. Complete the Lifestyle Check to keep this current.
          </p>
        </section>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[9px] uppercase tracking-[0.1em] text-charcoal/25">
        <span className="inline-flex items-center gap-1.5">
          <HeartPulse className="h-3 w-3" /> Self-reported data only. Not a diagnosis or medical assessment.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ArrowRight className="h-3 w-3" /> Recovery check-ins save {isCloud ? 'to your account' : 'locally'}.
        </span>
      </div>

      <LifestyleDialog open={dialogOpen} onClose={() => setDialogOpen(false)} initialDate={today} />
    </div>
  )
}
