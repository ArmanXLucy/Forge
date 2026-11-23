import type {
  Credential,
  FaqItem,
  PricingPlan,
  ServiceProgram,
  Testimonial,
} from '../types'

export const DISCIPLINES = [
  'Strength',
  'Muscle',
  'Fat Loss',
  'Endurance',
  'Nutrition',
  'Recovery',
  'Mobility',
  'Longevity',
]

export const HERO_STATS = [
  { value: '24', label: 'Plan templates' },
  { value: '03', label: 'Form checks' },
  { value: '07', label: 'Profile missions' },
  { value: '100%', label: 'Browser AI' },
]

export const STUDIO_TABS = [
  {
    id: 'workspace',
    number: '01',
    label: 'Workspace',
    title: 'Your whole training week, in one view.',
    body: 'The dashboard brings your next workout, profile progress, nutrition, recovery and recent sessions together. It is a working training workspace, not a static plan you print once and forget.',
    image: '/images/app/overview-wide.webp',
    stat: 'Overview',
  },
  {
    id: 'missions',
    number: '02',
    label: 'Missions',
    title: 'Seven missions. One complete profile.',
    body: 'Body metrics, health, training history, nutrition, lifestyle, goals and mindset are collected one mission at a time. The training-relevant answers shape the plan; the rest completes your workspace context and stays editable.',
    image: '/images/app/missions-wide.webp',
    stat: 'Assessment',
  },
  {
    id: 'ai-plan',
    number: '03',
    label: 'AI Plan',
    title: 'A weekly plan drawn from your profile.',
    body: 'Forge uses your age, body metrics, goal, equipment, experience and safety category to select from 24 training styles, then builds a structured week with sets, reps, rest and progression.',
    image: '/images/app/ai-plan-wide.webp',
    stat: 'Personalised',
  },
  {
    id: 'form-coach',
    number: '04',
    label: 'Form Coach',
    title: 'Camera-based form checks, on your device.',
    body: 'Squat, bicep curl and push-up sessions use MediaPipe pose tracking and browser-based ONNX classifiers to score movement, count reps and surface simple cues. Camera frames stay in the browser.',
    image: '/images/app/ai-coach-wide.webp',
    stat: 'On-device',
  },
]

export const PROGRAMS: ServiceProgram[] = [
  {
    id: 'ai-plan',
    number: '01',
    title: 'AI Workout Plan',
    tagline: 'A structured week, built from your profile.',
    description:
      'A 24-class recommendation model turns your goal, body metrics, experience, equipment and safety category into a weekly plan. It runs locally in your browser — no external AI service and no API key.',
    image: '/images/app/ai-plan-wide.webp',
    includes: ['24 training styles', 'Equipment-aware', 'Sets, reps and rest'],
  },
  {
    id: 'form-coach',
    number: '02',
    title: 'Form Coach',
    tagline: 'A second opinion while you train.',
    description:
      'Use your camera or upload a video for squat, bicep curl and push-up checks. Pose landmarks feed three trained classifiers that estimate form quality, count reps and show the cues that need attention.',
    image: '/images/app/ai-coach-wide.webp',
    includes: ['3 exercise checks', 'Rep counting', 'Camera stays local'],
  },
  {
    id: 'missions',
    number: '03',
    title: 'Guided Profile',
    tagline: 'Seven missions instead of one long form.',
    description:
      'Complete your profile in focused sections, each with a clear purpose and time estimate. Progress, XP and achievements make the setup visible, and the plan unlocks only when the essentials are in place.',
    image: '/images/app/missions-wide.webp',
    includes: ['7 guided missions', 'XP and achievements', 'Editable answers'],
  },
  {
    id: 'nutrition',
    number: '04',
    title: 'Nutrition Log',
    tagline: 'Fuel the training you actually do.',
    description:
      'Log meals, water and daily targets alongside your training. Nutrition preferences from your profile are kept separate from the workout model, so allergies and dietary choices are not treated as training inputs.',
    image: '/images/app/nutrition-wide.webp',
    includes: ['Meal logging', 'Water tracking', 'Macro targets'],
  },
  {
    id: 'progress',
    number: '05',
    title: 'Progress Tracking',
    tagline: 'Evidence, not guesswork.',
    description:
      'Workout history, body measurements, nutrition and AI form sessions feed one progress view. Trends show what is changing, while the dashboard keeps the next useful action in front of you.',
    image: '/images/app/progress-wide.webp',
    includes: ['Weight and measurements', 'Workout history', 'Form-score trends'],
  },
  {
    id: 'lifestyle',
    number: '06',
    title: 'Lifestyle & Recovery',
    tagline: 'The other 22 hours matter.',
    description:
      'Track sleep, steps, stress and recovery habits in the same place as your training. The aim is a repeatable week you can recover from, not a plan that only works on paper.',
    image: '/images/app/lifestyle-wide.webp',
    includes: ['Sleep and stress', 'Daily movement', 'Recovery habits'],
  },
]

