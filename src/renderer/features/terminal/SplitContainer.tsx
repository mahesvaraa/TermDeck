import { useEffect, useMemo } from 'react'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import type { TabData } from '../../stores/tabs-store'
import { useTabsStore } from '../../stores/tabs-store'
import type { SplitNode } from '@shared/types'
import { createInitialSplit, getAllLeaves } from '../../utils/split-tree'
import { SplitPane } from './SplitPane'

interface SplitContainerProps {
  tab: TabData
  isActive: boolean
  onReconnect?: () => void
}

export function SplitContainer({ tab, isActive, onReconnect }: SplitContainerProps): JSX.Element {
  const closePane = useTabsStore((s) => s.closePane)
  const setActivePane = useTabsStore((s) => s.setActivePane)
  const focusAdjacentPane = useTabsStore((s) => s.focusAdjacentPane)
  const setSplitSizes = useTabsStore((s) => s.setSplitSizes)

  const rootSplit = useMemo(() => {
    return tab.rootSplit || createInitialSplit(`pane-${tab.id}-1`, tab.channelId, tab.terminalId)
  }, [tab.rootSplit, tab.id, tab.channelId, tab.terminalId])

  const leaves = useMemo(() => getAllLeaves(rootSplit), [rootSplit])
  const showPaneHeader = leaves.length > 1

  // Handle Alt+Arrow keyboard navigation between panes
  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return

      if (e.code === 'ArrowUp') {
        e.preventDefault()
        focusAdjacentPane('up')
      } else if (e.code === 'ArrowDown') {
        e.preventDefault()
        focusAdjacentPane('down')
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault()
        focusAdjacentPane('left')
      } else if (e.code === 'ArrowRight') {
        e.preventDefault()
        focusAdjacentPane('right')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isActive, focusAdjacentPane])

  const renderNode = (node: SplitNode): JSX.Element => {
    if (node.type === 'leaf') {
      const isFocused =
        node.id === tab.activePaneId || (!tab.activePaneId && node.id === leaves[0]?.id)
      return (
        <SplitPane
          tab={tab}
          leaf={node}
          isActive={isActive}
          isFocused={isFocused}
          showPaneHeader={showPaneHeader}
          onFocus={() => setActivePane(tab.id, node.id)}
          onClose={() => closePane(tab.id, node.id)}
          onReconnect={onReconnect}
        />
      )
    }

    return (
      <PanelGroup
        direction={node.direction}
        autoSaveId={`termdeck-split-${tab.id}-${node.id}`}
        onLayout={(sizes) => {
          if (sizes.length === 2) {
            setSplitSizes(tab.id, node.id, [sizes[0], sizes[1]])
          }
        }}
      >
        <Panel defaultSize={node.sizes[0]} minSize={15}>
          {renderNode(node.children[0])}
        </Panel>

        <PanelResizeHandle
          className={
            node.direction === 'horizontal'
              ? 'w-[3px] bg-line hover:bg-acc transition-colors cursor-col-resize flex-none'
              : 'h-[3px] bg-line hover:bg-acc transition-colors cursor-row-resize flex-none'
          }
        />

        <Panel defaultSize={node.sizes[1]} minSize={15}>
          {renderNode(node.children[1])}
        </Panel>
      </PanelGroup>
    )
  }

  return (
    <div className="w-full h-full min-w-0 min-h-0 bg-term overflow-hidden">
      {renderNode(rootSplit)}
    </div>
  )
}
