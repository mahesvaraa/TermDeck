import { useState } from 'react'
import { DiffEditor } from '@monaco-editor/react'
import { X, GitCompare, SplitSquareVertical } from 'lucide-react'

interface FileDiffModalProps {
  isOpen: boolean
  onClose: () => void
  leftTitle: string
  rightTitle: string
  originalContent: string
  modifiedContent: string
  language?: string
}

export function FileDiffModal({
  isOpen,
  onClose,
  leftTitle,
  rightTitle,
  originalContent,
  modifiedContent,
  language = 'plaintext'
}: FileDiffModalProps): JSX.Element | null {
  const [sideBySide, setSideBySide] = useState(true)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-5xl h-[80vh] flex flex-col bg-panel border border-line rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-line bg-panel2/80">
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-acc" />
            <h3 className="text-xs font-semibold text-tx">Сравнение файлов (Diff)</h3>
            <span className="text-[11px] text-mut font-mono">
              ({leftTitle} ⇄ {rightTitle})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSideBySide(!sideBySide)}
              title={
                sideBySide
                  ? 'Переключить на построчное отображение изменений'
                  : 'Переключить на отображение бок о бок'
              }
              className="flex items-center gap-1 py-1 px-2.5 rounded border border-line bg-panel text-tx text-xs hover:border-mut transition-colors"
            >
              <SplitSquareVertical className="w-3.5 h-3.5 text-mut" />
              <span>{sideBySide ? 'Бок о бок' : 'В строках'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              title="Закрыть (Esc)"
              className="p-1 rounded text-mut hover:text-tx hover:bg-panel transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Diff Container */}
        <div className="flex-1 min-h-0 min-w-0 bg-term relative">
          <DiffEditor
            height="100%"
            language={language}
            original={originalContent}
            modified={modifiedContent}
            theme="termdeck-theme"
            options={{
              renderSideBySide: sideBySide,
              readOnly: true,
              fontSize: 13,
              fontFamily: "'JetBrains Mono', monospace",
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              automaticLayout: true
            }}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-line bg-panel2/60 text-xs">
          <div className="flex items-center gap-4 text-[11px] font-mono text-mut">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-err/30 border border-err/50" />
              <span>{leftTitle} (Оригинал)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-ok/30 border border-ok/50" />
              <span>{rightTitle} (Изменённый)</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="py-1 px-3 rounded bg-panel border border-line hover:border-mut text-tx text-xs transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}
