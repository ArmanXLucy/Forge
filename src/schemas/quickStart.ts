import { z } from 'zod'

export const quickStartSchema = z.object({
  name: z.string().min(2, 'Please tell us your name.').max(60, 'That name is a little too long.'),
  age: z.coerce
    .number({ invalid_type_error: 'Enter your age.' })
    .min(16, 'You must be at least 16 to use Forge.')
    .max(90, 'Please contact us directly if you are over 90.'),
  heightCm: z.coerce
    .number({ invalid_type_error: 'Enter your height.' })
    .min(120, 'Height must be at least 120 cm.')
    .max(230, 'Height must be under 230 cm.'),
  weightKg: z.coerce
    .number({ invalid_type_error: 'Enter your weight.' })
    .min(30, 'Weight must be at least 30 kg.')
    .max(300, 'Weight must be under 300 kg.'),
  goal: z.enum(['fat-loss', 'build-muscle', 'get-stronger', 'endurance', 'general-health', 'longevity'], {
    errorMap: () => ({ message: 'Choose your primary goal.' }),
  }),
  experience: z.enum(['beginner', 'returning', 'intermediate', 'advanced'], {
    errorMap: () => ({ message: 'Choose your experience level.' }),
  }),
  workoutDays: z
    .array(z.number())
    .min(2, 'Choose at least two days you can train.')
    .max(7, 'Choose up to seven days.'),
})

export type QuickStartValues = z.infer<typeof quickStartSchema>
