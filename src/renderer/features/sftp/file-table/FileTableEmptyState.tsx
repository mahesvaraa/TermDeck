import { RefreshCw, AlertCircle } from 'lucide-react'
import type { SftpPanelState } from '@shared/types'

interface FileTableEmptyStateProps {
  state?: SftpPanelState
  errorMessage?: string | null
  onRetry?: () => void
}

export function FileTableEmptyState({
  state,
  errorMessage,
  onRetry
}: FileTableEmptyStateProps): JSX.Element {
  if (state === 'loading') {
    return (
      <div className="flex-1 p-3 space-y-2 animate-pulse select-none">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 py-1">
            <div className="w-4 h-4 rounded bg-panel2 flex-none" />
            <div
              className="h-3.5 rounded bg-panel2"
              style={{ width: `${Math.floor(25 + ((i * 17) % 55))}%` }}
            />
          </div>
        ))}
      </div>
    )
  }

  const isConnectingOrNotReady =
    errorMessage?.includes('не подключена') ||
    errorMessage?.includes('не готова') ||
    errorMessage?.toLowerCase().includes('connecting')

  const isPermDenied =
    !isConnectingOrNotReady &&
    (state === 'permission_denied' ||
      errorMessage?.toLowerCase().includes('permission') ||
      errorMessage?.toLowerCase().includes('доступ') ||
      errorMessage?.toLowerCase().includes('прав'))

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
      {isConnectingOrNotReady ? (
        <>
          <RefreshCw className="w-8 h-8 text-warn mb-2 opacity-80 animate-spin" />
          <div className="text-xs text-tx font-medium mb-1">Подключение к SSH/SFTP…</div>
          <div className="text-[11px] text-mut mb-3 max-w-[240px] leading-relaxed">
            Устанавливается соединение с сервером. Список файлов загрузится сразу после авторизации.
          </div>
        </>
      ) : isPermDenied ? (
        <>
          <AlertCircle className="w-8 h-8 text-err mb-2 opacity-80" />
          <div className="text-xs text-tx font-medium mb-1">Отказано в доступе</div>
          <div className="text-[11px] text-mut mb-3 max-w-[240px] leading-relaxed">
            У пользователя недостаточно прав для чтения этого каталога на сервере.
          </div>
        </>
      ) : (
        <>
          <AlertCircle className="w-8 h-8 text-warn mb-2 opacity-80" />
          <div className="text-xs text-tx font-medium mb-1">
            {errorMessage || 'Нет соединения с SFTP'}
          </div>
          <div className="text-[11px] text-mut mb-3 max-w-[240px] leading-relaxed">
            Проверьте статус подключения к серверу или повторите попытку.
          </div>
        </>
      )}

      {onRetry && !isConnectingOrNotReady && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1.5 py-1 px-3 border border-line rounded-md bg-panel2 text-tx text-xs hover:border-acc transition-colors"
        >
          <RefreshCw className="w-3 h-3 text-mut" />
          <span>Повторить</span>
        </button>
      )}
    </div>
  )
}
