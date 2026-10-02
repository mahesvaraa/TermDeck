import { useEffect, useState } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { SessionsSidebar } from '../features/sessions/SessionsSidebar'
import { TabBar } from '../features/tabs/TabBar'
import { ActionBar } from '../features/tabs/ActionBar'
import { SftpPanel } from '../features/sftp/SftpPanel'
import { TerminalArea } from '../features/terminal/TerminalArea'
import { StatusBar } from './StatusBar'
import { UiGallery } from '../features/dev/UiGallery'
import { HostKeyModal } from '../features/ssh/HostKeyModal'
import { ConflictModal } from '../features/sftp/ConflictModal'
import { ExternalSyncModal } from '../features/editor/ExternalSyncModal'
import { TunnelsModal } from '../features/tunnels/TunnelsModal'
import { KeyManagerModal } from '../features/keys/KeyManagerModal'
import { CommandPalette } from '../features/commands/CommandPalette'
import { SnippetsModal } from '../features/snippets/SnippetsModal'
import { SettingsModal } from '../features/settings/SettingsModal'
import { SessionRestoreBanner } from '../features/tabs/SessionRestoreBanner'
import {
  saveTabsSnapshot,
  loadTabsSnapshot,
  clearTabsSnapshot,
  type RestorableTab
} from '../utils/session-restore'
import { useSettingsStore } from '../stores/settings-store'
import { useTabsStore } from '../stores/tabs-store'
import { useSftpStore } from '../stores/sftp-store'
import { useTransfersStore } from '../stores/transfers-store'
import type { HostKeyPrompt, ExternalEditorWatchEvent } from '@shared/types'

