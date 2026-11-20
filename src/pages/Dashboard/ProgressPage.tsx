import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  BarChart3,
  Camera,
  Check,
  ChevronDown,
  Dumbbell,
  LineChart,
  Plus,
  Ruler,
  Scale,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
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
import { Button, buttonClasses } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { ProgressRing } from '../../components/ui/ProgressRing'
import { useActivityStore } from '../../store/useActivityStore'
import { useProfileStats, useProfileStore } from '../../store/useProfileStore'
import { useAuth } from '../../features/auth/AuthContext'
import { GOAL_LABELS } from '../../lib/constants'
import {
  formatMinutes,
  latestMeasurement,
  measurementChange,
  monthlySeries,
  weeklySeries,
} from '../../utils/activity'
import { cn } from '../../lib/utils'
import type { MeasurementRecord } from '../../types'

type Metric = 'weightKg' | 'bodyFat'
type MeasurementRange = '30' | '90' | 'all'
type FrequencyRange = 'weekly' | 'monthly'

function MeasurementDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const addMeasurement = useActivityStore((s) => s.addMeasurement)
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    weightKg: '',
    bodyFat: '',
    waistCm: '',
    chestCm: '',
    restingHr: '',
  })

  const save = () => {
    const weight = Number(form.weightKg)
    if (!Number.isFinite(weight) || weight <= 20 || weight > 400) {
      toast.error('Enter a body weight between 20 and 400 kg.')
      return
    }
    addMeasurement({
      measuredAt: new Date(`${form.date}T12:00:00`).toISOString(),
      weightKg: Math.round(weight * 10) / 10,
      bodyFat: form.bodyFat ? Number(form.bodyFat) : undefined,
      waistCm: form.waistCm ? Number(form.waistCm) : undefined,
      chestCm: form.chestCm ? Number(form.chestCm) : undefined,
      restingHr: form.restingHr ? Number(form.restingHr) : undefined,
    })
    toast.success('Measurement saved on this device.')
    setForm({
      date: new Date().toISOString().slice(0, 10),
      weightKg: '',
      bodyFat: '',
      waistCm: '',
      chestCm: '',
      restingHr: '',
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log a measurement"
      description="Saved locally on this device. Use the same conditions each time for a cleaner trend."
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={save}>
            <Check className="h-3.5 w-3.5" /> Save measurement
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="measurement-date" className="field-label">
            Date
          </label>
          <input
            id="measurement-date"
            type="date"
            value={form.date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(event) => setForm((value) => ({ ...value, date: event.target.value }))}
            className="field-input"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'weightKg' as const, label: 'Body weight', unit: 'kg', required: true },
            { key: 'bodyFat' as const, label: 'Body fat (optional)', unit: '%', required: false },
            { key: 'waistCm' as const, label: 'Waist (optional)', unit: 'cm', required: false },
            { key: 'chestCm' as const, label: 'Chest (optional)', unit: 'cm', required: false },
            { key: 'restingHr' as const, label: 'Resting HR (optional)', unit: 'bpm', required: false },
          ].map((field) => (
            <div key={field.key} className={field.key === 'restingHr' ? 'col-span-2 sm:col-span-1' : ''}>
              <label htmlFor={`measurement-${field.key}`} className="field-label">
                {field.label}
                {field.required && <span className="ml-1 text-orange-500">*</span>}
              </label>
              <div className="relative">
                <input
                  id={`measurement-${field.key}`}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={form[field.key]}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, [field.key]: event.target.value }))
                  }
                  className="field-input pr-12"
                  placeholder="0"
                />
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[10px] uppercase tracking-[0.08em] text-charcoal/30">
                  {field.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="rounded-xl bg-ivory p-3 text-[10px] leading-relaxed text-charcoal/40">
          Measurements are non-sensitive demo records stored in this browser. Nothing is sent to a
          server. Blood markers and medical reports are intentionally not collected here.
        </p>
      </div>
    </Modal>
  )
}

function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
  unit: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-charcoal/10 bg-white px-3.5 py-2.5 shadow-soft">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-charcoal/35">{label}</p>
      <p className="mt-1 text-sm font-semibold text-charcoal">
        {payload[0].value} {unit}
      </p>
      <p className="text-[9px] text-charcoal/35">Saved measurement</p>
    </div>
  )
}

