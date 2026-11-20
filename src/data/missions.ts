import type { AdvancedAssessment, MissionDefinition, MissionField } from '../types'

const numberField = (
  id: string,
  label: string,
  unit: string,
  placeholder: string,
  opts: Partial<MissionField> = {},
): MissionField => ({
  id,
  label,
  type: 'number',
  unit,
  placeholder,
  ...opts,
})

export const MISSIONS: MissionDefinition[] = [
  {
    id: 'body-metrics',
    number: '01',
    title: 'Body Metrics',
    shortTitle: 'Metrics',
    description:
      'Capture the numbers that define your starting point — weight, body composition and the measurements we will track over time.',
    estimatedMinutes: 4,
    xp: 120,
    sensitive: false,
    sections: [
      {
        title: 'Core composition',
        description: 'Use your latest measurement. Estimates are fine — we refine them later.',
        fields: [
          numberField('weight', 'Body weight', 'kg', '78.4', { required: true, min: 30, max: 300 }),
          numberField('bodyFat', 'Body fat percentage', '%', '18.5', { min: 3, max: 70 }),
          numberField('leanMass', 'Lean muscle mass', 'kg', '63.2', { min: 10, max: 150 }),
          numberField('restingHr', 'Resting heart rate', 'bpm', '62', { min: 30, max: 140 }),
        ],
      },
      {
        title: 'Circumference measurements',
        description: 'Keep the tape level and relaxed. All measurements are optional.',
        fields: [
          numberField('chest', 'Chest', 'cm', '102'),
          numberField('waist', 'Waist (at navel)', 'cm', '86'),
          numberField('hips', 'Hips', 'cm', '98'),
          numberField('arm', 'Upper arm (flexed)', 'cm', '36'),
          numberField('thigh', 'Mid-thigh', 'cm', '58'),
        ],
      },
      {
        title: 'Cardiovascular markers',
        fields: [
          numberField('systolic', 'Blood pressure — systolic', 'mmHg', '120', { min: 70, max: 250 }),
          numberField('diastolic', 'Blood pressure — diastolic', 'mmHg', '80', { min: 40, max: 180 }),
        ],
      },
    ],
  },
  {
    id: 'health-profile',
    number: '02',
    title: 'Health Profile',
    shortTitle: 'Health',
    description:
      'Safety comes first. Tell us about injuries, medical conditions and restrictions so every session is built around you — not against you.',
    estimatedMinutes: 5,
    xp: 150,
    sensitive: true,
    safetyCritical: true,
    sections: [
      {
        title: 'Medical background',
        description:
          'This form is a demo interaction. Nothing you type is stored in your browser or sent anywhere in this stage.',
        fields: [
          {
            id: 'conditions',
            label: 'Existing medical conditions',
            type: 'multiselect',
            options: [
              { value: 'none', label: 'None' },
              { value: 'cardiac', label: 'Cardiovascular' },
              { value: 'hypertension', label: 'Hypertension' },
              { value: 'diabetes', label: 'Diabetes' },
              { value: 'asthma', label: 'Asthma' },
              { value: 'joint', label: 'Joint / arthritis' },
              { value: 'other', label: 'Other' },
            ],
            required: true,
          },
          {
            id: 'injuries',
            label: 'Current or previous injuries',
            type: 'textarea',
            placeholder: 'e.g. Left shoulder impingement (2022), resolved with physiotherapy…',
          },
          {
            id: 'medication',
            label: 'Medication that may affect training',
            type: 'textarea',
            placeholder: 'Optional — do not include prescription numbers or documents.',
          },
          {
            id: 'allergies',
            label: 'Relevant allergies',
            type: 'textarea',
            placeholder: 'Food or environmental allergies…',
          },
        ],
      },
      {
        title: 'Clearance & restrictions',
        fields: [
          {
            id: 'clearance',
            label: 'Medical clearance',
            type: 'select',
            options: [
              { value: 'cleared', label: 'Cleared for exercise' },
              { value: 'pending', label: 'Clearance pending' },
              { value: 'restricted', label: 'Cleared with restrictions' },
              { value: 'not-needed', label: 'Not required' },
            ],
            required: true,
          },
          {
            id: 'restrictions',
            label: 'Movement restrictions or limitations',
            type: 'textarea',
            placeholder: 'Any movements we should avoid or modify?',
          },
          {
            id: 'emergencyConsent',
            label: 'I understand a coach may ask for medical clearance before prescribing intense exercise.',
            type: 'toggle',
            required: true,
          },
        ],
      },
    ],
  },
  {
    id: 'training-history',
    number: '03',
    title: 'Training History',
    shortTitle: 'Training',
    description:
      'Your training past shapes your next programme. Share your experience, preferences and the equipment you can actually access.',
    estimatedMinutes: 4,
    xp: 120,
    sensitive: false,
    sections: [
      {
        title: 'Experience',
        fields: [
          {
            id: 'experience',
            label: 'Current training experience',
            type: 'select',
            options: [
              { value: 'beginner', label: 'Beginner — under 1 year' },
              { value: 'returning', label: 'Returning after a break' },
              { value: 'intermediate', label: 'Intermediate — 1–3 years' },
              { value: 'advanced', label: 'Advanced — 3+ years' },
            ],
            required: true,
          },
          {
            id: 'sports',
            label: 'Sports background',
            type: 'text',
            placeholder: 'e.g. Football, swimming, CrossFit…',
          },
          {
            id: 'previousRoutine',
            label: 'Your most recent routine',
            type: 'textarea',
            placeholder: 'Sessions per week, split, favourite lifts, what worked and what did not…',
          },
          {
            id: 'preferences',
            label: 'Training preferences',
            type: 'multiselect',
            options: [
              { value: 'free-weights', label: 'Free weights' },
              { value: 'machines', label: 'Machines' },
              { value: 'bodyweight', label: 'Bodyweight' },
              { value: 'hiit', label: 'HIIT / conditioning' },
              { value: 'cardio', label: 'Cardio' },
              { value: 'mobility', label: 'Mobility' },
            ],
          },
        ],
      },
      {
        title: 'Benchmarks & equipment',
        description: 'Best working sets or estimated one-rep maxes. Leave blank if unknown.',
        fields: [
          numberField('squat', 'Back squat — est. 1RM', 'kg', '100'),
          numberField('bench', 'Bench press — est. 1RM', 'kg', '75'),
          numberField('deadlift', 'Deadlift — est. 1RM', 'kg', '130'),
          {
            id: 'equipment',
            label: 'Equipment you can access',
            type: 'multiselect',
            options: [
              { value: 'gym', label: 'Full gym' },
              { value: 'home-basic', label: 'Home — dumbbells' },
              { value: 'bands', label: 'Resistance bands' },
              { value: 'cardio', label: 'Cardio machine' },
              { value: 'studio', label: 'Forge studio' },
              { value: 'none', label: 'Minimal equipment' },
            ],
            required: true,
          },
        ],
      },
    ],
  },
  {
    id: 'nutrition-profile',
    number: '04',
    title: 'Nutrition Profile',
    shortTitle: 'Nutrition',
    description:
      'Great training deserves great fuel. Map your preferences, habits and kitchen reality so guidance fits your actual life.',
    estimatedMinutes: 4,
    xp: 120,
    sensitive: true,
    sections: [
      {
        title: 'Preferences & restrictions',
        description:
          'Demo interaction only. Allergy and intolerance answers are not stored in this frontend build.',
        fields: [
          {
            id: 'diet',
            label: 'Dietary preference',
            type: 'select',
            options: [
              { value: 'omnivore', label: 'Omnivore' },
              { value: 'vegetarian', label: 'Vegetarian' },
              { value: 'vegan', label: 'Vegan' },
              { value: 'pescatarian', label: 'Pescatarian' },
              { value: 'halal', label: 'Halal' },
              { value: 'other', label: 'Other' },
            ],
            required: true,
          },
          {
            id: 'foodAllergies',
            label: 'Food allergies',
            type: 'textarea',
            placeholder: 'e.g. Tree nuts, shellfish…',
          },
          {
            id: 'intolerances',
            label: 'Food intolerances',
            type: 'textarea',
            placeholder: 'e.g. Lactose, gluten…',
          },
          {
            id: 'habits',
            label: 'Typical eating pattern',
            type: 'textarea',
            placeholder: 'Meal timing, snacking, eating out, weekend patterns…',
          },
        ],
      },
      {
        title: 'Kitchen & routine',
        fields: [
          numberField('water', 'Daily water intake', 'L', '2.2', { min: 0, max: 10 }),
          {
            id: 'cooking',
            label: 'Cooking preference',
            type: 'select',
            options: [
              { value: 'daily', label: 'Cook daily' },
              { value: 'batch', label: 'Batch cook' },
              { value: 'quick', label: 'Quick & simple' },
              { value: 'rarely', label: 'Rarely cook' },
            ],
          },
          {
            id: 'budget',
            label: 'Weekly grocery budget',
            type: 'select',
            options: [
              { value: 'low', label: 'Keep it economical' },
              { value: 'medium', label: 'Balanced' },
              { value: 'high', label: 'Flexible / premium' },
            ],
          },
          {
            id: 'supplements',
            label: 'Supplements currently used',
            type: 'text',
            placeholder: 'Optional',
          },
        ],
      },
    ],
  },
  {
    id: 'lifestyle-check',
    number: '05',
    title: 'Lifestyle Check',
    shortTitle: 'Lifestyle',
    description:
      'Recovery is training. We look at sleep, stress, work and daily movement to make your programme sustainable.',
    estimatedMinutes: 3,
    xp: 100,
    sensitive: false,
    sections: [
      {
        title: 'Sleep & recovery',
        fields: [
          numberField('sleepHours', 'Average sleep per night', 'h', '7.2', { required: true, min: 0, max: 16 }),
          {
            id: 'sleepSchedule',
            label: 'Sleep schedule',
            type: 'select',
            options: [
              { value: 'early', label: 'Early — before 22:30' },
              { value: 'regular', label: 'Regular — 22:30–00:00' },
              { value: 'late', label: 'Late — after midnight' },
              { value: 'shift', label: 'Shift work / irregular' },
            ],
          },
          {
            id: 'recoveryHabits',
            label: 'Recovery habits',
            type: 'multiselect',
            options: [
              { value: 'walking', label: 'Walking' },
              { value: 'mobility', label: 'Mobility work' },
              { value: 'sauna', label: 'Sauna / cold' },
              { value: 'massage', label: 'Massage' },
              { value: 'none', label: 'None yet' },
            ],
          },
        ],
      },
      {
        title: 'Daily life',
        fields: [
          {
            id: 'dailyActivity',
            label: 'Daily activity outside training',
            type: 'select',
            options: [
              { value: 'sedentary', label: 'Mostly seated' },
              { value: 'light', label: 'Lightly active' },
              { value: 'moderate', label: 'Moderately active' },
              { value: 'high', label: 'Very active job' },
            ],
            required: true,
          },
          {
            id: 'occupation',
            label: 'Occupation',
            type: 'text',
            placeholder: 'e.g. Product designer, nurse, student…',
          },
          {
            id: 'stress',
            label: 'Current stress level',
            type: 'scale',
            min: 1,
            max: 10,
            help: '1 = calm, 10 = overwhelmed',
            required: true,
          },
        ],
      },
    ],
  },
  {
    id: 'goal-deep-dive',
    number: '06',
    title: 'Goal Deep Dive',
    shortTitle: 'Goals',
    description:
      'A goal without context is a guess. Define what success looks like, your timeline and the obstacles that usually get in the way.',
    estimatedMinutes: 4,
    xp: 120,
    sensitive: false,
    sections: [
      {
        title: 'Your target',
        fields: [
          {
            id: 'primaryGoal',
            label: 'Primary goal',
            type: 'select',
            options: [
              { value: 'fat-loss', label: 'Fat loss' },
              { value: 'muscle', label: 'Build muscle' },
              { value: 'strength', label: 'Get stronger' },
              { value: 'endurance', label: 'Endurance' },
              { value: 'health', label: 'General health' },
              { value: 'longevity', label: 'Longevity' },
            ],
            required: true,
          },
          {
            id: 'secondaryGoals',
            label: 'Secondary goals',
            type: 'multiselect',
            options: [
              { value: 'confidence', label: 'Confidence' },
              { value: 'mobility', label: 'Mobility' },
              { value: 'energy', label: 'Energy' },
              { value: 'posture', label: 'Posture' },
              { value: 'sport', label: 'Sport performance' },
              { value: 'habits', label: 'Better habits' },
            ],
          },
          {
            id: 'timeline',
            label: 'Target timeline',
            type: 'select',
            options: [
              { value: '8-weeks', label: '8 weeks' },
              { value: '12-weeks', label: '12 weeks' },
              { value: '6-months', label: '6 months' },
              { value: '12-months', label: '12 months' },
              { value: 'open', label: 'No fixed deadline' },
            ],
            required: true,
          },
          {
            id: 'motivation',
            label: 'Why does this matter to you?',
            type: 'textarea',
            placeholder: 'The honest reason — not the polished one.',
            required: true,
          },
        ],
      },
      {
        title: 'Track record',
        fields: [
          {
            id: 'previousAttempts',
            label: 'Previous attempts',
            type: 'textarea',
            placeholder: 'What have you tried before, and what happened?',
          },
          {
            id: 'obstacles',
            label: 'What usually gets in the way?',
            type: 'multiselect',
            options: [
              { value: 'time', label: 'Time' },
              { value: 'motivation', label: 'Motivation' },
              { value: 'pain', label: 'Pain / injury' },
              { value: 'nutrition', label: 'Nutrition' },
              { value: 'travel', label: 'Travel' },
              { value: 'sleep', label: 'Sleep' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'mindset-mission',
    number: '07',
    title: 'Mindset Mission',
    shortTitle: 'Mindset',
    description:
      'The plan has to fit your personality. Tell us how you like to be coached, encouraged and held accountable.',
    estimatedMinutes: 3,
    xp: 100,
    sensitive: false,
    sections: [
      {
        title: 'How you train best',
        fields: [
          {
            id: 'confidence',
            label: 'Confidence in the gym right now',
            type: 'scale',
            min: 1,
            max: 10,
            help: '1 = unsure, 10 = completely at home',
            required: true,
          },
          {
            id: 'coachingStyle',
            label: 'Preferred coaching style',
            type: 'select',
            options: [
              { value: 'direct', label: 'Direct and demanding' },
              { value: 'encouraging', label: 'Encouraging and patient' },
              { value: 'analytical', label: 'Data-led and analytical' },
              { value: 'balanced', label: 'Balanced mix' },
            ],
            required: true,
          },
          {
            id: 'checkIn',
            label: 'Check-in preference',
            type: 'select',
            options: [
              { value: 'weekly', label: 'Weekly' },
              { value: 'fortnightly', label: 'Every two weeks' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'in-person', label: 'In person only' },
            ],
          },
          {
            id: 'habit',
            label: 'One habit you want to build',
            type: 'text',
            placeholder: 'e.g. Prepare lunch the night before',
            required: true,
          },
          {
            id: 'weeklyTime',
            label: 'Weekly time you can protect',
            type: 'select',
            options: [
              { value: '2h', label: 'Up to 2 hours' },
              { value: '3-4h', label: '3–4 hours' },
              { value: '5-6h', label: '5–6 hours' },
              { value: '7h+', label: '7+ hours' },
            ],
            required: true,
          },
        ],
      },
    ],
  },
]

export const ADVANCED_ASSESSMENTS: AdvancedAssessment[] = [
  {
    id: 'food-diary',
    title: 'Detailed Food Diary',
    description: 'A three-day record of meals, portions and timing for deeper nutrition analysis.',
    minutes: 20,
  },
  {
    id: 'measurements',
    title: 'Detailed Measurements',
    description: 'Full circumference set plus progress photographs for visual tracking.',
    minutes: 15,
  },
  {
    id: 'mobility',
    title: 'Mobility Assessment',
    description: 'Guided movement screen covering hips, shoulders, ankles and spine.',
    minutes: 12,
  },
  {
    id: 'strength-benchmarks',
    title: 'Strength Benchmarks',
    description: 'Structured strength testing to calibrate loads and progression.',
    minutes: 25,
  },
  {
    id: 'lifestyle-deep-dive',
    title: 'Advanced Lifestyle Assessment',
    description: 'Sleep quality, stress load, recovery capacity and daily movement audit.',
    minutes: 15,
  },
  {
    id: 'lab-reports',
    title: 'Laboratory Report Review',
    description: 'Share relevant blood markers for a medically informed coaching review.',
    minutes: 10,
  },
]

export const ACHIEVEMENTS = [
  {
    id: 'first-step',
    title: 'First Step',
    description: 'Complete the Quick Start profile and enter your dashboard.',
    xp: 50,
    icon: 'footprints' as const,
  },
  {
    id: 'body-metrics',
    title: 'Baseline Locked',
    description: 'Complete Mission 01 — Body Metrics.',
    xp: 120,
    icon: 'ruler' as const,
  },
  {
    id: 'training-ready',
    title: 'Training Ready',
    description: 'Complete Mission 03 — Training History.',
    xp: 120,
    icon: 'dumbbell' as const,
  },
  {
    id: 'nutrition-aware',
    title: 'Nutrition Aware',
    description: 'Complete Mission 04 — Nutrition Profile.',
    xp: 120,
    icon: 'apple' as const,
  },
  {
    id: 'consistency',
    title: 'Consistency Champion',
    description: 'Complete any four missions.',
    xp: 200,
    icon: 'flame' as const,
  },
  {
    id: 'profile-master',
    title: 'Complete Athlete',
    description: 'Complete all seven profile missions.',
    xp: 400,
    icon: 'trophy' as const,
  },
]

export const MISSION_MAP = Object.fromEntries(MISSIONS.map((m) => [m.id, m]))
