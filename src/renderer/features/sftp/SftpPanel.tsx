import { useEffect, useState, useMemo } from 'react'
import { HardDrive } from 'lucide-react'
import { useTabsStore } from '../../stores/tabs-store'
import { useSftpStore, defaultTabSftpState } from '../../stores/sftp-store'
import { useTransfersStore } from '../../stores/transfers-store'
import { PathBar } from './PathBar'
import { FileTable } from './FileTable'
import { TransferList } from './TransferList'
import { NewFolderModal } from './NewFolderModal'
import { RenameModal } from './RenameModal'
import { ChmodModal } from './ChmodModal'
import { formatTerminalCdCommand } from '../../utils/osc7'

interface SftpPanelProps {
  tabId?: string
}

export function SftpPanel({ tabId }: SftpPanelProps): JSX.Element {
  const tabs = useTabsStore((s) => s.tabs)
  const activeTabId = useTabsStore((s) => s.activeTabId)
  const activeTab = tabs.find((t) => t.id === activeTabId)

  const targetTab = tabId
    ? tabs.find((t) => t.id === tabId)
    : activeTab?.type === 'editor' && activeTab.sessionId
      ? tabs.find((t) => t.type === 'ssh' && t.sessionId === activeTab.sessionId) || activeTab
      : activeTab || tabs[0]

  const targetTabId = targetTab?.id
  const targetSessionId = targetTab?.sessionId
  const targetPath = targetTab?.currentPath
  const targetType = targetTab?.type

  // Direct stable selectors without instantiating new arrays/objects inside selector
  const tabStates = useSftpStore((s) => s.tabStates)
  const tabState = (targetTabId && tabStates[targetTabId]) || defaultTabSftpState

  const loadDirectory = useSftpStore((s) => s.loadDirectory)
  const navigateTo = useSftpStore((s) => s.navigateTo)
  const selectItem = useSftpStore((s) => s.selectItem)
  const clearSelection = useSftpStore((s) => s.clearSelection)
  const createDirectory = useSftpStore((s) => s.createDirectory)
  const renameItem = useSftpStore((s) => s.renameItem)
  const deleteSelected = useSftpStore((s) => s.deleteSelected)
  const chmodItem = useSftpStore((s) => s.chmodItem)
  const openEditorTab = useTabsStore((s) => s.openEditorTab)

  const allTransfers = useTransfersStore((s) => s.transfers)
  const transfers = useMemo(() => {
    const list = Object.values(allTransfers)
    if (!targetSessionId) return list
    return list.filter((t) => t.sessionId === targetSessionId)
  }, [allTransfers, targetSessionId])

  const startUpload = useTransfersStore((s) => s.startUpload)
  const startDownload = useTransfersStore((s) => s.startDownload)
  const pauseTransfer = useTransfersStore((s) => s.pauseTransfer)
  const resumeTransfer = useTransfersStore((s) => s.resumeTransfer)
  const cancelTransfer = useTransfersStore((s) => s.cancelTransfer)
  const retryTransfer = useTransfersStore((s) => s.retryTransfer)

  // Local Modals State
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<string | null>(null)
  const [chmodTarget, setChmodTarget] = useState<string | null>(null)

  // Load directory on mount or tab change
  useEffect(() => {
    if (targetTabId && targetSessionId && targetType === 'ssh') {
      loadDirectory(targetTabId, targetSessionId, targetPath || '/var/www')
    }
  }, [targetTabId, targetSessionId, targetType, targetPath, loadDirectory])

  // Handle local tab notice
  if (targetTab?.type === 'local') {
    return (
      <div className="w-full h-full bg-panel border-r border-line flex flex-col items-center justify-center p-6 text-center select-none">
        <HardDrive className="w-10 h-10 text-mut/60 mb-3" />
        <h4 className="text-xs font-semibold text-tx mb-1">Локальный терминал</h4>
        <p className="text-[11px] text-mut max-w-[240px] leading-relaxed mb-4">
          SFTP-проводник активен для удалённых SSH-сессий. Для работы с локальными файлами
          используйте стандартный файловый менеджер вашей системы.
        </p>
        <div className="text-[10px] text-mut/80 border border-line rounded px-2.5 py-1 bg-bg font-mono">
          {targetTab.host} ({targetTab.currentPath || '~'})
        </div>
      </div>
    )
  }

  if (!targetTab) {
    return (
      <div className="w-full h-full bg-panel border-r border-line flex items-center justify-center p-4 text-xs text-mut">
        Нет активной вкладки
      </div>
    )
  }

  const currentPath = tabState?.currentPath || targetTab.currentPath || '/var/www'
  const files = tabState?.items || []
  const selectedNames = tabState?.selectedNames || []
  const isLoading = tabState?.isLoading || false
  const error = tabState?.error || null

  const handleNavigate = (path: string): void => {
    if (targetTab.sessionId) {
      navigateTo(targetTab.id, targetTab.sessionId, path)
    }
  }

  const handleRefresh = (): void => {
    if (targetTab.sessionId) {
      loadDirectory(targetTab.id, targetTab.sessionId, currentPath)
    }
  }

  const handleSelect = (name: string, isCtrl: boolean, isShift: boolean): void => {
    selectItem(targetTab.id, name, isCtrl, isShift)
  }

  const handleClearSelection = (): void => {
    clearSelection(targetTab.id)
  }

  const handleDownload = async (names: string[]): Promise<void> => {
    if (!targetTab.sessionId || names.length === 0) return

    if (typeof window !== 'undefined' && window.api) {
      const dialogRes = await window.api.showOpenDialog({
        title: 'Выберите папку для сохранения файлов',
        properties: ['openDirectory']
      })

      if (dialogRes.canceled || dialogRes.filePaths.length === 0) return
      const localDir = dialogRes.filePaths[0]

      for (const name of names) {
        const remoteFilePath = `${currentPath.replace(/\/+$/, '')}/${name}`
        const localDestPath = `${localDir}/${name}`
        await startDownload(targetTab.sessionId, remoteFilePath, localDestPath)
      }
    }
  }

  const handleUpload = async (): Promise<void> => {
    if (!targetTab.sessionId) return

    if (typeof window !== 'undefined' && window.api) {
      const dialogRes = await window.api.showOpenDialog({
        title: 'Выберите файлы для загрузки на сервер',
        properties: ['openFile', 'multiSelections']
      })

      if (dialogRes.canceled || dialogRes.filePaths.length === 0) return

      for (const localFilePath of dialogRes.filePaths) {
        const slash = localFilePath.includes('\\') ? '\\' : '/'
        const fileName = localFilePath.split(slash).pop() || 'upload'
        const remoteDestPath = `${currentPath.replace(/\/+$/, '')}/${fileName}`
        await startUpload(targetTab.sessionId, localFilePath, remoteDestPath)
      }
    }
  }

  const handleDropFiles = async (filePaths: string[]): Promise<void> => {
    if (!targetTab.sessionId) return

    for (const localFilePath of filePaths) {
      const slash = localFilePath.includes('\\') ? '\\' : '/'
      const fileName = localFilePath.split(slash).pop() || 'file'
      const remoteDestPath = `${currentPath.replace(/\/+$/, '')}/${fileName}`
      await startUpload(targetTab.sessionId, localFilePath, remoteDestPath)
    }
  }

  const handleDelete = async (names: string[]): Promise<void> => {
    if (!targetTab.sessionId || names.length === 0) return
    const isConfirmed = confirm(`Удалить выбранные объекты (${names.length}) на сервере?`)
    if (isConfirmed) {
      await deleteSelected(targetTab.id, targetTab.sessionId)
    }
  }

  const handleOpenTerminalHere = (dirPath: string): void => {
    if (!targetTab) return
    const cmd = formatTerminalCdCommand(dirPath)
    if (targetTab.type === 'ssh' && targetTab.channelId && window.api?.writeSsh) {
      window.api.writeSsh(targetTab.channelId, cmd)
    } else if (targetTab.type === 'local' && targetTab.terminalId && window.api?.writeTerminal) {
      window.api.writeTerminal(targetTab.terminalId, cmd)
    }
  }

  const handleOpenFile = async (remotePath: string): Promise<void> => {
    if (!targetTab.sessionId) return
    await openEditorTab(targetTab.sessionId, remotePath)
  }

  const handleOpenExternal = async (remotePath: string): Promise<void> => {
    if (!targetTab.sessionId || !window.api?.editorOpenExternal) return
    try {
      await window.api.editorOpenExternal({
        sessionId: targetTab.sessionId,
        remotePath
      })
    } catch (err) {
      alert(`Ошибка открытия во внешнем редакторе: ${(err as Error).message}`)
    }
  }

  return (
    <>
      <div
        onDragOver={(e) => {
          e.preventDefault()
        }}
        onDrop={(e) => {
          e.preventDefault()
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const paths: string[] = []
            for (let i = 0; i < e.dataTransfer.files.length; i++) {
              const file = e.dataTransfer.files[i]
              let filePath = (file as unknown as { path?: string }).path
              if (!filePath && typeof window !== 'undefined' && window.api?.getPathForFile) {
                try {
                  filePath = window.api.getPathForFile(file)
                } catch {
                  // ignore
                }
              }
              if (filePath) paths.push(filePath)
            }
            if (paths.length > 0) {
              handleDropFiles(paths)
            }
          }
        }}
        className="w-full h-full bg-panel border-r border-line flex flex-col flex-none min-w-0 select-none overflow-hidden font-sans"
      >
        {/* Breadcrumb Path Bar */}
        <PathBar
          currentPath={currentPath}
          onNavigate={handleNavigate}
          onRefresh={handleRefresh}
          onNewFolder={() => setIsNewFolderOpen(true)}
          onUpload={handleUpload}
        />

        {/* Virtualized File Table */}
        <FileTable
          currentPath={currentPath}
          files={files}
          selectedNames={selectedNames}
          state={isLoading ? 'loading' : error ? 'permission_denied' : 'normal'}
          errorMessage={error}
          onNavigate={handleNavigate}
          onSelect={handleSelect}
          onClearSelection={handleClearSelection}
          onRetry={handleRefresh}
          onDownload={handleDownload}
          onUpload={handleUpload}
          onNewFolder={() => setIsNewFolderOpen(true)}
          onRename={(oldName) => setRenameTarget(oldName)}
          onDelete={handleDelete}
          onChmod={(name) => setChmodTarget(name)}
          onDropFiles={handleDropFiles}
          onOpenTerminalHere={handleOpenTerminalHere}
          onOpenFile={handleOpenFile}
          onOpenExternal={handleOpenExternal}
        />

        {/* Transfer Queue */}
        <TransferList
          transfers={transfers}
          onPauseTransfer={pauseTransfer}
          onResumeTransfer={resumeTransfer}
          onCancelTransfer={cancelTransfer}
          onRetryTransfer={retryTransfer}
        />
      </div>

      {/* Modals */}
      {isNewFolderOpen && (
        <NewFolderModal
          onClose={() => setIsNewFolderOpen(false)}
          onConfirm={(name) => {
            if (targetTab.sessionId) {
              createDirectory(targetTab.id, targetTab.sessionId, name)
            }
          }}
        />
      )}

      {renameTarget && (
        <RenameModal
          currentName={renameTarget}
          onClose={() => setRenameTarget(null)}
          onConfirm={(newName) => {
            if (targetTab.sessionId) {
              renameItem(targetTab.id, targetTab.sessionId, renameTarget, newName)
            }
          }}
        />
      )}

      {chmodTarget && (
        <ChmodModal
          fileName={chmodTarget}
          onClose={() => setChmodTarget(null)}
          onConfirm={(mode) => {
            if (targetTab.sessionId) {
              chmodItem(targetTab.id, targetTab.sessionId, chmodTarget, mode)
            }
          }}
        />
      )}
    </>
  )
}
