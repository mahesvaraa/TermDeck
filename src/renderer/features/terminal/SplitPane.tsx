import { X } from 'lucide-react'
import type { TabData } from '../../stores/tabs-store'
import type { SplitPaneLeaf } from '@shared/types'
import { TerminalView } from './TerminalView'

interface SplitPaneProps {
  tab: TabData
  leaf: SplitPaneLeaf
  isActive: boolean
  isFocused: boolean
  showPaneHeader: boolean
  onFocus: () => void
  onClose: () => void
  onReconnect?: () => void
}

export function SplitPane({
  tab,
  leaf,
  isActive,
  isFocused,
  showPaneHeader,
  onFocus,
  onClose,
  onReconnect
}: SplitPaneProps): JSX.Element {
  // Construct a synthetic tab object pointing to this leaf's channel or terminal id
  const paneTab: TabData = {
    ...tab,
    channelId: leaf.channelId,
    terminalId: leaf.terminalId
  }

  return (
    <div
      onClick={onFocus}
      className={`relative w-full h-full flex flex-col min-w-0 min-h-0 bg-term overflow-hidden transition-all ${
        showPaneHeader && isFocused ? 'ring-1 ring-acc/60' : ''
      }`}
    >
      {/* Pane header (only visible when there are multiple splits) */}
      {showPaneHeader && (
        <div
          className={`flex items-center justify-between px-2 py-0.5 border-b text-[11px] font-mono select-none flex-none transition-colors ${
            isFocused
              ? 'bg-panel2/90 border-acc/40 text-tx'
              : 'bg-panel/70 border-line/60 text-mut hover:text-tx'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            <span className={`w-1.5 h-1.5 rounded-full ${isFocused ? 'bg-acc' : 'bg-mut/50'}`} />
            <span className="truncate">
              {tab.type === 'ssh' ? `${tab.host}` : 'Локальный shell'}
              {leaf.channelId ? ` · ${leaf.channelId.slice(0, 6)}` : ''}
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            title="Закрыть панель терминала"
            className="p-0.5 rounded text-mut hover:text-err hover:bg-bg/50 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Terminal Viewport */}
      <div className="flex-1 min-h-0 min-w-0 relative">
        <TerminalView tab={paneTab} isActive={isActive && isFocused} onReconnect={onReconnect} />
      </div>
    </div>
  )
}
