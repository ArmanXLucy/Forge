import type { ComponentType } from 'react'
import {
  Apple,
  Brain,
  Dumbbell,
  HeartPulse,
  LayoutDashboard,
  LifeBuoy,
  LineChart,
  MoonStar,
  Ruler,
  Settings,
  Sparkles,
  Target,
} from 'lucide-react'

export const MISSION_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  'body-metrics': Ruler,
  'health-profile': HeartPulse,
  'training-history': Dumbbell,
  'nutrition-profile': Apple,
  'lifestyle-check': MoonStar,
  'goal-deep-dive': Target,
  'mindset-mission': Brain,
}

export const dashboardNav = [
  { label: 'Overview', to: '/dashboard', icon: LayoutDashboard, end: true },
  { label: 'My Missions', to: '/dashboard/missions', icon: Target },
  { label: 'Workout Plans', to: '/dashboard/workouts', icon: Dumbbell },
  { label: 'AI Plan', to: '/dashboard/workout-recommendation', icon: Brain, badge: 'New' },
  { label: 'Nutrition', to: '/dashboard/nutrition', icon: Apple },
  { label: 'Progress', to: '/dashboard/progress', icon: LineChart },
  { label: 'Lifestyle', to: '/dashboard/lifestyle', icon: MoonStar },
  { label: 'AI Coach', to: '/dashboard/ai-coach', icon: Sparkles, badge: 'Live' },
]

export const dashboardSupport = [
  { label: 'Help Desk', to: '/dashboard/help-desk', icon: LifeBuoy },
]

export const dashboardSecondary = [{ label: 'Settings', to: '/dashboard/settings', icon: Settings }]

export { LayoutDashboard, Target, Dumbbell, Apple, LineChart, MoonStar, Sparkles, Settings, LifeBuoy }
