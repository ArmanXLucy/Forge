import { EntityManager } from '../../components/admin/EntityManager'

export default function AdminExercisesPage() {
  return (
    <EntityManager
      collection="exerciseLibrary"
      eyebrow="Fitness management"
      title="Exercise library"
      subtitle="Manage exercise metadata. Only Squat, Bicep curl and Push-up are supported by the bundled AI model."
      entityName="Exercise"
      defaults={{ difficulty: 'intermediate', aiSupported: false, repCounting: false }}
      fields={[
        { key: 'name', label: 'Exercise name', type: 'text', required: true, placeholder: 'Back squat' },
        { key: 'muscleGroups', label: 'Target muscle groups', type: 'text', placeholder: 'Quads · Glutes · Core' },
        { key: 'difficulty', label: 'Difficulty', type: 'select', options: [
          { value: 'beginner', label: 'Beginner' },
          { value: 'intermediate', label: 'Intermediate' },
          { value: 'advanced', label: 'Advanced' },
        ] },
        { key: 'aiSupported', label: 'AI form analysis', type: 'checkbox', hint: 'Supported by the bundled classifier' },
        { key: 'repCounting', label: 'Rep counting', type: 'checkbox', hint: 'Available in AI Coach' },
        { key: 'instructions', label: 'Instructions', type: 'textarea', full: true, placeholder: 'Setup, execution and coaching cues.' },
      ]}
      columns={[
        { key: 'name', label: 'Exercise' },
        { key: 'muscleGroups', label: 'Muscle groups' },
        { key: 'difficulty', label: 'Level' },
        { key: 'aiSupported', label: 'AI analysis' },
        { key: 'repCounting', label: 'Rep count' },
        { key: 'updatedAt', label: 'Updated' },
      ]}
    />
  )
}
