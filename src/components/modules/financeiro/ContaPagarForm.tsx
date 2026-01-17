'use client'

import { useState, useEffect } from 'react'
import { ContaPagar, ContaPagarTipo, Rateio } from '@/types/financeiro'
import { createContaPagar, updateContaPagar } from '@/lib/db/contasPagar'
import { getObras } from '@/lib/db/obras'
import { uploadImage } from '@/lib/storage/upload'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Obra } from '@/types/obra'
import { toDate } from '@/utils/date'

interface ContaPagarFormProps {
  conta?: ContaPagar
  onSuccess?: () => void
}

export function ContaPagarForm({ conta, onSuccess }: ContaPagarFormProps) {
  const [valor, setValor] = useState(conta?.valor.toString() || '')
  const [dataVencimento, setDataVencimento] = useState(
    conta?.dataVencimento 
      ? toDate(conta.dataVencimento).toISOString().split('T')[0]
      : ''
  )
  const [tipo, setTipo] = useState<ContaPagarTipo>(conta?.tipo || 'outro')
  const [obraId, setObraId] = useState(conta?.obraId || '')
  const [descricao, setDescricao] = useState(conta?.descricao || '')
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null)
  const [comprovantePreview, setComprovantePreview] = useState(conta?.comprovanteUrl || '')
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    loadObras()
  }, [])

  const loadObras = async () => {
    try {
      const data = await getObras()
      setObras(data)
    } catch (error) {
      console.error('Erro ao carregar obras:', error)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setComprovanteFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setComprovantePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!obraId) {
      setError('Selecione uma obra')
      return
    }

    setLoading(true)

    try {
      if (!user) throw new Error('Usuário não autenticado')

      let comprovanteUrl = comprovantePreview || ''

      if (comprovanteFile) {
        const path = `comprovantes/${user.id}_${Date.now()}_${comprovanteFile.name}`
        comprovanteUrl = await uploadImage(comprovanteFile, path)
      }

      const data: any = {
        valor: parseFloat(valor),
        dataVencimento: new Date(dataVencimento),
        tipo,
        obraId,
        status: conta?.status || 'pendente',
        createdBy: user.id,
      }

      // Adicionar campos opcionais apenas se tiverem valor
      if (comprovanteUrl) {
        data.comprovanteUrl = comprovanteUrl
      }
      if (descricao) {
        data.descricao = descricao
      }

      if (conta) {
        await updateContaPagar(conta.id, data)
      } else {
        await createContaPagar(data)
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/financeiro/contas-pagar')
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="obraId" className="block text-sm font-medium text-gray-700">
          Obra (Centro de Custo) *
        </label>
        <select
          id="obraId"
          required
          value={obraId}
          onChange={(e) => setObraId(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Selecione uma obra</option>
          {obras.map((obra) => (
            <option key={obra.id} value={obra.id}>
              {obra.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="valor" className="block text-sm font-medium text-gray-700">
          Valor *
        </label>
        <input
          id="valor"
          type="number"
          step="0.01"
          required
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="dataVencimento" className="block text-sm font-medium text-gray-700">
          Data de Vencimento *
        </label>
        <input
          id="dataVencimento"
          type="date"
          required
          value={dataVencimento}
          onChange={(e) => setDataVencimento(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="tipo" className="block text-sm font-medium text-gray-700">
          Tipo *
        </label>
        <select
          id="tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as ContaPagarTipo)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="boleto">Boleto</option>
          <option value="folha">Folha de Pagamento</option>
          <option value="empreiteiro">Empreiteiro</option>
          <option value="outro">Outro</option>
        </select>
      </div>

      <div>
        <label htmlFor="descricao" className="block text-sm font-medium text-gray-700">
          Descrição
        </label>
        <textarea
          id="descricao"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={3}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="comprovante" className="block text-sm font-medium text-gray-700">
          Foto do Comprovante/Nota Fiscal
        </label>
        <input
          id="comprovante"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {comprovantePreview && (
          <img
            src={comprovantePreview}
            alt="Preview"
            className="mt-2 max-w-xs rounded-md"
          />
        )}
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Salvando...' : conta ? 'Atualizar' : 'Criar'}
        </button>
      </div>
    </form>
  )
}
