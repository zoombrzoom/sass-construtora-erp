'use client'

import { useEffect, useState } from 'react'
import {
    Empreiteiro,
    EmpreiteiroFormaPagamento,
    EmpreiteiroStatus,
} from '@/types/financeiro'
import { createEmpreiteiro, updateEmpreiteiro } from '@/lib/db/empreiteiros'
import { getObras } from '@/lib/db/obras'
import { uploadImage } from '@/lib/storage/upload'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { toDate } from '@/utils/date'
import { formatCurrencyInput, parseCurrencyInput, sanitizeCurrencyInput } from '@/utils/currency'
import { AlertCircle, ArrowLeft, Save, Upload, ExternalLink } from 'lucide-react'

interface EmpreiteiroFormProps {
    empreiteiro?: Empreiteiro
    onSuccess?: () => void
}

const FORMAS_PAGAMENTO: { value: EmpreiteiroFormaPagamento; label: string }[] = [
    { value: 'pix', label: 'PIX' },
    { value: 'deposito', label: 'Depósito' },
    { value: 'transferencia', label: 'Transferência' },
    { value: 'ted', label: 'TED' },
    { value: 'doc', label: 'DOC' },
    { value: 'dinheiro', label: 'Dinheiro' },
    { value: 'outro', label: 'Outro' },
]

const STATUS_OPTIONS: { value: EmpreiteiroStatus; label: string }[] = [
    { value: 'aberto', label: 'Em aberto' },
    { value: 'parcial', label: 'Pago parcial' },
    { value: 'pago', label: 'Pago' },
]

function formatCpf(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function toInputDate(value: Date): string {
    return value.toISOString().split('T')[0]
}

function parseDateInput(value: string): Date {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day, 12, 0, 0)
}

