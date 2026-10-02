import { useState, useEffect, useCallback } from 'react'
import {
  X,
  Plus,
  Play,
  Square,
  Trash2,
  Edit2,
  AlertCircle,
  Network,
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react'
import type { TunnelConfig, TunnelType } from '@shared/types'

interface TunnelsModalProps {
  isOpen: boolean
  onClose: () => void
  sessionId?: string
  sessionName?: string
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function TunnelsModal({
  isOpen,
  onClose,
  sessionId,
  sessionName
}: TunnelsModalProps): JSX.Element | null {
  const [tunnels, setTunnels] = useState<TunnelConfig[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingTunnel, setEditingTunnel] = useState<Partial<TunnelConfig> | null>(null)
  const [errorNotice, setErrorNotice] = useState<string | null>(null)

  const loadTunnels = useCallback(async (): Promise<void> => {
    if (!window.api?.listTunnels) return
    try {
      const list = await window.api.listTunnels(sessionId ? { sessionId } : undefined)
      setTunnels(list)
    } catch (err) {
      console.error('Failed to load tunnels:', err)
    }
  }, [sessionId])

  useEffect(() => {
    if (isOpen) {
      loadTunnels()
      const timer = setInterval(loadTunnels, 2000)
      return () => clearInterval(timer)
    }
    return undefined
  }, [isOpen, loadTunnels])

  if (!isOpen) return null

  const handleToggleTunnel = async (tunnel: TunnelConfig): Promise<void> => {
    setErrorNotice(null)
    try {
      if (tunnel.status === 'active') {
        const updated = await window.api?.stopTunnel(tunnel.id)
        if (updated) {
          setTunnels((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
        }
      } else {
        const updated = await window.api?.startTunnel(tunnel)
        if (updated) {
          setTunnels((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
        }
      }
    } catch (err) {
      setErrorNotice((err as Error).message)
      await loadTunnels()
    }
  }

  const handleDelete = async (id: string): Promise<void> => {
    if (!window.api?.deleteTunnel) return
    setErrorNotice(null)
    try {
      await window.api.deleteTunnel(id)
      setTunnels((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      setErrorNotice((err as Error).message)
    }
  }

  const handleSaveEdit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!editingTunnel || !window.api?.saveTunnel) return
    setErrorNotice(null)
    setIsLoading(true)

    try {
      const payload: TunnelConfig = {
        id: editingTunnel.id || `tun-${Date.now().toString(36)}`,
        sessionId: editingTunnel.sessionId || sessionId || '',
        name: editingTunnel.name || 'Новый туннель',
        type: (editingTunnel.type || 'local') as TunnelType,
        enabled: editingTunnel.enabled ?? false,
        autoStart: editingTunnel.autoStart ?? false,
        localHost: editingTunnel.localHost || '127.0.0.1',
        localPort: editingTunnel.localPort ? Number(editingTunnel.localPort) : undefined,
        dstHost: editingTunnel.dstHost || '127.0.0.1',
        dstPort: editingTunnel.dstPort ? Number(editingTunnel.dstPort) : undefined,
        remoteHost: editingTunnel.remoteHost || '127.0.0.1',
        remotePort: editingTunnel.remotePort ? Number(editingTunnel.remotePort) : undefined,
        socksPort: editingTunnel.socksPort ? Number(editingTunnel.socksPort) : undefined
      }

      const saved = await window.api.saveTunnel(payload)
      setTunnels((prev) => {
        const exists = prev.some((t) => t.id === saved.id)
        if (exists) {
          return prev.map((t) => (t.id === saved.id ? saved : t))
        }
        return [...prev, saved]
      })
      setEditingTunnel(null)
    } catch (err) {
      setErrorNotice((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans select-none">
      <div className="bg-panel2 border border-line rounded-lg shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] text-tx text-xs">
        {/* Header */}
        <div className="px-4 py-3 border-b border-line flex items-center justify-between bg-panel/70">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-acc" />
            <span className="font-semibold text-sm">
              SSH-туннели {sessionName ? `· ${sessionName}` : ''}
            </span>
            <span className="text-mut text-[11px] font-mono">
              ({tunnels.filter((t) => t.status === 'active').length} активных)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!editingTunnel && (
              <button
                type="button"
                onClick={() =>
                  setEditingTunnel({
                    id: '',
                    sessionId: sessionId || '',
                    name: 'Новый туннель',
                    type: 'local',
                    localHost: '127.0.0.1',
                    localPort: 8080,
                    dstHost: '127.0.0.1',
                    dstPort: 80,
                    autoStart: false
                  })
                }
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-acc text-bg font-medium hover:bg-acc/90 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Добавить туннель</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-mut hover:text-tx hover:bg-panel transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error notification banner */}
        {errorNotice && (
          <div className="px-4 py-2 bg-err/15 border-b border-err/30 text-err flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 flex-none" />
            <span className="flex-1 truncate">{errorNotice}</span>
            <button
              type="button"
              onClick={() => setErrorNotice(null)}
              className="text-err hover:underline"
            >
              Закрыть
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {editingTunnel ? (
            /* Edit Form */
            <form onSubmit={handleSaveEdit} className="space-y-4 max-w-xl mx-auto py-2">
              <h4 className="text-sm font-semibold border-b border-line pb-2">
                {editingTunnel.id ? 'Редактировать туннель' : 'Настройка нового туннеля'}
              </h4>

              <div>
                <label className="block text-xs font-medium text-mut mb-1">Название туннеля</label>
                <input
                  type="text"
                  required
                  value={editingTunnel.name || ''}
                  onChange={(e) => setEditingTunnel({ ...editingTunnel, name: e.target.value })}
                  placeholder="PostgreSQL / Web / SOCKS Proxy"
                  className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs outline-none"
                />
              </div>

              {/* Tunnel Type Selection */}
              <div>
                <label className="block text-xs font-medium text-mut mb-1.5">
                  Тип перенаправления
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTunnel({ ...editingTunnel, type: 'local' })}
                    className={`p-2 rounded border text-left transition-colors ${
                      editingTunnel.type === 'local'
                        ? 'border-acc bg-acc/10 text-tx'
                        : 'border-line bg-panel hover:border-tx/40 text-mut'
                    }`}
                  >
                    <div className="font-semibold text-xs text-tx">Локальный (-L)</div>
                    <div className="text-[10px] text-mut mt-0.5">Порт ПК → удалённый сервис</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingTunnel({ ...editingTunnel, type: 'remote' })}
                    className={`p-2 rounded border text-left transition-colors ${
                      editingTunnel.type === 'remote'
                        ? 'border-acc bg-acc/10 text-tx'
                        : 'border-line bg-panel hover:border-tx/40 text-mut'
                    }`}
                  >
                    <div className="font-semibold text-xs text-tx">Удалённый (-R)</div>
                    <div className="text-[10px] text-mut mt-0.5">Порт сервера → локальный ПК</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingTunnel({ ...editingTunnel, type: 'dynamic' })}
                    className={`p-2 rounded border text-left transition-colors ${
                      editingTunnel.type === 'dynamic'
                        ? 'border-acc bg-acc/10 text-tx'
                        : 'border-line bg-panel hover:border-tx/40 text-mut'
                    }`}
                  >
                    <div className="font-semibold text-xs text-tx">Динамический (-D)</div>
                    <div className="text-[10px] text-mut mt-0.5">Локальный SOCKS5 прокси</div>
                  </button>
                </div>
              </div>

              {/* Type-Specific Port Fields */}
              {editingTunnel.type === 'local' && (
                <div className="space-y-3 p-3 bg-panel/40 rounded border border-line">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-mut mb-1">
                        Локальный порт (на ПК)
                      </label>
                      <input
                        type="number"
                        required
                        value={editingTunnel.localPort || ''}
                        onChange={(e) =>
                          setEditingTunnel({
                            ...editingTunnel,
                            localPort: Number(e.target.value)
                          })
                        }
                        placeholder="5432"
                        className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs font-mono outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-mut mb-1">
                        Локальный адрес привязки
                      </label>
                      <input
                        type="text"
                        value={editingTunnel.localHost || '127.0.0.1'}
                        onChange={(e) =>
                          setEditingTunnel({ ...editingTunnel, localHost: e.target.value })
                        }
                        placeholder="127.0.0.1"
                        className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs font-mono outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-mut mb-1">
                        Целевой хост (от сервера)
                      </label>
                      <input
                        type="text"
                        required
                        value={editingTunnel.dstHost || '127.0.0.1'}
                        onChange={(e) =>
                          setEditingTunnel({ ...editingTunnel, dstHost: e.target.value })
                        }
                        placeholder="127.0.0.1 или internal.db"
                        className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs font-mono outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-mut mb-1">
                        Целевой порт
                      </label>
                      <input
                        type="number"
                        required
                        value={editingTunnel.dstPort || ''}
                        onChange={(e) =>
                          setEditingTunnel({
                            ...editingTunnel,
                            dstPort: Number(e.target.value)
                          })
                        }
                        placeholder="5432"
                        className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs font-mono outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {editingTunnel.type === 'remote' && (
                <div className="space-y-3 p-3 bg-panel/40 rounded border border-line">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-mut mb-1">
                        Удалённый порт (на сервере)
                      </label>
                      <input
                        type="number"
                        required
                        value={editingTunnel.remotePort || ''}
                        onChange={(e) =>
                          setEditingTunnel({
                            ...editingTunnel,
                            remotePort: Number(e.target.value)
                          })
                        }
                        placeholder="8080"
                        className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs font-mono outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-mut mb-1">
                        Удалённый адрес привязки
                      </label>
                      <input
                        type="text"
                        value={editingTunnel.remoteHost || '127.0.0.1'}
                        onChange={(e) =>
                          setEditingTunnel({ ...editingTunnel, remoteHost: e.target.value })
                        }
                        placeholder="127.0.0.1"
                        className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs font-mono outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-mut mb-1">
                        Локальный хост назначения (ПК)
                      </label>
                      <input
                        type="text"
                        value={editingTunnel.dstHost || '127.0.0.1'}
                        onChange={(e) =>
                          setEditingTunnel({ ...editingTunnel, dstHost: e.target.value })
                        }
                        placeholder="127.0.0.1"
                        className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs font-mono outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-mut mb-1">
                        Локальный порт назначения
                      </label>
                      <input
                        type="number"
                        required
                        value={editingTunnel.dstPort || ''}
                        onChange={(e) =>
                          setEditingTunnel({
                            ...editingTunnel,
                            dstPort: Number(e.target.value)
                          })
                        }
                        placeholder="3000"
                        className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs font-mono outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {editingTunnel.type === 'dynamic' && (
                <div className="space-y-3 p-3 bg-panel/40 rounded border border-line">
                  <div>
                    <label className="block text-xs font-medium text-mut mb-1">
                      Локальный порт SOCKS5 (на ПК)
                    </label>
                    <input
                      type="number"
                      required
                      value={editingTunnel.socksPort || ''}
                      onChange={(e) =>
                        setEditingTunnel({
                          ...editingTunnel,
                          socksPort: Number(e.target.value)
                        })
                      }
                      placeholder="1080"
                      className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs font-mono outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-autostart"
                  checked={editingTunnel.autoStart || false}
                  onChange={(e) =>
                    setEditingTunnel({ ...editingTunnel, autoStart: e.target.checked })
                  }
                  className="rounded border-line text-acc focus:ring-acc"
                />
                <label htmlFor="chk-autostart" className="text-xs text-tx cursor-pointer">
                  Запускать автоматически при подключении SSH-сессии
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setEditingTunnel(null)}
                  className="px-3 py-1.5 rounded border border-line text-mut hover:text-tx hover:bg-panel transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-1.5 rounded bg-acc text-bg font-medium hover:bg-acc/90 transition-colors"
                >
                  {isLoading ? 'Сохранение…' : 'Сохранить туннель'}
                </button>
              </div>
            </form>
          ) : tunnels.length === 0 ? (
            /* Empty State */
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <Network className="w-10 h-10 text-mut/40 mb-3" />
              <p className="text-sm font-semibold text-tx mb-1">Нет настроенных туннелей</p>
              <p className="text-xs text-mut max-w-sm mb-4">
                Вы можете настроить локальный проброс портов (например, для доступа к удалённой БД),
                обратный туннель или динамический SOCKS5 прокси.
              </p>
              <button
                type="button"
                onClick={() =>
                  setEditingTunnel({
                    id: '',
                    sessionId: sessionId || '',
                    name: 'Локальный порт БД',
                    type: 'local',
                    localPort: 5432,
                    dstHost: '127.0.0.1',
                    dstPort: 5432,
                    autoStart: false
                  })
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-acc text-bg font-medium hover:bg-acc/90 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Создать первый туннель</span>
              </button>
            </div>
          ) : (
            /* Table of Tunnels */
            <div className="border border-line rounded overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-panel border-b border-line text-mut font-medium text-[11px]">
                    <th className="py-2 px-3">Статус</th>
                    <th className="py-2 px-3">Имя</th>
                    <th className="py-2 px-3">Тип</th>
                    <th className="py-2 px-3">Маршрут</th>
                    <th className="py-2 px-3">Трафик</th>
                    <th className="py-2 px-3 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/40">
                  {tunnels.map((t) => (
                    <tr key={t.id} className="hover:bg-panel/40 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          {t.status === 'active' ? (
                            <span className="flex items-center gap-1 text-ok font-medium">
                              <span className="w-2 h-2 rounded-full bg-ok animate-pulse" />
                              Активен
                            </span>
                          ) : t.status === 'error' ? (
                            <span
                              className="flex items-center gap-1 text-err font-medium cursor-help"
                              title={t.errorMessage}
                            >
                              <span className="w-2 h-2 rounded-full bg-err" />
                              Ошибка
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-mut">
                              <span className="w-2 h-2 rounded-full bg-mut/50" />
                              Выключен
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 font-medium text-tx">
                        {t.name}
                        {t.autoStart && (
                          <span className="ml-1.5 text-[10px] text-acc bg-acc/10 px-1 py-0.5 rounded">
                            авто
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-[11px] text-mut">
                        {t.type === 'local' && (
                          <span className="bg-panel px-1.5 py-0.5 rounded border border-line">
                            Local (-L)
                          </span>
                        )}
                        {t.type === 'remote' && (
                          <span className="bg-panel px-1.5 py-0.5 rounded border border-line">
                            Remote (-R)
                          </span>
                        )}
                        {t.type === 'dynamic' && (
                          <span className="bg-panel px-1.5 py-0.5 rounded border border-line">
                            SOCKS5 (-D)
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-[11px] text-tx">
                        {t.type === 'local' && (
                          <div className="flex items-center gap-1">
                            <span>
                              {t.localHost || '127.0.0.1'}:{t.localPort}
                            </span>
                            <ArrowRight className="w-3 h-3 text-mut" />
                            <span className="text-acc">
                              {t.dstHost}:{t.dstPort}
                            </span>
                          </div>
                        )}
                        {t.type === 'remote' && (
                          <div className="flex items-center gap-1">
                            <span>
                              {t.remoteHost || '0.0.0.0'}:{t.remotePort}
                            </span>
                            <ArrowRight className="w-3 h-3 text-mut" />
                            <span className="text-acc">
                              {t.dstHost}:{t.dstPort}
                            </span>
                          </div>
                        )}
                        {t.type === 'dynamic' && <div>127.0.0.1:{t.socksPort}</div>}
                      </td>

                      <td className="py-2.5 px-3 text-[11px] font-mono text-mut">
                        ↓ {formatBytes(t.bytesIn)} / ↑ {formatBytes(t.bytesOut)}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleTunnel(t)}
                            title={t.status === 'active' ? 'Остановить' : 'Запустить'}
                            className={`p-1.5 rounded transition-colors ${
                              t.status === 'active'
                                ? 'bg-err/15 text-err hover:bg-err/25'
                                : 'bg-ok/15 text-ok hover:bg-ok/25'
                            }`}
                          >
                            {t.status === 'active' ? (
                              <Square className="w-3.5 h-3.5 fill-current" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditingTunnel(t)}
                            title="Редактировать"
                            className="p-1.5 rounded text-mut hover:text-tx hover:bg-panel transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(t.id)}
                            title="Удалить"
                            className="p-1.5 rounded text-mut hover:text-err hover:bg-panel transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-line bg-panel/40 flex items-center justify-between text-mut text-[11px]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-ok" />
            <span>Все туннели автоматически завершаются при закрытии сессии</span>
          </div>

          <button
            type="button"
            onClick={loadTunnels}
            className="flex items-center gap-1 text-tx hover:text-acc transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Обновить</span>
          </button>
        </div>
      </div>
    </div>
  )
}
