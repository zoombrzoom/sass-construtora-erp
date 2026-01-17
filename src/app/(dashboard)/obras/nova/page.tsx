import { ObraForm } from '@/components/modules/obras/ObraForm'

export default function NovaObraPage() {
  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Nova Obra</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <ObraForm />
      </div>
    </div>
  )
}
