import { describe, it, expect, beforeEach } from 'vitest'
import { SshAgentService } from './SshAgentService'

describe('SshAgentService', () => {
  let service: SshAgentService

  beforeEach(() => {
    service = new SshAgentService()
  })

  it('resolves custom agent path if provided', () => {
    const custom = '/custom/path/agent.sock'
    expect(service.resolveAgentSocket(custom)).toBe(custom)
  })

  it('detects agents for current platform', () => {
    const agents = service.detectAgents()
    expect(agents.length).toBeGreaterThan(0)
    for (const a of agents) {
      expect(a.id).toBeDefined()
      expect(a.name).toBeDefined()
      expect(a.socketPath).toBeDefined()
    }
  })

  it('resolves default socket when no custom path given', () => {
    const resolved = service.resolveAgentSocket()
    // Should return string on Windows or if SSH_AUTH_SOCK is set
    if (process.platform === 'win32') {
      expect(resolved).toBe('\\\\.\\pipe\\openssh-ssh-agent')
    }
  })
})
