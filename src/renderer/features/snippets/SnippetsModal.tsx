import { useState, useMemo } from 'react'
import { X, Code, Plus, Play, ArrowRight, Trash2, Edit2, Folder, Send, Sliders } from 'lucide-react'
import { useSnippetsStore, type SnippetItem } from '../../stores/snippets-store'
import { useTabsStore } from '../../stores/tabs-store'
import { extractSnippetVariables, interpolateSnippet } from '../../utils/snippets'

interface SnippetsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SnippetsModal({ isOpen, onClose }: SnippetsModalProps): JSX.Element | null {
  const snippets = useSnippetsStore((s) => s.snippets)
  const addSnippet = useSnippetsStore((s) => s.addSnippet)
  const updateSnippet = useSnippetsStore((s) => s.updateSnippet)
  const deleteSnippet = useSnippetsStore((s) => s.deleteSnippet)

  const getActiveTab = useTabsStore((s) => s.getActiveTab)
  const activeTab = getActiveTab()

  const [selectedCategory, setSelectedCategory] = useState<string>('Все')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingSnippet, setEditingSnippet] = useState<Partial<SnippetItem> | null>(null)

  // Variables Dialog State for snippet with {{var}}
  const [variableSnippet, setVariableSnippet] = useState<{
    snippet: SnippetItem
    vars: string[]
    values: Record<string, string>
    autoExecute: boolean
  } | null>(null)

  const categories = useMemo(() => {
    const set = new Set<string>()
    snippets.forEach((s) => {
      if (s.category) set.add(s.category)
    })
    return ['Все', ...Array.from(set)]
  }, [snippets])

  const filteredSnippets = useMemo(() => {
    let list = snippets
    if (selectedCategory !== 'Все') {
      list = list.filter((s) => s.category === selectedCategory)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.command.toLowerCase().includes(q) ||
          (s.description && s.description.toLowerCase().includes(q))
      )
    }
    return list
  }, [snippets, selectedCategory, searchQuery])

  if (!isOpen) return null

  const sendToTerminal = (command: string, executeImmediately = false): void => {
    if (!activeTab) return
    const textToSend = executeImmediately ? `${command}\n` : command

    if (activeTab.type === 'ssh' && activeTab.channelId && window.api?.writeSsh) {
      window.api.writeSsh(activeTab.channelId, textToSend)
    } else if (activeTab.type === 'local' && activeTab.terminalId && window.api?.writeTerminal) {
      window.api.writeTerminal(activeTab.terminalId, textToSend)
    }
    onClose()
  }

  const handleRunSnippet = (snippet: SnippetItem, executeImmediately: boolean): void => {
    const vars = extractSnippetVariables(snippet.command)
    if (vars.length > 0) {
      const initialValues: Record<string, string> = {}
      vars.forEach((v) => {
        initialValues[v] = ''
      })
      setVariableSnippet({
        snippet,
        vars,
        values: initialValues,
        autoExecute: executeImmediately
      })
      return
    }

    sendToTerminal(snippet.command, executeImmediately)
  }

  const handleApplyVariables = (executeImmediately: boolean): void => {
    if (!variableSnippet) return
    const interpolated = interpolateSnippet(variableSnippet.snippet.command, variableSnippet.values)
    setVariableSnippet(null)
    sendToTerminal(interpolated, executeImmediately)
  }

  const handleSaveSnippet = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!editingSnippet || !editingSnippet.title || !editingSnippet.command) return

    if (editingSnippet.id) {
      updateSnippet(editingSnippet.id, editingSnippet)
    } else {
      addSnippet({
        title: editingSnippet.title,
        command: editingSnippet.command,
        category: editingSnippet.category || 'Общие',
        description: editingSnippet.description || '',
        autoExecute: editingSnippet.autoExecute ?? false
      })
    }
    setEditingSnippet(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans select-none">
      <div className="bg-panel2 border border-line rounded-lg shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[75vh] max-h-[650px] text-tx text-xs">
        {/* Header */}
        <div className="px-4 py-3 border-b border-line flex items-center justify-between bg-panel/70">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-acc" />
            <span className="font-semibold text-sm">Сниппеты команд</span>
            <span className="text-mut text-[11px] font-mono">({snippets.length} шаблонов)</span>
          </div>

          <div className="flex items-center gap-2">
            {!editingSnippet && !variableSnippet && (
              <button
                type="button"
                onClick={() =>
                  setEditingSnippet({
                    title: '',
                    command: '',
                    category: selectedCategory === 'Все' ? 'Общие' : selectedCategory,
                    description: '',
                    autoExecute: false
                  })
                }
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-acc text-bg font-medium hover:bg-acc/90 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Новый сниппет</span>
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

        {/* Content Area */}
        {variableSnippet ? (
          /* Variable Filling Modal Form */
          <div className="flex-1 p-6 flex flex-col items-center justify-center bg-panel2">
            <div className="max-w-md w-full bg-panel p-5 rounded-lg border border-line shadow-lg space-y-4">
              <div className="flex items-center gap-2 border-b border-line pb-2">
                <Sliders className="w-4 h-4 text-acc" />
                <h4 className="text-sm font-semibold text-tx">Параметры команды</h4>
              </div>

              <div>
                <div className="text-xs font-medium text-tx mb-1">
                  {variableSnippet.snippet.title}
                </div>
                <div className="p-2 rounded bg-bg border border-line font-mono text-[11px] text-mut break-all">
                  {variableSnippet.snippet.command}
                </div>
              </div>

              <div className="space-y-3">
                {variableSnippet.vars.map((v) => (
                  <div key={v}>
                    <label className="block text-xs font-mono text-acc mb-1">{`{{${v}}}`}</label>
                    <input
                      type="text"
                      required
                      value={variableSnippet.values[v] || ''}
                      onChange={(e) =>
                        setVariableSnippet({
                          ...variableSnippet,
                          values: { ...variableSnippet.values, [v]: e.target.value }
                        })
                      }
                      placeholder={`Значение для ${v}`}
                      className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs font-mono outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setVariableSnippet(null)}
                  className="px-3 py-1.5 rounded border border-line text-mut hover:text-tx hover:bg-panel"
                >
                  Отмена
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyVariables(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-line bg-panel2 text-tx hover:border-acc"
                  >
                    <Send className="w-3.5 h-3.5 text-mut" />
                    <span>Вставить</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyVariables(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-acc text-bg font-medium hover:bg-acc/90"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Выполнить ▶</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : editingSnippet ? (
          /* Add / Edit Snippet Form */
          <form
            onSubmit={handleSaveSnippet}
            className="flex-1 p-6 overflow-y-auto max-w-xl mx-auto w-full space-y-4"
          >
            <h4 className="text-sm font-semibold border-b border-line pb-2">
              {editingSnippet.id ? 'Редактировать сниппет' : 'Новый сниппет команды'}
            </h4>

            <div>
              <label className="block text-xs font-medium text-mut mb-1">Название *</label>
              <input
                type="text"
                required
                value={editingSnippet.title || ''}
                onChange={(e) => setEditingSnippet({ ...editingSnippet, title: e.target.value })}
                placeholder="Docker: Логи сервиса"
                className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-mut mb-1">Категория / Папка</label>
                <input
                  type="text"
                  value={editingSnippet.category || ''}
                  onChange={(e) =>
                    setEditingSnippet({ ...editingSnippet, category: e.target.value })
                  }
                  placeholder="Docker / Git / Nginx"
                  className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-mut mb-1">Описание</label>
                <input
                  type="text"
                  value={editingSnippet.description || ''}
                  onChange={(e) =>
                    setEditingSnippet({ ...editingSnippet, description: e.target.value })
                  }
                  placeholder="Краткое описание назначения"
                  className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-mut">Команда *</label>
                <span className="text-[10px] text-mut">Поддерживает переменные `{'{{var}}'}`</span>
              </div>
              <textarea
                required
                rows={4}
                value={editingSnippet.command || ''}
                onChange={(e) => setEditingSnippet({ ...editingSnippet, command: e.target.value })}
                placeholder="docker logs -f --tail={{lines}} {{container}}"
                className="w-full p-2.5 rounded bg-bg border border-line focus:border-acc font-mono text-xs text-tx resize-none outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="chk-auto-exec"
                checked={editingSnippet.autoExecute || false}
                onChange={(e) =>
                  setEditingSnippet({ ...editingSnippet, autoExecute: e.target.checked })
                }
                className="rounded border-line text-acc focus:ring-acc"
              />
              <label htmlFor="chk-auto-exec" className="text-xs text-tx cursor-pointer">
                Выполнять сразу по нажатию (добавлять символ переноса строки)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-line">
              <button
                type="button"
                onClick={() => setEditingSnippet(null)}
                className="px-3 py-1.5 rounded border border-line text-mut hover:text-tx hover:bg-panel"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-acc text-bg font-medium hover:bg-acc/90"
              >
                Сохранить сниппет
              </button>
            </div>
          </form>
        ) : (
          /* Normal List View */
          <div className="flex-1 flex min-h-0">
            {/* Left Categories Sidebar */}
            <div className="w-48 border-r border-line bg-panel/30 flex flex-col p-2">
              <div className="text-[11px] font-medium text-mut px-2 py-1 mb-1">Категории</div>
              <div className="flex-1 overflow-y-auto space-y-0.5">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedCategory(c)}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between transition-colors ${
                      selectedCategory === c
                        ? 'bg-acc/15 text-tx font-medium'
                        : 'text-mut hover:text-tx hover:bg-panel/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Folder className="w-3.5 h-3.5 text-mut flex-none" />
                      <span className="truncate">{c}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right Snippets List */}
            <div className="flex-1 flex flex-col min-w-0 bg-panel2">
              <div className="p-2 border-b border-line bg-panel/20">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск сниппетов…"
                  className="w-full py-1 px-2.5 rounded bg-bg border border-line text-tx placeholder:text-mut focus:border-acc text-xs outline-none"
                />
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-line/30 p-2 space-y-1">
                {filteredSnippets.length === 0 ? (
                  <div className="p-8 text-center text-mut text-xs">Сниппеты не найдены</div>
                ) : (
                  filteredSnippets.map((s) => {
                    const vars = extractSnippetVariables(s.command)
                    return (
                      <div
                        key={s.id}
                        className="p-2.5 rounded-lg border border-line/50 hover:border-line bg-panel/40 transition-colors flex items-start justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-tx text-xs">{s.title}</span>
                            <span className="text-[10px] text-mut bg-panel px-1.5 py-0.5 rounded border border-line">
                              {s.category}
                            </span>
                            {vars.length > 0 && (
                              <span className="text-[10px] text-acc bg-acc/10 px-1 py-0.5 rounded font-mono">
                                {vars.length} {vars.length === 1 ? 'переменная' : 'переменных'}
                              </span>
                            )}
                          </div>

                          {s.description && (
                            <div className="text-[11px] text-mut mt-0.5">{s.description}</div>
                          )}

                          <div className="mt-1.5 p-1.5 rounded bg-bg border border-line font-mono text-[11px] text-tx/90 select-all overflow-x-auto whitespace-pre">
                            {s.command}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 flex-none mt-1">
                          <button
                            type="button"
                            onClick={() => handleRunSnippet(s, false)}
                            title="Вставить в терминал без выполнения"
                            className="flex items-center gap-1 px-2 py-1 rounded border border-line bg-panel text-tx hover:border-acc text-[11px] transition-colors"
                          >
                            <ArrowRight className="w-3 h-3 text-mut" />
                            <span>Вставить</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRunSnippet(s, true)}
                            title="Выполнить сразу в активном терминале"
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-acc text-bg font-medium hover:bg-acc/90 text-[11px] transition-colors"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Запустить ▶</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditingSnippet(s)}
                            title="Редактировать"
                            className="p-1 rounded text-mut hover:text-tx hover:bg-panel transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteSnippet(s.id)}
                            title="Удалить"
                            className="p-1 rounded text-mut hover:text-err hover:bg-panel transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-2 border-t border-line bg-panel/50 text-[11px] text-mut flex justify-between items-center">
          <span>Сниппеты вставляются в текущий активный терминал</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded border border-line text-tx hover:bg-panel"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}
