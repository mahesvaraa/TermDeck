/**
 * SOCKS5 Protocol Parser (RFC 1928)
 */

export interface Socks5ConnectRequest {
  dstHost: string
  dstPort: number
}

/**
 * Handle initial SOCKS5 greeting/handshake.
 * Returns true if greeting is valid and accepts NO_AUTH (0x00).
 */
export function parseSocks5Greeting(buffer: Buffer): boolean {
  if (buffer.length < 2) return false
  const version = buffer[0]
  if (version !== 0x05) return false

  const nmethods = buffer[1]
  if (buffer.length < 2 + nmethods) return false

  // Check if NO_AUTH (0x00) is among offered methods
  for (let i = 0; i < nmethods; i++) {
    if (buffer[2 + i] === 0x00) {
      return true
    }
  }

  return false
}

export const SOCKS5_HANDSHAKE_RESPONSE = Buffer.from([0x05, 0x00])
export const SOCKS5_AUTH_FAILED_RESPONSE = Buffer.from([0x05, 0xff])

export const SOCKS5_REPLY_SUCCESS = Buffer.from([
  0x05, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
])

export function createSocks5ErrorReply(errorCode = 0x05): Buffer {
  return Buffer.from([0x05, errorCode, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
}

/**
 * Parse SOCKS5 CONNECT command request.
 */
export function parseSocks5ConnectRequest(buffer: Buffer): Socks5ConnectRequest | null {
  if (buffer.length < 6) return null

  const version = buffer[0]
  const command = buffer[1] // 0x01 = CONNECT
  // buffer[2] is RSV (0x00)
  const atyp = buffer[3]

  if (version !== 0x05 || command !== 0x01) {
    return null
  }

  let dstHost = ''
  let portOffset = 0

  if (atyp === 0x01) {
    // IPv4 (4 bytes)
    if (buffer.length < 10) return null
    dstHost = `${buffer[4]}.${buffer[5]}.${buffer[6]}.${buffer[7]}`
    portOffset = 8
  } else if (atyp === 0x03) {
    // Domain name (1 byte length + ASCII string)
    const domainLen = buffer[4]
    if (buffer.length < 5 + domainLen + 2) return null
    dstHost = buffer.subarray(5, 5 + domainLen).toString('ascii')
    portOffset = 5 + domainLen
  } else if (atyp === 0x04) {
    // IPv6 (16 bytes)
    if (buffer.length < 22) return null
    const parts: string[] = []
    for (let i = 0; i < 16; i += 2) {
      parts.push(buffer.readUInt16BE(4 + i).toString(16))
    }
    dstHost = parts.join(':')
    portOffset = 20
  } else {
    return null
  }

  const dstPort = buffer.readUInt16BE(portOffset)

  return {
    dstHost,
    dstPort
  }
}
