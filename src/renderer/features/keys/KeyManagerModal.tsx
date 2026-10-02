import { useState, useEffect, useCallback } from 'react'
import {
  X,
  Key,
  Plus,
  Copy,
  Check,
  Upload,
  Lock,
  Unlock,
  ShieldCheck,
  FolderOpen,
  Server
} from 'lucide-react'
import type { SshKeyItem } from '@shared/types'
import { useSessionsStore } from '../../stores/sessions-store'

interface KeyManagerModalProps {
  isOpen: boolean
  onClose: () => void
  activeSessionId?: string
}

export function KeyManagerModal({
  isOpen,
  onClose,
  activeSessionId
}: KeyManagerModalProps): JSX.Element | null {
  const [keys, setKeys] = useState<SshKeyItem[]>([])
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null)
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null)

  // Generate Mode State
  const [isGenerating, setIsGenerating] = useState(false)
  const [genName, setGenName] = useState('id_ed25519_termdeck')
  const [genComment, setGenComment] = useState('termdeck')
  const [genPassphrase, setGenPassphrase] = useState('')
  const [isSubmittingGen, setIsSubmittingGen] = useState(false)

  // Install to Server State
  const sshSessions = useSessionsStore((s) => s.sessions)
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    activeSessionId || sshSessions[0]?.id || ''
  )
  const [isInstalling, setIsInstalling] = useState(false)
  const [installStatus, setInstallStatus] = useState<string | null>(null)
  const [errorNotice, setErrorNotice] = useState<string | null>(null)

  const loadKeys = useCallback(async (): Promise<void> => {
    if (!window.api?.listKeys) return
    try {
      const list = await window.api.listKeys()
      setKeys(list)
      if (list.length > 0 && !selectedKeyId) {
        setSelectedKeyId(list[0].id)
      }
    } catch (err) {
      console.error('Failed to list keys:', err)
    }
  }, [selectedKeyId])

  useEffect(() => {
    if (isOpen) {
      loadKeys()
    }
  }, [isOpen, loadKeys])

  if (!isOpen) return null

  const selectedKey = keys.find((k) => k.id === selectedKeyId) || keys[0] || null

  const handleCopyPubkey = async (text: string, id: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKeyId(id)
      setTimeout(() => setCopiedKeyId(null), 2000)
    } catch {
      setErrorNotice('Не удалось скопировать в буфер обмена')
    }
  }

  const handleImportKey = async (): Promise<void> => {
    if (!window.api?.showOpenDialog || !window.api?.importKey) return
    try {
      const res = await window.api.showOpenDialog({
        title: 'Выберите файл закрытого SSH-ключа',
        properties: ['openFile']
      })
      if (res && res.filePaths.length > 0) {
        const imported = await window.api.importKey({ filePath: res.filePaths[0] })
        await loadKeys()
        setSelectedKeyId(imported.id)
      }
    } catch (err) {
      setErrorNotice((err as Error).message)
    }
  }

  const handleGenerateKey = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!window.api?.generateKey) return
    setIsSubmittingGen(true)
    setErrorNotice(null)

    try {
      const generated = await window.api.generateKey({
        name: genName,
        comment: genComment || undefined,
        passphrase: genPassphrase || undefined
      })
      await loadKeys()
      setSelectedKeyId(generated.id)
      setIsGenerating(false)
      setGenPassphrase('')
    } catch (err) {
      setErrorNotice((err as Error).message)
    } finally {
      setIsSubmittingGen(false)
    }
  }

  const handleInstallToServer = async (): Promise<void> => {
    if (!selectedKey || !selectedKey.publicKeyText || !selectedSessionId) return
    if (!window.api?.installKeyToServer) return

    setIsInstalling(true)
    setInstallStatus(null)
    setErrorNotice(null)

    try {
      await window.api.installKeyToServer({
        publicKeyText: selectedKey.publicKeyText,
        sessionId: selectedSessionId
      })
      const targetSession = sshSessions.find((s) => s.id === selectedSessionId)
      setInstallStatus(
        `Ключ успешно скопирован на сервер «${targetSession?.name || selectedSessionId}» в ~/.ssh/authorized_keys`
      )
    } catch (err) {
      setErrorNotice((err as Error).message)
    } finally {
      setIsInstalling(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans select-none">
      <div className="bg-panel2 border border-line rounded-lg shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[75vh] max-h-[650px] text-tx text-xs">
        {/* Header */}
        <div className="px-4 py-3 border-b border-line flex items-center justify-between bg-panel/70">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-acc" />
            <span className="font-semibold text-sm">Менеджер SSH-ключей</span>
            <span className="text-mut text-[11px] font-mono">
              ({keys.length} {keys.length === 1 ? 'ключ' : 'ключей'})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsGenerating((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-acc text-bg font-medium hover:bg-acc/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isGenerating ? 'К списку ключей' : 'Сгенерировать Ed25519'}</span>
            </button>

            <button
              type="button"
              onClick={handleImportKey}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-line bg-panel text-tx hover:border-tx/40 transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5 text-mut" />
              <span>Импортировать</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-mut hover:text-tx hover:bg-panel transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error / Success Notifications */}
        {errorNotice && (
          <div className="px-4 py-2 bg-err/15 border-b border-err/30 text-err flex items-center justify-between text-xs">
            <span>{errorNotice}</span>
            <button
              type="button"
              onClick={() => setErrorNotice(null)}
              className="text-err hover:underline"
            >
              Закрыть
            </button>
          </div>
        )}

        {installStatus && (
          <div className="px-4 py-2 bg-ok/15 border-b border-ok/30 text-ok flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              {installStatus}
            </span>
            <button
              type="button"
              onClick={() => setInstallStatus(null)}
              className="text-ok hover:underline"
            >
              Закрыть
            </button>
          </div>
        )}

        {/* Main Split Layout */}
        <div className="flex-1 flex min-h-0">
          {/* Left Column: Keys List */}
          <div className="w-64 border-r border-line bg-panel/30 flex flex-col">
            <div className="p-2 border-b border-line text-mut text-[11px] font-medium flex justify-between items-center">
              <span>Доступные ключи</span>
              <span className="text-[10px] text-mut/80">~/.ssh</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-line/30">
              {keys.length === 0 ? (
                <div className="p-4 text-center text-mut text-xs">Ключи не найдены в ~/.ssh</div>
              ) : (
                keys.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => {
                      setSelectedKeyId(k.id)
                      setIsGenerating(false)
                    }}
                    className={`w-full text-left p-2.5 transition-colors flex items-start gap-2.5 ${
                      selectedKeyId === k.id && !isGenerating
                        ? 'bg-acc/10 text-tx font-medium'
                        : 'hover:bg-panel/50 text-tx/80'
                    }`}
                  >
                    <div className="p-1 rounded bg-panel border border-line text-mut flex-none mt-0.5">
                      <Key className="w-3.5 h-3.5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="truncate text-xs font-mono">{k.name}</div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-mut">
                        <span className="uppercase">{k.type}</span>
                        {k.isEncrypted ? (
                          <span
                            className="flex items-center gap-0.5 text-warning"
                            title="Зашифрован паролем"
                          >
                            <Lock className="w-2.5 h-2.5" />
                            pass
                          </span>
                        ) : (
                          <span
                            className="flex items-center gap-0.5 text-mut/60"
                            title="Без шифрования"
                          >
                            <Unlock className="w-2.5 h-2.5" />
                          </span>
                        )}
                        <span>{k.source === 'system' ? 'системный' : 'пользовательский'}</span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Key Details or Generator */}
          <div className="flex-1 p-5 overflow-y-auto bg-panel2">
            {isGenerating ? (
              /* Generate Form */
              <form onSubmit={handleGenerateKey} className="max-w-md space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-tx">Генерация ключа Ed25519</h4>
                  <p className="text-xs text-mut mt-0.5">
                    Современный и безопасный алгоритм эллиптических кривых. Ключ будет сохранён в
                    ~/.ssh/.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-mut mb-1">
                    Имя файла ключа *
                  </label>
                  <input
                    type="text"
                    required
                    value={genName}
                    onChange={(e) => setGenName(e.target.value)}
                    placeholder="id_ed25519_custom"
                    className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-mut mb-1">
                    Комментарий (метка в публичном ключе)
                  </label>
                  <input
                    type="text"
                    value={genComment}
                    onChange={(e) => setGenComment(e.target.value)}
                    placeholder="termdeck"
                    className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-mut mb-1">
                    Кодовая фраза (Passphrase, опционально)
                  </label>
                  <input
                    type="password"
                    value={genPassphrase}
                    onChange={(e) => setGenPassphrase(e.target.value)}
                    placeholder="Оставьте пустым для ключа без пароля"
                    className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsGenerating(false)}
                    className="px-3 py-1.5 rounded border border-line text-mut hover:text-tx hover:bg-panel transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingGen}
                    className="px-4 py-1.5 rounded bg-acc text-bg font-medium hover:bg-acc/90 transition-colors"
                  >
                    {isSubmittingGen ? 'Генерация…' : 'Сгенерировать и сохранить'}
                  </button>
                </div>
              </form>
            ) : selectedKey ? (
              /* Key Details */
              <div className="space-y-4">
                <div className="flex items-start justify-between border-b border-line pb-3">
                  <div>
                    <h4 className="text-base font-semibold font-mono text-tx">
                      {selectedKey.name}
                    </h4>
                    <p className="text-[11px] text-mut font-mono mt-0.5">{selectedKey.path}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-panel border border-line text-tx font-mono uppercase text-[11px]">
                      {selectedKey.type}
                    </span>
                    {selectedKey.isEncrypted && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-warning/15 text-warning text-[11px]">
                        <Lock className="w-3 h-3" />
                        Passphrase
                      </span>
                    )}
                  </div>
                </div>

                {/* Fingerprint */}
                <div>
                  <div className="text-xs font-medium text-mut mb-1">SHA256 Fingerprint:</div>
                  <div className="p-2 rounded bg-bg border border-line font-mono text-xs text-tx select-all break-all">
                    {selectedKey.fingerprintSha256}
                  </div>
                </div>

                {/* Public Key Display */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-mut">Публичный ключ (.pub):</span>
                    {selectedKey.publicKeyText && (
                      <button
                        type="button"
                        onClick={() => handleCopyPubkey(selectedKey.publicKeyText, selectedKey.id)}
                        className="flex items-center gap-1 text-[11px] text-acc hover:underline"
                      >
                        {copiedKeyId === selectedKey.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-ok" />
                            <span className="text-ok">Скопировано!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Скопировать public key</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {selectedKey.publicKeyText ? (
                    <textarea
                      readOnly
                      rows={3}
                      value={selectedKey.publicKeyText}
                      className="w-full p-2 rounded bg-bg border border-line font-mono text-[11px] text-tx select-all resize-none outline-none"
                    />
                  ) : (
                    <div className="p-3 bg-panel rounded border border-line text-mut text-xs italic">
                      Публичный файл (.pub) отсутствует на диске.
                    </div>
                  )}
                </div>

                {/* ssh-copy-id Section */}
                {selectedKey.publicKeyText && (
                  <div className="pt-3 border-t border-line space-y-2.5">
                    <div>
                      <h5 className="text-xs font-semibold text-tx flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5 text-acc" />
                        Скопировать на сервер (аналог ssh-copy-id)
                      </h5>
                      <p className="text-[11px] text-mut mt-0.5">
                        Добавляет публичный ключ в файл ~/.ssh/authorized_keys на удалённом сервере
                        через SFTP с правильными правами 0600.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <select
                          value={selectedSessionId}
                          onChange={(e) => setSelectedSessionId(e.target.value)}
                          className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs outline-none"
                        >
                          {sshSessions.length === 0 ? (
                            <option value="">Нет настроенных SSH-сессий</option>
                          ) : (
                            sshSessions.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.username}@{s.host}:{s.port || 22})
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      <button
                        type="button"
                        disabled={isInstalling || !selectedSessionId}
                        onClick={handleInstallToServer}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-acc text-bg font-medium hover:bg-acc/90 transition-colors disabled:opacity-50"
                      >
                        <Server className="w-3.5 h-3.5" />
                        <span>{isInstalling ? 'Копирование…' : 'Скопировать на сервер'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-mut text-xs">
                Выберите ключ слева для просмотра деталей
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-line bg-panel/40 flex items-center justify-between text-mut text-[11px]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-ok" />
            <span>
              Приватные ключи хранятся локально и никогда не передаются на сторонние серверы
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded border border-line text-tx hover:bg-panel transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}
