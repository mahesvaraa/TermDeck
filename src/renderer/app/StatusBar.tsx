import { useEffect, useState } from 'react'
import { useTabsStore } from '../stores/tabs-store'
import type { AppVersionInfo } from '../../shared/types'

export function StatusBar(): JSX.Element {
  const getActiveTab = useTabsStore((s) => s.getActiveTab)
  const activeTab = getActiveTab()

  const [versionInfo, setVersionInfo] = useState<AppVersionInfo | null>(null)

  useEffect(() => {
    window.api
      ?.getVersion()
      .then((info) => setVersionInfo(info))
      .catch(() => {})
  }, [])

  const getStatusDisplay = (): JSX.Element => {
    if (!activeTab) return <span>Отключено</span>
    if (activeTab.type === 'local') {
      return <span>● Локально</span>
    }
    if (activeTab.status === 'connected') {
      return <span className="text-ok">● Подключено</span>
    }
    if (activeTab.status === 'connecting') {
      return <span className="text-warn">● Подключение…</span>
    }
    if (activeTab.status === 'error') {
      return <span className="text-err">● Ошибка</span>
    }
    return <span className="text-mut">● Отключено</span>
  }

  return (
    <footer className="flex items-center gap-4 py-1 px-3 bg-panel2 border-t border-line text-mut text-xs flex-none overflow-x-auto whitespace-nowrap select-none">
      {getStatusDisplay()}
      <span>{activeTab?.host || '—'}</span>
      <span>Путь: {activeTab?.currentPath || '/'}</span>
      <span>Аптайм: {activeTab?.uptime || '—'}</span>

      <span className="ml-auto font-mono text-[11px] text-mut">UTF-8 · 120×32</span>

      {versionInfo && (
        <span className="py-0.5 px-1.5 rounded bg-bg border border-line text-[11px] font-mono text-tx">
          {versionInfo.name} v{versionInfo.version}
        </span>
      )}
    </footer>
  )
}
