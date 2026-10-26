import { existsSync } from 'node:fs'
import { homedir, platform } from 'node:os'

export interface DetectedSshAgent {
  id: string
  name: string
  type: 'openssh' | 'pageant' | '1password' | 'custom'
  socketPath: string
  isAvailable: boolean
  description: string
}

export class SshAgentService {
  /**
   * Resolves the agent socket path according to user preference or platform defaults.
   */
  public resolveAgentSocket(customPath?: string): string | undefined {
    if (customPath && customPath.trim().length > 0) {
      return customPath.trim()
    }

    // 1. Environment variable SSH_AUTH_SOCK
    if (process.env.SSH_AUTH_SOCK && process.env.SSH_AUTH_SOCK.trim().length > 0) {
      return process.env.SSH_AUTH_SOCK.trim()
    }

    // 2. Windows-specific defaults
    if (platform() === 'win32') {
      // OpenSSH Authentication Agent / 1Password default named pipe on Windows
      return '\\\\.\\pipe\\openssh-ssh-agent'
    }

    // 3. macOS 1Password default socket
    if (platform() === 'darwin') {
      const onePasswordMac = `${homedir()}/Library/Group Containers/2BUA8C4S2C.com.1password/t/agent.sock`
      if (existsSync(onePasswordMac)) {
        return onePasswordMac
      }
    }

    // 4. Linux 1Password default socket
    if (platform() === 'linux') {
      const onePasswordLinux = `${homedir()}/.1password/agent.sock`
      if (existsSync(onePasswordLinux)) {
        return onePasswordLinux
      }
    }

    return undefined
  }

  /**
   * Detects known SSH agents on the current operating system.
   */
  public detectAgents(): DetectedSshAgent[] {
    const isWin = platform() === 'win32'
    const isMac = platform() === 'darwin'
    const isLinux = platform() === 'linux'

    const envAuthSock = process.env.SSH_AUTH_SOCK?.trim() || ''

    const agents: DetectedSshAgent[] = []

    // 1. OpenSSH Agent
    if (isWin) {
      agents.push({
        id: 'win-openssh',
        name: 'OpenSSH Authentication Agent (Windows)',
        type: 'openssh',
        socketPath: '\\\\.\\pipe\\openssh-ssh-agent',
        isAvailable: true, // Standard Windows service pipe
        description: 'Служба «Агент аутентификации OpenSSH» (Windows Named Pipe)'
      })

      // Pageant
      agents.push({
        id: 'win-pageant',
        name: 'PuTTY / Pageant',
        type: 'pageant',
        socketPath: 'pageant',
        isAvailable: true,
        description: 'Pageant (PuTTY SSH Authentication Agent)'
      })
    } else {
      const hasEnvSock = envAuthSock.length > 0 && existsSync(envAuthSock)
      agents.push({
        id: 'unix-openssh',
        name: 'OpenSSH Agent ($SSH_AUTH_SOCK)',
        type: 'openssh',
        socketPath: envAuthSock || '/tmp/ssh-agent.sock',
        isAvailable: hasEnvSock,
        description: hasEnvSock
          ? `Активный сокет агента: ${envAuthSock}`
          : 'Переменная окружения $SSH_AUTH_SOCK не задана'
      })
    }

    // 2. 1Password SSH Agent
    if (isWin) {
      agents.push({
        id: '1password-win',
        name: '1Password SSH Agent',
        type: '1password',
        socketPath: '\\\\.\\pipe\\openssh-ssh-agent',
        isAvailable: true,
        description: 'Интеграция 1Password через Named Pipe openssh-ssh-agent'
      })
    } else if (isMac) {
      const opMac = `${homedir()}/Library/Group Containers/2BUA8C4S2C.com.1password/t/agent.sock`
      const available = existsSync(opMac)
      agents.push({
        id: '1password-mac',
        name: '1Password SSH Agent',
        type: '1password',
        socketPath: opMac,
        isAvailable: available,
        description: available ? '1Password Agent обнаружен' : 'Сокет 1Password не найден'
      })
    } else if (isLinux) {
      const opLinux = `${homedir()}/.1password/agent.sock`
      const available = existsSync(opLinux)
      agents.push({
        id: '1password-linux',
        name: '1Password SSH Agent',
        type: '1password',
        socketPath: opLinux,
        isAvailable: available,
        description: available ? '1Password Agent обнаружен' : 'Сокет 1Password не найден'
      })
    }

    return agents
  }
}

export const sshAgentService = new SshAgentService()