export default function ProgressPage() {
  const measurements = useActivityStore((s) => s.measurements)
  const workouts = useActivityStore((s) => s.workouts)
  const aiSessions = useActivityStore((s) => s.aiSessions)
  const removeMeasurement = useActivityStore((s) => s.removeMeasurement)
  const profile = useProfileStore((s) => s.profile)
  const user = useAuth().user
  const { completion, completedMissions } = useProfileStats()

  const [metric, setMetric] = useState<Metric>('weightKg')
  const [measurementRange, setMeasurementRange] = useState<MeasurementRange>('90')
  const [frequencyRange, setFrequencyRange] = useState<FrequencyRange>('weekly')
  const [dialogOpen, setDialogOpen] = useState(false)

  const latest = latestMeasurement(measurements)
  const weightChange = measurementChange(measurements, 'weightKg')
  const bodyFatChange = measurementChange(measurements, 'bodyFat')
  const waistChange = measurementChange(measurements, 'waistCm')

  const filteredMeasurements = useMemo(() => {
    if (measurementRange === 'all') return measurements
    const days = Number(measurementRange)
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
    return measurements.filter((entry) => new Date(entry.measuredAt).getTime() >= cutoff)
  }, [measurements, measurementRange])

  const chartData = useMemo(
    () =>
      [...filteredMeasurements]
        .filter((entry) => typeof entry[metric] === 'number')
        .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))
        .map((entry) => ({
          date: new Date(entry.measuredAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
          }),
          value: entry[metric] as number,
        })),
    [filteredMeasurements, metric],
  )

  const weekly = weeklySeries(workouts, 7)
  const monthly = monthlySeries(workouts, 4)
  const frequencyData = frequencyRange === 'weekly' ? weekly : monthly
  const frequencyKey = frequencyRange === 'weekly' ? 'day' : 'label'
  const periodMinutes = formatMinutes(
    workouts
      .filter((workout) => {
        const time = new Date(workout.completedAt).getTime()
        const days = frequencyRange === 'weekly' ? 7 : 28
        return time >= Date.now() - days * 24 * 60 * 60 * 1000
      })
      .reduce((sum, workout) => sum + workout.durationSeconds, 0),
  )

  const aiByExercise = ['squat', 'bicep_curl', 'push_up'].map((exercise) => {
    const sessions = aiSessions.filter((session) => session.exercise === exercise)
    const scores = sessions
      .map((session) => session.averageFormScore)
      .filter((value): value is number => typeof value === 'number')
    return {
      exercise,
      label:
        exercise === 'squat' ? 'Squat' : exercise === 'bicep_curl' ? 'Bicep curl' : 'Push-up',
      sessions: sessions.length,
      reps: sessions.reduce((sum, session) => sum + session.reps, 0),
      average: scores.length
        ? Math.round((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 100)
        : null,
    }
  })

  const unit = metric === 'weightKg' ? 'kg' : '%'
  const metricLabel = metric === 'weightKg' ? 'Body weight' : 'Body fat'

  return (
    <div>
      <PageHeader
        eyebrow="Tracking"
        title="Progress"
        subtitle="Your real logged measurements, training frequency and AI form sessions. No invented trend lines."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/dashboard/missions/body-metrics" className={buttonClasses('outline', 'sm')}>
              Body metrics mission
            </Link>
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className={buttonClasses('primary', 'sm')}
            >
              <Plus className="h-3.5 w-3.5" /> Log measurement
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          icon={Scale}
          label="Body weight"
          value={latest ? latest.weightKg : '—'}
          suffix={latest ? 'kg' : undefined}
          trend={
            weightChange !== null
              ? {
                  value: `${Math.abs(weightChange).toFixed(1)} kg`,
                  direction: weightChange <= 0 ? 'down' : 'up',
                  good: undefined,
                }
              : undefined
          }
          note={latest ? 'latest saved measurement' : 'no measurement yet'}
          accent
          source={latest ? 'local' : 'empty'}
        />
        <StatCard
          icon={LineChart}
          label="Body fat"
          value={latest?.bodyFat ?? '—'}
          suffix={latest?.bodyFat ? '%' : undefined}
          trend={
            bodyFatChange !== null
              ? {
                  value: `${Math.abs(bodyFatChange).toFixed(1)}%`,
                  direction: bodyFatChange <= 0 ? 'down' : 'up',
                  good: undefined,
                }
              : undefined
          }
          note={latest?.bodyFat ? 'latest saved measurement' : 'optional measurement'}
          source={latest?.bodyFat ? 'local' : 'empty'}
        />
        <StatCard
          icon={Ruler}
          label="Waist"
          value={latest?.waistCm ?? '—'}
          suffix={latest?.waistCm ? 'cm' : undefined}
          trend={
            waistChange !== null
              ? {
                  value: `${Math.abs(waistChange).toFixed(1)} cm`,
                  direction: waistChange <= 0 ? 'down' : 'up',
                  good: undefined,
                }
              : undefined
          }
          note={latest?.waistCm ? 'latest saved measurement' : 'optional measurement'}
          source={latest?.waistCm ? 'local' : 'empty'}
        />
        <StatCard
          icon={Activity}
          label="Resting HR"
          value={latest?.restingHr ?? '—'}
          suffix={latest?.restingHr ? 'bpm' : undefined}
          note={latest?.restingHr ? 'latest saved measurement' : 'optional measurement'}
          source={latest?.restingHr ? 'local' : 'empty'}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <SectionCard
          eyebrow="Measurement trend"
          title={`${metricLabel} over time`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl
                value={metric}
                onChange={setMetric}
                label="Measurement metric"
                options={[
                  { value: 'weightKg', label: 'Weight' },
                  { value: 'bodyFat', label: 'Body fat' },
                ]}
              />
              <SegmentedControl
                value={measurementRange}
                onChange={setMeasurementRange}
                label="Measurement range"
                options={[
                  { value: '30', label: '30d' },
                  { value: '90', label: '90d' },
                  { value: 'all', label: 'All' },
                ]}
              />
            </div>
          }
        >
          <div className="h-[270px] w-full min-w-0">
            {chartData.length >= 2 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={chartData} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
                  <CartesianGrid vertical={false} stroke="#171717" strokeOpacity={0.06} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#8A857D' }}
                    dy={6}
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fill: '#B5AFA5' }}
                    width={44}
                  />
                  <Tooltip content={<ChartTooltip unit={unit} />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#F97316"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#fff', stroke: '#F97316', strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: '#F97316', stroke: '#fff', strokeWidth: 2 }}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-charcoal/15 bg-ivory/40 px-5 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-charcoal text-white">
                  <Scale className="h-5 w-5" />
                </span>
                <p className="mt-3 text-[13px] font-semibold text-charcoal">
                  {filteredMeasurements.length ? 'One measurement is not a trend.' : 'No measurements yet.'}
                </p>
                <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-charcoal/45">
                  Log at least two records in this range to draw a real trend line.
                </p>
                <button
                  type="button"
                  onClick={() => setDialogOpen(true)}
                  className={buttonClasses('dark', 'sm', 'mt-4')}
                >
                  <Plus className="h-3.5 w-3.5" /> Log measurement
                </button>
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-charcoal/5 pt-3">
            <span className="inline-flex items-center gap-1.5 text-[10px] text-charcoal/35">
              <Check className="h-3 w-3 text-emerald-600" /> {filteredMeasurements.length} records in range
            </span>
            <SourceBadge source={measurements.length ? 'local' : 'empty'} />
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Latest records"
          title={measurements.length ? `${measurements.length} saved measurements` : 'No saved records'}
        >
          {measurements.length ? (
            <ul className="divide-y divide-charcoal/5">
              {measurements.slice(0, 7).map((measurement) => (
                <li key={measurement.id} className="flex items-start gap-2 py-3 first:pt-0 last:pb-0">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ivory text-charcoal/45">
                    <Scale className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-charcoal">
                      {measurement.weightKg} kg
                      {measurement.bodyFat ? ` · ${measurement.bodyFat}% body fat` : ''}
                    </p>
                    <p className="mt-0.5 text-[9px] text-charcoal/35">
                      {new Date(measurement.measuredAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {measurement.waistCm ? ` · waist ${measurement.waistCm} cm` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      removeMeasurement(measurement.id)
                      toast.success('Measurement removed.')
                    }}
                    aria-label="Delete measurement"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-charcoal/20 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-charcoal/15 bg-ivory/40 px-4 py-7 text-center">
              <p className="text-[11px] font-semibold text-charcoal">Start with one baseline.</p>
              <p className="mt-1 text-[10px] text-charcoal/40">
                Weight is required; the other fields are optional.
              </p>
            </div>
          )}

          <div className="mt-4 rounded-xl bg-ivory p-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-charcoal/35">
              Profile completion
            </p>
            <div className="mt-2 flex items-center gap-3">
              <ProgressRing value={completion} size={50} strokeWidth={5}>
                <span className="text-[10px] font-bold text-charcoal">{completion}%</span>
              </ProgressRing>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] leading-relaxed text-charcoal/40">
                  {completedMissions}/7 missions complete. More context improves how your coach reads these records.
                </p>
                <ProgressBar value={(completedMissions / 7) * 100} className="mt-2" />
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <SectionCard
          eyebrow="Workout frequency"
          title={`${periodMinutes} active minutes`}
          action={
            <SegmentedControl
              value={frequencyRange}
              onChange={setFrequencyRange}
              label="Workout frequency range"
              options={[
                { value: 'weekly', label: '7 days' },
                { value: 'monthly', label: '4 weeks' },
              ]}
            />
          }
        >
          <div className="h-[210px] w-full min-w-0">
            {workouts.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={frequencyData} margin={{ top: 4, right: 0, bottom: 0, left: -18 }}>
                  <CartesianGrid vertical={false} stroke="#171717" strokeOpacity={0.06} />
                  <XAxis
                    dataKey={frequencyKey}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#8A857D' }}
                    dy={6}
                  />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: '#F97316', opacity: 0.06 }}
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <div className="rounded-xl border border-charcoal/10 bg-white px-3.5 py-2.5 shadow-soft">
                          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-charcoal/40">{label}</p>
                          <p className="mt-1 text-sm font-semibold text-charcoal">
                            {payload[0].value} active min
                          </p>
                        </div>
                      ) : null
                    }
                  />
                  <Bar dataKey="minutes" fill="#171717" radius={[5, 5, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-charcoal/15 bg-ivory/40 px-5 text-center">
                <p className="text-[12px] font-semibold text-charcoal">No workouts logged yet.</p>
                <p className="mt-1 text-[10px] leading-relaxed text-charcoal/40">
                  Complete a session in Workout Plans or AI Coach to build frequency.
                </p>
                <Link to="/dashboard/workouts" className={buttonClasses('dark', 'sm', 'mt-3')}>
                  Open workouts <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="AI form sessions"
          title={aiSessions.length ? `${aiSessions.length} scored sessions` : 'No AI sessions yet'}
          action={<SourceBadge source={aiSessions.length ? 'local' : 'empty'} />}
        >
          <div className="space-y-2.5">
            {aiByExercise.map((item) => (
              <div key={item.exercise} className="rounded-xl border border-charcoal/8 bg-ivory/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold text-charcoal">{item.label}</p>
                  <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-charcoal/30">
                    {item.sessions} sessions
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <ProgressBar
                    value={item.average ?? 0}
                    className="flex-1"
                    barClassName={cn(
                      item.average === null
                        ? 'bg-charcoal/15'
                        : item.average >= 60
                          ? 'bg-emerald-600'
                          : 'bg-orange-500',
                    )}
                  />
                  <span className="w-10 text-right text-[10px] font-semibold text-charcoal/50">
                    {item.average !== null ? `${item.average}%` : '—'}
                  </span>
                </div>
                <p className="mt-1 text-[8px] uppercase tracking-[0.08em] text-charcoal/30">
                  {item.reps} reps detected · average model confidence
                </p>
              </div>
            ))}
          </div>
          {!aiSessions.length && (
            <Link
              to="/dashboard/ai-coach"
              className={buttonClasses('dark', 'sm', 'mt-3 w-full')}
            >
              <Sparkles className="h-3.5 w-3.5" /> Run form check
            </Link>
          )}
        </SectionCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <SectionCard
          eyebrow="Goal context"
          title="What this progress supports."
        >
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500 text-white">
              <BarChart3 className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-charcoal">
                {profile ? GOAL_LABELS[profile.goal] : 'Goal not set'}
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-charcoal/45">
                {profile
                  ? `You planned ${profile.workoutDays.length} training days per week. Progress is shown from records saved on this device.`
                  : 'Complete Quick Start to set a goal and training rhythm.'}
              </p>
            </div>
            <Link to="/dashboard/missions/goal-deep-dive" className={buttonClasses('outline', 'sm')}>
              Goal mission <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: 'Workouts', value: workouts.length },
              { label: 'AI sessions', value: aiSessions.length },
              { label: 'Measurements', value: measurements.length },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-ivory p-3 text-center">
                <p className="font-display text-2xl leading-none text-charcoal">{item.value}</p>
                <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.1em] text-charcoal/35">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>

        <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-charcoal/35">
              Progress photos
            </p>
            <Camera className="h-4 w-4 text-charcoal/25" />
          </div>
          <div className="mt-4 rounded-xl border border-dashed border-charcoal/15 bg-ivory/40 px-4 py-6 text-center">
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-charcoal text-white">
              <Camera className="h-4 w-4" />
            </span>
            <p className="mt-2.5 text-[12px] font-semibold text-charcoal">Secure storage required.</p>
            <p className="mt-1 text-[10px] leading-relaxed text-charcoal/40">
              Progress photos are intentionally disabled in this frontend build. They must never be
              stored in localStorage or shown as sample “your progress” imagery.
            </p>
          </div>
          <p className="mt-3 text-[9px] leading-relaxed text-charcoal/30">
            Body measurements are stored locally. Medical documents and photos require the Stage 2
            secure backend.
          </p>
        </section>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[9px] uppercase tracking-[0.1em] text-charcoal/25">
        <span className="inline-flex items-center gap-1.5">
          <Dumbbell className="h-3 w-3" /> Workout frequency comes from saved workout sessions.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ChevronDown className="h-3 w-3" /> {user?.isDemo ? 'Demo workspace' : 'Private account'} · local records only.
        </span>
      </div>

      <MeasurementDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  )
}
