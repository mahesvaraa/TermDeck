import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'

export function UpdatesSection(): JSX.Element {
  const [updaterStatus, setUpdaterStatus] = useState<{
    status: string
    version?: string
    percent?: number
    error?: string
  } | null>(null)
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)

  useEffect(() => {
    if (!window.api?.onUpdaterStatus) return
    const unsubscribe = window.api.onUpdaterStatus((status) => {
      setUpdaterStatus(status)
      if (status.status !== 'checking') {
        setIsCheckingUpdate(false)
      }
    })
    return () => unsubscribe()
  }, [])

  return (
    <div className="space-y-4 text-xs">
      <h4 className="text-sm font-semibold border-b border-line pb-2">
        Обновления приложения
      </h4>

      <div className="p-4 bg-panel rounded border border-line space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-tx">Версия TermDeck</div>
            <div className="text-[11px] text-mut">v0.1.0</div>
          </div>

          <button
            type="button"
            disabled={isCheckingUpdate}
            onClick={async () => {
              setIsCheckingUpdate(true)
              try {
                await window.api?.checkForUpdates(true)
              } catch {
                // Handled by event
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-acc text-bg font-medium hover:bg-acc/90 disabled:opacity-50 text-xs transition-colors"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`}
            />
            <span>{isCheckingUpdate ? 'Проверка…' : 'Проверить обновления'}</span>
          </button>
        </div>

        {updaterStatus && (
          <div className="mt-3 p-2.5 rounded bg-panel2 border border-line text-xs">
            {updaterStatus.status === 'checking' && (
              <div className="text-mut">Выполняется поиск новых версий…</div>
            )}
            {updaterStatus.status === 'available' && (
              <div className="text-acc">
                Доступна новая версия: {updaterStatus.version || ''}. Начинается загрузка…
              </div>
            )}
            {updaterStatus.status === 'not-available' && (
              <div className="text-ok">У вас установлена последняя версия TermDeck.</div>
            )}
            {updaterStatus.status === 'downloading' && (
              <div className="space-y-1">
                <div className="flex justify-between text-tx">
                  <span>Загрузка обновления…</span>
                  <span>{updaterStatus.percent || 0}%</span>
                </div>
                <div className="w-full bg-line rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-acc h-1.5 transition-all duration-300"
                    style={{ width: `${updaterStatus.percent || 0}%` }}
                  />
                </div>
              </div>
            )}
            {updaterStatus.status === 'downloaded' && (
              <div className="flex items-center justify-between">
                <span className="text-ok font-medium">
                  Обновление {updaterStatus.version || ''} готово к установке
                </span>
                <button
                  type="button"
                  onClick={() => window.api?.installUpdate()}
                  className="px-2.5 py-1 rounded bg-ok text-bg font-medium hover:bg-ok/90 text-xs"
                >
                  Перезапустить сейчас
                </button>
              </div>
            )}
            {updaterStatus.status === 'error' && (
              <div className="text-err">
                {updaterStatus.error || 'Ошибка проверки обновлений'}
              </div>
            )}
          </div>
        )}

        <p className="text-[11px] text-mut leading-relaxed">
          TermDeck автоматически проверяет доступность обновлений при старте и загружает
          их в фоновом режиме.
        </p>
      </div>
    </div>
  )
}
