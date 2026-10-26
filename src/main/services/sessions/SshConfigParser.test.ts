import path from 'node:path'
import { describe, it, expect } from 'vitest'
import {
  parseSshConfig,
  convertSshConfigToSessions,
  expandHomeDir
} from './SshConfigParser'

describe('SshConfigParser', () => {
  it('expands tilde to homedir', () => {
    const fakeHome = path.join('custom', 'home', 'tester')
    expect(expandHomeDir('~/.ssh/id_rsa', fakeHome)).toBe(path.join(fakeHome, '.ssh', 'id_rsa'))
    expect(expandHomeDir('~\\keys\\server.key', fakeHome)).toBe(path.join(fakeHome, 'keys', 'server.key'))
    expect(expandHomeDir('/absolute/path', fakeHome)).toBe('/absolute/path')
  })

  it('parses basic SSH config hosts with keys and ports', () => {
    const fakeHome = '/home/tester'
    const config = `
# Global comment
Host *
  User defaultuser
  Port 2222
  IdentityFile ~/.ssh/default_id

Host prod-web
  HostName 10.0.0.1
  User ubuntu
  Port 22
  IdentityFile ~/.ssh/prod.key

Host dev-box
  HostName dev.internal.corp
  # uses default User and Port from Host *
`
    const entries = parseSshConfig(config, fakeHome)
    expect(entries).toHaveLength(2)

    expect(entries[0].hostPatterns).toEqual(['prod-web'])
    expect(entries[0].hostName).toBe('10.0.0.1')
    expect(entries[0].user).toBe('ubuntu')
    expect(entries[0].port).toBe(22)
    expect(entries[0].identityFile).toBe(path.join(fakeHome, '.ssh', 'prod.key'))

    expect(entries[1].hostPatterns).toEqual(['dev-box'])
    expect(entries[1].hostName).toBe('dev.internal.corp')
    expect(entries[1].user).toBe('defaultuser')
    expect(entries[1].port).toBe(2222)
    expect(entries[1].identityFile).toBe(path.join(fakeHome, '.ssh', 'default_id'))
  })

  it('parses key=value syntax and quoted values', () => {
    const config = `
Host "bastion-server"
  HostName=bastion.example.com
  User='bastion-admin'
  Port=2200
`
    const entries = parseSshConfig(config)
    expect(entries).toHaveLength(1)
    expect(entries[0].hostPatterns).toEqual(['bastion-server'])
    expect(entries[0].hostName).toBe('bastion.example.com')
    expect(entries[0].user).toBe('bastion-admin')
    expect(entries[0].port).toBe(2200)
  })

  it('resolves ProxyJump into jumpHostId relationship', () => {
    const config = `
Host bastion
  HostName 1.2.3.4
  User root

Host internal-node
  HostName 10.0.1.5
  User app
  ProxyJump bastion
`
    const entries = parseSshConfig(config)
    const sessions = convertSshConfigToSessions(entries)

    expect(sessions).toHaveLength(2)
    const bastion = sessions.find((s) => s.name === 'bastion')
    const internal = sessions.find((s) => s.name === 'internal-node')

    expect(bastion).toBeDefined()
    expect(internal).toBeDefined()
    expect(internal?.jumpHostId).toBe(bastion?.id)
  })

  it('skips wildcard host patterns when creating sessions', () => {
    const config = `
Host *.prod.example.com
  User produser

Host api.prod.example.com
  HostName 10.10.10.10
`
    const entries = parseSshConfig(config)
    const sessions = convertSshConfigToSessions(entries)

    expect(sessions).toHaveLength(1)
    expect(sessions[0].name).toBe('api.prod.example.com')
  })
})
