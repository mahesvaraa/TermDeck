/**
 * Parse an OSC 7 payload (e.g. "file://hostname/path/to/dir" or "file:///path/to/dir")
 * and return the normalized decoded absolute path.
 */
export function parseOsc7Uri(data: string): string | null {
  if (!data) return null
  const trimmed = data.trim()
  if (!trimmed.startsWith('file://')) {
    return null
  }

  try {
    const url = new URL(trimmed)
    if (url.protocol === 'file:') {
      let pathname = decodeURIComponent(url.pathname)

      // Handle Windows drive prefix e.g. /C:/path -> C:/path
      if (/^\/[a-zA-Z]:/.test(pathname)) {
        pathname = pathname.slice(1)
      }

      if (pathname.length > 1 && pathname.endsWith('/')) {
        pathname = pathname.slice(0, -1)
      }
      return pathname || '/'
    }
  } catch {
    // Fallback regex in case of non-standard hostname or special characters
    const match = trimmed.match(/^file:\/\/[^/]*(\/.*)$/)
    if (match) {
      try {
        let p = decodeURIComponent(match[1])
        if (p.length > 1 && p.endsWith('/')) {
          p = p.slice(0, -1)
        }
        return p || '/'
      } catch {
        return match[1]
      }
    }
  }

  return null
}

/**
 * Format a shell "cd" command with safe POSIX single-quote escaping.
 * Example: "/var/log/don't" -> "cd '/var/log/don\'\'t'\n"
 */
export function formatTerminalCdCommand(rawPath: string): string {
  const escaped = rawPath.replace(/'/g, "'\\''")
  return `cd '${escaped}'\n`
}
