import { ArrowUp, ArrowDown, RotateCcw, Pause, Play, X } from 'lucide-react'
import type { TransferItem as TransferItemType } from '@shared/types'

interface TransferItemProps {
  transfer: TransferItemType
  onPause?: (id: string) => void
  onResume?: (id: string) => void
  onCancel?: (id: string) => void
  onRetry?: (id: string) => void
}

export function TransferItem({
  transfer,
  onPause,
  onResume,
  onCancel,
  onRetry
}: TransferItemProps): JSX.Element {
  const isUpload = transfer.direction === 'upload'

  const renderStatus = (): JSX.Element => {
    switch (transfer.status) {
      case 'queued':
        return <span className="text-mut text-[11px]">· в очереди</span>
      case 'paused':
        return <span className="text-warn text-[11px]">· пауза</span>
      case 'completed':
        return <span className="text-ok text-[11px]">· готово</span>
      case 'cancelled':
        return <span className="text-mut text-[11px]">· отменено</span>
      case 'error':
        return (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-err text-[11px]">
              {transfer.errorMessage || '· ошибка передачи'}
            </span>
          </div>
        )
      case 'in_progress':
      default:
        return (
          <span className="text-mut text-[11px]">
            · {transfer.progress}%{transfer.speed ? ` · ${transfer.speed}` : ''}
            {transfer.eta ? ` · ${transfer.eta}` : ''}
          </span>
        )
    }
  }

  return (
    <div className="text-xs mb-2 last:mb-0">
      <div className="flex items-center justify-between gap-1 text-tx">
        <div className="flex items-center gap-1 truncate flex-1 min-w-0">
          {isUpload ? (
            <ArrowUp className="w-3 h-3 text-acc flex-none" />
          ) : (
            <ArrowDown className="w-3 h-3 text-ok flex-none" />
          )}
          <span className="font-medium truncate">{transfer.fileName}</span>
          {transfer.status !== 'error' && <span className="flex-none">{renderStatus()}</span>}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 flex-none ml-1">
          {transfer.status === 'in_progress' && onPause && (
            <button
              type="button"
              onClick={() => onPause(transfer.id)}
              title="Приостановить"
              className="p-0.5 text-mut hover:text-tx transition-colors"
            >
              <Pause className="w-2.5 h-2.5" />
            </button>
          )}

          {transfer.status === 'paused' && onResume && (
            <button
              type="button"
              onClick={() => onResume(transfer.id)}
              title="Продолжить"
              className="p-0.5 text-mut hover:text-tx transition-colors"
            >
              <Play className="w-2.5 h-2.5" />
            </button>
          )}

          {(transfer.status === 'error' || transfer.status === 'cancelled') && onRetry && (
            <button
              type="button"
              onClick={() => onRetry(transfer.id)}
              title="Повторить"
              className="p-0.5 text-acc hover:text-acc/80 transition-colors"
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
          )}

          {(transfer.status === 'in_progress' ||
            transfer.status === 'paused' ||
            transfer.status === 'queued') &&
            onCancel && (
              <button
                type="button"
                onClick={() => onCancel(transfer.id)}
                title="Отменить"
                className="p-0.5 text-mut hover:text-err transition-colors"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
        </div>
      </div>

      {transfer.status === 'error' && renderStatus()}

      {(transfer.status === 'in_progress' || transfer.status === 'paused') && (
        <div className="h-[5px] bg-bg rounded-[3px] my-1 overflow-hidden">
          <div
            className={`h-full rounded-[3px] transition-all duration-300 ${
              transfer.status === 'paused' ? 'bg-warn' : 'bg-acc'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, transfer.progress))}%` }}
          />
        </div>
      )}
    </div>
  )
}
