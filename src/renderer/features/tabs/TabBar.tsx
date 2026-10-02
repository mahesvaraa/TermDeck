import {
  Plus,
  Sun,
  Moon,
  Monitor,
  Code,
  Columns,
  Rows,
  Network,
  FolderOpen,
  PanelLeft,
  PanelLeftOpen
} from 'lucide-react'
import { useTabsStore } from '../../stores/tabs-store'
import { useSettingsStore, type ThemeMode } from '../../stores/settings-store'
import { Tab } from './Tab'
import { CloseConfirmModal } from '../editor/CloseConfirmModal'
import { ru } from '../../i18n/ru'

interface TabBarProps {
  onSnippetsClick?: () => void
  onTunnelsClick?: () => void
  activeTunnelCount?: number
}

export function TabBar({
  onSnippetsClick,
  onTunnelsClick,
  activeTunnelCount
}: TabBarProps): JSX.Element {
  const tabs = useTabsStore((s) => s.tabs)
  const activeTabId = useTabsStore((s) => s.activeTabId)
  const setActiveTabId = useTabsStore((s) => s.setActiveTabId)
  const closeTab = useTabsStore((s) => s.closeTab)
  const requestCloseTab = useTabsStore((s) => s.requestCloseTab)
  const pendingCloseTabId = useTabsStore((s) => s.pendingCloseTabId)
  const setPendingCloseTabId = useTabsStore((s) => s.setPendingCloseTabId)
  const markEditorSaved = useTabsStore((s) => s.markEditorSaved)
  const openLocalTab = useTabsStore((s) => s.openLocalTab)
  const renameTab = useTabsStore((s) => s.renameTab)
  const duplicateTab = useTabsStore((s) => s.duplicateTab)
  const closeOtherTabs = useTabsStore((s) => s.closeOtherTabs)
  const reorderTabs = useTabsStore((s) => s.reorderTabs)
  const splitActivePane = useTabsStore((s) => s.splitActivePane)
  const getActiveTab = useTabsStore((s) => s.getActiveTab)

  const sidebarVisible = useSettingsStore((s) => s.sidebarVisible)
  const toggleSidebar = useSettingsStore((s) => s.toggleSidebar)
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const sftpVisible = useSettingsStore((s) => s.sftpVisible)
  const toggleSftp = useSettingsStore((s) => s.toggleSftp)

  const activeTab = getActiveTab()
  const isSshTab = activeTab?.type === 'ssh' || (activeTab?.type === 'editor' && Boolean(activeTab.sessionId))
  const isEditor = activeTab?.type === 'editor'

  const pendingTab = tabs.find((t) => t.id === pendingCloseTabId)

  const handleSaveAndClose = async (): Promise<void> => {
    if (!pendingTab || !pendingTab.editorState || !window.api?.editorSaveFile) {
      if (pendingCloseTabId) closeTab(pendingCloseTabId)
      setPendingCloseTabId(null)
      return
    }

    try {
      const { sessionId, remotePath, content, mtime, size } = pendingTab.editorState
      const res = await window.api.editorSaveFile({
        sessionId,
        remotePath,
        content,
        expectedMtime: mtime,
        expectedSize: size,
        forceOverwrite: true
      })

      if (res.success && res.newMtime !== undefined && res.newSize !== undefined) {
        markEditorSaved(pendingTab.id, res.newMtime, res.newSize)
      }
    } catch (err) {
      alert(`Ошибка сохранения: ${(err as Error).message}`)
      return
    }

    if (pendingCloseTabId) closeTab(pendingCloseTabId)
    setPendingCloseTabId(null)
  }

  const handleDiscardAndClose = (): void => {
    if (pendingCloseTabId) {
      closeTab(pendingCloseTabId)
    }
    setPendingCloseTabId(null)
  }

  const handleNewTab = (): void => {
    openLocalTab().catch(() => {})
  }

  const cycleTheme = (): void => {
    const nextTheme: Record<ThemeMode, ThemeMode> = {
      dark: 'light',
      light: 'system',
      system: 'dark'
    }
    setTheme(nextTheme[theme])
  }

  const renderThemeIcon = (): JSX.Element => {
    switch (theme) {
      case 'light':
        return <Sun className="w-3.5 h-3.5 text-mut hover:text-tx" />
      case 'system':
        return <Monitor className="w-3.5 h-3.5 text-mut hover:text-tx" />
      case 'dark':
      default:
        return <Moon className="w-3.5 h-3.5 text-mut hover:text-tx" />
    }
  }

  return (
    <div
      role="tablist"
      aria-label="Вкладки сессий"
      className="flex items-end gap-0.5 pt-1 px-2 bg-bg overflow-x-auto flex-none border-b border-line"
    >
      {!sidebarVisible && (
        <button
          type="button"
          onClick={toggleSidebar}
          title="Развернуть панель сессий (Ctrl+B)"
          className="p-1 mb-1 mr-1 rounded hover:bg-panel2 text-acc focus-visible:outline-2 focus-visible:outline-acc transition-colors flex-none"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      )}

      <div className="flex items-end gap-0.5 flex-1 min-w-0 overflow-x-auto">
        {tabs.map((tab, index) => (
          <Tab
            key={tab.id}
            tab={tab}
            index={index}
            isActive={tab.id === activeTabId}
            onSelect={setActiveTabId}
            onClose={requestCloseTab}
            onRename={renameTab}
            onDuplicate={duplicateTab}
            onCloseOthers={closeOtherTabs}
            onReorder={reorderTabs}
            onSnippetsClick={onSnippetsClick}
            onTunnelsClick={onTunnelsClick}
          />
        ))}

        <button
          type="button"
          onClick={handleNewTab}
          aria-label={ru.tabs.newTab}
          title={ru.tabs.newTab}
          className="py-1.5 px-2.5 text-mut hover:text-tx focus-visible:outline-2 focus-visible:outline-acc rounded-t-[7px] text-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right Tools Area */}
      <div className="flex items-center gap-1 pb-1 pl-2 flex-none">
        {/* Snippets button */}
        {onSnippetsClick && (
          <button
            type="button"
            onClick={onSnippetsClick}
            title="Сниппеты команд с переменными {{var}} (быстрый доступ)"
            className="flex items-center gap-1.5 py-1 px-2 rounded-md hover:bg-panel2 text-tx text-xs transition-colors border border-transparent hover:border-line"
          >
            <Code className="w-3.5 h-3.5 text-acc" />
            <span className="font-medium text-xs">Сниппеты</span>
          </button>
        )}

        <div className="w-[1px] h-3.5 bg-line mx-0.5" />

        {/* Split Right */}
        <button
          type="button"
          onClick={() => splitActivePane('horizontal')}
          disabled={isEditor}
          title="Разделить терминал по горизонтали (Split Right)"
          className="p-1 rounded text-mut hover:text-tx hover:bg-panel2 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <Columns className="w-3.5 h-3.5" />
        </button>

        {/* Split Down */}
        <button
          type="button"
          onClick={() => splitActivePane('vertical')}
          disabled={isEditor}
          title="Разделить терминал по вертикали (Split Down)"
          className="p-1 rounded text-mut hover:text-tx hover:bg-panel2 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <Rows className="w-3.5 h-3.5" />
        </button>

        {/* Tunnels */}
        {onTunnelsClick && isSshTab && (
          <button
            type="button"
            onClick={onTunnelsClick}
            title="SSH-туннели (-L, -R, -D)"
            className={`p-1 rounded flex items-center gap-1 transition-colors ${
              (activeTunnelCount ?? 0) > 0
                ? 'text-acc bg-acc/10 hover:bg-acc/20'
                : 'text-mut hover:text-tx hover:bg-panel2'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            {(activeTunnelCount ?? 0) > 0 && (
              <span className="text-[10px] font-bold text-acc leading-none">
                {activeTunnelCount}
              </span>
            )}
          </button>
        )}

        <div className="w-[1px] h-3.5 bg-line mx-0.5" />

        {/* SFTP Panel Toggle */}
        <button
          type="button"
          onClick={toggleSftp}
          disabled={!isSshTab}
          title={
            !isSshTab
              ? 'SFTP недоступен для локального терминала'
              : sftpVisible
              ? 'Скрыть панель SFTP (Ctrl+Shift+B)'
              : 'Показать панель SFTP (Ctrl+Shift+B)'
          }
          className={`p-1 rounded transition-colors ${
            !isSshTab
              ? 'opacity-30 pointer-events-none text-mut'
              : sftpVisible
              ? 'text-acc bg-acc/10 hover:bg-acc/20'
              : 'text-mut hover:text-tx hover:bg-panel2'
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5" />
        </button>

        {/* Sessions Sidebar Toggle */}
        <button
          type="button"
          onClick={toggleSidebar}
          title={sidebarVisible ? 'Скрыть панель сессий (Ctrl+B)' : 'Показать панель сессий (Ctrl+B)'}
          className={`p-1 rounded transition-colors ${
            sidebarVisible
              ? 'text-acc bg-acc/10 hover:bg-acc/20'
              : 'text-mut hover:text-tx hover:bg-panel2'
          }`}
        >
          <PanelLeft className="w-3.5 h-3.5" />
        </button>

        {/* Theme Switcher */}
        <button
          type="button"
          onClick={cycleTheme}
          title={`Тема: ${theme} (клик для переключения)`}
          className="p-1 rounded hover:bg-panel2 text-mut hover:text-tx transition-colors"
        >
          {renderThemeIcon()}
        </button>
      </div>

      {/* Unsaved changes confirmation modal */}
      <CloseConfirmModal
        isOpen={Boolean(pendingCloseTabId && pendingTab?.editorState?.isDirty)}
        fileName={pendingTab?.title || 'файл'}
        onSaveAndClose={handleSaveAndClose}
        onDiscardAndClose={handleDiscardAndClose}
        onCancel={() => setPendingCloseTabId(null)}
      />
    </div>
  )
}
