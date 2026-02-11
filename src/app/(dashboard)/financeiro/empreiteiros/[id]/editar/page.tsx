'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Empreiteiro } from '@/types/financeiro'
import { getEmpreiteiro } from '@/lib/db/empreiteiros'
import { EmpreiteiroForm } from '@/components/modules/financeiro/EmpreiteiroForm'

export default function EditarEmpreiteiroPage() {
    const params = useParams()
    const router = useRouter()
    const [empreiteiro, setEmpreiteiro] = useState<Empreiteiro | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (params.id) {
            loadEmpreiteiro(params.id as string)
        }
    }, [params.id])

    const loadEmpreiteiro = async (id: string) => {
        try {
            const data = await getEmpreiteiro(id)
            setEmpreiteiro(data)
        } catch (error) {
            console.error('Erro ao carregar empreiteiro:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <div className="text-center py-12 text-gray-400">Carregando...</div>
    }

    if (!empreiteiro) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500 mb-4">Registro não encontrado</p>
                <button
                    onClick={() => router.push('/financeiro/empreiteiros')}
                    className="text-brand hover:text-brand-light"
                >
                    Voltar para Empreiteiros
                </button>
            </div>
        )
    }

    return (
        <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand mb-6">Editar Medição de Empreiteiro</h1>
            <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-6">
                <EmpreiteiroForm
                    empreiteiro={empreiteiro}
                    onSuccess={() => router.push(`/financeiro/empreiteiros/${empreiteiro.id}`)}
                />
            </div>
        </div>
    )
}
