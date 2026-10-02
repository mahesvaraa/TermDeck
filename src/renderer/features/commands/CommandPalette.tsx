import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Terminal,
  Columns,
  Rows,
  Network,
  Key,
  FolderOpen,
  PanelLeft,
  PanelBottom,
  Code,
  LayoutGrid,
  Search,
  Server
} from 'lucide-react'
import { useSessionsStore } from '../../stores/sessions-store'
import { useSettingsStore } from '../../stores/settings-store'
import { useTabsStore } from '../../stores/tabs-store'
import type { SessionConfig } from '@shared/types'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onOpenSession: (session: SessionConfig) => void
  onOpenTunnels: () => void
  onOpenKeys: () => void
  onOpenSnippets: () => void
}

interface PaletteCommand {
  id: string
  title: string
  subtitle?: string
  category: 'Сессии' | 'Действия' | 'Вид' | 'Инструменты'
  icon: JSX.Element
  shortcut?: string
  action: () => void
}

export function CommandPalette({
  isOpen,
  onClose,
  onOpenSession,
  onOpenTunnels,
  onOpenKeys,
  onOpenSnippets
}: CommandPaletteProps): JSX.Element | null {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const sessions = useSessionsStore((s) => s.sessions)
  const openLocalTab = useTabsStore((s) => s.openLocalTab)
  const splitActivePane = useTabsStore((s) => s.splitActivePane)
  const toggleOsc7 = useTabsStore((s) => s.toggleOsc7)
  const activeTabId = useTabsStore((s) => s.activeTabId)
  const toggleSidebar = useSettingsStore((s) => s.toggleSidebar)
  const toggleSftp = useSettingsStore((s) => s.toggleSftp)
  const toggleTheme = useSettingsStore((s) => s.setTheme)
  const currentTheme = useSettingsStore((s) => s.theme)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const allCommands: PaletteCommand[] = useMemo(() => {
    const list: PaletteCommand[] = [
      // App Actions
      {
        id: 'new-local-tab',
        title: 'Новый локальный терминал',
        subtitle: 'Открыть вкладку командной строки локального ПК',
        category: 'Действия',
        icon: <Terminal className="w-4 h-4 text-acc" />,
        shortcut: 'Ctrl+T',
        action: () => {
          openLocalTab().catch(() => {})
        }
      },
      {
        id: 'split-right',
        title: 'Разделить терминал по горизонтали',
        subtitle: 'Split Right',
        category: 'Вид',
        icon: <Columns className="w-4 h-4 text-tx" />,
        action: () => splitActivePane('horizontal')
      },
      {
        id: 'split-down',
        title: 'Разделить терминал по вертикали',
        subtitle: 'Split Down',
        category: 'Вид',
        icon: <Rows className="w-4 h-4 text-tx" />,
        action: () => splitActivePane('vertical')
      },
      {
        id: 'toggle-sidebar',
        title: 'Переключить боковую панель сессий',
        category: 'Вид',
        icon: <PanelLeft className="w-4 h-4 text-tx" />,
        shortcut: 'Ctrl+B',
        action: () => toggleSidebar()
      },
      {
        id: 'toggle-sftp',
        title: 'Переключить SFTP-проводник',
        category: 'Вид',
        icon: <PanelBottom className="w-4 h-4 text-tx" />,
        shortcut: 'Ctrl+Shift+B',
        action: () => toggleSftp()
      },
      {
        id: 'toggle-osc7',
        title: 'Переключить следование SFTP за терминалом (OSC 7)',
        category: 'Действия',
        icon: <FolderOpen className="w-4 h-4 text-tx" />,
        action: () => {
          if (activeTabId) toggleOsc7(activeTabId)
        }
      },
      {
        id: 'tunnels',
        title: 'SSH-туннели',
        subtitle: 'Локальные (-L), удалённые (-R) и SOCKS5 (-D)',
        category: 'Инструменты',
        icon: <Network className="w-4 h-4 text-tx" />,
        action: onOpenTunnels
      },
      {
        id: 'keys',
        title: 'Менеджер SSH-ключей',
        subtitle: 'Просмотр ~/.ssh, генерация Ed25519, ssh-copy-id',
        category: 'Инструменты',
        icon: <Key className="w-4 h-4 text-tx" />,
        action: onOpenKeys
      },
      {
        id: 'snippets',
        title: 'Сниппеты команд',
        subtitle: 'Быстрые команды с переменными {{var}}',
        category: 'Инструменты',
        icon: <Code className="w-4 h-4 text-tx" />,
        action: onOpenSnippets
      },
      {
        id: 'toggle-theme',
        title: `Сменить тему оформления (текущая: ${currentTheme})`,
        category: 'Вид',
        icon: <LayoutGrid className="w-4 h-4 text-tx" />,
        action: () => {
          toggleTheme(currentTheme === 'dark' ? 'light' : 'dark')
        }
      }
    ]

    // Add configured sessions to command palette
    for (const s of sessions) {
      list.push({
        id: `sess-${s.id}`,
        title: s.name,
        subtitle: `Подключиться к ${s.username}@${s.host}:${s.port || 22}`,
        category: 'Сессии',
        icon: <Server className="w-4 h-4 text-acc" />,
        action: () => onOpenSession(s)
      })
    }

    return list
  }, [
    sessions,
    openLocalTab,
    splitActivePane,
    activeTabId,
    toggleOsc7,
    toggleSidebar,
    toggleSftp,
    toggleTheme,
    currentTheme,
    onOpenTunnels,
    onOpenKeys,
    onOpenSnippets,
    onOpenSession
  ])

  const filteredCommands = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return allCommands
    return allCommands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.subtitle && c.subtitle.toLowerCase().includes(q)) ||
        c.category.toLowerCase().includes(q)
    )
  }, [allCommands, query])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  if (!isOpen) return null

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredCommands.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const chosen = filteredCommands[selectedIndex]
      if (chosen) {
        onClose()
        chosen.action()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  const handleSelect = (cmd: PaletteCommand): void => {
    onClose()
    cmd.action()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-xs p-4 font-sans select-none"
      onClick={onClose}
    >
      <div
        className="bg-panel2 border border-line rounded-lg shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[70vh] text-tx text-xs animate-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Header */}
        <div className="flex items-center gap-2 p-3 border-b border-line bg-panel/60">
          <Search className="w-4 h-4 text-mut flex-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Введите команду или имя сессии… (↑ / ↓ для выбора, Enter для запуска)"
            className="w-full bg-transparent text-sm text-tx placeholder:text-mut focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-panel border border-line text-[10px] text-mut font-mono">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto divide-y divide-line/20 p-1">
          {filteredCommands.length === 0 ? (
            <div className="p-6 text-center text-mut text-xs">
              Ничего не найдено по запросу «{query}»
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => (
              <button
                key={cmd.id}
                type="button"
                onClick={() => handleSelect(cmd)}
                className={`w-full text-left p-2.5 rounded-md flex items-center gap-3 transition-colors ${
                  idx === selectedIndex
                    ? 'bg-acc/15 text-tx font-medium'
                    : 'hover:bg-panel/50 text-tx/85'
                }`}
              >
                <div
                  className={`p-1.5 rounded border border-line flex-none ${
                    idx === selectedIndex ? 'bg-panel2 text-acc' : 'bg-panel text-mut'
                  }`}
                >
                  {cmd.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-xs">{cmd.title}</span>
                    <span className="text-[10px] text-mut/80 ml-2 font-mono uppercase">
                      {cmd.category}
                    </span>
                  </div>
                  {cmd.subtitle && (
                    <div className="text-[11px] text-mut truncate mt-0.5">{cmd.subtitle}</div>
                  )}
                </div>

                {cmd.shortcut && (
                  <kbd className="px-1.5 py-0.5 rounded bg-panel border border-line text-[10px] text-mut font-mono flex-none">
                    {cmd.shortcut}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
