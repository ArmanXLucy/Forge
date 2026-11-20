import type {
  Credential,
  FaqItem,
  PricingPlan,
  ServiceProgram,
  Testimonial,
} from '../types'

export const DISCIPLINES = [
  'Strength',
  'Fat Loss',
  'Mobility',
  'Endurance',
  'Nutrition',
  'Recovery',
  'Performance',
  'Longevity',
]

export const STUDIO_TABS = [
  {
    id: 'studio',
    number: '01',
    label: 'The Studio',
    title: 'A private training floor, reserved for you.',
    body: 'No crowded racks. No waiting for equipment. Every session takes place in a fully equipped private studio built for focused, unhurried coaching — strength machines, free weights and cardio, all in one calm space.',
    image: '/images/studio.jpg',
    stat: 'Private access',
  },
  {
    id: 'coach',
    number: '02',
    label: 'The Coach',
    title: 'Certified coaching, personal by design.',
    body: 'Strength and nutrition coaching led by a certified trainer with a background in sport science. Every programme is written from your assessment — never copied from a template.',
    image: '/images/coach-portrait.jpg',
    stat: 'Certified & insured',
  },
  {
    id: 'athlete',
    number: '03',
    label: 'The Method',
    title: 'Athlete-level structure. Everyday-life realism.',
    body: 'Progressive overload, honest recovery and nutrition that fits your kitchen. We borrow the structure of elite sport and translate it into a plan you can sustain around work, family and travel.',
    image: '/images/strength.jpg',
    stat: 'Built for real life',
  },
  {
    id: 'mission',
    number: '04',
    label: 'The Mission',
    title: 'Health, confidence and performance — in that order.',
    body: 'Our mission is to make you stronger, move better and feel at home in your body. Aesthetics follow. We measure what matters and adjust every four to six weeks.',
    image: '/images/gallery6.jpg',
    stat: 'Long-term results',
  },
]

export const PROGRAMS: ServiceProgram[] = [
  {
    id: 'personal-training',
    number: '01',
    title: 'Personal Training',
    tagline: 'One coach. One athlete. Your session.',
    description:
      'Private, one-to-one coaching with a programme built around your assessment, schedule and goals. Technique, load and recovery are adjusted in real time.',
    image: '/images/coach.jpg',
    includes: ['Private studio access', 'Individual programme', 'Technique-led coaching'],
  },
  {
    id: 'strength',
    number: '02',
    title: 'Strength & Muscle',
    tagline: 'Built, not borrowed.',
    description:
      'Structured progressive overload for visible muscle, durable joints and measurable strength. Programming follows your benchmarks, not a generic split.',
    image: '/images/strength.jpg',
    includes: ['Strength testing', 'Block periodisation', 'Form video review'],
  },
  {
    id: 'fat-loss',
    number: '03',
    title: 'Fat Loss & Fitness',
    tagline: 'Sustainable, not punishing.',
    description:
      'A calm, evidence-led approach to body composition: strength training, daily movement and nutrition habits you can keep after the programme ends.',
    image: '/images/fatloss.jpg',
    includes: ['Metabolic assessment', 'Habit coaching', 'Monthly re-testing'],
  },
  {
    id: 'nutrition',
    number: '04',
    title: 'Nutrition Guidance',
    tagline: 'Food that works with your life.',
    description:
      'Practical nutrition built around your preferences, allergies, cooking reality and budget. No banned foods — just a structure that supports training and recovery.',
    image: '/images/nutrition.jpg',
    includes: ['In-depth nutrition review', 'Flexible meal framework', 'Fortnightly adjustments'],
  },
  {
    id: 'endurance',
    number: '05',
    title: 'Endurance Training',
    tagline: 'Go further, recover faster.',
    description:
      'Zone-aware conditioning for runners, cyclists and hybrid athletes. We build an aerobic base without sacrificing strength or leaving you flat.',
    image: '/images/endurance.jpg',
    includes: ['Zone testing', 'Hybrid programming', 'Race-day planning'],
  },
  {
    id: 'lifestyle',
    number: '06',
    title: 'Lifestyle & Recovery',
    tagline: 'The other 22 hours matter.',
    description:
      'Sleep, stress, mobility and recovery habits engineered around a real schedule. The goal is a body that feels good on the days you are not training.',
    image: '/images/recovery.jpg',
    includes: ['Sleep & stress audit', 'Mobility routine', 'Recovery protocol'],
  },
]

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'For the first time, training fits around my week instead of taking it over. The programme is demanding but never random — and my back pain has largely gone.',
    name: 'Sample Client A',
    detail: 'Strength programme · 9 months',
    initials: 'SA',
  },
  {
    quote:
      'The nutrition coaching changed the way I eat without turning dinner into a spreadsheet. I am stronger, sleeping better and no longer starting over every Monday.',
    name: 'Sample Client B',
    detail: 'Fat loss & nutrition · 6 months',
    initials: 'SB',
  },
  {
    quote:
      'Every session has a purpose. My squat is up 30 kg, my running is easier, and the check-ins keep me honest when work gets chaotic.',
    name: 'Sample Client C',
    detail: 'Hybrid performance · 12 months',
    initials: 'SC',
  },
  {
    quote:
      'I was nervous about returning to the gym after years away. The pace was right from day one, and I never felt out of place. That made all the difference.',
    name: 'Sample Client D',
    detail: 'Beginner strength · 4 months',
    initials: 'SD',
  },
]

