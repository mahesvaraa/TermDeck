import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Client } from 'ssh2'
import type { TunnelConfig } from '@shared/types'
import { TunnelService } from './TunnelService'
import { sshConnectionManager } from '../ssh/SshConnectionManager'

describe('TunnelService', () => {
  let service: TunnelService

  beforeEach(() => {
    service = new TunnelService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    service.closeAll()
  })

  it('saves, retrieves and deletes tunnel configurations', async () => {
    const config: TunnelConfig = {
      id: 'tun-1',
      sessionId: 'sess-1',
      name: 'Postgres DB',
      type: 'local',
      enabled: false,
      autoStart: false,
      localPort: 15432,
      dstHost: '127.0.0.1',
      dstPort: 5432
    }

    const saved = service.saveTunnelConfig(config)
    expect(saved.id).toBe('tun-1')
    expect(saved.status).toBe('inactive')

    const list = service.getTunnels('sess-1')
    expect(list).toHaveLength(1)
    expect(list[0].name).toBe('Postgres DB')

    await service.deleteTunnel('tun-1')
    expect(service.getTunnels('sess-1')).toHaveLength(0)
  })

  it('rejects start if SSH session is not connected', async () => {
    vi.spyOn(sshConnectionManager, 'getClient').mockReturnValue(undefined)

    const config: TunnelConfig = {
      id: 'tun-2',
      sessionId: 'disconnected-sess',
      name: 'Web',
      type: 'local',
      enabled: true,
      autoStart: false,
      localPort: 18080,
      dstHost: '127.0.0.1',
      dstPort: 80
    }

    await expect(service.startTunnel(config)).rejects.toThrow('SSH-сессия не подключена')
  })

  it('starts a local tunnel successfully and handles stop', async () => {
    const mockClient = {
      forwardOut: vi.fn()
    } as unknown as Client

    vi.spyOn(sshConnectionManager, 'getClient').mockReturnValue(mockClient)

    const config: TunnelConfig = {
      id: 'tun-3',
      sessionId: 'sess-1',
      name: 'Local DB',
      type: 'local',
      enabled: true,
      autoStart: false,
      localHost: '127.0.0.1',
      localPort: 0, // OS assigns an ephemeral free port
      dstHost: '127.0.0.1',
      dstPort: 5432
    }

    const started = await service.startTunnel(config)
    expect(started.status).toBe('active')
    expect(started.enabled).toBe(true)

    const stopped = await service.stopTunnel('tun-3')
    expect(stopped.status).toBe('inactive')
    expect(stopped.enabled).toBe(false)
  })

  it('closes all tunnels for a given session', async () => {
    const mockClient = {
      forwardOut: vi.fn()
    } as unknown as Client

    vi.spyOn(sshConnectionManager, 'getClient').mockReturnValue(mockClient)

    const config1: TunnelConfig = {
      id: 'tun-sess-1',
      sessionId: 'sess-cleanup',
      name: 'Tunnel 1',
      type: 'local',
      enabled: true,
      autoStart: false,
      localPort: 0,
      dstHost: '127.0.0.1',
      dstPort: 80
    }

    await service.startTunnel(config1)
    expect(service.getTunnels('sess-cleanup')[0].status).toBe('active')

    await service.closeSessionTunnels('sess-cleanup')
    expect(service.getTunnels('sess-cleanup')[0].status).toBe('inactive')
  })
})
