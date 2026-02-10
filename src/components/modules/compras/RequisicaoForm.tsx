'use client'

import { useState, useEffect } from 'react'
import { Requisicao, RequisicaoAnexo, RequisicaoItem } from '@/types/compras'
import { createRequisicao, updateRequisicao } from '@/lib/db/requisicoes'
import { getObras } from '@/lib/db/obras'
import { uploadImage } from '@/lib/storage/upload'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Obra } from '@/types/obra'
import { toDate } from '@/utils/date'
import { formatCurrencyInput, parseCurrencyInput, sanitizeCurrencyInput } from '@/utils/currency'
import { AlertCircle, Save, ArrowLeft, Plus, Trash2, Upload, Download } from 'lucide-react'

interface RequisicaoFormProps {
  requisicao?: Requisicao
  onSuccess?: () => void
}

interface RequisicaoFormItem extends RequisicaoItem {
  valorUnitarioInput?: string
}

function createEmptyItem(): RequisicaoFormItem {
  return { descricao: '', quantidade: 0, valorUnitario: undefined, valorUnitarioInput: '', info: '' }
}

export function RequisicaoForm({ requisicao, onSuccess }: RequisicaoFormProps) {
  const [obraId, setObraId] = useState(requisicao?.obraId || '')
  const [itens, setItens] = useState<RequisicaoFormItem[]>(
    requisicao?.itens
      ? requisicao.itens.map((item) => ({
        ...item,
        valorUnitarioInput:
          item.valorUnitario !== undefined && item.valorUnitario !== null
            ? formatCurrencyInput(item.valorUnitario)
            : '',
      }))
      : [createEmptyItem()]
  )
  const [observacoes, setObservacoes] = useState(requisicao?.observacoes || '')
  const [dataEntrega, setDataEntrega] = useState(
    requisicao?.dataEntrega
      ? toDate(requisicao.dataEntrega).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  )
  const [notaFile, setNotaFile] = useState<File | null>(null)
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null)
  const [notaFiscal, setNotaFiscal] = useState<RequisicaoAnexo | null>(requisicao?.notaFiscal || null)
  const [comprovantePagamento, setComprovantePagamento] = useState<RequisicaoAnexo | null>(
    requisicao?.comprovantePagamento || null
  )
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
      const data = await getObras({ status: 'ativa' })
      setObras(data)
    } catch (error) {
      console.error('Erro ao carregar obras:', error)
    }
  }

  const addItem = () => {
    setItens([...itens, createEmptyItem()])
  }

  const removeItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index))
  }

  const updateItem = (
    index: number,
    field: keyof RequisicaoFormItem,
    value: string | number | undefined
  ) => {
    const updated = [...itens]
    updated[index] = { ...updated[index], [field]: value }
    setItens(updated)
  }

  const parseDateInput = (value: string): Date => {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day, 12, 0, 0)
  }

  const uploadAnexo = async (file: File, pasta: string): Promise<RequisicaoAnexo> => {
    if (!user) throw new Error('Usuário não autenticado')

    const fileName = file.name.replace(/\s+/g, '_')
    const path = `${pasta}/${user.id}_${Date.now()}_${fileName}`
    const url = await uploadImage(file, path, false)

    return {
      nome: file.name,
      url,
    }
  }

  const handleNotaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setNotaFile(file)
    }
  }

  const handleComprovanteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setComprovanteFile(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!obraId) {
      setError('Selecione uma obra')
      return
    }

    if (itens.length === 0 || itens.some(item => !item.descricao || item.quantidade <= 0)) {
      setError('Adicione pelo menos um item válido')
      return
    }

    setLoading(true)

    try {
      if (!user) throw new Error('Usuário não autenticado')
      let notaFiscalData = notaFiscal || undefined
      let comprovantePagamentoData = comprovantePagamento || undefined

      if (notaFile) {
        notaFiscalData = await uploadAnexo(notaFile, 'requisicoes/notas')
        setNotaFiscal(notaFiscalData)
      }

      if (comprovanteFile) {
        comprovantePagamentoData = await uploadAnexo(comprovanteFile, 'requisicoes/comprovantes')
        setComprovantePagamento(comprovantePagamentoData)
      }

      const itensValidados = itens
        .filter((item) => item.descricao && item.quantidade > 0)
        .map(({ valorUnitarioInput: _, ...item }) => item)

      const data: any = {
        obraId,
        solicitadoPor: user.id,
        itens: itensValidados,
        status: requisicao?.status || 'pendente',
      }

      if (observacoes && observacoes.trim()) {
        data.observacoes = observacoes.trim()
      }
      if (dataEntrega) {
        data.dataEntrega = parseDateInput(dataEntrega)
      }
      if (notaFiscalData) {
        data.notaFiscal = notaFiscalData
      }
      if (comprovantePagamentoData) {
        data.comprovantePagamento = comprovantePagamentoData
      }

      if (requisicao) {
        await updateRequisicao(requisicao.id, data)
      } else {
        await createRequisicao(data)
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/compras/requisicoes')
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar requisição')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all min-h-touch"
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
          Obra *
        </label>
        <select
          id="obraId"
          required
          value={obraId}
          onChange={(e) => setObraId(e.target.value)}
          className={`${inputClass} min-h-touch`}
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
        <label className={labelClass}>Itens *</label>
        <div className="space-y-3">
          {itens.map((item, index) => (
            <div key={index} className="border border-dark-100 rounded-lg p-3 bg-dark-400">
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 sm:col-span-4">
                  <label className="block text-xs font-medium text-gray-400 mb-1">Descrição</label>
                  <input
                    type="text"
                    placeholder="Ex: Parafuso"
                    value={item.descricao}
                    onChange={(e) => updateItem(index, 'descricao', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="col-span-6 sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-400 mb-1">Quantidade</label>
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    step="0.01"
                    value={item.quantidade}
                    onChange={(e) => updateItem(index, 'quantidade', parseFloat(e.target.value) || 0)}
                    className={inputClass}
                  />
                </div>
                <div className="col-span-6 sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-400 mb-1">Valor Unitário</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={item.valorUnitarioInput || ''}
                    onChange={(e) => {
                      const input = sanitizeCurrencyInput(e.target.value)
                      updateItem(index, 'valorUnitarioInput', input)
                      updateItem(index, 'valorUnitario', input ? parseCurrencyInput(input) : undefined)
                    }}
                    onBlur={() => {
                      if (!item.valorUnitarioInput) return
                      updateItem(index, 'valorUnitarioInput', formatCurrencyInput(item.valorUnitarioInput))
                    }}
                    className={inputClass}
                  />
                </div>
                <div className="col-span-6 sm:col-span-3">
                  <label className="block text-xs font-medium text-gray-400 mb-1">Info</label>
                  <input
                    type="text"
                    placeholder="Peso, tamanho..."
                    value={item.info || item.unidade || ''}
                    onChange={(e) => updateItem(index, 'info', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="col-span-12 sm:col-span-1 flex items-end">
                  {itens.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="w-full p-2 text-error hover:bg-error/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5 mx-auto" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addItem}
          className="mt-3 flex items-center px-4 py-2 text-sm text-brand hover:bg-brand/10 border border-brand/50 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Item
        </button>
      </div>

      <div className="border border-dark-100 rounded-xl bg-dark-400/40 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-brand">Controle da Planilha</h3>
          <p className="text-xs text-gray-500">DATA ENTREGA | NOTA | PAGO MAJOLLO</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="dataEntrega" className={labelClass}>
              Data de Entrega
            </label>
            <input
              id="dataEntrega"
              type="date"
              value={dataEntrega}
              onChange={(e) => setDataEntrega(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="notaFiscalFile" className={labelClass}>
              Nota Fiscal
            </label>
            <label className="flex items-center justify-center px-3 py-2.5 border border-dashed border-dark-100 rounded-lg bg-dark-500 text-gray-300 hover:border-brand hover:text-brand transition-colors cursor-pointer min-h-touch">
              <Upload className="w-4 h-4 mr-2" />
              {notaFile ? 'Trocar Nota' : notaFiscal ? 'Substituir Nota' : 'Anexar Nota'}
              <input
                id="notaFiscalFile"
                type="file"
                accept=".pdf,image/*"
                onChange={handleNotaChange}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-500 mt-2 truncate">
              {notaFile?.name || notaFiscal?.nome || 'Nenhuma nota anexada'}
            </p>
            {notaFiscal?.url && (
              <a
                href={notaFiscal.url}
                target="_blank"
                rel="noopener noreferrer"
                download={notaFiscal.nome}
                className="mt-2 inline-flex items-center text-xs text-brand hover:text-brand-light"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Baixar nota atual
              </a>
            )}
          </div>

          <div>
            <label htmlFor="comprovantePagamentoFile" className={labelClass}>
              Comprovante de Pagamento
            </label>
            <label className="flex items-center justify-center px-3 py-2.5 border border-dashed border-dark-100 rounded-lg bg-dark-500 text-gray-300 hover:border-brand hover:text-brand transition-colors cursor-pointer min-h-touch">
              <Upload className="w-4 h-4 mr-2" />
              {comprovanteFile ? 'Trocar Comprovante' : comprovantePagamento ? 'Substituir Comprovante' : 'Anexar Comprovante'}
              <input
                id="comprovantePagamentoFile"
                type="file"
                accept=".pdf,image/*"
                onChange={handleComprovanteChange}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-500 mt-2 truncate">
              {comprovanteFile?.name || comprovantePagamento?.nome || 'Nenhum comprovante anexado'}
            </p>
            {comprovantePagamento?.url && (
              <a
                href={comprovantePagamento.url}
                target="_blank"
                rel="noopener noreferrer"
                download={comprovantePagamento.nome}
                className="mt-2 inline-flex items-center text-xs text-brand hover:text-brand-light"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Baixar comprovante atual
              </a>
            )}
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="observacoes" className={labelClass}>Observações</label>
        <textarea
          id="observacoes"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          rows={3}
          className={inputClass}
          placeholder="Observações opcionais..."
        />
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
          {loading ? 'Salvando...' : requisicao ? 'Atualizar' : 'Criar'}
        </button>
      </div>
    </form>
  )
}