export const CREDENTIALS: Credential[] = [
  {
    id: 'sport-science',
    year: '2016',
    title: 'BSc Sport Science & Movement',
    institution: 'University of Lausanne',
    description:
      'Exercise physiology, biomechanics and strength & conditioning foundations. Sample credential for this demo build.',
  },
  {
    id: 'strength-cert',
    year: '2018',
    title: 'Certified Strength Coach',
    institution: 'Swiss Coaching Federation',
    description:
      'Advanced programming, load management and movement screening. Sample credential for this demo build.',
  },
  {
    id: 'nutrition-cert',
    year: '2020',
    title: 'Sports Nutrition Diploma',
    institution: 'Institute of Applied Nutrition',
    description:
      'Energy availability, body composition and behaviour-led nutrition coaching. Sample credential for this demo build.',
  },
  {
    id: 'rehab-cert',
    year: '2023',
    title: 'Return-to-Training Specialist',
    institution: 'Clinical Movement Academy',
    description:
      'Progressive rehabilitation and return-to-load protocols for common injuries. Sample credential for this demo build.',
  },
]

export const PRICING: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Foundation',
    price: 'CHF 690',
    cadence: '/ month',
    description: 'For a focused start with structure and accountability.',
    features: [
      '4 private sessions per month',
      'Personal training programme',
      'Monthly progress review',
      'Studio access during sessions',
      'Message support (48h)',
    ],
  },
  {
    id: 'signature',
    name: 'Signature',
    price: 'CHF 1,190',
    cadence: '/ month',
    description: 'Our most complete coaching relationship.',
    features: [
      '8 private sessions per month',
      'Full assessment & mission review',
      'Nutrition framework included',
      'Fortnightly check-in call',
      'Priority message support',
      'Progress photo & measurement tracking',
    ],
    highlighted: true,
    badge: 'Most chosen',
  },
  {
    id: 'performance',
    name: 'Performance',
    price: 'CHF 1,890',
    cadence: '/ month',
    description: 'High-touch coaching for ambitious goals and busy calendars.',
    features: [
      '12 private sessions per month',
      'Advanced performance testing',
      'Nutrition plan & adjustments',
      'Weekly coach check-in',
      'Travel & competition programming',
      'Direct coach line',
    ],
  },
]

export const FAQS: FaqItem[] = [
  {
    question: 'Is coaching suitable if I am completely new to training?',
    answer:
      'Yes. Beginners are the group that benefits most from coached technique and a gradually loaded programme. Your first sessions are spent on assessment and movement quality, not chasing numbers.',
  },
  {
    question: 'What happens before my first session?',
    answer:
      'You complete the Quick Start profile online, then we walk through your training history, health restrictions and goals. Any relevant medical information requires clearance before intense exercise is prescribed.',
  },
  {
    question: 'How often should I train each week?',
    answer:
      'Most clients train two to four times per week. Two well-programmed sessions consistently done will beat five improvised ones. We set the frequency around your schedule and recovery.',
  },
  {
    question: 'Do I need to follow a strict diet?',
    answer:
      'No. Nutrition guidance is built around foods you actually enjoy, your cooking capacity and your budget. The aim is a repeatable structure — not a short-term restriction phase.',
  },
  {
    question: 'Can I train with an injury or medical condition?',
    answer:
      'Often yes, with appropriate clearance and modifications. We ask for details in the Health Profile mission and will request medical clearance before loading movements that could be unsafe.',
  },
  {
    question: 'Where do sessions take place?',
    answer:
      'In our private studio in central Lausanne, with limited remote coaching available for travel or hybrid clients. Exact address and availability are shared during your intro call.',
  },
]

export const GALLERY = [
  { src: '/images/gallery1.jpg', alt: 'Athlete training with battle ropes in a studio', label: 'Conditioning' },
  { src: '/images/gallery2.jpg', alt: 'Close-up of dumbbell training in the gym', label: 'Strength' },
  { src: '/images/training.jpg', alt: 'Athlete performing a pull-up in a gym', label: 'Pull day' },
  { src: '/images/gallery4.jpg', alt: 'Muscular athlete hanging from a pull-up bar', label: 'Back work' },
  { src: '/images/woman-strong.jpg', alt: 'Athlete performing a cable exercise', label: 'Coached session' },
  { src: '/images/gallery6.jpg', alt: 'Barbell squat training in a dark gym', label: 'Squat focus' },
]
