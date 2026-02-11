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
import { AlertCircle, Save, ArrowLeft, Upload } from 'lucide-react'

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

  const inputClass = "mt-1 block w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all min-h-touch"
  const labelClass = "block text-sm font-medium text-gray-300 mb-1"

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-error/20 border border-error/30 text-error px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      <div>
        <label htmlFor="obraId" className={labelClass}>
          Obra (Centro de Custo) *
        </label>
        <select
          id="obraId"
          required
          value={obraId}
          onChange={(e) => setObraId(e.target.value)}
          className={inputClass}
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
        <label htmlFor="valor" className={labelClass}>
          Valor *
        </label>
        <input
          id="valor"
          type="number"
          step="0.01"
          required
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className={inputClass}
          placeholder="0.00"
        />
      </div>

      <div>
        <label htmlFor="dataVencimento" className={labelClass}>
          Data de Vencimento *
        </label>
        <input
          id="dataVencimento"
          type="date"
          required
          value={dataVencimento}
          onChange={(e) => setDataVencimento(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="tipo" className={labelClass}>
          Tipo *
        </label>
        <select
          id="tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as ContaPagarTipo)}
          className={inputClass}
        >
          <option value="boleto">Boleto</option>
          <option value="folha">Folha de Pagamento</option>
          <option value="empreiteiro">Empreiteiro</option>
          <option value="outro">Outro</option>
        </select>
      </div>

      <div>
        <label htmlFor="descricao" className={labelClass}>
          Descrição
        </label>
        <textarea
          id="descricao"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={3}
          className={inputClass}
          placeholder="Descrição opcional..."
        />
      </div>

      <div>
        <label htmlFor="comprovante" className={labelClass}>
          Foto do Comprovante/Nota Fiscal
        </label>
        <div className="mt-1 flex items-center">
          <label className="flex items-center px-4 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-300 cursor-pointer hover:border-brand hover:text-brand transition-colors">
            <Upload className="w-4 h-4 mr-2" />
            Escolher arquivo
            <input
              id="comprovante"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          {comprovanteFile && (
            <span className="ml-3 text-sm text-gray-400">{comprovanteFile.name}</span>
          )}
        </div>
        {comprovantePreview && (
          <img
            src={comprovantePreview}
            alt="Preview"
            className="mt-3 max-w-xs rounded-lg border border-dark-100"
          />
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-dark-100">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center justify-center px-4 py-2.5 border border-dark-100 rounded-lg text-gray-400 hover:border-gray-500 hover:text-gray-300 transition-colors min-h-touch"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center px-6 py-2.5 bg-brand text-dark-800 font-semibold rounded-lg hover:bg-brand-light disabled:opacity-50 transition-colors min-h-touch"
        >
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Salvando...' : conta ? 'Atualizar' : 'Criar'}
        </button>
      </div>
    </form>
  )
}
