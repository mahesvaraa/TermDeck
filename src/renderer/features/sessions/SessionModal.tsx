import { useState, type FormEvent } from 'react'
import { X, Server, KeyRound, Lock, Folder } from 'lucide-react'
import type { SessionConfig } from '@shared/types'
import { useSessionsStore } from '../../stores/sessions-store'

interface SessionModalProps {
  session?: SessionConfig
  onClose: () => void
  onSaved?: (session: SessionConfig) => void
}

export function SessionModal({ session, onClose, onSaved }: SessionModalProps): JSX.Element {
  const folders = useSessionsStore((s) => s.folders)
  const saveSession = useSessionsStore((s) => s.saveSession)
  const allSessions = useSessionsStore((s) => s.sessions)

  const [name, setName] = useState(session?.name || '')
  const [host, setHost] = useState(session?.host || '')
  const [port, setPort] = useState(session?.port || 22)
  const [username, setUsername] = useState(session?.username || '')
  const [folderId, setFolderId] = useState(session?.folderId || '')
  const [auth, setAuth] = useState<'password' | 'key' | 'agent'>(session?.auth || 'password')
  const [secret, setSecret] = useState('')
  const [keyPath, setKeyPath] = useState(session?.keyPath || '~/.ssh/id_ed25519')
  const [tags, setTags] = useState(session?.tags?.join(', ') || '')
  const [keepaliveSec, setKeepaliveSec] = useState(session?.keepaliveSec || 30)
  const [jumpHostId, setJumpHostId] = useState(session?.jumpHostId || '')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const otherSshSessions = allSessions.filter((s) => s.id !== session?.id)

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
              <label className="block text-xs font-medium text-mut mb-1">Папка</label>
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

          {/* Jump Host (ProxyJump / Bastion) */}
          <div>
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

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
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
        </form>
      </div>
    </div>
  )
}
