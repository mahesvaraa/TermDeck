import { useState, useRef, useEffect, useCallback } from 'react'
import Editor, { loader, type OnMount } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { TabData } from '../../stores/tabs-store'
import { useTabsStore } from '../../stores/tabs-store'
import { useSettingsStore } from '../../stores/settings-store'
import { getLanguageFromPath } from '../../utils/editor-languages'
import { EditorConflictModal } from './EditorConflictModal'

// Configure Monaco to use local bundled package (strictly offline / CSP compliant)
loader.config({ monaco })

function getCssToken(name: string): string {
  if (typeof window === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function applyMonacoTheme(monacoInstance: typeof monaco): void {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light'
  const term = getCssToken('--term')
  const termtx = getCssToken('--termtx')
  const panel2 = getCssToken('--panel2')
  const mut = getCssToken('--mut')
  const acc = getCssToken('--acc')

  monacoInstance.editor.defineTheme('termdeck-theme', {
    base: isLight ? 'vs' : 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': term,
      'editor.foreground': termtx,
      'editor.lineHighlightBackground': panel2,
      'editorLineNumber.foreground': mut,
      'editorLineNumber.activeForeground': acc,
      'editor.selectionBackground': panel2,
      'editorCursor.foreground': acc
    }
  })
  monacoInstance.editor.setTheme('termdeck-theme')
}

interface RemoteEditorProps {
  tab: TabData
  isActive: boolean
}

export function RemoteEditor({ tab, isActive }: RemoteEditorProps): JSX.Element {
  const editorState = tab.editorState
  const theme = useSettingsStore((s) => s.theme)
  const updateEditorContent = useTabsStore((s) => s.updateEditorContent)
  const updateEditorEncoding = useTabsStore((s) => s.updateEditorEncoding)
  const updateEditorLineEndings = useTabsStore((s) => s.updateEditorLineEndings)
  const markEditorSaved = useTabsStore((s) => s.markEditorSaved)

  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 })
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Rebuild Monaco theme whenever the application theme changes
  useEffect(() => {
    applyMonacoTheme(monaco)
  }, [theme])

  // Conflict modal state
  const [conflictData, setConflictData] = useState<{
    serverMtime: number
    serverSize: number
  } | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null)

  const handleEditorMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor
    applyMonacoTheme(monacoInstance)

    editor.onDidChangeCursorPosition((e) => {
      setCursorPos({
        line: e.position.lineNumber,
        col: e.position.column
      })
    })

    // Custom Ctrl+S command within Monaco
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, () => {
      handleSave(false, false)
    })

    if (isActive) {
      editor.focus()
    }
  }

  // Refocus on tab activation
  useEffect(() => {
    if (isActive && editorRef.current) {
      editorRef.current.focus()
      editorRef.current.layout()
    }
  }, [isActive])

  const handleSave = useCallback(
    async (forceOverwrite = false, saveAsCopy = false): Promise<void> => {
      if (!editorState || !window.api?.editorSaveFile) return

      setIsSaving(true)
      setSaveError(null)

      try {
        const res = await window.api.editorSaveFile({
          sessionId: editorState.sessionId,
          remotePath: editorState.remotePath,
          content: editorState.content,
          expectedMtime: editorState.mtime,
          expectedSize: editorState.size,
          forceOverwrite,
          saveAsCopy
        })

        if (res.conflict) {
          setConflictData({
            serverMtime: res.currentMtime || Date.now(),
            serverSize: res.currentSize || 0
          })
          setIsSaving(false)
          return
        }

        if (res.success && res.newMtime !== undefined && res.newSize !== undefined) {
          markEditorSaved(tab.id, res.newMtime, res.newSize, res.savedPath)
          setConflictData(null)
        }
      } catch (err) {
        setSaveError((err as Error).message)
      } finally {
        setIsSaving(false)
      }
    },
    [editorState, tab.id, markEditorSaved]
  )

  if (!editorState) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-term text-mut text-xs">
        Данные файла отсутствуют
      </div>
    )
  }

  const language = getLanguageFromPath(editorState.remotePath)
  const isDirty = editorState.isDirty

  return (
    <div className="relative w-full h-full flex flex-col min-w-0 min-h-0 bg-term overflow-hidden font-sans">
      {/* Editor Body */}
      <div className="flex-1 min-h-0 min-w-0 relative">
        <Editor
          height="100%"
          language={language}
          value={editorState.content}
          theme="termdeck-dark"
          onChange={(val) => updateEditorContent(tab.id, val || '')}
          onMount={handleEditorMount}
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace",
            lineHeight: 20,
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 2,
            renderWhitespace: 'selection'
          }}
        />
      </div>

      {/* Editor Status Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-panel border-t border-line text-[11px] font-mono text-mut flex-none select-none">
        <div className="flex items-center gap-3 truncate">
          <span className="truncate text-tx/80" title={editorState.remotePath}>
            {editorState.remotePath}
          </span>

          {isDirty ? (
            <span className="flex items-center gap-1 text-warn text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-warn" />
              Не сохранено
            </span>
          ) : (
            <span className="flex items-center gap-1 text-ok text-[10px]">
              <CheckCircle2 className="w-3 h-3 text-ok" />
              Сохранено
            </span>
          )}

          {saveError && (
            <span className="flex items-center gap-1 text-err text-[10px]" title={saveError}>
              <AlertCircle className="w-3 h-3 text-err" />
              Ошибка: {saveError}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 flex-none">
          {/* Cursor info */}
          <span>
            Стр {cursorPos.line}, Кол {cursorPos.col}
          </span>

          {/* Line Endings Selector */}
          <button
            type="button"
            onClick={() =>
              updateEditorLineEndings(tab.id, editorState.lineEndings === 'LF' ? 'CRLF' : 'LF')
            }
            title="Клик для переключения окончаний строк"
            className="hover:text-tx hover:underline"
          >
            {editorState.lineEndings}
          </button>

          {/* Encoding Selector */}
          <select
            value={editorState.encoding}
            onChange={(e) => updateEditorEncoding(tab.id, e.target.value)}
            className="bg-panel2 border border-line rounded px-1 text-[11px] text-tx outline-none cursor-pointer"
          >
            <option value="UTF-8">UTF-8</option>
            <option value="Windows-1251">Windows-1251</option>
            <option value="ISO-8859-1">ISO-8859-1</option>
            <option value="ASCII">ASCII</option>
          </select>

          {/* Save Button */}
          <button
            type="button"
            disabled={!isDirty || isSaving}
            onClick={() => handleSave(false, false)}
            title="Сохранить файл на сервере (Ctrl+S)"
            className={`flex items-center gap-1 px-2 py-0.5 rounded font-sans text-xs transition-colors ${
              isDirty && !isSaving
                ? 'bg-acc text-bg font-medium hover:bg-acc/90 cursor-pointer'
                : 'bg-panel2 border border-line text-mut/50 cursor-not-allowed'
            }`}
          >
            <Save className="w-3 h-3" />
            <span>{isSaving ? 'Сохранение…' : 'Сохранить'}</span>
          </button>
        </div>
      </div>

      {/* Conflict Resolution Modal */}
      {conflictData && (
        <EditorConflictModal
          isOpen={true}
          remotePath={editorState.remotePath}
          localMtime={editorState.mtime}
          localSize={editorState.size}
          serverMtime={conflictData.serverMtime}
          serverSize={conflictData.serverSize}
          onForceOverwrite={() => handleSave(true, false)}
          onSaveAsCopy={() => handleSave(false, true)}
          onCancel={() => setConflictData(null)}
        />
      )}
    </div>
  )
}
