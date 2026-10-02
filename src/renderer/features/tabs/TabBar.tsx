import { Plus, Sun, Moon, Monitor } from 'lucide-react'
import { useTabsStore } from '../../stores/tabs-store'
import { useSettingsStore, type ThemeMode } from '../../stores/settings-store'
import { Tab } from './Tab'
import { CloseConfirmModal } from '../editor/CloseConfirmModal'
import { ru } from '../../i18n/ru'

export function TabBar(): JSX.Element {
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

  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)

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
      className="flex items-end gap-0.5 pt-1.5 px-2 bg-bg overflow-x-auto flex-none border-b border-line"
    >
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

      <div className="flex items-center pb-1 pl-2">
        <button
          type="button"
          onClick={cycleTheme}
          title={`Тема: ${theme} (клик для переключения)`}
          className="p-1 rounded hover:bg-panel2 focus-visible:outline-2 focus-visible:outline-acc transition-colors"
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
