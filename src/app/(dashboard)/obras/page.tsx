import { ObraList } from '@/components/modules/obras/ObraList'

export default function ObrasPage() {
  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Obras</h1>
      <ObraList />
    </div>
  )
}
