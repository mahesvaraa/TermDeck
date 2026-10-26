import { useState, useEffect, type FormEvent } from 'react'
import { X, Server, KeyRound, Lock, Folder, Plus, ArrowRight, ShieldCheck } from 'lucide-react'
import type { SessionConfig, DetectedSshAgent } from '@shared/types'
import { useSessionsStore } from '../../stores/sessions-store'
import { useSettingsStore } from '../../stores/settings-store'
import { SessionFolderModal } from './SessionFolderModal'

interface SessionModalProps {
  session?: SessionConfig
  onClose: () => void
  onSaved?: (session: SessionConfig) => void
}

export function SessionModal({ session, onClose, onSaved }: SessionModalProps): JSX.Element {
  const folders = useSessionsStore((s) => s.folders)
  const saveFolder = useSessionsStore((s) => s.saveFolder)
  const saveSession = useSessionsStore((s) => s.saveSession)
  const allSessions = useSessionsStore((s) => s.sessions)

  const sessionProfile = useSettingsStore((s) => s.sessionProfile)
  const setSessionProfile = useSettingsStore((s) => s.setSessionProfile)

  const [name, setName] = useState(session?.name || '')
  const [host, setHost] = useState(session?.host || '')
  const [port, setPort] = useState(session?.port || sessionProfile.port || 22)
  const [username, setUsername] = useState(session?.username || sessionProfile.username || '')
  const [folderId, setFolderId] = useState(session?.folderId || '')
  const [auth, setAuth] = useState<'password' | 'key' | 'agent'>(
    session?.auth || sessionProfile.auth || 'key'
  )
  const [secret, setSecret] = useState('')
  const [keyPath, setKeyPath] = useState(
    session?.keyPath || sessionProfile.keyPath || '~/.ssh/id_ed25519'
  )
  const [agentPath, setAgentPath] = useState(session?.agentPath || '')
  const [forwardAgent, setForwardAgent] = useState(
    session?.forwardAgent ?? sessionProfile.forwardAgent ?? false
  )
  const [detectedAgents, setDetectedAgents] = useState<DetectedSshAgent[]>([])
  const [tags, setTags] = useState(session?.tags?.join(', ') || '')
  const [keepaliveSec, setKeepaliveSec] = useState(
    session?.keepaliveSec || sessionProfile.keepaliveSec || 30
  )
  const [jumpHostId, setJumpHostId] = useState(session?.jumpHostId || '')
  const [error, setError] = useState<string | null>(null)
  const [profileNotice, setProfileNotice] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false)

  const handleSaveAsDefaultProfile = (): void => {
    setSessionProfile({
      port: Number(port) || 22,
      username: username.trim(),
      auth,
      keyPath: keyPath.trim(),
      keepaliveSec: Number(keepaliveSec) || 30,
      forwardAgent
    })
    setProfileNotice('Параметры сохранены как профиль по умолчанию для новых сессий!')
    setTimeout(() => setProfileNotice(null), 3500)
  }

  useEffect(() => {
    if (window.api?.detectSshAgents) {
      window.api.detectSshAgents().then((res) => {
        setDetectedAgents(res.agents)
      }).catch(() => {})
    }
  }, [])

  const otherSshSessions = allSessions.filter((s) => s.id !== session?.id)
  const selectedJumpHost = allSessions.find((s) => s.id === jumpHostId)

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Укажите название сессии')
      return
    }
    if (!host.trim()) {
      setError('Укажите адрес хоста')
      return
    }
    if (!username.trim()) {
      setError('Укажите имя пользователя')
      return
    }

    setIsSubmitting(true)
    setError(null)

    const sessionData: SessionConfig = {
      id: session?.id || `s-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      host: host.trim(),
      port: Number(port) || 22,
      username: username.trim(),
      folderId: folderId || undefined,
      auth,
      keyPath: auth === 'key' ? keyPath.trim() : undefined,
      agentPath: auth === 'agent' ? (agentPath.trim() || undefined) : undefined,
      forwardAgent: forwardAgent ? true : undefined,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      keepaliveSec: Number(keepaliveSec) || 30,
      encoding: 'utf-8',
      jumpHostId: jumpHostId || undefined
    }

    try {
      await saveSession(sessionData, secret ? secret : undefined)
      if (onSaved) {
        onSaved(sessionData)
      }
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-panel border border-line rounded-lg w-[480px] max-w-[95vw] shadow-2xl overflow-hidden font-sans flex flex-col text-tx">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line bg-panel2">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-acc" />
            <h2 className="text-sm font-semibold text-tx">
              {session ? 'Редактирование сессии' : 'Новая SSH-сессия'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-mut hover:text-tx hover:bg-bg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 rounded bg-err/15 border border-err/30 text-err text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-mut mb-1">Название сессии *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="prod-web-01"
                className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-mut">Папка</label>
                <button
                  type="button"
                  onClick={() => setIsNewFolderOpen(true)}
                  className="text-[11px] text-acc hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" />
                  <span>Новая папка</span>
                </button>
              </div>
              <div className="relative">
                <select
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs outline-none appearance-none"
                >
                  <option value="">(Без папки)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <Folder className="w-3.5 h-3.5 text-mut absolute right-2.5 top-2 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-mut mb-1">Хост или IP-адрес *</label>
              <input
                type="text"
                required
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="192.168.1.100"
                className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-mut mb-1">Порт</label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                min={1}
                max={65535}
                className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-mut mb-1">Имя пользователя *</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="root / ubuntu / deploy"
              className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs outline-none"
            />
          </div>

          {/* Authentication Type Selector */}
          <div>
            <label className="block text-xs font-medium text-mut mb-1.5">Аутентификация</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAuth('password')}
                className={`py-1.5 px-2 rounded border text-xs flex items-center justify-center gap-1.5 transition-colors ${
                  auth === 'password'
                    ? 'border-acc bg-acc/15 text-acc font-medium'
                    : 'border-line bg-panel2 text-mut hover:text-tx'
                }`}
              >
                <Lock className="w-3 h-3" />
                <span>Пароль</span>
              </button>
              <button
                type="button"
                onClick={() => setAuth('key')}
                className={`py-1.5 px-2 rounded border text-xs flex items-center justify-center gap-1.5 transition-colors ${
                  auth === 'key'
                    ? 'border-acc bg-acc/15 text-acc font-medium'
                    : 'border-line bg-panel2 text-mut hover:text-tx'
                }`}
              >
                <KeyRound className="w-3 h-3" />
                <span>Ключ SSH</span>
              </button>
              <button
                type="button"
                onClick={() => setAuth('agent')}
                className={`py-1.5 px-2 rounded border text-xs flex items-center justify-center gap-1.5 transition-colors ${
                  auth === 'agent'
                    ? 'border-acc bg-acc/15 text-acc font-medium'
                    : 'border-line bg-panel2 text-mut hover:text-tx'
                }`}
              >
                <Server className="w-3 h-3" />
                <span>SSH-агент</span>
              </button>
            </div>
          </div>

          {/* Auth-specific inputs */}
          {auth === 'password' && (
            <div>
              <label className="block text-xs font-medium text-mut mb-1">
                Пароль (сохраняется зашифрованным в safeStorage)
              </label>
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="••••••••"
                className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs outline-none"
              />
            </div>
          )}

          {auth === 'key' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-mut mb-1">
                  Путь к закрытому ключу
                </label>
                <input
                  type="text"
                  value={keyPath}
                  onChange={(e) => setKeyPath(e.target.value)}
                  placeholder="~/.ssh/id_ed25519"
                  className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-mut mb-1">
                  Кодовая фраза (Passphrase, если ключ зашифрован)
                </label>
                <input
                  type="password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="••••••••"
                  className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs outline-none"
                />
              </div>
            </div>
          )}

          {auth === 'agent' && (
            <div className="space-y-3 p-3 rounded bg-panel2 border border-line">
              <div>
                <label className="block text-xs font-medium text-mut mb-1">
                  SSH-агент аутентификации
                </label>
                <select
                  value={agentPath}
                  onChange={(e) => setAgentPath(e.target.value)}
                  className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs outline-none"
                >
                  <option value="">По умолчанию (системный OpenSSH / SSH_AUTH_SOCK)</option>
                  {detectedAgents.map((ag) => (
                    <option key={ag.id} value={ag.socketPath}>
                      {ag.name} ({ag.socketPath})
                    </option>
                  ))}
                  <option value="custom">Указать кастомный сокет / Named Pipe…</option>
                </select>
              </div>

              {agentPath === 'custom' && (
                <div>
                  <label className="block text-xs font-medium text-mut mb-1">
                    Путь к сокету агента или Named Pipe
                  </label>
                  <input
                    type="text"
                    value={agentPath === 'custom' ? '' : agentPath}
                    onChange={(e) => setAgentPath(e.target.value)}
                    placeholder={
                      navigator.platform.includes('Win')
                        ? '\\\\.\\pipe\\openssh-ssh-agent'
                        : '/tmp/ssh-agent.sock'
                    }
                    className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs font-mono outline-none"
                  />
                </div>
              )}

              <p className="text-[11px] text-mut leading-relaxed">
                TermDeck запросит авторизацию через локальный агент (OpenSSH, Pageant или 1Password). Вводить пароль или экспортировать ключ не требуется.
              </p>
            </div>
          )}

          {/* ForwardAgent Option */}
          <div className="flex items-start gap-2 pt-1 border-t border-line">
            <input
              type="checkbox"
              id="chk-forward-agent"
              checked={forwardAgent}
              onChange={(e) => setForwardAgent(e.target.checked)}
              className="mt-0.5 rounded border-line text-acc focus:ring-acc"
            />
            <div>
              <label
                htmlFor="chk-forward-agent"
                className="text-xs text-tx font-medium cursor-pointer flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-acc" />
                <span>Проброс SSH-агента на сервер (ForwardAgent)</span>
              </label>
              <p className="text-[10px] text-mut mt-0.5">
                Позволяет использовать ваши локальные ключи на удалённом сервере (для git clone, бастионов, CI) без копирования закрытых ключей на сервер.
              </p>
            </div>
          </div>

          {/* Jump Host (ProxyJump / Bastion) */}
          <div className="space-y-2 pt-1 border-t border-line">
            <label className="block text-xs font-medium text-mut mb-1">
              Jump Host (Бастион / ProxyJump)
            </label>
            <select
              value={jumpHostId}
              onChange={(e) => setJumpHostId(e.target.value)}
              className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs outline-none"
            >
              <option value="">Без jump host (прямое подключение)</option>
              {otherSshSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.username}@{s.host}:{s.port || 22})
                </option>
              ))}
            </select>

            {/* Jump Host Chain Visualizer */}
            {selectedJumpHost && (
              <div className="p-2.5 rounded bg-panel2 border border-acc/30 flex items-center justify-between text-[11px] text-tx">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-mut">Локальный ПК</span>
                  <ArrowRight className="w-3 h-3 text-acc" />
                  <span className="px-1.5 py-0.5 rounded bg-acc/15 text-acc font-mono">
                    {selectedJumpHost.name}
                  </span>
                  <ArrowRight className="w-3 h-3 text-acc" />
                  <span className="px-1.5 py-0.5 rounded bg-ok/15 text-ok font-mono">
                    {host || 'целевой хост'}:{port || 22}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Tags & Options */}
          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-line">
            <div>
              <label className="block text-xs font-medium text-mut mb-1">
                Теги (через запятую)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="prod, web, nginx"
                className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-mut mb-1">Keepalive (сек.)</label>
              <input
                type="number"
                value={keepaliveSec}
                onChange={(e) => setKeepaliveSec(Number(e.target.value))}
                min={0}
                className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs outline-none"
              />
            </div>
          </div>

          {profileNotice && (
            <div className="p-2 rounded bg-ok/15 border border-ok/30 text-ok text-[11px] flex items-center gap-1.5">
              <span>{profileNotice}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-line">
            <button
              type="button"
              onClick={handleSaveAsDefaultProfile}
              title="Сохранить текущие параметры как шаблон по умолчанию для новых сессий"
              className="py-1 px-2.5 rounded border border-line bg-panel2 hover:bg-bg text-mut hover:text-tx text-[11px] transition-colors"
            >
              Сохранить как профиль по умолчанию
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="py-1.5 px-3 rounded border border-line bg-panel2 text-tx text-xs hover:border-mut transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="py-1.5 px-4 rounded bg-acc hover:bg-acc/90 text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Сохранение…' : 'Сохранить'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {isNewFolderOpen && (
        <SessionFolderModal
          onSave={async (folderName) => {
            const newId = `f-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`
            await saveFolder({ id: newId, name: folderName })
            setFolderId(newId)
          }}
          onClose={() => setIsNewFolderOpen(false)}
        />
      )}
    </div>
  )
}
