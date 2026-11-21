import { useState } from 'react'
import { ChevronDown, Clock3, Dumbbell, Info, MoonStar, Repeat2, ShieldCheck } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { Badge } from '../../../components/ui/Badge'
import type { GeneratedDay } from '../types'

function restLabel(seconds: number) {
  if (!seconds) return '—'
  if (seconds < 60) return `${seconds}s`
  const minutes = seconds / 60
  return Number.isInteger(minutes) ? `${minutes} min` : `${minutes.toFixed(1)} min`
}

const kindTone: Record<GeneratedDay['kind'], 'orange' | 'green' | 'muted' | 'dark'> = {
  strength: 'dark',
  conditioning: 'orange',
  cardio: 'orange',
  mobility: 'green',
  recovery: 'green',
  rest: 'muted',
}

export function PlanSchedule({
  schedule,
  defaultOpenDay,
}: {
  schedule: GeneratedDay[]
  defaultOpenDay?: number
}) {
  const firstTrainingDay = schedule.find((day) => day.kind !== 'rest')?.dayNumber ?? 1
  const [openDay, setOpenDay] = useState<number | null>(defaultOpenDay ?? firstTrainingDay)

  return (
    <div className="space-y-2">
      {schedule.map((day) => {
        const open = openDay === day.dayNumber
        const isRest = day.kind === 'rest'
        return (
          <article
            key={day.dayNumber}
            className={cn(
              'overflow-hidden rounded-xl border transition-colors',
              open ? 'border-charcoal/20 bg-white' : 'border-charcoal/10 bg-white',
            )}
          >
            <button
              type="button"
              onClick={() => setOpenDay(open ? null : day.dayNumber)}
              aria-expanded={open}
              className="flex w-full items-center gap-3 p-3.5 text-left sm:gap-4 sm:p-4"
            >
              <span className="flex w-10 shrink-0 flex-col items-center rounded-lg bg-ivory py-1.5">
                <span className="text-[8px] font-bold uppercase tracking-[0.1em] text-charcoal/35">
                  Day
                </span>
                <span className="font-display text-lg leading-none text-charcoal">{day.dayNumber}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/35">
                    {day.dayName}
                  </span>
                  <Badge tone={kindTone[day.kind]}>{isRest ? 'Rest' : day.kind}</Badge>
                  {day.difficulty !== 'Beginner' && (
                    <span className="text-[9px] uppercase tracking-[0.08em] text-charcoal/30">
                      {day.difficulty}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-[13px] font-semibold text-charcoal">
                  {day.workoutTitle}
                </span>
                <span className="mt-0.5 block text-[10px] text-charcoal/40">
                  {isRest ? 'Recovery · no structured session' : `${day.focus} · ${day.estimatedDuration} min`}
                </span>
              </span>
              <span className="hidden shrink-0 items-center gap-3 text-[10px] text-charcoal/35 sm:flex">
                {!isRest && (
                  <>
                    <span className="inline-flex items-center gap-1">
                      <Dumbbell className="h-3 w-3" /> {day.exercises.length}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3 w-3" /> {day.estimatedDuration} min
                    </span>
                  </>
                )}
                {isRest && (
                  <span className="inline-flex items-center gap-1">
                    <MoonStar className="h-3 w-3" /> Recovery
                  </span>
                )}
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 text-charcoal/30 transition-transform',
                  open && 'rotate-180',
                )}
              />
            </button>

            {open && (
              <div className="border-t border-charcoal/5 bg-ivory/40 px-3.5 pb-4 pt-3.5 sm:px-4">
                {isRest ? (
                  <div className="flex items-start gap-2.5 rounded-lg bg-white p-3.5">
                    <MoonStar className="mt-0.5 h-4 w-4 shrink-0 text-charcoal/45" />
                    <div>
                      <p className="text-[12px] font-semibold text-charcoal">Rest &amp; recovery</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-charcoal/50">
                        {day.recoveryNotes}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      {day.muscleGroups.map((group) => (
                        <span
                          key={group}
                          className="rounded-full border border-charcoal/10 bg-white px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-charcoal/45"
                        >
                          {group}
                        </span>
                      ))}
                    </div>
                    <ul className="divide-y divide-charcoal/5 overflow-hidden rounded-lg border border-charcoal/8 bg-white">
                      {day.exercises.map((exercise, index) => (
                        <li key={`${exercise.exerciseId}-${index}`} className="p-3">
                          <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                            <span className="mt-0.5 w-5 text-[10px] font-bold text-charcoal/25">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[12.5px] font-semibold text-charcoal">
                                {exercise.exerciseName}
                              </p>
                              <p className="mt-0.5 text-[10px] text-charcoal/40">
                                {exercise.primaryMuscle}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-[10px]">
                              <span className="rounded-md bg-orange-500/10 px-2 py-1 font-semibold text-orange-700">
                                {exercise.sets} × {exercise.repetitions}
                              </span>
                              <span className="inline-flex items-center gap-1 text-charcoal/35">
                                <Repeat2 className="h-3 w-3" /> {restLabel(exercise.restSeconds)} rest
                              </span>
                            </div>
                          </div>
                          <details className="group mt-1.5 pl-8">
                            <summary className="cursor-pointer list-none text-[9px] font-bold uppercase tracking-[0.1em] text-charcoal/30 transition-colors hover:text-orange-600">
                              Instructions
                            </summary>
                            <p className="mt-1 text-[11px] leading-relaxed text-charcoal/50">
                              {exercise.instructions}
                            </p>
                          </details>
                        </li>
                      ))}
                    </ul>
                    {day.recoveryNotes && (
                      <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-charcoal/8 bg-white/70 p-2.5">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-charcoal/35" />
                        <p className="text-[10px] leading-relaxed text-charcoal/45">
                          {day.recoveryNotes}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </article>
        )
      })}
      <p className="flex items-start gap-1.5 px-1 pt-1 text-[9px] leading-relaxed text-charcoal/30">
        <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
        Exercise guidance is general information, not medical advice. Stop if pain or symptoms increase
        and consult a qualified professional.
      </p>
    </div>
  )
}
