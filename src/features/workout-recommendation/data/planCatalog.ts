import type { PlanTemplate } from '../types'

/**
 * Maps each of the 24 SmartFit plan classes to a validated session template.
 * The classifier decides the *category*; this catalog decides the actual work.
 */
export const PLAN_TEMPLATES: Record<string, PlanTemplate> = {
  fullBodyStrength: {
    id: 'full-body-strength',
    label: 'Full-body strength',
    description: 'Compound-led full-body sessions with low rep ranges and long rests.',
    defaultDays: 3,
    maxDays: 4,
    sessionMinutes: 55,
    intensity: 'High',
    supportsCardio: false,
    sessions: [
      {
        title: 'Full Body — Squat Focus',
        focus: 'Quads · Glutes · Back',
        kind: 'strength',
        patterns: ['squat', 'push', 'pull', 'core'],
      },
      {
        title: 'Full Body — Hinge Focus',
        focus: 'Hamstrings · Glutes · Back',
        kind: 'strength',
        patterns: ['hinge', 'push-overhead', 'pull-vertical', 'core'],
      },
      {
        title: 'Full Body — Mixed Strength',
        focus: 'Total body · Carries',
        kind: 'strength',
        patterns: ['lunge', 'push', 'pull', 'carry'],
      },
      {
        title: 'Full Body — Technique',
        focus: 'Movement quality · Core',
        kind: 'strength',
        patterns: ['squat', 'hinge', 'core', 'mobility'],
      },
    ],
  },
  upperLower: {
    id: 'upper-lower',
    label: 'Upper / lower split',
    description: 'Alternating upper- and lower-body sessions for balanced development.',
    defaultDays: 4,
    maxDays: 4,
    sessionMinutes: 50,
    intensity: 'Moderate',
    supportsCardio: true,
    sessions: [
      {
        title: 'Upper Body — Push & Pull',
        focus: 'Chest · Back · Shoulders',
        kind: 'strength',
        patterns: ['push', 'pull', 'push-overhead', 'pull-vertical'],
      },
      {
        title: 'Lower Body — Strength',
        focus: 'Quads · Glutes · Hamstrings',
        kind: 'strength',
        patterns: ['squat', 'hinge', 'lunge', 'core'],
      },
      {
        title: 'Upper Body — Volume',
        focus: 'Back · Arms · Core',
        kind: 'strength',
        patterns: ['pull', 'push', 'pull-vertical', 'core'],
      },
      {
        title: 'Lower Body — Posterior Chain',
        focus: 'Glutes · Hamstrings · Calves',
        kind: 'strength',
        patterns: ['hinge', 'lunge', 'core', 'mobility'],
      },
    ],
  },
  pushPullLegs: {
    id: 'push-pull-legs',
    label: 'Push / pull / legs',
    description: 'Hypertrophy split rotating push, pull and leg sessions.',
    defaultDays: 3,
    maxDays: 5,
    sessionMinutes: 55,
    intensity: 'Moderate',
    supportsCardio: false,
    sessions: [
      {
        title: 'Push — Chest & Shoulders',
        focus: 'Chest · Shoulders · Triceps',
        kind: 'strength',
        patterns: ['push', 'push-overhead', 'push', 'core'],
      },
      {
        title: 'Pull — Back & Biceps',
        focus: 'Back · Rear delts · Arms',
        kind: 'strength',
        patterns: ['pull', 'pull-vertical', 'pull', 'core'],
      },
      {
        title: 'Legs — Quads & Glutes',
        focus: 'Quads · Glutes · Hamstrings',
        kind: 'strength',
        patterns: ['squat', 'hinge', 'lunge', 'core'],
      },
      {
        title: 'Upper — Hypertrophy',
        focus: 'Chest · Back · Arms',
        kind: 'strength',
        patterns: ['push', 'pull', 'push-overhead', 'pull-vertical'],
      },
      {
        title: 'Lower — Glute Focus',
        focus: 'Glutes · Hamstrings · Core',
        kind: 'strength',
        patterns: ['hinge', 'lunge', 'core', 'mobility'],
      },
    ],
  },
  bodyweightCircuit: {
    id: 'bodyweight-circuit',
    label: 'Bodyweight circuit',
    description: 'Joint-friendly full-body circuits with core and mobility work.',
    defaultDays: 3,
    maxDays: 5,
    sessionMinutes: 35,
    intensity: 'Moderate',
    supportsCardio: true,
    sessions: [
      {
        title: 'Bodyweight Circuit — Full Body',
        focus: 'Total body · Core',
        kind: 'conditioning',
        patterns: ['squat', 'push', 'pull', 'core'],
      },
      {
        title: 'Core & Stability',
        focus: 'Trunk · Hips · Shoulders',
        kind: 'strength',
        patterns: ['core', 'lunge', 'mobility', 'core'],
      },
      {
        title: 'Bodyweight Conditioning',
        focus: 'Work capacity · Legs',
        kind: 'conditioning',
        patterns: ['squat', 'lunge', 'push', 'core'],
      },
      {
        title: 'Mobility & Recovery Flow',
        focus: 'Hips · Spine · Shoulders',
        kind: 'mobility',
        patterns: ['mobility', 'mobility', 'core', 'mobility'],
      },
      {
        title: 'Walking & Core',
        focus: 'Aerobic base · Trunk',
        kind: 'cardio',
        patterns: ['run', 'core', 'mobility'],
      },
    ],
  },
  hiitConditioning: {
    id: 'hiit-conditioning',
    label: 'HIIT & conditioning',
    description: 'Short, intense intervals balanced with recovery and mobility.',
    defaultDays: 3,
    maxDays: 4,
    sessionMinutes: 30,
    intensity: 'High',
    supportsCardio: true,
    sessions: [
      {
        title: 'HIIT Intervals',
        focus: 'Engine · Full body',
        kind: 'conditioning',
        patterns: ['conditioning', 'plyometric', 'squat', 'core'],
      },
      {
        title: 'Strength & Conditioning',
        focus: 'Total body · Power',
        kind: 'strength',
        patterns: ['hinge', 'push', 'pull', 'core'],
      },
      {
        title: 'Tempo Cardio',
        focus: 'Aerobic capacity',
        kind: 'cardio',
        patterns: ['row', 'cycle', 'run', 'mobility'],
      },
      {
        title: 'Recovery & Mobility',
        focus: 'Hips · Spine · Breathing',
        kind: 'mobility',
        patterns: ['mobility', 'mobility', 'core', 'mobility'],
      },
    ],
  },
  mobilityFlow: {
    id: 'mobility-flow',
    label: 'Mobility & yoga flow',
    description: 'Low-impact mobility, yoga-inspired flow and walking.',
    defaultDays: 4,
    maxDays: 6,
    sessionMinutes: 30,
    intensity: 'Low',
    supportsCardio: true,
    sessions: [
      {
        title: 'Mobility Flow',
        focus: 'Hips · Spine · Shoulders',
        kind: 'mobility',
        patterns: ['mobility', 'mobility', 'mobility', 'core'],
      },
      {
        title: 'Yoga-Inspired Flow',
        focus: 'Balance · Flexibility',
        kind: 'mobility',
        patterns: ['mobility', 'core', 'mobility', 'mobility'],
      },
      {
        title: 'Walk & Stretch',
        focus: 'Aerobic base · Tissue quality',
        kind: 'cardio',
        patterns: ['run', 'mobility', 'mobility'],
      },
      {
        title: 'Core & Posture',
        focus: 'Trunk · Shoulders',
        kind: 'strength',
        patterns: ['core', 'pull', 'core', 'mobility'],
      },
      {
        title: 'Gentle Full-Body Flow',
        focus: 'Recovery · Range of motion',
        kind: 'mobility',
        patterns: ['mobility', 'mobility', 'core', 'mobility'],
      },
      {
        title: 'Long Walk & Breathing',
        focus: 'Recovery · Aerobic base',
        kind: 'cardio',
        patterns: ['run', 'mobility'],
      },
    ],
  },
  enduranceRun: {
    id: 'endurance-run',
    label: 'Endurance running',
    description: 'Easy running, controlled intervals and a longer aerobic session.',
    defaultDays: 3,
    maxDays: 5,
    sessionMinutes: 45,
    intensity: 'Moderate',
    supportsCardio: true,
    sessions: [
      {
        title: 'Easy Run',
        focus: 'Aerobic base',
        kind: 'cardio',
        patterns: ['run', 'mobility'],
      },
      {
        title: 'Intervals',
        focus: 'Speed · Threshold',
        kind: 'cardio',
        patterns: ['run', 'run', 'core'],
      },
      {
        title: 'Long Aerobic Session',
        focus: 'Endurance',
        kind: 'cardio',
        patterns: ['run', 'run', 'mobility'],
      },
      {
        title: 'Cross-Training & Core',
        focus: 'Engine · Trunk',
        kind: 'conditioning',
        patterns: ['cycle', 'row', 'core', 'mobility'],
      },
      {
        title: 'Recovery Walk',
        focus: 'Blood flow · Recovery',
        kind: 'recovery',
        patterns: ['run', 'mobility'],
      },
    ],
  },
  sculpt: {
    id: 'sculpt',
    label: 'High-rep sculpting',
    description: 'Moderate-load, higher-repetition sessions with short rests.',
    defaultDays: 3,
    maxDays: 5,
    sessionMinutes: 40,
    intensity: 'Moderate',
    supportsCardio: true,
    sessions: [
      {
        title: 'Upper Body Sculpt',
        focus: 'Shoulders · Arms · Back',
        kind: 'strength',
        patterns: ['push', 'pull', 'push-overhead', 'core'],
      },
      {
        title: 'Lower Body Sculpt',
        focus: 'Glutes · Quads · Hamstrings',
        kind: 'strength',
        patterns: ['squat', 'hinge', 'lunge', 'core'],
      },
      {
        title: 'Full Body Burn',
        focus: 'Total body · Conditioning',
        kind: 'conditioning',
        patterns: ['squat', 'push', 'pull', 'core'],
      },
      {
        title: 'Core & Glutes',
        focus: 'Trunk · Glutes',
        kind: 'strength',
        patterns: ['core', 'hinge', 'lunge', 'core'],
      },
      {
        title: 'Low-Impact Cardio',
        focus: 'Aerobic base',
        kind: 'cardio',
        patterns: ['cycle', 'row', 'mobility'],
      },
    ],
  },
  powerStrength: {
    id: 'power-strength',
    label: 'Power & strength',
    description: 'Explosive power work supported by heavy compound strength.',
    defaultDays: 3,
    maxDays: 4,
    sessionMinutes: 50,
    intensity: 'High',
    supportsCardio: false,
    sessions: [
      {
        title: 'Power & Explosiveness',
        focus: 'Hips · Legs · Power',
        kind: 'strength',
        patterns: ['plyometric', 'squat', 'hinge', 'core'],
      },
      {
        title: 'Heavy Strength',
        focus: 'Total body · Barbell',
        kind: 'strength',
        patterns: ['squat', 'push', 'pull', 'core'],
      },
      {
        title: 'Power Endurance',
        focus: 'Conditioning · Power',
        kind: 'conditioning',
        patterns: ['plyometric', 'conditioning', 'carry', 'core'],
      },
      {
        title: 'Recovery & Mobility',
        focus: 'Hips · Shoulders',
        kind: 'mobility',
        patterns: ['mobility', 'mobility', 'core', 'mobility'],
      },
    ],
  },
}