export const CAPABILITIES: Testimonial[] = [
  {
    quote:
      'Your age, body metrics, goal, equipment, training experience and safety category feed a 24-class model that runs entirely in the browser. It selects a training style, then structures the week around your inputs.',
    name: 'AI workout plan',
    detail: '24 training styles · browser inference',
    initials: 'AI',
  },
  {
    quote:
      'Squat, bicep curl and push-up checks use 33 pose landmarks and three trained classifiers. You get rep counts, form scores and cues without sending camera frames to a server.',
    name: 'On-device form coach',
    detail: 'MediaPipe + ONNX · camera stays local',
    initials: 'FC',
  },
  {
    quote:
      'Seven profile missions cover body metrics, health, training history, nutrition, lifestyle, goals and mindset. The training-relevant answers shape the plan; every answer can be updated later.',
    name: 'Guided profile',
    detail: '7 missions · XP and achievements',
    initials: 'GP',
  },
  {
    quote:
      'Your next workout, nutrition log, recovery check-in, progress trends and recent AI sessions share one account. The dashboard shows what matters next instead of scattering it across five apps.',
    name: 'One training workspace',
    detail: 'Web app · mobile responsive',
    initials: 'TW',
  },
]

export const TECHNOLOGY: Credential[] = [
  {
    id: 'browser-inference',
    year: '01',
    title: 'Browser-based recommendation',
    institution: 'ONNX Runtime Web',
    description:
      'The workout model is exported to ONNX and executed on your device. Your profile is not sent to a third-party inference API to generate a plan.',
  },
  {
    id: 'pose-tracking',
    year: '02',
    title: 'On-device pose tracking',
    institution: 'MediaPipe Tasks Vision',
    description:
      'The form coach tracks 33 body landmarks from camera frames. Frames are processed in the browser and are not uploaded by the app.',
  },
  {
    id: 'account-security',
    year: '03',
    title: 'Account-scoped data',
    institution: 'Firebase Auth + Firestore',
    description:
      'Signed-in profiles and logs are stored under your account with owner-scoped access rules. Demo mode keeps its data in this browser instead.',
  },
  {
    id: 'safety-guardrails',
    year: '04',
    title: 'Safety guardrails',
    institution: 'Validation before planning',
    description:
      'Plans are checked against session, volume and exercise constraints. Health answers set a training category; free-text medical notes are never passed to the model.',
  },
]

