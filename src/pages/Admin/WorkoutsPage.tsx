import { EntityManager } from '../../components/admin/EntityManager'

export default function AdminWorkoutsPage() {
  return (
    <EntityManager
      collection="workoutPlans"
      eyebrow="Fitness management"
      title="Workout plans"
      subtitle="Create, edit, publish and archive the programme catalog stored in Firestore."
      entityName="Workout plan"
      defaults={{ status: 'draft', difficulty: 'intermediate', daysPerWeek: 3, durationMinutes: 45 }}
      fields={[
        { key: 'title', label: 'Plan title', type: 'text', required: true, placeholder: 'Foundation Strength' },
        { key: 'focus', label: 'Focus', type: 'text', placeholder: 'Squat · Hinge · Push · Pull' },
        { key: 'difficulty', label: 'Difficulty', type: 'select', options: [
          { value: 'beginner', label: 'Beginner' },
          { value: 'intermediate', label: 'Intermediate' },
          { value: 'advanced', label: 'Advanced' },
        ] },
        { key: 'durationMinutes', label: 'Session duration (min)', type: 'number' },
        { key: 'daysPerWeek', label: 'Days per week', type: 'number' },
        { key: 'status', label: 'Status', type: 'select', options: [
          { value: 'draft', label: 'Draft' },
          { value: 'published', label: 'Published' },
          { value: 'archived', label: 'Archived' },
        ] },
        { key: 'description', label: 'Description', type: 'textarea', full: true, placeholder: 'Purpose and progression of this block.' },
        { key: 'exercises', label: 'Exercises', type: 'textarea', full: true, placeholder: 'Back squat | 4 | 5 | 3 min | Quads' },
      ]}
      columns={[
        { key: 'title', label: 'Plan' },
        { key: 'focus', label: 'Focus' },
        { key: 'difficulty', label: 'Level' },
        { key: 'durationMinutes', label: 'Minutes' },
        { key: 'status', label: 'Status' },
        { key: 'updatedAt', label: 'Updated' },
      ]}
    />
  )
}
