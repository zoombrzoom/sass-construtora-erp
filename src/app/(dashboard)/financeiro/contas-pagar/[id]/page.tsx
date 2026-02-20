'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ContaPagar, ContaPagarFormaPagamento, ContaPagarTipo } from '@/types/financeiro'
import {
  getContaPagar,
  getContasPagarPorGrupo,
  updateContaPagar,
  deleteContasPagarByIds,
} from '@/lib/db/contasPagar'
import { getObra } from '@/lib/db/obras'
import { Obra } from '@/types/obra'
import { format } from 'date-fns'
import Link from 'next/link'
import { toDate, formatIsoToBr, parseBrToIso } from '@/utils/date'
import { useAuth } from '@/hooks/useAuth'
import { getPermissions } from '@/lib/permissions/check'
import {
  ArrowLeft,
  Edit2,
  ExternalLink,
  Copy,
  Eye,
  Pencil,
  Trash2,
  X,
  Loader2,
} from 'lucide-react'

const TIPOS: { value: ContaPagarTipo; label: string }[] = [
  { value: 'boleto', label: 'Boleto' },
  { value: 'folha', label: 'Folha' },
  { value: 'empreiteiro', label: 'Empreiteiro' },
  { value: 'escritorio', label: 'Escritório' },
  { value: 'particular', label: 'Particular' },
  { value: 'outro', label: 'Outro' },
]

const FORMAS_PAGAMENTO: { value: ContaPagarFormaPagamento; label: string }[] = [
  { value: 'boleto', label: 'Boleto' },
  { value: 'pix', label: 'PIX' },
  { value: 'ted', label: 'TED' },
  { value: 'doc', label: 'DOC' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'deposito', label: 'Depósito' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'outro', label: 'Outro' },
]

function toInputDate(value: Date): string {
  return value.toISOString().split('T')[0]
}