export const PLATFORM_PLANS: PricingPlan[] = [
  {
    id: 'profile',
    name: 'Profile',
    price: '7',
    cadence: 'guided missions',
    description: 'Build the context every useful plan depends on.',
    features: [
      'Quick Start in about two minutes',
      'Body, health and training history',
      'Nutrition, lifestyle, goals and mindset',
      'Progress saved to your account',
      'Answers editable at any time',
    ],
  },
  {
    id: 'plan',
    name: 'AI Plan',
    price: '24',
    cadence: 'training styles',
    description: 'Turn your profile into a structured training week.',
    features: [
      'Goal and equipment-aware selection',
      'Experience and safety-category inputs',
      'Weekly sets, reps, rest and progression',
      'Plan validation before it is shown',
      'Regenerate when your profile changes',
    ],
    highlighted: true,
    badge: 'Core workflow',
  },
  {
    id: 'coach',
    name: 'Form Coach',
    price: '3',
    cadence: 'exercise checks',
    description: 'Add a live form check to your training week.',
    features: [
      'Squat, bicep curl and push-up',
      'Rep counting from joint motion',
      'Form score and corrective cues',
      'Camera or uploaded video',
      'Session summaries saved to progress',
    ],
  },
]

export const FAQS: FaqItem[] = [
  {
    question: 'Do I need a coach or a gym to use Forge?',
    answer:
      'No. Forge is a self-guided training workspace. You choose the equipment you can access during your profile missions — from a full gym to dumbbells, bands or minimal equipment — and the plan is generated around that selection.',
  },
  {
    question: 'How does the AI workout plan work?',
    answer:
      'Once the seven profile missions are complete, the recommendation model uses your age, weight, height, goal, equipment, experience and safety category to choose from 24 training styles. It then builds a weekly plan with exercises, sets, reps and rest. The model runs in your browser.',
  },
  {
    question: 'Does the AI Coach upload my camera feed?',
    answer:
      'No. Pose tracking and the three form classifiers run in your browser. Camera frames stay on your device; only the session summary you choose to save is added to your workout history. You can also upload a video instead of using a live camera.',
  },
  {
    question: 'What happens to the information in my missions?',
    answer:
      'When you are signed in, profile answers and training logs are stored under your account in Firebase. Access rules scope that data to the signed-in owner. If you use demo mode, the data stays in this browser. Free-text injury notes are not sent to the recommendation model.',
  },
  {
    question: 'Can I use Forge with an injury or medical condition?',
    answer:
      'The Health Profile mission records conditions, injuries and clearance so the plan can use a safer training category. Forge does not diagnose or treat injuries, and it does not replace medical advice. Seek clearance from a qualified clinician before starting intense exercise.',
  },
  {
    question: 'Is Forge a replacement for a doctor or physiotherapist?',
    answer:
      'No. Forge is a training and tracking tool. It can help you organise exercise and notice form trends, but it cannot provide medical diagnosis, rehabilitation or emergency support. Stop if something hurts and seek professional advice.',
  },
  {
    question: 'Does it work on a phone?',
    answer:
      'Yes. The workspace is responsive and works in a modern mobile browser. Camera form checks need camera permission; if you prefer not to grant it, you can upload a recorded video or skip the form coach and use the rest of the workspace.',
  },
]

export const GALLERY = [
  {
    src: '/images/app/overview-tall.webp',
    alt: 'Forge Athletic dashboard showing profile completion, weekly plan and next workout',
    label: 'Overview',
  },
  {
    src: '/images/app/missions-tall.webp',
    alt: 'Forge Athletic missions screen showing the seven guided profile missions',
    label: 'Missions',
  },
  {
    src: '/images/app/ai-plan-tall.webp',
    alt: 'Forge Athletic AI Plan screen showing a generated weekly workout plan',
    label: 'AI Plan',
  },
  {
    src: '/images/app/ai-coach-tall.webp',
    alt: 'Forge Athletic AI Coach screen with camera form-check controls',
    label: 'Form Coach',
  },
  {
    src: '/images/app/nutrition-tall.webp',
    alt: 'Forge Athletic nutrition screen showing meal and water logging',
    label: 'Nutrition',
  },
  {
    src: '/images/app/progress-tall.webp',
    alt: 'Forge Athletic progress screen showing weight and measurement trends',
    label: 'Progress',
  },
]
