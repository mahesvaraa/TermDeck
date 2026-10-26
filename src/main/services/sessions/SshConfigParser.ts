import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import type { SessionConfig } from '@shared/types'

export interface SshConfigEntry {
  hostPatterns: string[]
  hostName?: string
  user?: string
  port?: number
  identityFile?: string
  proxyJump?: string
  forwardAgent?: boolean
}

/**
 * Normalizes and expands paths like ~/.ssh/id_rsa
 */
export function expandHomeDir(filepath: string, homedir = os.homedir()): string {
  if (!filepath) return filepath
  if (filepath === '~') return homedir
  if (filepath.startsWith('~/') || filepath.startsWith('~\\')) {
    const subPath = filepath.slice(2)
    return path.join(homedir, ...subPath.split(/[/\\]/))
  }
  return filepath
}

/**
 * Gets the standard path to user's SSH config file (~/.ssh/config).
 */
export function getDefaultSshConfigPath(homedir = os.homedir()): string {
  return path.join(homedir, '.ssh', 'config')
}

/**
 * Parses the raw text of an OpenSSH config file.
 */
export function parseSshConfig(rawContent: string, homedir = os.homedir()): SshConfigEntry[] {
  const lines = rawContent.split(/\r?\n/)
  const entries: SshConfigEntry[] = []
  let currentEntry: SshConfigEntry | null = null

  // Global wildcard defaults (e.g. from Host *)
  const globalDefaults: Partial<SshConfigEntry> = {}

  for (const rawLine of lines) {
    const line = rawLine.trim()
    // Skip empty lines and comments
    if (!line || line.startsWith('#')) {
      continue
    }

    // Match "Key Value" or "Key=Value"
    const match = line.match(/^(\w+)(?:[\s=]+(.*))?$/)
    if (!match) continue

    const keyword = match[1].toLowerCase()
    let value = (match[2] || '').trim()

    // Remove quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1).trim()
    }

    if (keyword === 'host') {
      const patterns = value.split(/\s+/).filter(Boolean)
      if (patterns.length === 0) continue

      if (patterns.includes('*')) {
        // This is a catch-all block: subsequent directives become global defaults
        currentEntry = null
      } else {
        currentEntry = { hostPatterns: patterns }
        entries.push(currentEntry)
      }
    } else if (currentEntry) {
      switch (keyword) {
        case 'hostname':
          currentEntry.hostName = value
          break
        case 'user':
          currentEntry.user = value
          break
        case 'port': {
          const parsedPort = Number.parseInt(value, 10)
          if (!Number.isNaN(parsedPort) && parsedPort > 0 && parsedPort <= 65535) {
            currentEntry.port = parsedPort
          }
          break
        }
        case 'identityfile':
          currentEntry.identityFile = expandHomeDir(value, homedir)
          break
        case 'proxyjump':
          currentEntry.proxyJump = value
          break
        case 'forwardagent':
          currentEntry.forwardAgent = value.toLowerCase() === 'yes'
          break
      }
    } else {
      // Global option applied outside of or in Host *
      switch (keyword) {
        case 'user':
          globalDefaults.user = value
          break
        case 'port': {
          const parsedPort = Number.parseInt(value, 10)
          if (!Number.isNaN(parsedPort)) globalDefaults.port = parsedPort
          break
        }
        case 'identityfile':
          globalDefaults.identityFile = expandHomeDir(value, homedir)
          break
        case 'forwardagent':
          globalDefaults.forwardAgent = value.toLowerCase() === 'yes'
          break
      }
    }
  }

  // Apply global defaults to entries where not explicitly specified
  for (const entry of entries) {
    if (!entry.user && globalDefaults.user) entry.user = globalDefaults.user
    if (!entry.port && globalDefaults.port) entry.port = globalDefaults.port
    if (!entry.identityFile && globalDefaults.identityFile) {
      entry.identityFile = globalDefaults.identityFile
    }
    if (entry.forwardAgent === undefined && globalDefaults.forwardAgent !== undefined) {
      entry.forwardAgent = globalDefaults.forwardAgent
    }
  }

  return entries
}

/**
 * Converts parsed SSH config entries into TermDeck SessionConfig objects.
 */
export function convertSshConfigToSessions(
  entries: SshConfigEntry[],
  folderId?: string
): SessionConfig[] {
  const sessions: SessionConfig[] = []

  for (const entry of entries) {
    // For each pattern (usually single alias, but could be multiple)
    for (const pattern of entry.hostPatterns) {
      // Skip wildcard patterns
      if (pattern.includes('*') || pattern.includes('?')) {
        continue
      }

      const host = entry.hostName || pattern
      const port = entry.port || 22
      const username = entry.user || 'root'
      const hasKey = Boolean(entry.identityFile)

      const id = `ssh-cfg-${pattern.replace(/[^a-zA-Z0-9_-]/g, '_')}-${Date.now().toString(36).slice(-4)}`

      const session: SessionConfig = {
        id,
        name: pattern,
        folderId,
        host,
        port,
        username,
        auth: hasKey ? 'key' : 'password',
        keyPath: entry.identityFile,
        tags: ['ssh-config'],
        keepaliveSec: 30,
        encoding: 'utf-8'
      }

      sessions.push(session)
    }
  }

  // Second pass: resolve ProxyJump if it references an imported host alias
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    if (entry.proxyJump) {
      const targetSession = sessions.find((s) => s.name === entry.proxyJump)
      if (targetSession) {
        for (const pattern of entry.hostPatterns) {
          const match = sessions.find((s) => s.name === pattern)
          if (match && match.id !== targetSession.id) {
            match.jumpHostId = targetSession.id
          }
        }
      }
    }
  }

  return sessions
}

/**
 * Reads ~/.ssh/config and parses into SessionConfig list.
 */
export function readAndParseSshConfig(
  customPath?: string,
  homedir = os.homedir()
): { exists: boolean; path: string; sessions: SessionConfig[] } {
  const targetPath = customPath || getDefaultSshConfigPath(homedir)

  if (!fs.existsSync(targetPath)) {
    return { exists: false, path: targetPath, sessions: [] }
  }

  try {
    const content = fs.readFileSync(targetPath, 'utf8')
    const entries = parseSshConfig(content, homedir)
    const sessions = convertSshConfigToSessions(entries)
    return { exists: true, path: targetPath, sessions }
  } catch (err) {
    console.error('Failed to read SSH config:', err)
    return { exists: true, path: targetPath, sessions: [] }
  }
}