export interface PlanCategoryMapping {
  category: string
  templateId: string
  summary: string
}

/** All 24 SmartFit classes. Verified against `model_classes.json`. */
export const PLAN_CATEGORY_MAP: Record<string, PlanCategoryMapping> = {
  '3-Day Full Body Mix': {
    category: '3-Day Full Body Mix',
    templateId: 'fullBodyStrength',
    summary: 'Three balanced full-body sessions with compound movements.',
  },
  '5x5 Compound Lifts': {
    category: '5x5 Compound Lifts',
    templateId: 'fullBodyStrength',
    summary: 'Low-rep compound strength with generous rest.',
  },
  '5x3x1 Strength Program': {
    category: '5x3x1 Strength Program',
    templateId: 'fullBodyStrength',
    summary: 'Heavy, low-volume strength progression.',
  },
  'Push-Pull-Legs Split (Hypertrophy)': {
    category: 'Push-Pull-Legs Split (Hypertrophy)',
    templateId: 'pushPullLegs',
    summary: 'Classic push, pull and leg rotation for muscle growth.',
  },
  'Upper Body Calisthenics & Core': {
    category: 'Upper Body Calisthenics & Core',
    templateId: 'bodyweightCircuit',
    summary: 'Bodyweight upper-body strength with focused core work.',
  },
  'Lower Body Bodyweight & Hiking': {
    category: 'Lower Body Bodyweight & Hiking',
    templateId: 'bodyweightCircuit',
    summary: 'Joint-friendly lower-body strength and aerobic walking.',
  },
  'Seated Upper Body Strength & Rowing': {
    category: 'Seated Upper Body Strength & Rowing',
    templateId: 'upperLower',
    summary: 'Supported upper-body strength with rowing intervals.',
  },
  'Swimming & Upper Body Machines': {
    category: 'Swimming & Upper Body Machines',
    templateId: 'upperLower',
    summary: 'Low-impact aerobic work paired with machine-based upper-body sessions.',
  },
  'Lower Body Power & Stationary Bike': {
    category: 'Lower Body Power & Stationary Bike',
    templateId: 'upperLower',
    summary: 'Lower-body strength with bike-based conditioning.',
  },
  'Advanced Calisthenics': {
    category: 'Advanced Calisthenics',
    templateId: 'bodyweightCircuit',
    summary: 'High-skill bodyweight progressions and core strength.',
  },
  'Bodyweight Circuit': {
    category: 'Bodyweight Circuit',
    templateId: 'bodyweightCircuit',
    summary: 'Full-body bodyweight circuits with short rests.',
  },
  'Core Stability, Yoga & Walking': {
    category: 'Core Stability, Yoga & Walking',
    templateId: 'mobilityFlow',
    summary: 'Core control, mobility flow and low-intensity walking.',
  },
  'Daily 30-min Bodyweight Flow': {
    category: 'Daily 30-min Bodyweight Flow',
    templateId: 'bodyweightCircuit',
    summary: 'Short daily bodyweight and mobility sessions.',
  },
  'Yoga & Mobility Flow': {
    category: 'Yoga & Mobility Flow',
    templateId: 'mobilityFlow',
    summary: 'Flexibility, mobility and recovery-focused flows.',
  },
  'High Reps Low Weight Sculpting': {
    category: 'High Reps Low Weight Sculpting',
    templateId: 'sculpt',
    summary: 'Higher-repetition resistance work with short rest periods.',
  },
  'HIIT with Dumbbells': {
    category: 'HIIT with Dumbbells',
    templateId: 'hiitConditioning',
    summary: 'Dumbbell intervals alternating work and recovery.',
  },
  'Jump Rope & Burpee Intervals': {
    category: 'Jump Rope & Burpee Intervals',
    templateId: 'hiitConditioning',
    summary: 'High-intensity interval work with full-body movements.',
  },
  'Metabolic Resistance Training': {
    category: 'Metabolic Resistance Training',
    templateId: 'hiitConditioning',
    summary: 'Resistance circuits designed to elevate work capacity.',
  },
  'WOD & High Intensity Functional Training': {
    category: 'WOD & High Intensity Functional Training',
    templateId: 'hiitConditioning',
    summary: 'Functional high-intensity sessions with mixed modalities.',
  },
  'Treadmill Intervals & Circuit Training': {
    category: 'Treadmill Intervals & Circuit Training',
    templateId: 'hiitConditioning',
    summary: 'Run intervals paired with strength circuits.',
  },
  'Long Distance Running Plan': {
    category: 'Long Distance Running Plan',
    templateId: 'enduranceRun',
    summary: 'Progressive aerobic running with one quality session.',
  },
  'Olympic Lifting & Plyometrics': {
    category: 'Olympic Lifting & Plyometrics',
    templateId: 'powerStrength',
    summary: 'Explosive power development with compound strength.',
  },
  'Full Body Dumbbell Complex': {
    category: 'Full Body Dumbbell Complex',
    templateId: 'pushPullLegs',
    summary: 'Dumbbell-based full-body strength and hypertrophy.',
  },
  'Dumbbell Upper/Lower Split': {
    category: 'Dumbbell Upper/Lower Split',
    templateId: 'upperLower',
    summary: 'Upper and lower sessions using dumbbells only.',
  },
}

export function templateForCategory(category: string): PlanTemplate {
  const mapping = PLAN_CATEGORY_MAP[category]
  if (!mapping) {
    throw new Error(`Unsupported plan category: ${category}`)
  }
  return PLAN_TEMPLATES[mapping.templateId]
}
