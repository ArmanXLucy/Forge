import type {
  ActivityPoint,
  MeasurementEntry,
  PlanMeal,
  WeightPoint,
  WorkoutSession,
} from '../types'

/** All dashboard data below is sample data for the frontend demo. */
export const WEEKLY_ACTIVITY: ActivityPoint[] = [
  { day: 'Mon', minutes: 45, calories: 380 },
  { day: 'Tue', minutes: 30, calories: 260 },
  { day: 'Wed', minutes: 0, calories: 0 },
  { day: 'Thu', minutes: 52, calories: 460 },
  { day: 'Fri', minutes: 25, calories: 210 },
  { day: 'Sat', minutes: 64, calories: 540 },
  { day: 'Sun', minutes: 0, calories: 0 },
]

export const WORKOUTS: WorkoutSession[] = [
  {
    id: 'w1',
    day: 'Today',
    dateLabel: 'Lower strength',
    title: 'Lower Body — Squat Focus',
    focus: 'Quads · Glutes · Core',
    duration: 55,
    intensity: 'High',
    status: 'today',
    weekday: 1,
    exercises: [
      { name: 'Back squat', sets: '4', reps: '5', rest: '3 min', focus: 'Quads · Glutes' },
      { name: 'Romanian deadlift', sets: '3', reps: '8', rest: '2 min', focus: 'Hamstrings' },
      { name: 'Split squat', sets: '3', reps: '10 / side', rest: '90 sec', focus: 'Unilateral' },
      { name: 'Calf raise', sets: '3', reps: '15', rest: '60 sec', focus: 'Calves' },
      { name: 'Dead bug', sets: '3', reps: '8 / side', rest: '45 sec', focus: 'Core' },
    ],
  },
  {
    id: 'w2',
    day: 'Thu',
    dateLabel: 'Upper strength',
    title: 'Upper Body — Push & Pull',
    focus: 'Chest · Back · Arms',
    duration: 50,
    intensity: 'Moderate',
    status: 'upcoming',
    weekday: 4,
    exercises: [
      { name: 'Bench press', sets: '4', reps: '6', rest: '2–3 min', focus: 'Chest · Triceps' },
      { name: 'Chest-supported row', sets: '4', reps: '8', rest: '2 min', focus: 'Back' },
      { name: 'Incline dumbbell press', sets: '3', reps: '10', rest: '90 sec', focus: 'Upper chest' },
      { name: 'Face pull', sets: '3', reps: '15', rest: '60 sec', focus: 'Rear delts' },
    ],
  },
  {
    id: 'w3',
    day: 'Sat',
    dateLabel: 'Conditioning',
    title: 'Engine — Zone 2 + Finisher',
    focus: 'Aerobic base · Conditioning',
    duration: 40,
    intensity: 'Low',
    status: 'upcoming',
    weekday: 6,
    exercises: [
      { name: 'Zone 2 row', sets: '1', reps: '25 min', rest: '—', focus: 'Aerobic base' },
      { name: 'Sled push', sets: '4', reps: '20 m', rest: '90 sec', focus: 'Power endurance' },
      { name: 'Mobility flow', sets: '1', reps: '8 min', rest: '—', focus: 'Hips · Thoracic' },
    ],
  },
  {
    id: 'w4',
    day: 'Mon',
    dateLabel: 'Completed',
    title: 'Lower Body — Hinge Focus',
    focus: 'Hamstrings · Glutes',
    duration: 52,
    intensity: 'High',
    status: 'completed',
    weekday: 1,
    exercises: [
      { name: 'Trap bar deadlift', sets: '4', reps: '5', rest: '3 min', focus: 'Posterior chain' },
      { name: 'Hip thrust', sets: '3', reps: '10', rest: '2 min', focus: 'Glutes' },
      { name: 'Leg curl', sets: '3', reps: '12', rest: '75 sec', focus: 'Hamstrings' },
    ],
  },
]

