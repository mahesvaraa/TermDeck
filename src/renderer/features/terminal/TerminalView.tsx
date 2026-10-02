import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import { SearchAddon } from '@xterm/addon-search'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import { RotateCcw, AlertTriangle } from 'lucide-react'
import { BUILTIN_THEMES } from '../../utils/theme-importer'
import { TerminalSearchBar } from './TerminalSearchBar'
import { useSettingsStore } from '../../stores/settings-store'
import { useTabsStore } from '../../stores/tabs-store'
import { useSftpStore } from '../../stores/sftp-store'
import { parseOsc7Uri } from '../../utils/osc7'
import { getAllLeaves } from '../../utils/split-tree'
import type { TabData } from '../../stores/tabs-store'

interface TerminalViewProps {
  tab?: TabData
  isActive?: boolean
  onReconnect?: () => void
}

export function TerminalView({
  tab,
  isActive = true,
  onReconnect
}: TerminalViewProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const searchAddonRef = useRef<SearchAddon | null>(null)

  const [isExited, setIsExited] = useState(false)
  const [exitCode, setExitCode] = useState<number | null>(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  const isActiveRef = useRef(isActive)
  useEffect(() => {
    isActiveRef.current = isActive
  }, [isActive])

  const tabRef = useRef(tab)
  useEffect(() => {
    tabRef.current = tab
  }, [tab])

  const streamId = tab?.channelId || tab?.terminalId
  const isSsh = tab?.type === 'ssh'

  const terminalSettings = useSettingsStore((s) => s.terminalSettings)
  const activeTheme =
    terminalSettings.customThemes[terminalSettings.colorScheme] ||
    BUILTIN_THEMES[terminalSettings.colorScheme] ||
    BUILTIN_THEMES['TermDeck Dark']

  const rawFont =
    terminalSettings.fontFamily || "'JetBrains Mono', 'Cascadia Code', Consolas, monospace"
  const cleanFont =
    rawFont.replace(/var\(--mono\),?\s*/g, '').trim() ||
    "'JetBrains Mono', 'Cascadia Code', Consolas, monospace"

  // Update terminal options live when settings change
  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = activeTheme
      termRef.current.options.fontFamily = cleanFont
      termRef.current.options.fontSize = terminalSettings.fontSize
      termRef.current.options.lineHeight = terminalSettings.lineHeight
      termRef.current.options.letterSpacing = 0
      termRef.current.options.cursorStyle = terminalSettings.cursorStyle
      termRef.current.options.cursorBlink = terminalSettings.cursorBlink
      termRef.current.options.scrollback = terminalSettings.scrollback
      fitAddonRef.current?.fit()
    }
  }, [activeTheme, terminalSettings, cleanFont])

  // Auto-spawn local terminal if tab is local and has no streamId yet
  useEffect(() => {
    if (tab?.type === 'local' && !streamId) {
      if (typeof window !== 'undefined' && window.api?.createTerminal) {
        window.api
          .createTerminal()
          .then((res) => {
            if (res?.terminalId && tabRef.current) {
              useTabsStore.getState().setTabTerminalId(tabRef.current.id, res.terminalId)
            }
          })
          .catch((err) => {
            console.error('Failed to auto-spawn local terminal:', err)
          })
      }
    }
  }, [tab?.id, tab?.type, streamId])

  // Terminal lifecycle for tabs with an active stream (local or SSH)
  useEffect(() => {
    if (!streamId || !containerRef.current) {
      return
    }

    const term = new Terminal({
      theme: activeTheme,
      fontFamily: cleanFont,
      fontSize: terminalSettings.fontSize,
      lineHeight: terminalSettings.lineHeight,
      letterSpacing: 0,
      fontWeight: '400',
      fontWeightBold: '700',
      cursorBlink: terminalSettings.cursorBlink,
      cursorStyle: terminalSettings.cursorStyle,
      scrollback: terminalSettings.scrollback,
      allowProposedApi: true
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)

    const searchAddon = new SearchAddon()
    term.loadAddon(searchAddon)

    const webLinksAddon = new WebLinksAddon()
    term.loadAddon(webLinksAddon)

    const unicode11Addon = new Unicode11Addon()
    term.loadAddon(unicode11Addon)
    term.unicode.activeVersion = '11'

    term.open(containerRef.current)

    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(() => {
        if (fitAddonRef.current) {
          fitAddonRef.current.fit()
        }
      })
    }

    // Attempt WebGL acceleration with graceful fallback to DOM renderer
    try {
      const webglAddon = new WebglAddon()
      webglAddon.onContextLoss(() => {
        webglAddon.dispose()
      })
      term.loadAddon(webglAddon)
    } catch {
      // Standard canvas/DOM fallback is used automatically
    }

    termRef.current = term
    fitAddonRef.current = fitAddon
    searchAddonRef.current = searchAddon

    // Send input from xterm to pty or ssh (supports multi-exec across splits)
    const dataDisposable = term.onData((data) => {
      const activeTab = tabRef.current
      const currentTab = activeTab
        ? useTabsStore.getState().tabs.find((t) => t.id === activeTab.id)
        : undefined
      if (currentTab?.isMultiExec && currentTab.rootSplit) {
        const leaves = getAllLeaves(currentTab.rootSplit)
        for (const leaf of leaves) {
          if (leaf.channelId) {
            window.api?.writeSsh(leaf.channelId, data)
          } else if (leaf.terminalId) {
            window.api?.writeTerminal(leaf.terminalId, data)
          }
        }
      } else {
        if (isSsh) {
          window.api?.writeSsh(streamId, data)
        } else {
          window.api?.writeTerminal(streamId, data)
        }
      }
    })

    // Custom key event handler for Ctrl+Shift+C / Ctrl+Shift+V / Ctrl+Shift+F
    term.attachCustomKeyEventHandler((event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.code === 'KeyF') {
        event.preventDefault()
        setIsSearchOpen((prev) => !prev)
        return false
      }
      if (event.ctrlKey && event.shiftKey && event.code === 'KeyC') {
        event.preventDefault()
        const selection = term.getSelection()
        if (selection) {
          navigator.clipboard.writeText(selection)
        }
        return false
      }
      if (event.ctrlKey && event.shiftKey && event.code === 'KeyV') {
        event.preventDefault()
        navigator.clipboard.readText().then((text) => {
          if (text) {
            const activeTab = tabRef.current
            const currentTab = activeTab
              ? useTabsStore.getState().tabs.find((t) => t.id === activeTab.id)
              : undefined
            if (currentTab?.isMultiExec && currentTab.rootSplit) {
              const leaves = getAllLeaves(currentTab.rootSplit)
              for (const leaf of leaves) {
                if (leaf.channelId) {
                  window.api?.writeSsh(leaf.channelId, text)
                } else if (leaf.terminalId) {
                  window.api?.writeTerminal(leaf.terminalId, text)
                }
              }
            } else {
              if (isSsh) {
                window.api?.writeSsh(streamId, text)
              } else {
                window.api?.writeTerminal(streamId, text)
              }
            }
          }
        })
        return false
      }
      return true
    })

    // Copy on select option
    const selectionDisposable = term.onSelectionChange(() => {
      if (useSettingsStore.getState().copyOnSelect && term.hasSelection()) {
        navigator.clipboard.writeText(term.getSelection())
      }
    })

    // Register OSC 7 directory synchronization handler
    const osc7Disposable = term.parser.registerOscHandler(7, (data) => {
      const newPath = parseOsc7Uri(data)
      const activeTab = tabRef.current
      if (newPath && activeTab) {
        useTabsStore.getState().setTabPath(activeTab.id, newPath)
        const currentTab = useTabsStore.getState().tabs.find((t) => t.id === activeTab.id)
        if (currentTab?.osc7Follow && currentTab.type === 'ssh' && currentTab.sessionId) {
          useSftpStore.getState().navigateTo(currentTab.id, currentTab.sessionId, newPath)
        }
      }
      return true
    })

    // Receive data from pty or ssh
    const unsubscribeData = isSsh
      ? window.api?.onSshData((event) => {
          if (event.channelId === streamId) {
            term.write(event.data)
            const logCfg = useSettingsStore.getState().logging
            if (logCfg.enabled && window.api?.logTerminal) {
              window.api.logTerminal({
                sessionId: tabRef.current?.sessionId || 'ssh',
                data: event.data,
                stripAnsi: logCfg.stripAnsi
              })
            }
          }
        })
      : window.api?.onTerminalData((event) => {
          if (event.terminalId === streamId) {
            term.write(event.data)
            const logCfg = useSettingsStore.getState().logging
            if (logCfg.enabled && window.api?.logTerminal) {
              window.api.logTerminal({
                sessionId: 'local',
                data: event.data,
                stripAnsi: logCfg.stripAnsi
              })
            }
          }
        })

    // Handle exit
    const unsubscribeExit = isSsh
      ? window.api?.onSshExit((event) => {
          if (event.channelId === streamId) {
            setIsExited(true)
            setExitCode(event.exitCode)
          }
        })
      : window.api?.onTerminalExit((event) => {
          if (event.terminalId === streamId) {
            setIsExited(true)
            setExitCode(event.exitCode)
          }
        })

    // Initial fit
    setTimeout(() => {
      try {
        fitAddon.fit()
        const { cols, rows } = term
        if (cols && rows) {
          if (isSsh) {
            window.api?.resizeSsh(streamId, cols, rows)
          } else {
            window.api?.resizeTerminal(streamId, cols, rows)
          }
        }
      } catch {
        // Ignored
      }
    }, 50)

    // ResizeObserver for geometry synchronization
    const resizeObserver = new ResizeObserver(() => {
      if (!isActiveRef.current) return
      try {
        fitAddon.fit()
        const { cols, rows } = term
        if (cols && rows) {
          if (isSsh) {
            window.api?.resizeSsh(streamId, cols, rows)
          } else {
            window.api?.resizeTerminal(streamId, cols, rows)
          }
        }
      } catch {
        // Ignored
      }
    })

    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      dataDisposable.dispose()
      selectionDisposable.dispose()
      osc7Disposable.dispose()
      if (unsubscribeData) unsubscribeData()
      if (unsubscribeExit) unsubscribeExit()
      term.dispose()
      termRef.current = null
      fitAddonRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId, isSsh])

  // Refit and focus when tab becomes active
  useEffect(() => {
    if (isActive && fitAddonRef.current && termRef.current && streamId) {
      setTimeout(() => {
        try {
          fitAddonRef.current?.fit()
          termRef.current?.focus()
          const { cols, rows } = termRef.current!
          if (cols && rows) {
            if (isSsh) {
              window.api?.resizeSsh(streamId, cols, rows)
            } else {
              window.api?.resizeTerminal(streamId, cols, rows)
            }
          }
        } catch {
          // Ignored
        }
      }, 50)
    }
  }, [isActive, streamId, isSsh])

  // Right-click context menu: copy if selection exists, otherwise paste
  const handleContextMenu = (e: MouseEvent<HTMLDivElement>): void => {
    e.preventDefault()
    const term = termRef.current
    if (term && term.hasSelection()) {
      navigator.clipboard.writeText(term.getSelection())
    } else if (streamId) {
      navigator.clipboard.readText().then((text) => {
        if (text) {
          if (isSsh) {
            window.api?.writeSsh(streamId, text)
          } else {
            window.api?.writeTerminal(streamId, text)
          }
        }
      })
    }
  }

  // Format mock lines for tabs without pty process (demo / mockup mode)
  const renderMockFormattedText = (text: string): JSX.Element[] => {
    return text.split('\n').map((line, idx) => {
      let coloredLine = <span className="text-termtx">{line}</span>

      if (line.includes('Connected to') || line.includes('Connected via')) {
        coloredLine = <span className="text-mut">{line}</span>
      } else if (line.includes('deploy@') || line.includes('postgres@') || line.includes('anna@')) {
        const parts = line.split(/(:|%|\$)/)
        coloredLine = (
          <span>
            <span className="text-ok font-semibold">{parts[0]}</span>
            <span className="text-mut">{parts[1] || ''}</span>
            <span className="text-acc">{parts.slice(2).join('')}</span>
          </span>
        )
      } else if (line.includes('[warn]') || line.startsWith(' M ')) {
        coloredLine = <span className="text-warn">{line}</span>
      } else if (line.includes('[error]') || line.startsWith('?? ')) {
        coloredLine = <span className="text-err">{line}</span>
      } else if (line.includes('[info]') || line.includes('total ')) {
        coloredLine = <span className="text-mut">{line}</span>
      }

      return (
        <div key={idx} className="leading-relaxed">
          {coloredLine}
        </div>
      )
    })
  }

  const isDisconnected = tab?.status === 'disconnected' || tab?.status === 'error' || isExited

  return (
    <div
      onContextMenu={handleContextMenu}
      className="flex-1 flex flex-col min-w-0 bg-term text-termtx font-mono text-[13px] relative select-text overflow-hidden h-full w-full"
    >
      {/* Connecting overlay */}
      {tab?.status === 'connecting' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-term/85 backdrop-blur-xs text-mut space-y-2 select-none">
          <div className="w-5 h-5 border-2 border-acc border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-sans">Подключение к {tab.host}…</span>
        </div>
      )}

      {/* Reconnect / Exit banner */}
      {isDisconnected && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-err/15 border-b border-err/30 text-err text-xs flex-none select-none z-10">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-err flex-none" />
            <span>
              {tab?.errorMessage
                ? tab.errorMessage
                : exitCode !== null
                  ? `Процесс завершился с кодом ${exitCode}`
                  : tab?.status === 'error'
                    ? 'Соединение разорвано из-за ошибки сети'
                    : 'Сессия отключена'}
            </span>
          </div>
          {onReconnect && (
            <button
              type="button"
              onClick={onReconnect}
              className="flex items-center gap-1 px-2 py-0.5 rounded border border-err/40 hover:bg-err/20 text-xs font-sans font-medium transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Переподключиться</span>
            </button>
          )}
        </div>
      )}

      {/* Terminal Viewport */}
      {streamId ? (
        <div ref={containerRef} className="flex-1 min-h-0 w-full h-full p-2 relative" />
      ) : (
        <div className="flex-1 p-3.5 overflow-y-auto whitespace-pre-wrap">
          {tab?.termText ? renderMockFormattedText(tab.termText) : <div>$ </div>}
          <span
            className="inline-block w-2 h-4 bg-termtx align-[-2px] animate-pulse"
            aria-hidden="true"
          />
        </div>
      )}

      {/* Terminal Search Bar (Ctrl+Shift+F) */}
      <TerminalSearchBar
        searchAddon={searchAddonRef.current}
        isOpen={isSearchOpen}
        onClose={() => {
          setIsSearchOpen(false)
          termRef.current?.focus()
        }}
      />
    </div>
  )
}
