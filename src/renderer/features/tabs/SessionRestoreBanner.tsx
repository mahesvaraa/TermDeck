import { RotateCcw, X } from 'lucide-react'

interface SessionRestoreBannerProps {
  count: number
  onRestore: () => void
  onDismiss: () => void
}

export function SessionRestoreBanner({
  count,
  onRestore,
  onDismiss
}: SessionRestoreBannerProps): JSX.Element {
  return (
    <div className="flex items-center justify-between px-3 py-1 bg-acc/15 border-b border-acc/30 text-tx text-xs flex-none select-none z-20 animate-in fade-in duration-150">
      <div className="flex items-center gap-2">
        <RotateCcw className="w-3.5 h-3.5 text-acc flex-none" />
        <span>
          Обнаружен предыдущий сеанс ({count} {count === 1 ? 'вкладка' : 'вкладок'}). Восстановить?
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRestore}
          className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-acc text-bg font-medium hover:bg-acc/90 text-xs transition-colors"
        >
          <span>Восстановить</span>
        </button>

        <button
          type="button"
          onClick={onDismiss}
          title="Начать с чистого листа"
          className="p-1 rounded text-mut hover:text-tx hover:bg-panel transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
