/**
 * Strips all ANSI escape codes (colors, cursor movements, OSC sequences) from text.
 */
export function stripAnsi(text: string): string {
  return (
    text
      // Strip OSC sequences: ESC ] ... (BEL or ESC \)
      // eslint-disable-next-line no-control-regex
      .replace(/\x1b\][^\x07\x1b]*(\x07|\x1b\\)/g, '')
      // Strip CSI sequences: ESC [ ... command
      // eslint-disable-next-line no-control-regex
      .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
      // Strip simple 2-byte ESC sequences: ESC ( B, ESC = etc.
      // eslint-disable-next-line no-control-regex
      .replace(/\x1b[@-Z\\-_]/g, '')
  )
}
