import type { SftpFileItem } from './types'

const D = 'drwxr-xr-x'
const F = '-rw-r--r--'

export const mockFileSystem: Record<string, SftpFileItem[]> = {
  '/var/www': [
    {
      name: 'app',
      type: 'directory',
      size: '—',
      permissions: D,
      date: '30 сен 18:02',
      owner: 'deploy'
    },
    {
      name: 'static',
      type: 'directory',
      size: '—',
      permissions: D,
      date: '12 сен 07:31',
      owner: 'www-data'
    },
    {
      name: 'deploy.sh',
      type: 'file',
      size: '612 B',
      permissions: '-rwxr-xr-x',
      date: '28 сен 12:15',
      owner: 'deploy'
    },
    {
      name: 'index.html',
      type: 'file',
      size: '4.1 KB',
      permissions: F,
      date: '15 сен 10:00',
      owner: 'deploy'
    },
    {
      name: '.env',
      type: 'file',
      size: '231 B',
      permissions: '-rw-------',
      date: '01 сен 09:20',
      owner: 'deploy'
    }
  ],
  '/var/www/app': [
    {
      name: 'src',
      type: 'directory',
      size: '—',
      permissions: D,
      date: '30 сен 18:02',
      owner: 'deploy'
    },
    {
      name: 'dist',
      type: 'directory',
      size: '—',
      permissions: D,
      date: '30 сен 18:05',
      owner: 'deploy'
    },
    {
      name: 'package.json',
      type: 'file',
      size: '1.8 KB',
      permissions: F,
      date: '29 сен 14:10',
      owner: 'deploy'
    },
    {
      name: 'server.js',
      type: 'file',
      size: '12 KB',
      permissions: F,
      date: '30 сен 17:50',
      owner: 'deploy'
    }
  ],
  '/var': [
    {
      name: 'www',
      type: 'directory',
      size: '—',
      permissions: D,
      date: '30 сен 18:02',
      owner: 'www-data'
    },
    {
      name: 'log',
      type: 'directory',
      size: '—',
      permissions: D,
      date: '01 окт 08:00',
      owner: 'root'
    },
    {
      name: 'lib',
      type: 'directory',
      size: '—',
      permissions: D,
      date: '15 авг 11:30',
      owner: 'root'
    },
    {
      name: 'tmp',
      type: 'directory',
      size: '—',
      permissions: 'drwxrwxrwt',
      date: '01 окт 09:00',
      owner: 'root'
    }
  ],
  '/var/log': [
    {
      name: 'nginx',
      type: 'directory',
      size: '—',
      permissions: D,
      date: '01 окт 09:00',
      owner: 'root'
    },
    {
      name: 'syslog',
      type: 'file',
      size: '48 MB',
      permissions: '-rw-r-----',
      date: '01 окт 09:04',
      owner: 'syslog'
    },
    {
      name: 'auth.log',
      type: 'file',
      size: '2.2 MB',
      permissions: '-rw-r-----',
      date: '01 окт 09:01',
      owner: 'syslog'
    },
    {
      name: 'dpkg.log',
      type: 'file',
      size: '310 KB',
      permissions: F,
      date: '28 сен 11:00',
      owner: 'root'
    }
  ],
  '/var/log/nginx': [
    {
      name: 'access.log',
      type: 'file',
      size: '128 MB',
      permissions: F,
      date: '01 окт 09:05',
      owner: 'www-data'
    },
    {
      name: 'error.log',
      type: 'file',
      size: '94 KB',
      permissions: F,
      date: '01 окт 09:04',
      owner: 'www-data'
    }
  ],
  '/': [
    {
      name: 'etc',
      type: 'directory',
      size: '—',
      permissions: D,
      date: '11 авг 09:40',
      owner: 'root'
    },
    {
      name: 'home',
      type: 'directory',
      size: '—',
      permissions: D,
      date: '11 авг 09:40',
      owner: 'root'
    },
    {
      name: 'var',
      type: 'directory',
      size: '—',
      permissions: D,
      date: '11 авг 09:40',
      owner: 'root'
    },
    {
      name: 'opt',
      type: 'directory',
      size: '—',
      permissions: D,
      date: '11 авг 09:40',
      owner: 'root'
    }
  ],
  '/var/lib': [
    {
      name: 'postgresql',
      type: 'directory',
      size: '—',
      permissions: D,
      date: '20 сен 10:15',
      owner: 'postgres'
    }
  ],
  '/var/lib/postgresql': [
    {
      name: '15',
      type: 'directory',
      size: '—',
      permissions: 'drwx------',
      date: '20 сен 10:15',
      owner: 'postgres'
    },
    {
      name: 'backup.sql.gz',
      type: 'file',
      size: '1.2 GB',
      permissions: F,
      date: '30 сен 23:00',
      owner: 'postgres'
    },
    {
      name: '.psql_history',
      type: 'file',
      size: '4 KB',
      permissions: '-rw-------',
      date: '01 окт 07:45',
      owner: 'postgres'
    }
  ],
  '/var/lib/postgresql/15': [
    {
      name: 'main',
      type: 'directory',
      size: '—',
      permissions: 'drwx------',
      date: '20 сен 10:15',
      owner: 'postgres'
    }
  ],
  '/home': [
    {
      name: 'anna',
      type: 'directory',
      size: '—',
      permissions: D,
      date: '12 авг 14:00',
      owner: 'root'
    }
  ],
  '/home/anna': [
    {
      name: 'projects',
      type: 'directory',
      size: '—',
      permissions: D,
      date: '01 окт 08:30',
      owner: 'anna'
    },
    {
      name: 'Downloads',
      type: 'directory',
      size: '—',
      permissions: D,
      date: '28 сен 19:10',
      owner: 'anna'
    },
    {
      name: 'notes.md',
      type: 'file',
      size: '3 KB',
      permissions: F,
      date: '30 сен 21:00',
      owner: 'anna'
    }
  ]
}

export const mockSftpFiles: SftpFileItem[] = mockFileSystem['/var/www']
