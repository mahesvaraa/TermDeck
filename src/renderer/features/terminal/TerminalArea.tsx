import { lazy, Suspense } from 'react'
import { useTabsStore } from '../../stores/tabs-store'
import { SplitContainer } from './SplitContainer'

const RemoteEditor = lazy(() =>
  import('../editor/RemoteEditor').then((m) => ({ default: m.RemoteEditor }))
)

export function TerminalArea(): JSX.Element {
  const tabs = useTabsStore((s) => s.tabs)
  const activeTabId = useTabsStore((s) => s.activeTabId)
  const setTabStatus = useTabsStore((s) => s.setTabStatus)
  const connectSshTab = useTabsStore((s) => s.connectSshTab)

  return (
    <div className="relative w-full h-full flex-1 min-h-0 min-w-0 overflow-hidden bg-term">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        return (
          <div
            key={tab.id}
            className="absolute inset-0 w-full h-full"
            style={{
              visibility: isActive ? 'visible' : 'hidden',
              pointerEvents: isActive ? 'auto' : 'none',
              zIndex: isActive ? 1 : 0
            }}
          >
            {tab.type === 'editor' ? (
              <Suspense
                fallback={
                  <div className="w-full h-full flex items-center justify-center bg-term text-mut text-xs">
                    Загрузка редактора…
                  </div>
                }
              >
                <RemoteEditor tab={tab} isActive={isActive} />
              </Suspense>
            ) : (
              <SplitContainer
                tab={tab}
                isActive={isActive}
                onReconnect={() => {
                  if (tab.type === 'ssh') {
                    connectSshTab(tab.id)
                  } else {
                    setTabStatus(tab.id, 'connecting')
                    setTimeout(() => setTabStatus(tab.id, 'connected'), 500)
                  }
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
