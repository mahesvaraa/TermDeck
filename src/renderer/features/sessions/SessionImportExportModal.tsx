import { useState, useEffect, useRef } from 'react'
import {
  X,
  FileCode,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  FolderSync
} from 'lucide-react'
import { useSessionsStore } from '../../stores/sessions-store'
import type { SessionExportBundle } from '@shared/types'

interface SessionImportExportModalProps {
  isOpen: boolean
  onClose: () => void
}

type TabType = 'ssh-config' | 'json'

export function SessionImportExportModal({
  isOpen,
  onClose
}: SessionImportExportModalProps): JSX.Element | null {
  const [activeTab, setActiveTab] = useState<TabType>('ssh-config')
  const [isDetecting, setIsDetecting] = useState(false)
  const [sshConfigInfo, setSshConfigInfo] = useState<{
    exists: boolean
    path: string
    count: number
  } | null>(null)
  const [customConfigPath, setCustomConfigPath] = useState<string>('')
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  // JSON Import state
  const [jsonMode, setJsonMode] = useState<'merge' | 'replace'>('merge')
  const [pendingBundle, setPendingBundle] = useState<SessionExportBundle | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const detectSshConfig = useSessionsStore((s) => s.detectSshConfig)
  const importSshConfig = useSessionsStore((s) => s.importSshConfig)
  const exportSessions = useSessionsStore((s) => s.exportSessions)
  const importSessions = useSessionsStore((s) => s.importSessions)

  useEffect(() => {
    if (!isOpen) {
      setImportStatus(null)
      setImportError(null)
      setPendingBundle(null)
      return
    }

    let isMounted = true
    setIsDetecting(true)
    detectSshConfig(customConfigPath || undefined)
      .then((info) => {
        if (isMounted) {
          setSshConfigInfo(info)
          setIsDetecting(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to detect SSH config:', err)
          setIsDetecting(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, customConfigPath, detectSshConfig])

  if (!isOpen) return null

  const handleImportSshConfig = async (): Promise<void> => {
    setImportStatus(null)
    setImportError(null)
    try {
      const res = await importSshConfig(customConfigPath || undefined)
      if (res.importedCount > 0) {
        setImportStatus(`Успешно импортировано ${res.importedCount} сессий в папку "SSH Config"`)
      } else {
        setImportStatus('Новых сессий не найдено (все хосты уже были импортированы ранее)')
      }
    } catch (err) {
      setImportError((err as Error).message || 'Ошибка импорта из ~/.ssh/config')
    }
  }

  const handleExportJson = async (): Promise<void> => {
    try {
      const bundle = await exportSessions()
      if (!bundle) return

      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const dateStr = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `termdeck-sessions-${dateStr}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setImportStatus(`Экспортировано ${bundle.sessions.length} сессий и ${bundle.folders.length} папок`)
    } catch (err) {
      setImportError((err as Error).message || 'Ошибка экспорта')
    }
  }

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setImportStatus(null)
    setImportError(null)
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const parsed = JSON.parse(text)
        if (!parsed || !Array.isArray(parsed.sessions)) {
          throw new Error('Некорректный формат файла резервной копии TermDeck')
        }
        setPendingBundle(parsed as SessionExportBundle)
      } catch (err) {
        setImportError((err as Error).message || 'Не удалось прочитать JSON файл')
      }
    }
    reader.readAsText(file)
  }

  const handleConfirmJsonImport = async (): Promise<void> => {
    if (!pendingBundle) return
    setImportStatus(null)
    setImportError(null)
    try {
      const res = await importSessions(pendingBundle, jsonMode)
      setImportStatus(
        `Успешно импортировано: ${res.importedSessionsCount} сессий, ${res.importedFoldersCount} папок`
      )
      setPendingBundle(null)
    } catch (err) {
      setImportError((err as Error).message || 'Ошибка импорта сессий')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-panel border border-line rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-panel2/50">
          <div className="flex items-center gap-2 text-sm font-semibold text-tx">
            <FolderSync className="w-4 h-4 text-acc" />
            <span>Импорт и экспорт сессий</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-mut hover:text-tx hover:bg-panel2 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-line bg-bg text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('ssh-config')}
            className={`flex-1 py-2 px-3 text-center font-medium border-b-2 transition-colors ${
              activeTab === 'ssh-config'
                ? 'border-acc text-acc bg-panel/50'
                : 'border-transparent text-mut hover:text-tx'
            }`}
          >
            Импорт из ~/.ssh/config
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('json')}
            className={`flex-1 py-2 px-3 text-center font-medium border-b-2 transition-colors ${
              activeTab === 'json'
                ? 'border-acc text-acc bg-panel/50'
                : 'border-transparent text-mut hover:text-tx'
            }`}
          >
            JSON Резервная копия
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 text-xs">
          {importStatus && (
            <div className="flex items-center gap-2 p-2.5 rounded-md bg-ok/10 border border-ok/30 text-ok">
              <CheckCircle2 className="w-4 h-4 flex-none" />
              <span>{importStatus}</span>
            </div>
          )}

          {importError && (
            <div className="flex items-center gap-2 p-2.5 rounded-md bg-err/10 border border-err/30 text-err">
              <AlertCircle className="w-4 h-4 flex-none" />
              <span>{importError}</span>
            </div>
          )}

          {activeTab === 'ssh-config' && (
            <div className="space-y-4">
              <p className="text-mut text-xs leading-relaxed">
                TermDeck автоматически считывает хосты, пользователей, порты, ключи авторизации и ProxyJump из стандартного файла конфигурации OpenSSH.
              </p>

              <div className="p-3 rounded-md bg-bg border border-line space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-mut">Путь к файлу:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] text-tx truncate max-w-[200px]" title={sshConfigInfo?.path}>
                      {sshConfigInfo?.path || '~/.ssh/config'}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.api?.showOpenDialog) return
                        const res = await window.api.showOpenDialog({
                          title: 'Выберите файл SSH config',
                          properties: ['openFile']
                        })
                        if (!res.canceled && res.filePaths.length > 0) {
                          setCustomConfigPath(res.filePaths[0])
                        }
                      }}
                      className="px-1.5 py-0.5 rounded text-[11px] border border-line bg-panel2 hover:border-acc text-mut hover:text-tx transition-colors"
                    >
                      Обзор...
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-mut">Статус обнаружения:</span>
                  {isDetecting ? (
                    <span className="text-mut">Поиск...</span>
                  ) : sshConfigInfo?.exists ? (
                    <span className="text-ok font-medium">
                      Найден (найдено хостов: {sshConfigInfo.count})
                    </span>
                  ) : (
                    <span className="text-warn">Файл не найден</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-1.5 px-3 rounded-md border border-line bg-panel2 text-tx hover:border-tx/40 transition-colors"
                >
                  Закрыть
                </button>
                <button
                  type="button"
                  onClick={handleImportSshConfig}
                  disabled={!sshConfigInfo?.exists || sshConfigInfo?.count === 0}
                  className="flex items-center gap-1.5 py-1.5 px-3 rounded-md bg-acc text-bg font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Импортировать хосты</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'json' && (
            <div className="space-y-4">
              {/* Export section */}
              <div className="p-3 rounded-md bg-bg border border-line space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-tx">Экспорт сессий и папок</h4>
                    <p className="text-mut text-[11px]">
                      Сохранить все ваши сессии, папки и теги в JSON-файл
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="flex items-center gap-1.5 py-1.5 px-3 rounded-md border border-line bg-panel2 text-tx hover:border-acc transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-acc" />
                    <span>Экспорт JSON</span>
                  </button>
                </div>
              </div>

              {/* Import section */}
              <div className="p-3 rounded-md bg-bg border border-line space-y-3">
                <div>
                  <h4 className="font-medium text-tx">Импорт сессий из JSON</h4>
                  <p className="text-mut text-[11px]">
                    Восстановить сессии из ранее сохранённой резервной копии TermDeck
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-tx">
                    <input
                      type="radio"
                      name="jsonMode"
                      value="merge"
                      checked={jsonMode === 'merge'}
                      onChange={() => setJsonMode('merge')}
                      className="text-acc focus:ring-acc"
                    />
                    <span>Объединить (Merge)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-tx">
                    <input
                      type="radio"
                      name="jsonMode"
                      value="replace"
                      checked={jsonMode === 'replace'}
                      onChange={() => setJsonMode('replace')}
                      className="text-acc focus:ring-acc"
                    />
                    <span>Заменить всё (Replace)</span>
                  </label>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json,application/json"
                  onChange={handleFileSelected}
                  className="hidden"
                />

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 py-1.5 px-3 rounded-md border border-line bg-panel2 text-tx hover:border-acc transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-acc" />
                    <span>Выбрать JSON файл...</span>
                  </button>

                  {pendingBundle && (
                    <span className="text-[11px] text-ok flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Сессий: {pendingBundle.sessions.length}, папок: {pendingBundle.folders.length}
                    </span>
                  )}
                </div>

                {pendingBundle && (
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleConfirmJsonImport}
                      className="flex items-center gap-1.5 py-1.5 px-3 rounded-md bg-acc text-bg font-semibold hover:opacity-90 transition-opacity"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Применить импорт</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
