import { useTabsStore } from '../../stores/tabs-store'
import type { TransferItem } from '@shared/types'

export interface UseTransfersResult {
  transfers: TransferItem[]
}

export function useTransfers(tabId?: string): UseTransfersResult {
  const tabs = useTabsStore((s) => s.tabs)
  const activeTabId = useTabsStore((s) => s.activeTabId)
  const targetId = tabId || activeTabId

  const activeTab = tabs.find((t) => t.id === targetId)
  return {
    transfers: activeTab?.transfers || []
  }
}
