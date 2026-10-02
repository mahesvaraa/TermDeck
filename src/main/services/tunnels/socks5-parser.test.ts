import { describe, it, expect } from 'vitest'
import {
  parseSocks5Greeting,
  parseSocks5ConnectRequest,
  SOCKS5_HANDSHAKE_RESPONSE,
  SOCKS5_AUTH_FAILED_RESPONSE,
  SOCKS5_REPLY_SUCCESS,
  createSocks5ErrorReply
} from './socks5-parser'

describe('socks5-parser', () => {
  describe('parseSocks5Greeting', () => {
    it('accepts greeting with NO_AUTH method (0x00)', () => {
      // Version 5, 2 methods: 0x00 (NO_AUTH), 0x02 (PASSWORD)
      const buffer = Buffer.from([0x05, 0x02, 0x00, 0x02])
      expect(parseSocks5Greeting(buffer)).toBe(true)
    })

    it('rejects greeting with invalid SOCKS version', () => {
      const buffer = Buffer.from([0x04, 0x01, 0x00])
      expect(parseSocks5Greeting(buffer)).toBe(false)
    })

    it('rejects greeting without NO_AUTH method', () => {
      // Only 0x02 (PASSWORD) offered
      const buffer = Buffer.from([0x05, 0x01, 0x02])
      expect(parseSocks5Greeting(buffer)).toBe(false)
    })

    it('rejects truncated buffer', () => {
      const buffer = Buffer.from([0x05])
      expect(parseSocks5Greeting(buffer)).toBe(false)
    })
  })

  describe('parseSocks5ConnectRequest', () => {
    it('parses IPv4 destination address and port', () => {
      // 0x05, 0x01 (CONNECT), 0x00 (RSV), 0x01 (IPv4), 192.168.1.100, port 8080 (0x1f90)
      const buffer = Buffer.from([0x05, 0x01, 0x00, 0x01, 192, 168, 1, 100, 0x1f, 0x90])

      const req = parseSocks5ConnectRequest(buffer)
      expect(req).not.toBeNull()
      expect(req?.dstHost).toBe('192.168.1.100')
      expect(req?.dstPort).toBe(8080)
    })

    it('parses domain name destination and port', () => {
      // Domain: "db.local" (len = 8), port 5432 (0x1538)
      const domainBuf = Buffer.from('db.local', 'ascii')
      const buffer = Buffer.concat([
        Buffer.from([0x05, 0x01, 0x00, 0x03, domainBuf.length]),
        domainBuf,
        Buffer.from([0x15, 0x38])
      ])

      const req = parseSocks5ConnectRequest(buffer)
      expect(req).not.toBeNull()
      expect(req?.dstHost).toBe('db.local')
      expect(req?.dstPort).toBe(5432)
    })

    it('returns null for non-CONNECT command', () => {
      // Command 0x02 (BIND)
      const buffer = Buffer.from([0x05, 0x02, 0x00, 0x01, 127, 0, 0, 1, 0x00, 0x50])
      expect(parseSocks5ConnectRequest(buffer)).toBeNull()
    })
  })

  describe('response buffers', () => {
    it('provides standard response buffers', () => {
      expect(SOCKS5_HANDSHAKE_RESPONSE).toEqual(Buffer.from([0x05, 0x00]))
      expect(SOCKS5_AUTH_FAILED_RESPONSE).toEqual(Buffer.from([0x05, 0xff]))
      expect(SOCKS5_REPLY_SUCCESS[1]).toBe(0x00)
      expect(createSocks5ErrorReply(0x05)[1]).toBe(0x05)
    })
  })
})
