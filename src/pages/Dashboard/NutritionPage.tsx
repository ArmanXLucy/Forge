import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Apple,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Flame,
  Plus,
  Salad,
  Sparkles,
  Trash2,
  UtensilsCrossed,
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
import { DAILY_MEALS, NUTRITION_TARGETS } from '../../data/dashboard'
import { useActivityStore } from '../../store/useActivityStore'
import { useDataStatus } from '../../hooks/useDataStatus'
import { dateKey, sumMeals } from '../../utils/activity'
import { cn } from '../../lib/utils'

const mealSlots = ['07:30', '12:30', '16:30', '20:00']

const macroBars = [
  { key: 'protein' as const, label: 'Protein', color: 'bg-orange-500' },
  { key: 'carbs' as const, label: 'Carbs', color: 'bg-amber-500' },
  { key: 'fat' as const, label: 'Fat', color: 'bg-charcoal' },
]

function formatDayLabel(date: Date) {
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function MealDialog({
  open,
  onClose,
  date,
}: {
  open: boolean
  onClose: () => void
  date: string
}) {
  const addMeal = useActivityStore((s) => s.addMeal)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    time: mealSlots[0],
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
  })

  const submit = () => {
    const calories = Number(form.calories)
    if (!form.name.trim()) {
      toast.error('Give the meal a name.')
      return
    }
    if (!Number.isFinite(calories) || calories <= 0) {
      toast.error('Enter a calorie value greater than zero.')
      return
    }
    setSaving(true)
    addMeal({
      date,
      time: form.time || mealSlots[0],
      name: form.name.trim(),
      calories: Math.round(calories),
      protein: Math.max(0, Math.round(Number(form.protein) || 0)),
      carbs: Math.max(0, Math.round(Number(form.carbs) || 0)),
      fat: Math.max(0, Math.round(Number(form.fat) || 0)),
    })
    setSaving(false)
    setForm({ name: '', time: mealSlots[0], calories: '', protein: '', carbs: '', fat: '' })
    toast.success('Meal saved.')
    onClose()
  }

  const fields = [
    { key: 'calories' as const, label: 'Calories', unit: 'kcal' },
    { key: 'protein' as const, label: 'Protein', unit: 'g' },
    { key: 'carbs' as const, label: 'Carbs', unit: 'g' },
    { key: 'fat' as const, label: 'Fat', unit: 'g' },
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log a meal"
      description="Saved to your nutrition log. This is not a prescribed nutrition plan."
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={saving}>
            <Check className="h-3.5 w-3.5" /> Save meal
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="meal-name" className="field-label">
            Meal name
          </label>
          <input
            id="meal-name"
            value={form.name}
            onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
            className="field-input"
            placeholder="e.g. Chicken, rice and greens"
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="meal-time" className="field-label">
            Time
          </label>
          <select
            id="meal-time"
            value={form.time}
            onChange={(event) => setForm((value) => ({ ...value, time: event.target.value }))}
            className="field-input"
          >
            {mealSlots.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
            <option value="22:30">22:30</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {fields.map((field) => (
            <div key={field.key}>
              <label htmlFor={`meal-${field.key}`} className="field-label">
                {field.label}
              </label>
              <div className="relative">
                <input
                  id={`meal-${field.key}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
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
          Meal entries are non-sensitive demo records. They are stored only in this browser and can be
          deleted at any time.
        </p>
      </div>
    </Modal>
  )
}

export default function NutritionPage() {
  const { source, label, isCloud } = useDataStatus()
  const meals = useActivityStore((s) => s.meals)
  const waterByDate = useActivityStore((s) => s.waterByDate)
  const setWater = useActivityStore((s) => s.setWater)
  const removeMeal = useActivityStore((s) => s.removeMeal)
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [mealOpen, setMealOpen] = useState(false)

  const dayKey = dateKey(selectedDate)
  const isToday = dayKey === dateKey(new Date())
  const dayMeals = useMemo(
    () => meals.filter((meal) => meal.date === dayKey),
    [meals, dayKey],
  )
  const totals = sumMeals(dayMeals)
  const glasses = waterByDate[dayKey] ?? 0
  const waterLitres = glasses * 0.25

  const recentDays = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(new Date(), index - 6)
    const key = dateKey(date)
    const entries = meals.filter((meal) => meal.date === key)
    return {
      key,
      label: date.toLocaleDateString('en-GB', { weekday: 'short' }),
      calories: entries.reduce((sum, meal) => sum + meal.calories, 0),
      logged: entries.length > 0,
    }
  })

  const proteinPercent = Math.min(100, Math.round((totals.protein / NUTRITION_TARGETS.protein) * 100))

  return (
    <div>
      <PageHeader
        eyebrow="Fuel"
        title="Nutrition"
        subtitle="Log what you actually eat, watch the day build, and keep the framework simple enough to repeat."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/dashboard/missions/nutrition-profile" className={buttonClasses('outline', 'sm')}>
              Nutrition profile <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => setMealOpen(true)}
              className={buttonClasses('primary', 'sm')}
            >
              <Plus className="h-3.5 w-3.5" /> Log meal
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          icon={Flame}
          label="Logged"
          value={totals.calories.toLocaleString()}
          suffix="kcal"
          note={`${dayMeals.length} meals · ${formatDayLabel(selectedDate)}`}
          accent
          source={dayMeals.length ? source : 'empty'}
        />
        <StatCard
          icon={Apple}
          label="Protein"
          value={totals.protein}
          suffix="g"
          note={`${proteinPercent}% of reference target`}
          source={dayMeals.length ? source : 'empty'}
        />
        <StatCard
          icon={Salad}
          label="Carbs / fat"
          value={`${totals.carbs} / ${totals.fat}`}
          suffix="g"
          note="logged today"
          source={dayMeals.length ? source : 'empty'}
        />
        <StatCard
          icon={Droplets}
          label="Hydration"
          value={waterLitres.toFixed(2)}
          suffix={`/ ${NUTRITION_TARGETS.water.toFixed(1)} L`}
          note={isCloud ? 'synced to your account' : 'saved on this device'}
          source={glasses ? source : 'empty'}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous day"
            onClick={() => setSelectedDate((date) => addDays(date, -1))}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-charcoal/15 bg-white text-charcoal/50 hover:border-charcoal/30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-[150px] text-center">
            <p className="text-[11px] font-semibold text-charcoal">{formatDayLabel(selectedDate)}</p>
            <p className="text-[9px] uppercase tracking-[0.1em] text-charcoal/30">
              {isToday ? 'Today' : 'Meal history'}
            </p>
          </div>
          <button
            type="button"
            aria-label="Next day"
            onClick={() => setSelectedDate((date) => addDays(date, 1))}
            disabled={isToday}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-charcoal/15 bg-white text-charcoal/50 hover:border-charcoal/30 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <SourceBadge source={source} label={label} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <SectionCard
          eyebrow="Daily log"
          title={`${totals.calories.toLocaleString()} kcal logged`}
          action={
            <button
              type="button"
              onClick={() => setMealOpen(true)}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-full bg-charcoal px-3 text-[9px] font-bold uppercase tracking-[0.1em] text-white"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          }
        >
          <div className="flex flex-wrap items-end gap-5 border-b border-charcoal/5 pb-5">
            <div>
              <p className="font-display uppercase text-4xl leading-none text-charcoal">
                {totals.calories.toLocaleString()}
                <span className="ml-1 font-sans text-[10px] font-semibold uppercase tracking-[0.1em] text-charcoal/30">
                  / {NUTRITION_TARGETS.calories.toLocaleString()} kcal reference
                </span>
              </p>
              <p className="mt-1 text-[10px] text-charcoal/35">
                {dayMeals.length ? `${dayMeals.length} meals logged` : 'No meals logged on this day'}
              </p>
            </div>
            <div className="ml-auto flex gap-4">
              {macroBars.map((macro) => (
                <div key={macro.key} className="text-center">
                  <p className="font-display uppercase text-lg leading-none text-charcoal">
                    {totals[macro.key]}g
                  </p>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.1em] text-charcoal/35">
                    {macro.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 space-y-3.5">
            {macroBars.map((macro) => {
              const target = NUTRITION_TARGETS[macro.key]
              return (
                <ProgressBar
                  key={macro.key}
                  value={(totals[macro.key] / target) * 100}
                  label={macro.label}
                  detail={`${totals[macro.key]} / ${target} g`}
                  barClassName={macro.color}
                />
              )
            })}
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-charcoal/35">
                Meals
              </p>
              <span className="text-[9px] uppercase tracking-[0.12em] text-charcoal/25">
                {dayMeals.length} entries
              </span>
            </div>
            {dayMeals.length ? (
              <ul className="mt-3 divide-y divide-charcoal/5">
                {dayMeals.map((meal) => (
                  <li key={meal.id} className="flex gap-3 py-3.5">
                    <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-ivory text-charcoal/55">
                      <UtensilsCrossed className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-[12px] font-semibold text-charcoal">{meal.name}</p>
                        <p className="text-[10px] text-charcoal/35">{meal.time}</p>
                      </div>
                      <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-charcoal/30">
                        <span>{meal.calories} kcal</span>
                        <span>P {meal.protein}g</span>
                        <span>C {meal.carbs}g</span>
                        <span>F {meal.fat}g</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        removeMeal(meal.id)
                        toast.success('Meal removed.')
                      }}
                      aria-label={`Delete ${meal.name}`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-charcoal/25 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-3 flex flex-col items-center justify-center rounded-xl border border-dashed border-charcoal/15 bg-ivory/40 px-5 py-8 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-charcoal text-white">
                  <UtensilsCrossed className="h-4 w-4" />
                </span>
                <p className="mt-2.5 text-[12px] font-semibold text-charcoal">Nothing logged yet.</p>
                <p className="mt-1 max-w-xs text-[10px] leading-relaxed text-charcoal/45">
                  Add your first meal to start the daily total and macro progress.
                </p>
                <button
                  type="button"
                  onClick={() => setMealOpen(true)}
                  className={buttonClasses('dark', 'sm', 'mt-3')}
                >
                  <Plus className="h-3.5 w-3.5" /> Log first meal
                </button>
              </div>
            )}
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard eyebrow="Hydration" title={`${waterLitres.toFixed(2)} L today`} action={<Droplets className="h-4 w-4 text-sky-500" />}>
            <div className="grid grid-cols-6 gap-1.5">
              {Array.from({ length: 12 }).map((_, index) => {
                const filled = index < glasses
                return (
                  <button
                    key={index}
                    type="button"
                    aria-label={`Set hydration to ${((index + 1) * 0.25).toFixed(2)} litres`}
                    aria-pressed={filled}
                    onClick={() => setWater(dayKey, index + 1)}
                    className={cn(
                      'flex h-9 items-center justify-center rounded-md border transition-colors',
                      filled
                        ? 'border-sky-500 bg-sky-500 text-white'
                        : 'border-charcoal/10 bg-ivory text-charcoal/20 hover:border-sky-300',
                    )}
                  >
                    <Droplets className="h-3 w-3" />
                  </button>
                )
              })}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-[9px] uppercase tracking-[0.1em] text-charcoal/30">250 ml per glass</p>
              <button
                type="button"
                onClick={() => setWater(dayKey, glasses + 1)}
                disabled={glasses >= 12}
                className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] text-sky-600 disabled:opacity-30"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
            <p className="mt-2 text-[9px] text-charcoal/25">
              {isCloud ? 'Synced for' : 'Saved for'} {formatDayLabel(selectedDate)} {isCloud ? 'to your account.' : 'on this device only.'}
            </p>
          </SectionCard>

          <section className="rounded-2xl bg-charcoal p-5 text-white sm:p-6">
            <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-orange-400">
              <Sparkles className="h-3 w-3" /> Nutrition focus
            </p>
            <p className="mt-2 font-display uppercase text-xl leading-tight">
              Build the plate before you optimise the details.
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-white/50">
              Anchor each main meal with a palm of protein, a fist of vegetables and a measured
              carbohydrate portion. Consistency beats precision at this stage.
            </p>
            <Link
              to="/dashboard/missions/nutrition-profile"
              className="mt-4 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-orange-400 hover:text-orange-300"
            >
              Sharpen my nutrition profile <ArrowRight className="h-3 w-3" />
            </Link>
          </section>

          <section className="rounded-2xl border border-amber-500/25 bg-amber-50 p-5">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="text-[12px] font-semibold text-amber-900">Reference, not prescription</p>
                <p className="mt-1 text-[11px] leading-relaxed text-amber-900/70">
                  Targets and example meals are sample content. Real nutrition guidance requires your
                  allergy and health profile, and should be reviewed by a qualified professional.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <SectionCard
          eyebrow="Weekly intake"
          title="Logged calories, last seven days."
          action={<SourceBadge source={recentDays.some((day) => day.logged) ? source : 'empty'} />}
        >
          <div className="h-[210px] w-full min-w-0">
            {recentDays.some((day) => day.logged) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recentDays} margin={{ top: 4, right: 0, bottom: 0, left: -16 }}>
                  <CartesianGrid vertical={false} stroke="#171717" strokeOpacity={0.06} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8A857D' }} dy={6} />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: '#F97316', opacity: 0.06 }}
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <div className="rounded-xl border border-charcoal/10 bg-white px-3.5 py-2.5 shadow-soft">
                          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-charcoal/40">{label}</p>
                          <p className="mt-1 text-sm font-semibold text-charcoal">{payload[0].value} kcal</p>
                        </div>
                      ) : null
                    }
                  />
                  <Bar dataKey="calories" fill="#F97316" radius={[6, 6, 0, 0]} maxBarSize={34} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-charcoal/15 bg-ivory/40 px-5 text-center">
                <p className="text-[12px] font-semibold text-charcoal">No meal history yet.</p>
                <p className="mt-1 text-[10px] text-charcoal/40">Logged days will appear here.</p>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Example framework"
          title="A sample day, not your log."
          action={<SourceBadge source="sample" label="Sample meals" />}
        >
          <ul className="divide-y divide-charcoal/5">
            {DAILY_MEALS.map((meal) => (
              <li key={meal.id} className="flex gap-2.5 py-3 first:pt-0 last:pb-0">
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ivory text-[8px] font-bold text-charcoal/40">
                  {meal.time.slice(0, 2)}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-charcoal">{meal.name}</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-charcoal/40">{meal.description}</p>
                  <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.08em] text-charcoal/25">
                    {meal.calories} kcal · P {meal.protein}g · C {meal.carbs}g · F {meal.fat}g
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[9px] uppercase tracking-[0.1em] text-charcoal/25">
        <span className="inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3 w-3" /> Use the date arrows to review previous days.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Check className="h-3 w-3" /> Meal entries never leave this browser.
        </span>
      </div>

      <MealDialog open={mealOpen} onClose={() => setMealOpen(false)} date={dayKey} />
    </div>
  )
}
