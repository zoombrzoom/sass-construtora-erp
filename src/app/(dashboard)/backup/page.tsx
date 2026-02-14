'use client'

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getPermissions } from '@/lib/permissions/check'
import {
  BackupProgress,
  DatabaseBackup,
  createDatabaseBackup,
  getBackupFileName,
  isDatabaseBackup,
  restoreDatabaseBackup,
} from '@/lib/db/backup'
import {
  StoredBackupMeta,
  deleteStoredBackup,
  getStoredBackupById,
  listStoredBackups,
  saveStoredBackup,
} from '@/lib/db/backupStorage'
import {
  AlertTriangle,
  Database,
  Download,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
  Upload,
} from 'lucide-react'

type BackupAction =
  | 'none'
  | 'create'
  | 'download'
  | 'restore-system'
  | 'restore-upload'
  | 'delete-system'

function formatDateTime(value?: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  let size = value
  let unit = 0

  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit += 1
  }

  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`
}

function downloadBackup(backup: DatabaseBackup) {
  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = getBackupFileName(backup.createdAt)
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function BackupPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const permissions = getPermissions(user)
  const canManageBackup = permissions.canManageUsers

  const [systemBackups, setSystemBackups] = useState<StoredBackupMeta[]>([])
  const [selectedBackupId, setSelectedBackupId] = useState<string>('')
  const [uploadedBackup, setUploadedBackup] = useState<DatabaseBackup | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string>('')
  const [progress, setProgress] = useState<BackupProgress | null>(null)
  const [status, setStatus] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [loadingBackups, setLoadingBackups] = useState(true)
  const [activeAction, setActiveAction] = useState<BackupAction>('none')

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const selectedSystemBackup = useMemo(
    () => systemBackups.find((item) => item.id === selectedBackupId) || null,
    [systemBackups, selectedBackupId]
  )

  const hasBusyAction = activeAction !== 'none'

  const loadBackups = async () => {
    try {
      setLoadingBackups(true)
      const list = await listStoredBackups()
      setSystemBackups(list)

      if (list.length === 0) {
        setSelectedBackupId('')
      } else if (!list.some((item) => item.id === selectedBackupId)) {
        setSelectedBackupId(list[0].id)
      }
    } catch (err) {
      console.error('Erro ao listar backups do sistema:', err)
      setError('Não foi possível listar os backups do sistema.')
    } finally {
      setLoadingBackups(false)
    }
  }

  useEffect(() => {
    if (!authLoading && user && !canManageBackup) {
      router.replace('/dashboard')
    }
  }, [authLoading, user, canManageBackup, router])

  useEffect(() => {
    if (authLoading || !canManageBackup) return
    loadBackups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, canManageBackup])

  const handleCreateBackup = async () => {
    setError('')
    setStatus('')
    setProgress(null)
    setActiveAction('create')

    try {
      const backup = await createDatabaseBackup({
        allowPartial: true,
        onProgress: (info) => setProgress(info),
      })
      const skipped = backup.stats.skippedCollections || []

      try {
        const saved = await saveStoredBackup(backup)
        await loadBackups()
        setSelectedBackupId(saved.id)

        if (skipped.length > 0) {
          setStatus(
            `Backup criado com ${saved.documents} documento(s), mas ${skipped.length} coleção(ões) foram ignoradas: ${skipped.join(', ')}.`
          )
        } else {
          setStatus(`Backup completo criado com sucesso: ${saved.documents} documento(s).`)
        }
      } catch (storageError) {
        console.error('Falha ao salvar backup localmente. Fazendo download direto.', storageError)
        downloadBackup(backup)
        setStatus(
          'Backup gerado, mas não foi possível salvar localmente no sistema. O download do arquivo foi iniciado automaticamente.'
        )
      }
    } catch (err) {
      console.error('Erro ao criar backup:', err)
      const message = err instanceof Error ? err.message : 'Falha ao criar backup do sistema.'
      setError(`Falha ao criar backup do sistema. ${message}`)
    } finally {
      setActiveAction('none')
      setProgress(null)
    }
  }

  const handleDownloadBackup = async () => {
    if (!selectedBackupId) {
      setError('Selecione um backup do sistema para download.')
      return
    }

    setError('')
    setStatus('')
    setActiveAction('download')

    try {
      const backup = await getStoredBackupById(selectedBackupId)
      if (!backup) {
        setError('Backup selecionado não foi encontrado no armazenamento local.')
        return
      }

      downloadBackup(backup)
      setStatus('Download do backup iniciado.')
    } catch (err) {
      console.error('Erro ao baixar backup:', err)
      setError('Falha ao gerar download do backup.')
    } finally {
      setActiveAction('none')
    }
  }

  const handleDeleteSystemBackup = async () => {
    if (!selectedBackupId) {
      setError('Selecione um backup para excluir do sistema.')
      return
    }

    const canDelete = confirm('Excluir este backup salvo no sistema? Esta ação remove apenas o arquivo local.')
    if (!canDelete) return

    setError('')
    setStatus('')
    setActiveAction('delete-system')

    try {
      await deleteStoredBackup(selectedBackupId)
      await loadBackups()
      setStatus('Backup removido do sistema.')
    } catch (err) {
      console.error('Erro ao excluir backup do sistema:', err)
      setError('Falha ao excluir backup salvo.')
    } finally {
      setActiveAction('none')
    }
  }

  const handleRestoreSystemBackup = async () => {
    if (!selectedBackupId) {
      setError('Selecione um backup do sistema para restaurar.')
      return
    }

    const canRestore = confirm(
      'A restauração substituirá os dados atuais pelas informações do backup selecionado. Deseja continuar?'
    )
    if (!canRestore) return

    setError('')
    setStatus('')
    setProgress(null)
    setActiveAction('restore-system')

    try {
      const backup = await getStoredBackupById(selectedBackupId)
      if (!backup) {
        setError('Backup selecionado não foi encontrado.')
        return
      }

      const result = await restoreDatabaseBackup(backup, {
        replaceExisting: true,
        onProgress: (info) => setProgress(info),
      })

      const skippedInfo = result.collectionsSkipped.length
        ? ` Coleções ignoradas para segurança: ${result.collectionsSkipped.join(', ')}.`
        : ''
      const warningInfo = result.warnings.length
        ? ` Avisos: ${result.warnings.map((w) => w.message).join('; ')}`
        : ''
      setStatus(
        `Restauração concluída: ${result.documentsWritten} documento(s) gravados e ${result.documentsDeleted} removido(s).${skippedInfo}${warningInfo}`
      )
      router.refresh()
    } catch (err) {
      console.error('Erro ao restaurar backup do sistema:', err)
      const message = err instanceof Error ? err.message : 'Erro desconhecido.'
      setError(`Falha ao restaurar backup do sistema. ${message}`)
    } finally {
      setActiveAction('none')
      setProgress(null)
    }
  }

  const handleRequestUpload = () => {
    if (hasBusyAction) return
    fileInputRef.current?.click()
  }

  const handleUploadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    setError('')
    setStatus('')

    try {
      const content = await file.text()
      const parsed = JSON.parse(content)

      if (!isDatabaseBackup(parsed)) {
        setError('Arquivo inválido. Selecione um JSON de backup compatível.')
        setUploadedBackup(null)
        setUploadedFileName('')
        return
      }

      setUploadedBackup(parsed)
      setUploadedFileName(file.name)
      setStatus('Backup carregado. Revise os dados e confirme a restauração.')
    } catch (err) {
      console.error('Erro ao carregar arquivo de backup:', err)
      setError('Falha ao ler o arquivo de backup enviado.')
      setUploadedBackup(null)
      setUploadedFileName('')
    }
  }

  const handleRestoreUploadedBackup = async () => {
    if (!uploadedBackup) {
      setError('Envie um arquivo de backup antes de restaurar.')
      return
    }

    const canRestore = confirm(
      'A restauração do arquivo enviado substituirá os dados atuais. Deseja continuar?'
    )
    if (!canRestore) return

    setError('')
    setStatus('')
    setProgress(null)
    setActiveAction('restore-upload')

    try {
      const result = await restoreDatabaseBackup(uploadedBackup, {
        replaceExisting: true,
        onProgress: (info) => setProgress(info),
      })

      const skippedInfo = result.collectionsSkipped.length
        ? ` Coleções ignoradas para segurança: ${result.collectionsSkipped.join(', ')}.`
        : ''
      const warningInfo = result.warnings.length
        ? ` Avisos: ${result.warnings.map((w) => w.message).join('; ')}`
        : ''
      setStatus(
        `Restauração do arquivo concluída: ${result.documentsWritten} documento(s) gravados e ${result.documentsDeleted} removido(s).${skippedInfo}${warningInfo}`
      )
      router.refresh()
    } catch (err) {
      console.error('Erro ao restaurar backup enviado:', err)
      const message = err instanceof Error ? err.message : 'Erro desconhecido.'
      setError(`Falha ao restaurar o backup enviado. ${message}`)
    } finally {
      setActiveAction('none')
      setProgress(null)
    }
  }

  if (authLoading || loadingBackups) {
    return <div className="text-center py-12 text-gray-400">Carregando...</div>
  }

  if (!canManageBackup) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Database className="w-7 h-7 text-brand" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand">Backup do Banco de Dados</h1>
          <p className="text-sm text-gray-400 mt-1">Gerencie backup, download e restauração completa dos dados do sistema.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-4">
        <aside className="bg-dark-500 border border-dark-100 rounded-xl p-4 h-fit lg:sticky lg:top-20">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand mb-3">Menu de Backup</h2>

          <div className="space-y-2">
            <button
              onClick={handleCreateBackup}
              disabled={hasBusyAction}
              className="w-full inline-flex items-center justify-center px-3 py-2.5 bg-brand text-dark-800 font-semibold rounded-lg hover:bg-brand-light disabled:opacity-50 transition-colors"
            >
              {activeAction === 'create' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Criar Backup
            </button>

            <button
              onClick={handleDownloadBackup}
              disabled={hasBusyAction || !selectedBackupId}
              className="w-full inline-flex items-center justify-center px-3 py-2.5 bg-dark-400 text-gray-100 font-medium rounded-lg hover:bg-dark-300 disabled:opacity-50 transition-colors"
            >
              {activeAction === 'download' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Download do Backup
            </button>

            <button
              onClick={handleRestoreSystemBackup}
              disabled={hasBusyAction || !selectedBackupId}
              className="w-full inline-flex items-center justify-center px-3 py-2.5 bg-warning/20 text-warning font-medium rounded-lg hover:bg-warning/30 disabled:opacity-50 transition-colors"
            >
              {activeAction === 'restore-system' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
              Restaurar do Sistema
            </button>

            <button
              onClick={handleRequestUpload}
              disabled={hasBusyAction}
              className="w-full inline-flex items-center justify-center px-3 py-2.5 bg-dark-400 text-gray-100 font-medium rounded-lg hover:bg-dark-300 disabled:opacity-50 transition-colors"
            >
              <Upload className="w-4 h-4 mr-2" />
              Subir Backup (.json)
            </button>

            <button
              onClick={handleRestoreUploadedBackup}
              disabled={hasBusyAction || !uploadedBackup}
              className="w-full inline-flex items-center justify-center px-3 py-2.5 bg-error/20 text-error font-medium rounded-lg hover:bg-error/30 disabled:opacity-50 transition-colors"
            >
              {activeAction === 'restore-upload' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Restaurar Backup Enviado
            </button>

            <button
              onClick={handleDeleteSystemBackup}
              disabled={hasBusyAction || !selectedBackupId}
              className="w-full inline-flex items-center justify-center px-3 py-2.5 bg-dark-400 text-gray-300 font-medium rounded-lg hover:bg-dark-300 disabled:opacity-50 transition-colors"
            >
              {activeAction === 'delete-system' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Excluir Backup Selecionado
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleUploadFile}
          />
        </aside>

        <section className="space-y-4">
          {(status || error) && (
            <div className={`rounded-xl border px-4 py-3 text-sm ${error
                ? 'border-error/40 bg-error/10 text-error'
                : 'border-success/40 bg-success/10 text-success'
              }`}>
              {error || status}
            </div>
          )}

          {progress && (
            <div className="bg-dark-500 border border-dark-100 rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                <Loader2 className="w-4 h-4 animate-spin text-brand" />
                Processando {progress.collection}
              </div>
              <p className="text-xs text-gray-500">
                {progress.phase === 'reading' && 'Lendo dados'}
                {progress.phase === 'writing' && 'Gravando dados'}
                {progress.phase === 'deleting' && 'Removendo dados antigos'}
                {' '}({progress.current}/{progress.total})
              </p>
            </div>
          )}

          <div className="bg-dark-500 border border-dark-100 rounded-xl p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-brand mb-3">Backups do Sistema</h3>

            {systemBackups.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum backup local criado ainda.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-auto pr-1">
                {systemBackups.map((backup) => (
                  <button
                    key={backup.id}
                    onClick={() => setSelectedBackupId(backup.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${selectedBackupId === backup.id
                        ? 'border-brand bg-brand/10'
                        : 'border-dark-100 bg-dark-400 hover:bg-dark-300'
                      }`}
                  >
                    <p className="text-sm font-medium text-gray-100">{backup.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDateTime(backup.createdAt)} | {backup.documents} docs | {formatBytes(backup.sizeBytes)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-dark-500 border border-dark-100 rounded-xl p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-brand mb-3">Resumo do Backup Selecionado</h3>

            {selectedSystemBackup ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-dark-400 border border-dark-100 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Criado em</p>
                  <p className="text-sm text-gray-100 mt-1">{formatDateTime(selectedSystemBackup.createdAt)}</p>
                </div>
                <div className="bg-dark-400 border border-dark-100 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Documentos</p>
                  <p className="text-sm text-gray-100 mt-1">{selectedSystemBackup.documents}</p>
                </div>
                <div className="bg-dark-400 border border-dark-100 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Tamanho</p>
                  <p className="text-sm text-gray-100 mt-1">{formatBytes(selectedSystemBackup.sizeBytes)}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Selecione um backup para ver os detalhes.</p>
            )}
          </div>

          <div className="bg-dark-500 border border-dark-100 rounded-xl p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-brand mb-3">Backup Enviado</h3>

            {uploadedBackup ? (
              <div className="space-y-2 text-sm">
                <p className="text-gray-100">Arquivo: {uploadedFileName || 'arquivo sem nome'}</p>
                <p className="text-gray-400">Criado em: {formatDateTime(uploadedBackup.createdAt)}</p>
                <p className="text-gray-400">Coleções: {uploadedBackup.stats?.collections || Object.keys(uploadedBackup.collections || {}).length}</p>
                <p className="text-gray-400">Documentos: {uploadedBackup.stats?.documents || 0}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Nenhum arquivo de backup enviado.</p>
            )}
          </div>

          <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
              <p className="text-sm text-warning">
                A restauração substitui os dados atuais do banco pelas informações do backup. Use apenas arquivos confiáveis.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