export const WEIGHT_HISTORY: WeightPoint[] = [
  { week: 'W1', weight: 78.4, bodyFat: 19.2 },
  { week: 'W2', weight: 78.0, bodyFat: 19.0 },
  { week: 'W3', weight: 77.6, bodyFat: 18.7 },
  { week: 'W4', weight: 77.7, bodyFat: 18.6 },
  { week: 'W5', weight: 77.1, bodyFat: 18.2 },
  { week: 'W6', weight: 76.8, bodyFat: 18.0 },
  { week: 'W7', weight: 76.4, bodyFat: 17.7 },
  { week: 'W8', weight: 76.1, bodyFat: 17.5 },
]

export const MEASUREMENTS: MeasurementEntry[] = [
  { label: 'Body weight', value: 76.1, unit: 'kg', change: -2.3, measuredAt: 'This week' },
  { label: 'Waist', value: 84, unit: 'cm', change: -2.0, measuredAt: '2 weeks ago' },
  { label: 'Chest', value: 103, unit: 'cm', change: 1.0, measuredAt: '2 weeks ago' },
  { label: 'Resting HR', value: 58, unit: 'bpm', change: -4, measuredAt: 'This week' },
]

export const DAILY_MEALS: PlanMeal[] = [
  {
    id: 'm1',
    time: '07:30',
    name: 'Training breakfast',
    description: 'Greek yoghurt, oats, blueberries, honey and walnuts.',
    calories: 480,
    protein: 32,
    carbs: 58,
    fat: 12,
  },
  {
    id: 'm2',
    time: '12:30',
    name: 'Studio lunch',
    description: 'Grilled chicken, quinoa, roasted vegetables and tahini dressing.',
    calories: 620,
    protein: 46,
    carbs: 62,
    fat: 19,
  },
  {
    id: 'm3',
    time: '16:30',
    name: 'Pre-session fuel',
    description: 'Banana, cottage cheese and a small handful of almonds.',
    calories: 290,
    protein: 20,
    carbs: 32,
    fat: 9,
  },
  {
    id: 'm4',
    time: '20:00',
    name: 'Recovery dinner',
    description: 'Salmon, sweet potato, green beans and avocado.',
    calories: 610,
    protein: 42,
    carbs: 48,
    fat: 26,
  },
]

export const NUTRITION_TARGETS = {
  calories: 2400,
  protein: 168,
  carbs: 260,
  fat: 72,
  water: 3.0,
}

export const SLEEP_DATA = [
  { day: 'Mon', hours: 7.1, quality: 74 },
  { day: 'Tue', hours: 6.6, quality: 66 },
  { day: 'Wed', hours: 7.4, quality: 81 },
  { day: 'Thu', hours: 7.8, quality: 84 },
  { day: 'Fri', hours: 6.2, quality: 58 },
  { day: 'Sat', hours: 8.3, quality: 88 },
  { day: 'Sun', hours: 7.9, quality: 85 },
]

export const NOTIFICATIONS = [
  {
    id: 'n1',
    title: 'Mission 04 is waiting',
    body: 'Your nutrition profile is the next highest-impact step.',
    time: '2h ago',
    unread: true,
  },
  {
    id: 'n2',
    title: 'Workout reminder',
    body: 'Lower Body — Squat Focus is scheduled for today.',
    time: '5h ago',
    unread: true,
  },
  {
    id: 'n3',
    title: 'Weekly review ready',
    body: 'You trained 5 times and moved for 216 minutes last week.',
    time: 'Yesterday',
    unread: false,
  },
]

export const MOTIVATION = [
  'Consistency compounds. One honest session is worth ten perfect plans.',
  'You do not need a new you. You need a plan that respects the current one.',
  'Strength is built on the days you show up unremarkable.',
]

export const RECENT_PROGRESS = [
  { id: 'r1', title: 'Body weight recorded', detail: '76.1 kg · down 0.3 kg', time: 'Today', type: 'measurement' },
  { id: 'r2', title: 'Lower Body — Hinge Focus', detail: '52 min · 5 exercises', time: 'Mon', type: 'workout' },
  { id: 'r3', title: 'Squat benchmark improved', detail: '100 kg est. 1RM · +5 kg', time: 'Last week', type: 'strength' },
  { id: 'r4', title: 'Sleep target hit', detail: '7.9 h · 85% quality', time: 'Sun', type: 'sleep' },
]