export default function ContaPagarDetalhesPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const permissions = getPermissions(user)
  const [conta, setConta] = useState<ContaPagar | null>(null)
  const [parcelas, setParcelas] = useState<ContaPagar[]>([])
  const [obra, setObra] = useState<Obra | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalLote, setModalLote] = useState<'editar' | 'deletar' | null>(null)
  const [loteSelecionados, setLoteSelecionados] = useState<Set<string>>(new Set())
  const [loteValor, setLoteValor] = useState<string>('')
  const [loteDataVencimento, setLoteDataVencimento] = useState<string>('')
  const [loteTipo, setLoteTipo] = useState<ContaPagarTipo | ''>('')
  const [loteDescricao, setLoteDescricao] = useState<string>('')
  const [loteFormaPagamento, setLoteFormaPagamento] = useState<ContaPagarFormaPagamento | ''>('')
  const [loteContaPagamento, setLoteContaPagamento] = useState<string>('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (params.id) {
      loadConta(params.id as string)
    }
  }, [params.id])

  // Deduplica para exibição na lista: uma linha por parcelaAtual (evita duplicatas visuais)
  const parcelasExibicao = useMemo(() => {
    const ord = [...parcelas].sort(
      (a, b) => (a.parcelaAtual || 1) - (b.parcelaAtual || 1) || a.id.localeCompare(b.id)
    )
    return ord.reduce<ContaPagar[]>((acc, p) => {
      const n = p.parcelaAtual || 1
      if (!acc.some((x) => (x.parcelaAtual || 1) === n)) acc.push(p)
      return acc
    }, [])
  }, [parcelas])

  const loadConta = async (id: string) => {
    try {
      const data = await getContaPagar(id)
      if (data) {
        setConta(data)
        const obraData = await getObra(data.obraId)
        setObra(obraData)
        if (data.grupoParcelamentoId) {
          const grupo = await getContasPagarPorGrupo(data.grupoParcelamentoId)
          setParcelas(grupo.sort((a, b) => (a.parcelaAtual || 1) - (b.parcelaAtual || 1) || a.id.localeCompare(b.id)))
        } else {
          setParcelas([])
        }
      }
    } catch (error) {
      console.error('Erro ao carregar conta:', error)
    } finally {
      setLoading(false)
    }
  }

  const abrirModalEditar = () => {
    setLoteSelecionados(new Set(parcelas.map((p) => p.id)))
    setLoteValor('')
    setLoteDataVencimento('')
    setLoteTipo('')
    setLoteDescricao('')
    setLoteFormaPagamento('')
    setLoteContaPagamento('')
    setModalLote('editar')
  }

  const abrirModalDeletar = () => {
    setLoteSelecionados(new Set())
    setModalLote('deletar')
  }

  const toggleLoteSelecionado = (id: string) => {
    setLoteSelecionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selecionarTodosLote = (checked: boolean) => {
    if (checked) setLoteSelecionados(new Set(parcelas.map((p) => p.id)))
    else setLoteSelecionados(new Set())
  }

  const handleEditarLote = async () => {
    if (loteSelecionados.size === 0) return
    const ids = Array.from(loteSelecionados)
    setSalvando(true)
    try {
      const update: Partial<ContaPagar> = {}
      if (loteValor.trim()) {
        const v = parseFloat(loteValor.replace(/,/g, '.').replace(/\s/g, ''))
        if (!Number.isNaN(v)) update.valor = v
      }
      const isoData = parseBrToIso(loteDataVencimento)
      if (isoData) update.dataVencimento = new Date(isoData + 'T12:00:00')
      if (loteTipo) update.tipo = loteTipo
      if (loteDescricao.trim()) update.descricao = loteDescricao.trim()
      if (loteFormaPagamento) update.formaPagamento = loteFormaPagamento
      if (loteContaPagamento.trim()) update.contaPagamento = loteContaPagamento.trim()
      if (Object.keys(update).length === 0) {
        setModalLote(null)
        return
      }
      await Promise.all(ids.map((id) => updateContaPagar(id, update)))
      setModalLote(null)
      await loadConta(params.id as string)
    } catch (error) {
      console.error('Erro ao editar em lote:', error)
      alert('Não foi possível atualizar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const handleDeletarLote = async () => {
    if (loteSelecionados.size === 0) {
      alert('Selecione pelo menos uma parcela para excluir.')
      return
    }
    if (!confirm(`Excluir ${loteSelecionados.size} parcela(s)? Esta ação não pode ser desfeita.`)) return
    setSalvando(true)
    try {
      await deleteContasPagarByIds(Array.from(loteSelecionados))
      setModalLote(null)
      const restantes = parcelas.filter((p) => !loteSelecionados.has(p.id))
      if (restantes.length > 0) {
        router.push(`/financeiro/contas-pagar/${restantes[0].id}`)
      } else {
        router.push('/financeiro/contas-pagar')
      }
    } catch (error) {
      console.error('Erro ao deletar em lote:', error)
      alert('Não foi possível excluir. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const getParcelaTexto = (target: ContaPagar) => {
    const total = Math.max(1, target.totalParcelas || 1)
    const atual = Math.min(Math.max(1, target.parcelaAtual || 1), total)
    return `${atual}/${total}`
  }

  const formatMonthLabel = (value: string) => {
    if (!value || !value.includes('-')) return value
    const [year, month] = value.split('-')
    return `${month}/${year}`
  }

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      alert('Copiado!')
    } catch {
      alert('Não foi possível copiar')
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Carregando...</div>
  }

  if (!conta) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Conta não encontrada</p>
        <Link href="/financeiro/contas-pagar" className="text-brand hover:text-brand-light">
          Voltar para Contas a Pagar
        </Link>
      </div>
    )
  }

  if (conta.tipo === 'particular' && !permissions.canAccessContasParticulares) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Você não tem acesso a contas particulares.</p>
        <Link href="/financeiro/contas-pagar" className="text-brand hover:text-brand-light">
          Voltar para Contas a Pagar
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-brand">Detalhes da Conta a Pagar</h1>
        <Link
          href="/financeiro/contas-pagar"
          className="flex items-center px-4 py-2 border border-dark-100 rounded-lg text-gray-400 hover:border-brand hover:text-brand transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Link>
      </div>

      <div className="bg-dark-500 border border-dark-100 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-dark-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-100">
                Conta #{conta.id.slice(0, 8)} {(conta.totalParcelas || 1) > 1 ? `| Parcela ${getParcelaTexto(conta)}` : ''}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Criada em {format(toDate(conta.createdAt), 'dd/MM/yyyy HH:mm')}
              </p>
            </div>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${
              conta.status === 'pago' ? 'bg-success/20 text-success' :
              conta.status === 'vencido' ? 'bg-error/20 text-error' :
              'bg-warning/20 text-warning'
            }`}>
              {conta.status}
            </span>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Valor</h3>
              <p className="text-2xl font-bold text-brand">{formatCurrency(conta.valor)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Tipo</h3>
              <p className="text-sm text-gray-100 capitalize">{conta.tipo}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Parcela</h3>
              <p className="text-sm text-gray-100">
                {getParcelaTexto(conta)}
                {conta.recorrenciaMensal ? ' | Recorrência mensal' : ''}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Data de Vencimento</h3>
              <p className="text-sm text-gray-100">{format(toDate(conta.dataVencimento), 'dd/MM/yyyy')}</p>
            </div>
            {conta.dataPagamento && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Data de Pagamento</h3>
                <p className="text-sm text-gray-100">{format(toDate(conta.dataPagamento), 'dd/MM/yyyy')}</p>
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Obra (Centro de Custo)</h3>
              <p className="text-sm text-gray-100">{obra ? obra.nome : conta.obraId}</p>
              {obra && <p className="text-xs text-gray-500 mt-1">{obra.endereco}</p>}
            </div>
            {conta.descricao && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Descrição</h3>
                <p className="text-sm text-gray-100 whitespace-pre-wrap">{conta.descricao}</p>
              </div>
            )}
            {parcelas.length > 1 && (
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Todas as Parcelas</h3>
                {parcelas.length > parcelasExibicao.length && (
                  <p className="text-xs text-warning mb-2">
                    Existem {parcelas.length - parcelasExibicao.length} parcela(s) duplicada(s). Use &quot;Deletar em lote&quot; para remover.
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mb-2">
                  <button
                    type="button"
                    onClick={abrirModalEditar}
                    className="inline-flex items-center px-3 py-1.5 text-sm border border-brand text-brand rounded-lg hover:bg-brand/10 transition-colors"
                  >
                    <Pencil className="w-4 h-4 mr-1.5" />
                    Editar em lote
                  </button>
                  <button
                    type="button"
                    onClick={abrirModalDeletar}
                    className="inline-flex items-center px-3 py-1.5 text-sm border border-error/60 text-error rounded-lg hover:bg-error/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Deletar em lote
                  </button>
                </div>
                <ul className="space-y-2">
                  {parcelasExibicao.map((p) => (
                    <li
                      key={p.id}
                      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border p-3 transition-colors ${
                        p.id === conta.id
                          ? 'border-brand bg-brand/5'
                          : 'border-dark-100 bg-dark-400 hover:border-dark-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          p.status === 'pago' ? 'bg-success/20 text-success' :
                          p.status === 'vencido' ? 'bg-error/20 text-error' :
                          'bg-warning/20 text-warning'
                        }`}>
                          {p.status}
                        </span>
                        <span className="text-sm font-medium text-gray-100">
                          Parcela {getParcelaTexto(p)} | {formatCurrency(p.valor)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 sm:order-first sm:ml-0">
                        Venc: {format(toDate(p.dataVencimento), 'dd/MM/yyyy')}
                        {p.dataPagamento && ` | Pago: ${format(toDate(p.dataPagamento), 'dd/MM/yyyy')}`}
                      </p>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/financeiro/contas-pagar/${p.id}`}
                          className="inline-flex items-center text-sm text-brand hover:text-brand-light transition-colors"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver
                        </Link>
                        <Link
                          href={`/financeiro/contas-pagar/${p.id}/editar`}
                          className="inline-flex items-center text-sm text-gray-400 hover:text-brand transition-colors"
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Editar
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {conta.rateio && conta.rateio.length > 0 && (
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Rateio</h3>
                <div className="space-y-2">
                  {conta.rateio.map((rateio, index) => (
                    <div key={index} className="text-sm text-gray-100">
                      {rateio.percentual}% - Obra ID: {rateio.obraId}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(conta.favorecido || conta.contaPagamento || conta.formaPagamento || conta.banco || conta.agencia || conta.conta || conta.chavePix) && (
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Dados de Pagamento</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="bg-dark-400 border border-dark-100 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Contato</p>
                    <p className="text-sm text-gray-100">{conta.favorecido || '-'}</p>
                  </div>
                  <div className="bg-dark-400 border border-dark-100 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Conta</p>
                    <p className="text-sm text-gray-100">{conta.contaPagamento || '-'}</p>
                  </div>
                  <div className="bg-dark-400 border border-dark-100 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Forma</p>
                    <p className="text-sm text-gray-100">{conta.formaPagamento || '-'}</p>
                  </div>
                  <div className="bg-dark-400 border border-dark-100 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Banco</p>
                    <p className="text-sm text-gray-100">{conta.banco || '-'}</p>
                  </div>
                  <div className="bg-dark-400 border border-dark-100 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Agência</p>
                    <p className="text-sm text-gray-100">{conta.agencia || '-'}</p>
                  </div>
                  <div className="bg-dark-400 border border-dark-100 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Conta do favorecido</p>
                    <p className="text-sm text-gray-100">{conta.conta || '-'}</p>
                  </div>
                  <div className="bg-dark-400 border border-dark-100 rounded-lg p-3 sm:col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Chave PIX</p>
                    <p className="text-sm text-gray-100 break-all">{conta.chavePix || '-'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {(conta.linhaDigitavel || conta.codigoBarras || conta.boletoUrl) && (
            <div className="mt-6 pt-6 border-t border-dark-100">
              <h3 className="text-sm font-medium text-gray-400 mb-4">Boleto e Códigos</h3>
              <div className="space-y-3">
                {conta.boletoUrl && (
                  <a
                    href={conta.boletoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-brand hover:text-brand-light text-sm"
                  >
                    <ExternalLink className="w-4 h-4 mr-1.5" />
                    Abrir boleto
                  </a>
                )}

                {conta.linhaDigitavel && (
                  <div className="bg-dark-400 border border-dark-100 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Linha Digitável</p>
                    <p className="text-sm text-gray-100 break-all">{conta.linhaDigitavel}</p>
                    <button
                      onClick={() => handleCopy(conta.linhaDigitavel!)}
                      className="mt-2 inline-flex items-center text-xs text-brand hover:text-brand-light"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      Copiar linha
                    </button>
                  </div>
                )}

                {conta.codigoBarras && (
                  <div className="bg-dark-400 border border-dark-100 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Código de Barras</p>
                    <p className="text-sm text-gray-100 break-all">{conta.codigoBarras}</p>
                    <button
                      onClick={() => handleCopy(conta.codigoBarras!)}
                      className="mt-2 inline-flex items-center text-xs text-brand hover:text-brand-light"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      Copiar código
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {conta.comprovanteUrl && (
            <div className="mt-6 pt-6 border-t border-dark-100">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Comprovante</h3>
              <a
                href={conta.comprovanteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-brand hover:text-brand-light text-sm"
              >
                <ExternalLink className="w-4 h-4 mr-1.5" />
                Abrir comprovante
              </a>
            </div>
          )}

          {conta.comprovantesMensais && conta.comprovantesMensais.length > 0 && (
            <div className="mt-6 pt-6 border-t border-dark-100">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Comprovantes mensais</h3>
              <div className="space-y-2">
                {conta.comprovantesMensais.map((item, index) => (
                  <div key={`${item.mesReferencia}-${item.parcela}-${index}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-dark-100 bg-dark-400 p-3">
                    <p className="text-sm text-gray-100">
                      Parcela {item.parcela}/{Math.max(1, conta.totalParcelas || 1)} | Mês {formatMonthLabel(item.mesReferencia)}
                    </p>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-brand hover:text-brand-light"
                    >
                      <ExternalLink className="w-4 h-4 mr-1.5" />
                      Abrir comprovante
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-dark-100">
            <div className="flex flex-wrap justify-end gap-3">
              <Link href="/financeiro/contas-pagar" className="px-4 py-2 border border-dark-100 rounded-lg text-gray-400 hover:border-brand hover:text-brand transition-colors">
                Voltar
              </Link>
              <Link href={`/financeiro/contas-pagar/${conta.id}/editar`} className="flex items-center px-4 py-2 bg-brand text-dark-800 font-medium rounded-lg">
                <Edit2 className="w-4 h-4 mr-2" />
                Editar
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Editar em Lote */}
      {modalLote === 'editar' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-dark-500 border border-dark-100 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-dark-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-brand">Editar em lote</h3>
              <button
                type="button"
                onClick={() => setModalLote(null)}
                className="p-1.5 rounded-lg border border-dark-100 text-gray-300 hover:text-brand hover:border-brand transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <p className="text-sm text-gray-400">
                Selecione as parcelas e preencha apenas os campos que deseja alterar em todas.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Parcelas selecionadas</label>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => selecionarTodosLote(true)}
                    className="text-xs text-brand hover:text-brand-light"
                  >
                    Todas
                  </button>
                  <button
                    type="button"
                    onClick={() => selecionarTodosLote(false)}
                    className="text-xs text-gray-400 hover:text-gray-300"
                  >
                    Nenhuma
                  </button>
                </div>
                <ul className="space-y-1.5 max-h-32 overflow-y-auto">
                  {parcelas.map((p) => (
                    <li key={p.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={loteSelecionados.has(p.id)}
                        onChange={() => toggleLoteSelecionado(p.id)}
                        className="rounded border-dark-200 text-brand focus:ring-brand"
                      />
                      <span className="text-sm text-gray-100">
                        Parcela {getParcelaTexto(p)} | {formatCurrency(p.valor)} | {format(toDate(p.dataVencimento), 'dd/MM/yyyy')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Novo valor (opcional)</label>
                <input
                  type="text"
                  value={loteValor}
                  onChange={(e) => setLoteValor(e.target.value)}
                  placeholder="Ex: 563,59"
                  className="w-full px-3 py-2 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 placeholder-gray-500 focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Nova data de vencimento (opcional)</label>
                <input
                  type="text"
                  value={loteDataVencimento}
                  onChange={(e) => setLoteDataVencimento(e.target.value)}
                  placeholder="DD/MM/AAAA"
                  maxLength={10}
                  className="w-full px-3 py-2 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 placeholder-gray-500 focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Novo tipo (opcional)</label>
                <select
                  value={loteTipo}
                  onChange={(e) => setLoteTipo(e.target.value as ContaPagarTipo | '')}
                  className="w-full px-3 py-2 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:border-brand focus:ring-1 focus:ring-brand"
                >
                  <option value="">— Manter —</option>
                  {TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Nova descrição (opcional)</label>
                <input
                  type="text"
                  value={loteDescricao}
                  onChange={(e) => setLoteDescricao(e.target.value)}
                  placeholder="Deixe vazio para manter"
                  className="w-full px-3 py-2 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 placeholder-gray-500 focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Nova forma de pagamento (opcional)</label>
                <select
                  value={loteFormaPagamento}
                  onChange={(e) => setLoteFormaPagamento(e.target.value as ContaPagarFormaPagamento | '')}
                  className="w-full px-3 py-2 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:border-brand focus:ring-1 focus:ring-brand"
                >
                  <option value="">— Manter —</option>
                  {FORMAS_PAGAMENTO.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Nova conta de pagamento (opcional)</label>
                <input
                  type="text"
                  value={loteContaPagamento}
                  onChange={(e) => setLoteContaPagamento(e.target.value)}
                  placeholder="Ex: Roberts Santander"
                  className="w-full px-3 py-2 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 placeholder-gray-500 focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-dark-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalLote(null)}
                className="px-4 py-2 border border-dark-100 rounded-lg text-gray-400 hover:border-brand hover:text-brand transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEditarLote}
                disabled={salvando || loteSelecionados.size === 0}
                className="flex items-center px-4 py-2 bg-brand text-dark-800 font-medium rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {salvando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Pencil className="w-4 h-4 mr-2" />}
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Deletar em Lote */}
      {modalLote === 'deletar' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-dark-500 border border-dark-100 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-dark-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-error">Deletar em lote</h3>
              <button
                type="button"
                onClick={() => setModalLote(null)}
                className="p-1.5 rounded-lg border border-dark-100 text-gray-300 hover:text-brand hover:border-brand transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-400">
                Selecione as parcelas que deseja excluir. Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => selecionarTodosLote(true)}
                  className="text-xs text-brand hover:text-brand-light"
                >
                  Selecionar todas
                </button>
                <button
                  type="button"
                  onClick={() => selecionarTodosLote(false)}
                  className="text-xs text-gray-400 hover:text-gray-300"
                >
                  Desmarcar todas
                </button>
              </div>
              <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                {parcelas.map((p) => (
                  <li key={p.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={loteSelecionados.has(p.id)}
                      onChange={() => toggleLoteSelecionado(p.id)}
                      className="rounded border-dark-200 text-error focus:ring-error"
                    />
                    <span className="text-sm text-gray-100">
                      Parcela {getParcelaTexto(p)} | {formatCurrency(p.valor)} | {format(toDate(p.dataVencimento), 'dd/MM/yyyy')}
                      {p.status === 'pago' && <span className="text-success ml-1">(pago)</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="px-4 py-3 border-t border-dark-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalLote(null)}
                className="px-4 py-2 border border-dark-100 rounded-lg text-gray-400 hover:border-brand hover:text-brand transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeletarLote}
                disabled={salvando || loteSelecionados.size === 0}
                className="flex items-center px-4 py-2 bg-error text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {salvando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Excluir {loteSelecionados.size > 0 ? `(${loteSelecionados.size})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