export function App(): JSX.Element {
  const sidebarVisible = useSettingsStore((s) => s.sidebarVisible)
  const toggleSidebar = useSettingsStore((s) => s.toggleSidebar)
  const sftpVisible = useSettingsStore((s) => s.sftpVisible)
  const toggleSftp = useSettingsStore((s) => s.toggleSftp)

  const openLocalTab = useTabsStore((s) => s.openLocalTab)
  const requestCloseTab = useTabsStore((s) => s.requestCloseTab)
  const activeTabId = useTabsStore((s) => s.activeTabId)
  const getActiveTab = useTabsStore((s) => s.getActiveTab)
  const nextTab = useTabsStore((s) => s.nextTab)
  const prevTab = useTabsStore((s) => s.prevTab)

  const activeTab = getActiveTab()

  const [showGallery, setShowGallery] = useState(() => {
    return (
      window.location.hash === '#/dev/ui-gallery' ||
      window.location.pathname.includes('/dev/ui-gallery')
    )
  })

  const [isTunnelsOpen, setIsTunnelsOpen] = useState(false)
  const [isKeysOpen, setIsKeysOpen] = useState(false)
  const [isSnippetsOpen, setIsSnippetsOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [restorableTabs, setRestorableTabs] = useState<RestorableTab[]>([])
  const [activeTunnelCount, setActiveTunnelCount] = useState<number>(0)

  const tabs = useTabsStore((s) => s.tabs)
  const openTab = useTabsStore((s) => s.openTab)
  const sessionRestore = useSettingsStore((s) => s.sessionRestore)

  // Auto-save session layout snapshot
  useEffect(() => {
    if (tabs.length > 0) {
      saveTabsSnapshot(tabs)
    }
  }, [tabs])

  // Prevent Chromium from navigating when files are dropped outside drop targets
  useEffect(() => {
    const handleGlobalDragOver = (e: DragEvent): void => {
      e.preventDefault()
    }
    const handleGlobalDrop = (e: DragEvent): void => {
      e.preventDefault()
    }
    window.addEventListener('dragover', handleGlobalDragOver)
    window.addEventListener('drop', handleGlobalDrop)
    return () => {
      window.removeEventListener('dragover', handleGlobalDragOver)
      window.removeEventListener('drop', handleGlobalDrop)
    }
  }, [])

  const handleRestoreSession = (tabsToRestore: RestorableTab[]): void => {
    clearTabsSnapshot()
    setRestorableTabs([])
    for (const item of tabsToRestore) {
      if (item.type === 'ssh' && item.sessionItem) {
        openTab(item.sessionItem)
      } else if (item.type === 'local') {
        openLocalTab().catch(() => {})
      }
    }
  }

  // Check for restorable tabs on initial mount
  useEffect(() => {
    const saved = loadTabsSnapshot()
    if (saved.length > 0) {
      if (sessionRestore.autoRestore) {
        handleRestoreSession(saved)
      } else {
        setRestorableTabs(saved)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Ensure local tabs without an active terminalId get initialized
  useEffect(() => {
    const uninitializedLocal = tabs.find((t) => t.type === 'local' && !t.terminalId)
    if (uninitializedLocal && typeof window !== 'undefined' && window.api?.createTerminal) {
      window.api
        .createTerminal()
        .then((res) => {
          if (res?.terminalId) {
            useTabsStore.getState().setTabTerminalId(uninitializedLocal.id, res.terminalId)
          }
        })
        .catch((err) => {
          console.error('Failed to initialize local terminal:', err)
        })
    }
  }, [tabs])

  // Poll active tunnels count for badge
  useEffect(() => {
    const updateCount = async (): Promise<void> => {
      if (!window.api?.listTunnels) return
      try {
        const list = await window.api.listTunnels()
        setActiveTunnelCount(list.filter((t) => t.status === 'active').length)
      } catch {
        // Ignored
      }
    }

    updateCount()
    const timer = setInterval(updateCount, 3000)
    return () => clearInterval(timer)
  }, [])

  const panelPosition = useSftpStore((s) => s.panelPosition)
  const conflictPrompt = useTransfersStore((s) => s.conflictPrompt)
  const resolveConflict = useTransfersStore((s) => s.resolveConflict)

  const [hostKeyPrompt, setHostKeyPrompt] = useState<HostKeyPrompt | null>(null)
  const [externalEvent, setExternalEvent] = useState<ExternalEditorWatchEvent | null>(null)
  const [isSyncingExternal, setIsSyncingExternal] = useState(false)

  useEffect(() => {
    const unsubscribe = window.api?.onSshHostKeyPrompt((prompt) => {
      setHostKeyPrompt(prompt)
    })
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  useEffect(() => {
    const unsubscribe = window.api?.onEditorExternalModified((event) => {
      setExternalEvent(event)
    })
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  const handleSyncExternal = async (): Promise<void> => {
    if (!externalEvent || !window.api?.editorSyncExternal) return
    setIsSyncingExternal(true)
    try {
      await window.api.editorSyncExternal({
        watchId: externalEvent.watchId,
        sessionId: externalEvent.sessionId,
        remotePath: externalEvent.remotePath,
        localPath: externalEvent.localPath
      })
      setExternalEvent(null)
    } catch (err) {
      alert(`Ошибка синхронизации файла: ${(err as Error).message}`)
    } finally {
      setIsSyncingExternal(false)
    }
  }

  const handleStopWatchingExternal = async (): Promise<void> => {
    if (externalEvent && window.api?.editorCloseExternal) {
      await window.api.editorCloseExternal({ watchId: externalEvent.watchId })
    }
    setExternalEvent(null)
  }

  const handleResolveHostKey = (decision: { trustOnce: boolean; remember: boolean }): void => {
    if (hostKeyPrompt) {
      window.api?.confirmHostKey({
        sessionId: hostKeyPrompt.sessionId,
        trustOnce: decision.trustOnce,
        remember: decision.remember
      })
      setHostKeyPrompt(null)
    }
  }

  const handleCancelHostKey = (): void => {
    if (hostKeyPrompt) {
      window.api?.confirmHostKey({
        sessionId: hostKeyPrompt.sessionId,
        trustOnce: false,
        remember: false
      })
      setHostKeyPrompt(null)
    }
  }

  // Keyboard shortcuts: Ctrl+B (sidebar), Ctrl+Shift+B (SFTP), Ctrl+T, Ctrl+W, Ctrl+Tab
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey

      if (isCtrlOrMeta && e.shiftKey && e.code === 'KeyP') {
        e.preventDefault()
        setIsCommandPaletteOpen((prev) => !prev)
      } else if (isCtrlOrMeta && !e.shiftKey && e.code === 'KeyB') {
        e.preventDefault()
        toggleSidebar()
      } else if (isCtrlOrMeta && e.shiftKey && e.code === 'KeyB') {
        e.preventDefault()
        toggleSftp()
      } else if (isCtrlOrMeta && !e.shiftKey && e.code === 'KeyT') {
        e.preventDefault()
        openLocalTab().catch(() => {})
      } else if (isCtrlOrMeta && !e.shiftKey && e.code === 'KeyW') {
        e.preventDefault()
        requestCloseTab(activeTabId)
      } else if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault()
        if (e.shiftKey) {
          prevTab()
        } else {
          nextTab()
        }
      } else if (isCtrlOrMeta && e.shiftKey && e.code === 'KeyU') {
        e.preventDefault()
        setShowGallery((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleSidebar, toggleSftp, openLocalTab, requestCloseTab, activeTabId, nextTab, prevTab])

  if (showGallery) {
    return <UiGallery onBackToApp={() => setShowGallery(false)} />
  }

  return (
    <div className="flex h-screen w-screen min-w-[900px] flex-col overflow-hidden bg-bg text-tx select-none font-sans">
      <div className="flex flex-1 min-h-0">
        <PanelGroup direction="horizontal" autoSaveId="termdeck-main-layout">
          {/* Sessions Sidebar Panel */}
          {sidebarVisible && (
            <>
              <Panel defaultSize={18} minSize={12} maxSize={35} id="panel-sidebar">
                <SessionsSidebar
                  onKeysClick={() => setIsKeysOpen(true)}
                  onSettingsClick={() => setIsSettingsOpen(true)}
                />
              </Panel>

              <PanelResizeHandle className="w-[1px] bg-line hover:bg-acc transition-colors cursor-col-resize flex-none" />
            </>
          )}

          {/* Main Area (Tabs + Action Bar + Work Area) */}
          <Panel defaultSize={sidebarVisible ? 82 : 100} id="panel-main">
            <div className="flex flex-col h-full min-w-0 bg-bg">
              {/* Session Restore Banner */}
              {restorableTabs.length > 0 && (
                <SessionRestoreBanner
                  count={restorableTabs.length}
                  onRestore={() => handleRestoreSession(restorableTabs)}
                  onDismiss={() => {
                    clearTabsSnapshot()
                    setRestorableTabs([])
                  }}
                />
              )}

              {/* Tabs */}
              <TabBar />

              {/* Action Bar */}
              <ActionBar
                onKeysClick={() => setIsKeysOpen(true)}
                onTunnelsClick={() => setIsTunnelsOpen(true)}
                onSnippetsClick={() => setIsSnippetsOpen(true)}
                activeTunnelCount={activeTunnelCount}
              />

              {/* Work Area (SFTP + Terminal Area) */}
              <div className="flex-1 min-h-0 bg-panel">
                {panelPosition === 'left' ? (
                  <PanelGroup direction="horizontal" autoSaveId="termdeck-work-layout-h">
                    {sftpVisible && (
                      <>
                        <Panel defaultSize={26} minSize={18} maxSize={45} id="panel-sftp">
                          <SftpPanel />
                        </Panel>

                        <PanelResizeHandle className="w-[1px] bg-line hover:bg-acc transition-colors cursor-col-resize flex-none" />
                      </>
                    )}

                    <Panel defaultSize={sftpVisible ? 74 : 100} id="panel-terminal">
                      <TerminalArea />
                    </Panel>
                  </PanelGroup>
                ) : (
                  <PanelGroup direction="vertical" autoSaveId="termdeck-work-layout-v">
                    <Panel defaultSize={sftpVisible ? 65 : 100} minSize={30} id="panel-terminal">
                      <TerminalArea />
                    </Panel>

                    {sftpVisible && (
                      <>
                        <PanelResizeHandle className="h-[1px] bg-line hover:bg-acc transition-colors cursor-row-resize flex-none" />

                        <Panel defaultSize={35} minSize={20} maxSize={60} id="panel-sftp">
                          <SftpPanel />
                        </Panel>
                      </>
                    )}
                  </PanelGroup>
                )}
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Host Key Verification Dialog */}
      {hostKeyPrompt && (
        <HostKeyModal
          prompt={hostKeyPrompt}
          onResolve={handleResolveHostKey}
          onCancel={handleCancelHostKey}
        />
      )}

      {/* Transfer Conflict Dialog */}
      {conflictPrompt && (
        <ConflictModal
          prompt={conflictPrompt}
          onResolve={(action, applyToAll, newName) =>
            resolveConflict(conflictPrompt.transferId, action, applyToAll, newName)
          }
          onCancel={() => resolveConflict(conflictPrompt.transferId, 'skip')}
        />
      )}

      {/* External Editor File Sync Dialog */}
      <ExternalSyncModal
        event={externalEvent}
        isSyncing={isSyncingExternal}
        onSync={handleSyncExternal}
        onDismiss={() => setExternalEvent(null)}
        onStopWatching={handleStopWatchingExternal}
      />

      {/* Tunnels Management Modal */}
      <TunnelsModal
        isOpen={isTunnelsOpen}
        onClose={() => setIsTunnelsOpen(false)}
        sessionId={activeTab?.sessionId}
        sessionName={activeTab?.title}
      />

      {/* SSH Key Manager Modal */}
      <KeyManagerModal
        isOpen={isKeysOpen}
        onClose={() => setIsKeysOpen(false)}
        activeSessionId={activeTab?.sessionId}
      />

      {/* Snippets Modal */}
      <SnippetsModal isOpen={isSnippetsOpen} onClose={() => setIsSnippetsOpen(false)} />

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Command Palette (Ctrl+Shift+P) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenSession={(s) =>
          openTab({
            id: s.id,
            name: s.name,
            host: s.host,
            username: s.username,
            port: s.port,
            type: 'ssh',
            auth: s.auth,
            keyPath: s.keyPath,
            jumpHostId: s.jumpHostId
          })
        }
        onOpenTunnels={() => setIsTunnelsOpen(true)}
        onOpenKeys={() => setIsKeysOpen(true)}
        onOpenSnippets={() => setIsSnippetsOpen(true)}
      />
    </div>
  )
}
