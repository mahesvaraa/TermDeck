import { useEffect, useState, useMemo, useRef } from 'react'
import { HardDrive, ArrowRight, ArrowLeft } from 'lucide-react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useTabsStore } from '../../stores/tabs-store'
import { useSettingsStore } from '../../stores/settings-store'
import { useSftpStore, defaultTabSftpState } from '../../stores/sftp-store'
import { useTransfersStore } from '../../stores/transfers-store'
import { PathBar } from './PathBar'
import { FileTable } from './FileTable'
import { LocalFileTable } from './LocalFileTable'
import { TransferList } from './TransferList'
import { NewFolderModal } from './NewFolderModal'
import { RenameModal } from './RenameModal'
import { ChmodModal } from './ChmodModal'
import { FileDiffModal } from '../editor/FileDiffModal'
import { getLanguageFromPath } from '../../utils/editor-languages'
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
  const isSsh = targetType === 'ssh'

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
  const panelPosition = useSftpStore((s) => s.panelPosition)
  const setPanelPosition = useSftpStore((s) => s.setPanelPosition)
  const toggleSftp = useSettingsStore((s) => s.toggleSftp)
  const toggleOsc7 = useTabsStore((s) => s.toggleOsc7)
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

  // Local Modals & Dual-Pane State
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<string | null>(null)
  const [chmodTarget, setChmodTarget] = useState<string | null>(null)
  const [isDualPane, setIsDualPane] = useState(false)
  const [localPath, setLocalPath] = useState('')
  const [localSelectedNames, setLocalSelectedNames] = useState<string[]>([])
  const [diffModal, setDiffModal] = useState<{
    isOpen: boolean
    leftTitle: string
    rightTitle: string
    originalContent: string
    modifiedContent: string
    language?: string
  }>({
    isOpen: false,
    leftTitle: '',
    rightTitle: '',
    originalContent: '',
    modifiedContent: ''
  })
  const inFlightUploadsRef = useRef<Set<string>>(new Set())

  // Initialize local path for dual pane
  useEffect(() => {
    if (window.api?.localFsHomeDir) {
      window.api
        .localFsHomeDir()
        .then((res) => {
          setLocalPath(res.path)
        })
        .catch(() => {})
    }
  }, [])

  // Load directory on mount or tab change
  useEffect(() => {
    if (targetTabId && targetSessionId && targetType === 'ssh') {
      loadDirectory(targetTabId, targetSessionId, targetPath || '/var/www')
    }
  }, [targetTabId, targetSessionId, targetType, targetPath, loadDirectory])

  // Automatically refresh directory when a transfer completes for this session
  const completedCount = transfers.filter((t) => t.status === 'completed').length
  const prevCompletedCountRef = useRef(completedCount)

  useEffect(() => {
    const currentDirectory = tabState?.currentPath || targetPath || '/var/www'
    if (completedCount > prevCompletedCountRef.current) {
      if (targetTabId && targetSessionId && targetType === 'ssh') {
        loadDirectory(targetTabId, targetSessionId, currentDirectory)
      }
    }
    prevCompletedCountRef.current = completedCount
  }, [completedCount, targetTabId, targetSessionId, targetType, tabState?.currentPath, targetPath, loadDirectory])

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
      const uploadKey = `${targetTab.sessionId}:${localFilePath}:${remoteDestPath}`

      if (inFlightUploadsRef.current.has(uploadKey)) continue
      inFlightUploadsRef.current.add(uploadKey)
      setTimeout(() => inFlightUploadsRef.current.delete(uploadKey), 1200)

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

  const handleCompareDiff = async (names: [string, string]): Promise<void> => {
    if (!targetTab?.sessionId || !window.api?.sftpReadFile) return
    const cleanBase = currentPath.replace(/\/+$/, '')
    const path1 = `${cleanBase}/${names[0]}`
    const path2 = `${cleanBase}/${names[1]}`

    try {
      const [res1, res2] = await Promise.all([
        window.api.sftpReadFile({ sessionId: targetTab.sessionId, remotePath: path1 }),
        window.api.sftpReadFile({ sessionId: targetTab.sessionId, remotePath: path2 })
      ])
      const lang = getLanguageFromPath(names[0]) || getLanguageFromPath(names[1])
      setDiffModal({
        isOpen: true,
        leftTitle: names[0],
        rightTitle: names[1],
        originalContent: res1.content,
        modifiedContent: res2.content,
        language: lang
      })
    } catch (err) {
      alert(`Ошибка чтения файлов для Diff: ${(err as Error).message}`)
    }
  }

  const handleLocalSelect = (name: string, isCtrl: boolean): void => {
    if (isCtrl) {
      setLocalSelectedNames((prev) =>
        prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
      )
    } else {
      setLocalSelectedNames([name])
    }
  }

  const handleUploadSelectedLocalFiles = async (): Promise<void> => {
    if (!targetTab?.sessionId || localSelectedNames.length === 0 || !localPath) return
    const isWin = localPath.includes('\\')
    const sep = isWin ? '\\' : '/'
    const cleanLocalBase = localPath.endsWith(sep) ? localPath : `${localPath}${sep}`
    const cleanRemoteBase = currentPath.replace(/\/+$/, '')

    for (const name of localSelectedNames) {
      const src = `${cleanLocalBase}${name}`
      const dst = `${cleanRemoteBase}/${name}`
      await startUpload(targetTab.sessionId, src, dst)
    }
    setLocalSelectedNames([])
  }

  const handleDownloadSelectedRemoteFiles = async (): Promise<void> => {
    if (!targetTab?.sessionId || selectedNames.length === 0 || !localPath) return
    const isWin = localPath.includes('\\')
    const sep = isWin ? '\\' : '/'
    const cleanLocalBase = localPath.endsWith(sep) ? localPath : `${localPath}${sep}`
    const cleanRemoteBase = currentPath.replace(/\/+$/, '')

    for (const name of selectedNames) {
      const src = `${cleanRemoteBase}/${name}`
      const dst = `${cleanLocalBase}${name}`
      await startDownload(targetTab.sessionId, src, dst)
    }
    handleClearSelection()
  }

  const handleDropRemoteFilesOnLocal = async (names: string[]): Promise<void> => {
    if (!targetTab?.sessionId || names.length === 0 || !localPath) return
    const isWin = localPath.includes('\\')
    const sep = isWin ? '\\' : '/'
    const cleanLocalBase = localPath.endsWith(sep) ? localPath : `${localPath}${sep}`
    const cleanRemoteBase = currentPath.replace(/\/+$/, '')

    for (const name of names) {
      const src = `${cleanRemoteBase}/${name}`
      const dst = `${cleanLocalBase}${name}`
      await startDownload(targetTab.sessionId, src, dst)
    }
  }

  return (
    <>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
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
          panelPosition={panelPosition}
          onTogglePosition={() => setPanelPosition(panelPosition === 'left' ? 'bottom' : 'left')}
          isDualPane={isDualPane}
          onToggleDualPane={() => setIsDualPane(!isDualPane)}
          onCollapse={toggleSftp}
        />

        {/* Dual-Pane View or Single File Table */}
        {isDualPane ? (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <PanelGroup direction="horizontal" className="flex-1 min-h-0">
              <Panel defaultSize={50} minSize={20} order={1}>
                <LocalFileTable
                  currentLocalPath={localPath}
                  onPathChange={setLocalPath}
                  selectedNames={localSelectedNames}
                  onSelect={handleLocalSelect}
                  onClearSelection={() => setLocalSelectedNames([])}
                  onDropRemoteFiles={handleDropRemoteFilesOnLocal}
                />
              </Panel>

              <PanelResizeHandle className="w-1 bg-line hover:bg-acc/50 transition-colors" />

              <Panel defaultSize={50} minSize={20} order={2}>
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
                  onCompareDiff={handleCompareDiff}
                />
              </Panel>
            </PanelGroup>

            {/* Quick Dual-Pane Actions Toolbar */}
            <div className="flex items-center justify-between px-2.5 py-1 bg-panel2/80 border-t border-line text-xs flex-none">
              <button
                type="button"
                disabled={localSelectedNames.length === 0}
                onClick={handleUploadSelectedLocalFiles}
                title="Загрузить выбранные локальные файлы на сервер"
                className="py-1 px-2.5 rounded bg-acc text-bg font-medium hover:bg-acc/90 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1.5 text-[11px] transition-colors"
              >
                <span>Загрузить на сервер ({localSelectedNames.length})</span>
                <ArrowRight className="w-3 h-3" />
              </button>

              <button
                type="button"
                disabled={selectedNames.length === 0}
                onClick={handleDownloadSelectedRemoteFiles}
                title="Скачать выбранные файлы с сервера на локальный ПК"
                className="py-1 px-2.5 rounded border border-line bg-panel hover:bg-panel2 text-tx disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1.5 text-[11px] transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Скачать на ПК ({selectedNames.length})</span>
              </button>
            </div>
          </div>
        ) : (
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
            onCompareDiff={handleCompareDiff}
          />
        )}

        {/* Transfer Queue */}
        <TransferList
          transfers={transfers}
          onPauseTransfer={pauseTransfer}
          onResumeTransfer={resumeTransfer}
          onCancelTransfer={cancelTransfer}
          onRetryTransfer={retryTransfer}
        />

        {/* Footer: OSC 7 Follow status button */}
        <div className="flex items-center justify-between px-2.5 py-1.5 border-t border-line bg-panel2/60 text-xs flex-none select-none">
          <button
            type="button"
            onClick={() => targetTab && isSsh && toggleOsc7(targetTab.id)}
            disabled={!isSsh}
            title={
              !isSsh
                ? 'Следование доступно только для удалённых SSH-сессий'
                : targetTab?.osc7Follow
                ? 'Клик для выключения следования за терминалом'
                : 'Клик для включения следования за терминалом (OSC 7)'
            }
            className={`flex items-center gap-1.5 py-0.5 px-2 rounded-full border text-[11px] font-mono transition-colors ${
              !isSsh
                ? 'opacity-40 cursor-not-allowed border-line text-mut'
                : targetTab?.osc7Follow
                ? 'bg-ok/10 text-ok border-ok/40 hover:bg-ok/20'
                : 'bg-bg text-mut border-line hover:text-tx hover:border-tx/40'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${targetTab?.osc7Follow ? 'bg-ok' : 'bg-mut'}`}
            />
            <span>{targetTab?.osc7Follow ? 'Следование (OSC 7) включено' : 'Следование за терминалом'}</span>
          </button>

          <span className="text-[10px] text-mut">
            {files.length} {files.length === 1 ? 'объект' : files.length >= 2 && files.length <= 4 ? 'объекта' : 'объектов'}
          </span>
        </div>
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

      {diffModal.isOpen && (
        <FileDiffModal
          isOpen={diffModal.isOpen}
          onClose={() => setDiffModal((prev) => ({ ...prev, isOpen: false }))}
          leftTitle={diffModal.leftTitle}
          rightTitle={diffModal.rightTitle}
          originalContent={diffModal.originalContent}
          modifiedContent={diffModal.modifiedContent}
          language={diffModal.language}
        />
      )}
    </>
  )
}
