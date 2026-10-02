import type { TransferItem as TransferItemType } from '../../mocks/types'
import { TransferItem } from './TransferItem'

interface TransferListProps {
  transfers: TransferItemType[]
  onPauseTransfer?: (id: string) => void
  onResumeTransfer?: (id: string) => void
  onCancelTransfer?: (id: string) => void
  onRetryTransfer?: (id: string) => void
}

export function TransferList({
  transfers,
  onPauseTransfer,
  onResumeTransfer,
  onCancelTransfer,
  onRetryTransfer
}: TransferListProps): JSX.Element {
  return (
    <div className="border-t border-line py-2 px-2.5 flex-none select-none text-xs">
      <div className="font-semibold text-tx mb-2">Передачи</div>

      {transfers.length === 0 ? (
        <div className="text-[11px] text-mut mb-2">Нет активных передач</div>
      ) : (
        <div className="space-y-1 mb-2 max-h-32 overflow-y-auto">
          {transfers.map((item) => (
            <TransferItem
              key={item.id}
              transfer={item}
              onPause={onPauseTransfer}
              onResume={onResumeTransfer}
              onCancel={onCancelTransfer}
              onRetry={onRetryTransfer}
            />
          ))}
        </div>
      )}

      <div className="text-[10px] text-mut leading-tight">
        Двойной клик — открыть папку · перетащите файл сюда, чтобы загрузить
      </div>
    </div>
  )
}
