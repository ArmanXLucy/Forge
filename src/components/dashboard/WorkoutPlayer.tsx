import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  ChevronRight,
  Clock3,
  Dumbbell,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Trophy,
} from 'lucide-react'
import type { WorkoutSession } from '../../types'
import { cn } from '../../lib/utils'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { ProgressBar } from './ui'

export interface WorkoutResult {
  durationSeconds: number
  exercisesCompleted: number
  totalExercises: number
  setsCompleted: number
  totalSets: number
}

interface WorkoutPlayerProps {
  workout: WorkoutSession | null
  open: boolean
  onClose: () => void
  onSave: (result: WorkoutResult) => void
}

function parseSets(value: string) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

function parseRest(value: string) {
  const lower = value.toLowerCase()
  const number = Number.parseFloat(lower)
  if (!Number.isFinite(number)) return 60
  if (lower.includes('min')) return Math.round(number * 60)
  return Math.round(number)
}

function clock(seconds: number) {
  const safe = Math.max(0, seconds)
  const minutes = Math.floor(safe / 60)
  return `${String(minutes).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`
}

export function WorkoutPlayer({ workout, open, onClose, onSave }: WorkoutPlayerProps) {
  const [exerciseIndex, setExerciseIndex] = useState(0)
  const [completedSets, setCompletedSets] = useState<Record<number, number>>({})
  const [elapsed, setElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  const [restRemaining, setRestRemaining] = useState(0)
  const [summary, setSummary] = useState<WorkoutResult | null>(null)

  const totalSets = useMemo(
    () => workout?.exercises.reduce((sum, exercise) => sum + parseSets(exercise.sets), 0) ?? 0,
    [workout],
  )
  const doneSets = useMemo(
    () => Object.values(completedSets).reduce((sum, value) => sum + value, 0),
    [completedSets],
  )

  useEffect(() => {
    if (!open) return
    setExerciseIndex(0)
    setCompletedSets({})
    setElapsed(0)
    setPaused(false)
    setRestRemaining(0)
    setSummary(null)
  }, [open, workout?.id])

  useEffect(() => {
    if (!open || paused || summary) return
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [open, paused, summary])

  useEffect(() => {
    if (!open || restRemaining <= 0) return
    const timer = window.setInterval(() => {
      setRestRemaining((value) => Math.max(0, value - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [open, restRemaining])

  if (!workout) return null

  const exercise = workout.exercises[exerciseIndex]
  const setsTarget = parseSets(exercise.sets)
  const setsDone = completedSets[exerciseIndex] ?? 0
  const exerciseComplete = setsDone >= setsTarget
  const allComplete = exerciseIndex === workout.exercises.length - 1 && exerciseComplete
  const progress = totalSets ? (doneSets / totalSets) * 100 : 0

  const completeSet = () => {
    if (exerciseComplete) return
    const nextSets = Math.min(setsTarget, setsDone + 1)
    setCompletedSets((value) => ({ ...value, [exerciseIndex]: nextSets }))
    if (nextSets < setsTarget) {
      setRestRemaining(parseRest(exercise.rest))
    }
  }

  const finishWorkout = () => {
    const completedExercises = workout.exercises.filter((_, index) => {
      const target = parseSets(workout.exercises[index].sets)
      return (completedSets[index] ?? 0) >= target
    }).length
    setSummary({
      durationSeconds: elapsed,
      exercisesCompleted: completedExercises,
      totalExercises: workout.exercises.length,
      setsCompleted: doneSets,
      totalSets,
    })
    setRestRemaining(0)
  }

  const nextExercise = () => {
    if (allComplete) {
      finishWorkout()
      return
    }
    setExerciseIndex((value) => Math.min(workout.exercises.length - 1, value + 1))
    setRestRemaining(0)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={summary ? 'Session complete' : workout.title}
      description={
        summary
          ? `${workout.focus} · saved only when you press Save session.`
          : `${workout.focus} · ${workout.duration} min planned · ${workout.intensity} intensity`
      }
      size="xl"
      footer={
        summary ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>
              Discard
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onSave(summary)
                onClose()
              }}
            >
              <Check className="h-3.5 w-3.5" /> Save session
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] leading-relaxed text-charcoal/40">
              Your session is timed locally. Finish to create a saved workout record.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={finishWorkout}>
                End session
              </Button>
              <Button size="sm" onClick={exerciseComplete ? nextExercise : completeSet}>
                {exerciseComplete ? (
                  <>
                    {allComplete ? 'Finish workout' : 'Next exercise'}{' '}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    Complete set <Check className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )
      }
    >
      {summary ? (
        <div className="grid gap-4 md:grid-cols-[1fr_1.1fr]">
          <div className="rounded-2xl bg-charcoal p-5 text-white sm:p-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-white">
              <Trophy className="h-5 w-5" />
            </span>
            <p className="mt-4 text-[9px] font-bold uppercase tracking-[0.16em] text-orange-400">
              Workout recorded
            </p>
            <p className="mt-1 font-display uppercase text-4xl leading-none">
              {clock(summary.durationSeconds)}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-white/50">
              {summary.exercisesCompleted} of {summary.totalExercises} exercises completed ·{' '}
              {summary.setsCompleted} of {summary.totalSets} sets.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Duration', value: clock(summary.durationSeconds) },
              { label: 'Exercises', value: `${summary.exercisesCompleted}/${summary.totalExercises}` },
              { label: 'Sets', value: `${summary.setsCompleted}/${summary.totalSets}` },
              { label: 'Intensity', value: workout.intensity },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-charcoal/10 bg-ivory/60 p-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-charcoal/35">
                  {item.label}
                </p>
                <p className="mt-1.5 font-display text-2xl leading-none text-charcoal">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-charcoal/10 bg-ivory/60 p-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-charcoal text-white">
                  <Clock3 className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-charcoal/35">
                    Session time
                  </p>
                  <p className="font-display uppercase text-2xl leading-none text-charcoal">{clock(elapsed)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaused((value) => !value)}
                  className="flex min-h-[40px] items-center gap-1.5 rounded-full border border-charcoal/15 bg-white px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-charcoal/60 hover:border-charcoal/30"
                >
                  {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                  {paused ? 'Resume' : 'Pause'}
                </button>
                {restRemaining > 0 && (
                  <button
                    type="button"
                    onClick={() => setRestRemaining(0)}
                    className="flex min-h-[40px] items-center gap-1.5 rounded-full bg-orange-500 px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-white"
                  >
                    <SkipForward className="h-3.5 w-3.5" /> Rest {clock(restRemaining)}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-charcoal/10 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-orange-600">
                    Exercise {String(exerciseIndex + 1).padStart(2, '0')} /{' '}
                    {String(workout.exercises.length).padStart(2, '0')}
                  </p>
                  <h3 className="mt-2 font-display uppercase text-3xl leading-none text-charcoal">
                    {exercise.name}
                  </h3>
                  <p className="mt-2 text-[11px] text-charcoal/45">{exercise.focus}</p>
                </div>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white">
                  <Dumbbell className="h-5 w-5" />
                </span>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                {[
                  { label: 'Sets', value: exercise.sets },
                  { label: 'Reps', value: exercise.reps },
                  { label: 'Rest', value: exercise.rest },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-ivory p-3">
                    <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-charcoal/35">
                      {item.label}
                    </p>
                    <p className="mt-1 text-[12px] font-semibold text-charcoal">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/40">
                    Set progress
                  </p>
                  <span className="text-[10px] font-semibold text-charcoal/45">
                    {setsDone} / {setsTarget}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Array.from({ length: setsTarget }, (_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() =>
                        setCompletedSets((value) => ({
                          ...value,
                          [exerciseIndex]: index + 1,
                        }))
                      }
                      aria-label={`Mark ${index + 1} sets complete`}
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full border text-[11px] font-bold transition-colors',
                        index < setsDone
                          ? 'border-orange-500 bg-orange-500 text-white'
                          : 'border-charcoal/15 bg-white text-charcoal/35 hover:border-orange-500/50',
                      )}
                    >
                      {index < setsDone ? <Check className="h-4 w-4" /> : index + 1}
                    </button>
                  ))}
                </div>
              </div>

              {restRemaining > 0 && (
                <div className="mt-4 flex items-center justify-between rounded-xl border border-orange-500/20 bg-orange-50 px-4 py-3">
                  <p className="text-[11px] font-semibold text-orange-900">
                    Rest {clock(restRemaining)} before the next set.
                  </p>
                  <button
                    type="button"
                    onClick={() => setRestRemaining(0)}
                    className="text-[10px] font-bold uppercase tracking-[0.1em] text-orange-700"
                  >
                    Skip
                  </button>
                </div>
              )}
            </div>
          </div>

          <aside className="rounded-2xl border border-charcoal/10 bg-ivory/50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-charcoal/35">
                Session plan
              </p>
              <span className="text-[9px] font-semibold text-charcoal/30">
                {Math.round(progress)}%
              </span>
            </div>
            <ProgressBar value={progress} className="mt-2" />
            <ul className="mt-3 space-y-1">
              {workout.exercises.map((item, index) => {
                const target = parseSets(item.sets)
                const done = completedSets[index] ?? 0
                const complete = done >= target
                return (
                  <li key={item.name}>
                    <button
                      type="button"
                      onClick={() => {
                        setExerciseIndex(index)
                        setRestRemaining(0)
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors',
                        index === exerciseIndex ? 'bg-white shadow-soft' : 'hover:bg-white/60',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[8px] font-bold',
                          complete
                            ? 'bg-emerald-600 text-white'
                            : index === exerciseIndex
                              ? 'bg-orange-500 text-white'
                              : 'bg-white text-charcoal/35',
                        )}
                      >
                        {complete ? <Check className="h-3 w-3" /> : index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[10px] font-semibold text-charcoal/70">
                          {item.name}
                        </span>
                        <span className="block text-[8px] uppercase tracking-[0.08em] text-charcoal/30">
                          {item.sets} × {item.reps}
                        </span>
                      </span>
                      <span className="text-[8px] font-semibold text-charcoal/30">
                        {done}/{target}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <div className="mt-4 rounded-xl border border-charcoal/8 bg-white p-3">
              <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-charcoal/35">
                <RotateCcw className="h-3 w-3 text-orange-500" /> Demo template
              </p>
              <p className="mt-1.5 text-[9px] leading-relaxed text-charcoal/40">
                Loads and exercises are sample content. Stop if anything hurts.
              </p>
            </div>
          </aside>
        </div>
      )}
    </Modal>
  )
}
