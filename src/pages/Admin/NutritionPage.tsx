import { EntityManager } from '../../components/admin/EntityManager'

export default function AdminNutritionPage() {
  return (
    <EntityManager
      collection="nutritionPlans"
      eyebrow="Fitness management"
      title="Nutrition plans"
      subtitle="Manage macro targets and guidance records in Firestore."
      entityName="Nutrition plan"
      defaults={{ status: 'draft', calories: 2400, protein: 160, carbs: 260, fat: 72 }}
      fields={[
        { key: 'name', label: 'Plan name', type: 'text', required: true, placeholder: 'Performance base' },
        { key: 'goal', label: 'Goal', type: 'text', placeholder: 'Get stronger' },
        { key: 'status', label: 'Status', type: 'select', options: [
          { value: 'draft', label: 'Draft' },
          { value: 'published', label: 'Published' },
        ] },
        { key: 'calories', label: 'Calories', type: 'number' },
        { key: 'protein', label: 'Protein (g)', type: 'number' },
        { key: 'carbs', label: 'Carbs (g)', type: 'number' },
        { key: 'fat', label: 'Fat (g)', type: 'number' },
        { key: 'notes', label: 'Guidance notes', type: 'textarea', full: true, placeholder: 'Meal timing, preferences and coaching notes.' },
      ]}
      columns={[
        { key: 'name', label: 'Plan' },
        { key: 'goal', label: 'Goal' },
        { key: 'calories', label: 'kcal' },
        { key: 'protein', label: 'Protein' },
        { key: 'carbs', label: 'Carbs' },
        { key: 'fat', label: 'Fat' },
        { key: 'status', label: 'Status' },
      ]}
    />
  )
}
