import { EmpreiteiroForm } from '@/components/modules/financeiro/EmpreiteiroForm'

export default function NovoEmpreiteiroPage() {
    return (
        <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand mb-6">Nova Medição de Empreiteiro</h1>
            <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-6">
                <EmpreiteiroForm />
            </div>
        </div>
    )
}