export function EmpreiteiroForm({ empreiteiro, onSuccess }: EmpreiteiroFormProps) {
    const [empreiteiroNome, setEmpreiteiroNome] = useState(empreiteiro?.empreiteiroNome || '')
    const [cpf, setCpf] = useState(formatCpf(empreiteiro?.cpf || ''))
    const [agencia, setAgencia] = useState(empreiteiro?.agencia || '')
    const [conta, setConta] = useState(empreiteiro?.conta || '')

    // Medição
    const [obras, setObras] = useState<Array<{ id: string; nome: string }>>([])
    const [obraId, setObraId] = useState(empreiteiro?.obraId || '')
    const [servico, setServico] = useState(empreiteiro?.servico || '')
    const [medicaoNumero, setMedicaoNumero] = useState<number>(empreiteiro?.medicaoNumero || 1)
    const [percentualExecutado, setPercentualExecutado] = useState<number>(empreiteiro?.percentualExecutado || 0)
    const [valorContrato, setValorContrato] = useState(
        empreiteiro?.valorContrato !== undefined ? formatCurrencyInput(empreiteiro.valorContrato) : ''
    )
    const [valorMedicao, setValorMedicao] = useState(
        empreiteiro?.valorMedicao !== undefined ? formatCurrencyInput(empreiteiro.valorMedicao) : ''
    )

    // Pagamento
    const [valor, setValor] = useState(empreiteiro?.valor !== undefined ? formatCurrencyInput(empreiteiro.valor) : '')
    const [valorPago, setValorPago] = useState(empreiteiro?.valorPago !== undefined ? formatCurrencyInput(empreiteiro.valorPago) : '0,00')
    const [status, setStatus] = useState<EmpreiteiroStatus>(empreiteiro?.status || 'aberto')
    const [formaPagamento, setFormaPagamento] = useState<EmpreiteiroFormaPagamento | ''>(empreiteiro?.formaPagamento || '')
    const [dataReferencia, setDataReferencia] = useState(
        empreiteiro?.dataReferencia ? toInputDate(toDate(empreiteiro.dataReferencia)) : toInputDate(new Date())
    )
    const [dataPagamento, setDataPagamento] = useState(
        empreiteiro?.dataPagamento ? toInputDate(toDate(empreiteiro.dataPagamento)) : ''
    )
    const [comprovanteFile, setComprovanteFile] = useState<File | null>(null)
    const [comprovanteUrl, setComprovanteUrl] = useState(empreiteiro?.comprovanteUrl || '')
    const [observacoes, setObservacoes] = useState(empreiteiro?.observacoes || '')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const { user } = useAuth()
    const router = useRouter()

    useEffect(() => {
        ; (async () => {
            try {
                const data = await getObras()
                setObras(data.map((o) => ({ id: o.id, nome: o.nome })))
            } catch (err) {
                console.error('Erro ao carregar obras:', err)
            }
        })()
    }, [])

    // Calcular medição automaticamente quando contrato ou percentual muda
    useEffect(() => {
        const contratoNum = parseCurrencyInput(valorContrato) || 0
        if (contratoNum > 0 && percentualExecutado > 0) {
            const medicaoCalc = contratoNum * (percentualExecutado / 100)
            setValorMedicao(formatCurrencyInput(medicaoCalc))
            setValor(formatCurrencyInput(medicaoCalc))
        }
    }, [valorContrato, percentualExecutado])

    const inputClass = 'mt-1 block w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all min-h-touch'
    const labelClass = 'block text-sm font-medium text-gray-300 mb-1'

    const valorNumber = parseCurrencyInput(valor) || 0
    const valorPagoNumber = parseCurrencyInput(valorPago) || 0
    const valorAberto = Math.max(valorNumber - valorPagoNumber, 0)

    const ensurePagamentoDefaults = () => {
        if (!formaPagamento) setFormaPagamento('pix')
        if (!dataPagamento) setDataPagamento(toInputDate(new Date()))
    }

    const handleStatusChange = (nextStatus: EmpreiteiroStatus) => {
        setStatus(nextStatus)

        if (nextStatus === 'aberto') {
            setValorPago('0,00')
            setFormaPagamento('')
            setDataPagamento('')
            return
        }

        if (nextStatus === 'pago' && valor) {
            setValorPago(formatCurrencyInput(valor))
            if (!dataPagamento) {
                setDataPagamento(toInputDate(new Date()))
            }
        }
    }

    const syncStatusFromValorPago = (nextValorPagoStr: string) => {
        const total = parseCurrencyInput(valor) || 0
        const pago = parseCurrencyInput(nextValorPagoStr) || 0

        if (!total || total <= 0) return

        if (pago <= 0) {
            if (status !== 'aberto') setStatus('aberto')
            return
        }

        ensurePagamentoDefaults()

        if (pago >= total) {
            if (status !== 'pago') setStatus('pago')
            setValorPago(formatCurrencyInput(valor))
            return
        }

        if (status !== 'parcial') setStatus('parcial')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        const cpfDigits = cpf.replace(/\D/g, '')
        const valorNum = parseCurrencyInput(valor)
        let valorPagoNum = parseCurrencyInput(valorPago) || 0
        const valorContratoNum = parseCurrencyInput(valorContrato) || 0
        const valorMedicaoNum = parseCurrencyInput(valorMedicao) || 0

        if (!empreiteiroNome.trim()) {
            setError('Informe o nome do empreiteiro')
            return
        }

        if (!obraId) {
            setError('Selecione a obra')
            return
        }

        if (!servico.trim()) {
            setError('Informe o serviço')
            return
        }

        if (medicaoNumero < 1) {
            setError('Nº da medição deve ser pelo menos 1')
            return
        }

        if (cpfDigits.length > 0 && cpfDigits.length !== 11) {
            setError('Se informar CPF, ele precisa ter 11 dígitos')
            return
        }

        if (!valor || Number.isNaN(valorNum) || valorNum <= 0) {
            setError('Informe um valor válido')
            return
        }

        if (!dataReferencia) {
            setError('Informe a data de referência')
            return
        }

        if (status === 'aberto') {
            valorPagoNum = 0
        }

        if (status === 'pago') {
            valorPagoNum = valorNum
        }

        if (status === 'parcial' && (valorPagoNum <= 0 || valorPagoNum >= valorNum)) {
            setError('Para status parcial, informe um valor pago maior que zero e menor que o valor total')
            return
        }

        if (status !== 'aberto' && !dataPagamento) {
            setError('Informe a data de pagamento')
            return
        }

        if (status !== 'aberto' && !formaPagamento) {
            setError('Selecione a forma de pagamento')
            return
        }

        setLoading(true)

        try {
            if (!user) throw new Error('Usuário não autenticado')
            let comprovante = comprovanteUrl

            if (comprovanteFile) {
                const path = `empreiteiros/comprovantes/${user.id}_${Date.now()}_${comprovanteFile.name}`
                comprovante = await uploadImage(comprovanteFile, path, false)
                setComprovanteUrl(comprovante)
            }

            const payload: any = {
                empreiteiroNome: empreiteiroNome.trim(),
                cpf: cpfDigits,
                agencia: agencia.trim(),
                conta: conta.trim(),
                obraId,
                servico: servico.trim(),
                medicaoNumero,
                percentualExecutado,
                valorContrato: valorContratoNum,
                valorMedicao: valorMedicaoNum,
                valor: valorNum,
                valorPago: valorPagoNum,
                status,
                dataReferencia: parseDateInput(dataReferencia),
                createdBy: user.id,
            }

            if (status !== 'aberto') {
                payload.formaPagamento = formaPagamento
                payload.dataPagamento = parseDateInput(dataPagamento)
            } else {
                payload.formaPagamento = null
                payload.dataPagamento = null
            }

            if (comprovante) {
                payload.comprovanteUrl = comprovante
            }

            if (observacoes.trim()) {
                payload.observacoes = observacoes.trim()
            }

            if (empreiteiro) {
                await updateEmpreiteiro(empreiteiro.id, payload)
            } else {
                await createEmpreiteiro(payload)
            }

            if (onSuccess) {
                onSuccess()
            } else {
                router.push('/financeiro/empreiteiros')
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar empreiteiro')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
                <div className="bg-error/20 border border-error/30 text-error px-4 py-3 rounded-lg flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Dados do Empreiteiro */}
            <div className="border border-dark-100 rounded-xl p-4 sm:p-5 bg-dark-400/40 space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-brand">Dados do Empreiteiro</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                        <label htmlFor="empreiteiroNome" className={labelClass}>Empreiteiro *</label>
                        <input
                            id="empreiteiroNome"
                            type="text"
                            required
                            value={empreiteiroNome}
                            onChange={(e) => setEmpreiteiroNome(e.target.value)}
                            className={inputClass}
                            placeholder="Nome do empreiteiro"
                        />
                    </div>

                    <div>
                        <label htmlFor="cpf" className={labelClass}>CPF</label>
                        <input
                            id="cpf"
                            type="text"
                            value={cpf}
                            onChange={(e) => setCpf(formatCpf(e.target.value))}
                            className={inputClass}
                            placeholder="000.000.000-00"
                        />
                    </div>

                    <div>
                        <label htmlFor="agencia" className={labelClass}>Agência</label>
                        <input
                            id="agencia"
                            type="text"
                            value={agencia}
                            onChange={(e) => setAgencia(e.target.value)}
                            className={inputClass}
                            placeholder="Ex: 1234"
                        />
                    </div>

                    <div>
                        <label htmlFor="conta" className={labelClass}>Conta</label>
                        <input
                            id="conta"
                            type="text"
                            value={conta}
                            onChange={(e) => setConta(e.target.value)}
                            className={inputClass}
                            placeholder="Ex: 12345-6"
                        />
                    </div>
                </div>
            </div>

            {/* Dados da Medição */}
            <div className="border border-dark-100 rounded-xl p-4 sm:p-5 bg-dark-400/40 space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-orange-400">Dados da Medição</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 lg:col-span-3">
                        <label htmlFor="obraId" className={labelClass}>Obra *</label>
                        <select
                            id="obraId"
                            required
                            value={obraId}
                            onChange={(e) => setObraId(e.target.value)}
                            className={inputClass}
                        >
                            <option value="">Selecione a obra</option>
                            {obras.map((obra) => (
                                <option key={obra.id} value={obra.id}>{obra.nome}</option>
                            ))}
                        </select>
                    </div>

                    <div className="sm:col-span-2 lg:col-span-3">
                        <label htmlFor="servico" className={labelClass}>Serviço *</label>
                        <input
                            id="servico"
                            type="text"
                            required
                            value={servico}
                            onChange={(e) => setServico(e.target.value)}
                            className={inputClass}
                            placeholder="Ex: Alvenaria, Pintura, Elétrica..."
                        />
                    </div>

                    <div>
                        <label htmlFor="medicaoNumero" className={labelClass}>Nº da Medição *</label>
                        <input
                            id="medicaoNumero"
                            type="number"
                            min={1}
                            required
                            value={medicaoNumero}
                            onChange={(e) => setMedicaoNumero(Number(e.target.value) || 1)}
                            className={inputClass}
                            placeholder="1"
                        />
                    </div>

                    <div>
                        <label htmlFor="valorContrato" className={labelClass}>Valor do Contrato</label>
                        <input
                            id="valorContrato"
                            type="text"
                            inputMode="decimal"
                            value={valorContrato}
                            onChange={(e) => setValorContrato(sanitizeCurrencyInput(e.target.value))}
                            onBlur={() => {
                                if (valorContrato) {
                                    setValorContrato(formatCurrencyInput(valorContrato))
                                }
                            }}
                            className={inputClass}
                            placeholder="0,00"
                        />
                    </div>

                    <div>
                        <label htmlFor="percentualExecutado" className={labelClass}>% Executado</label>
                        <div className="mt-1 flex items-center gap-2">
                            <input
                                id="percentualExecutado"
                                type="number"
                                min={0}
                                max={100}
                                step={0.1}
                                value={percentualExecutado}
                                onChange={(e) => setPercentualExecutado(Number(e.target.value) || 0)}
                                className={inputClass}
                                placeholder="0"
                            />
                            <span className="text-gray-400 text-sm">%</span>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="valorMedicao" className={labelClass}>Valor da Medição</label>
                        <input
                            id="valorMedicao"
                            type="text"
                            inputMode="decimal"
                            value={valorMedicao}
                            onChange={(e) => {
                                setValorMedicao(sanitizeCurrencyInput(e.target.value))
                                // Ao alterar valor da medição manualmente, sincroniza com valor a pagar
                                setValor(sanitizeCurrencyInput(e.target.value))
                            }}
                            onBlur={() => {
                                if (valorMedicao) {
                                    setValorMedicao(formatCurrencyInput(valorMedicao))
                                }
                            }}
                            className={inputClass}
                            placeholder="0,00"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Calculado automaticamente (contrato × %) ou edite manualmente
                        </p>
                    </div>

                    <div>
                        <label htmlFor="valor" className={labelClass}>Valor a Pagar *</label>
                        <input
                            id="valor"
                            type="text"
                            inputMode="decimal"
                            required
                            value={valor}
                            onChange={(e) => setValor(sanitizeCurrencyInput(e.target.value))}
                            onBlur={() => {
                                if (valor) {
                                    setValor(formatCurrencyInput(valor))
                                }
                            }}
                            className={inputClass}
                            placeholder="0,00"
                        />
                    </div>
                </div>

                {/* Resumo da Medição */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                    <div className="bg-dark-500 border border-dark-100 rounded-lg p-3">
                        <p className="text-xs text-gray-400 mb-1">Contrato</p>
                        <p className="text-sm font-semibold text-gray-100">
                            {(parseCurrencyInput(valorContrato) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                    <div className="bg-dark-500 border border-dark-100 rounded-lg p-3">
                        <p className="text-xs text-gray-400 mb-1">% Executado</p>
                        <p className="text-sm font-semibold text-orange-400">{percentualExecutado}%</p>
                    </div>
                    <div className="bg-dark-500 border border-dark-100 rounded-lg p-3">
                        <p className="text-xs text-gray-400 mb-1">Valor Medição</p>
                        <p className="text-sm font-semibold text-brand">
                            {(parseCurrencyInput(valorMedicao) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Controle de Pagamento */}
            <div className="border border-dark-100 rounded-xl p-4 sm:p-5 bg-dark-400/40 space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-brand">Controle de Pagamento</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="status" className={labelClass}>Status *</label>
                        <select
                            id="status"
                            value={status}
                            onChange={(e) => handleStatusChange(e.target.value as EmpreiteiroStatus)}
                            className={inputClass}
                        >
                            {STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="valorPago" className={labelClass}>Valor Pago</label>
                        <input
                            id="valorPago"
                            type="text"
                            inputMode="decimal"
                            value={valorPago}
                            onChange={(e) => {
                                const next = sanitizeCurrencyInput(e.target.value)
                                setValorPago(next)
                                syncStatusFromValorPago(next)
                            }}
                            onBlur={() => {
                                if (valorPago) {
                                    setValorPago(formatCurrencyInput(valorPago))
                                }
                            }}
                            className={inputClass}
                            placeholder="0,00"
                        />
                    </div>

                    <div>
                        <label htmlFor="formaPagamento" className={labelClass}>Forma de Pagamento</label>
                        <select
                            id="formaPagamento"
                            value={formaPagamento}
                            onChange={(e) => {
                                setFormaPagamento(e.target.value as EmpreiteiroFormaPagamento)
                                if (status === 'aberto') {
                                    ensurePagamentoDefaults()
                                    setStatus('parcial')
                                }
                            }}
                            className={inputClass}
                        >
                            <option value="">Selecione</option>
                            {FORMAS_PAGAMENTO.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="dataReferencia" className={labelClass}>Data de Referência *</label>
                        <input
                            id="dataReferencia"
                            type="date"
                            required
                            value={dataReferencia}
                            onChange={(e) => setDataReferencia(e.target.value)}
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label htmlFor="dataPagamento" className={labelClass}>Data de Pagamento</label>
                        <input
                            id="dataPagamento"
                            type="date"
                            value={dataPagamento}
                            onChange={(e) => {
                                setDataPagamento(e.target.value)
                                if (status === 'aberto') {
                                    ensurePagamentoDefaults()
                                    setStatus('parcial')
                                }
                            }}
                            className={inputClass}
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="comprovanteEmpreiteiro" className={labelClass}>Comprovante de Pagamento (PDF ou imagem)</label>
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                        <label className="flex items-center px-4 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-300 cursor-pointer hover:border-brand hover:text-brand transition-colors">
                            <Upload className="w-4 h-4 mr-2" />
                            {comprovanteFile ? 'Trocar comprovante' : comprovanteUrl ? 'Substituir comprovante' : 'Escolher comprovante'}
                            <input
                                id="comprovanteEmpreiteiro"
                                type="file"
                                accept=".pdf,image/*"
                                onChange={(e) => setComprovanteFile(e.target.files?.[0] || null)}
                                className="hidden"
                            />
                        </label>
                        <span className="text-sm text-gray-400 truncate max-w-full">
                            {comprovanteFile?.name || (comprovanteUrl ? 'Comprovante anexado' : 'Nenhum arquivo enviado')}
                        </span>
                        {comprovanteUrl && (
                            <a
                                href={comprovanteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-sm text-brand hover:text-brand-light"
                            >
                                <ExternalLink className="w-4 h-4 mr-1.5" />
                                Abrir comprovante atual
                            </a>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-dark-500 border border-dark-100 rounded-lg p-3">
                        <p className="text-xs text-gray-400 mb-1">Valor Total</p>
                        <p className="text-sm font-semibold text-gray-100">
                            {valorNumber.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                    <div className="bg-dark-500 border border-dark-100 rounded-lg p-3">
                        <p className="text-xs text-gray-400 mb-1">Pago</p>
                        <p className="text-sm font-semibold text-success">
                            {valorPagoNumber.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                    <div className="bg-dark-500 border border-dark-100 rounded-lg p-3">
                        <p className="text-xs text-gray-400 mb-1">Em Aberto</p>
                        <p className="text-sm font-semibold text-warning">
                            {valorAberto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
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
                    placeholder="Ex: medição referente ao 2º pavimento, retenção de 5%, etc."
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
                    {loading ? 'Salvando...' : empreiteiro ? 'Atualizar' : 'Salvar'}
                </button>
            </div>
        </form>
    )
}
