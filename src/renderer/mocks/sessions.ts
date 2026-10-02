import type { SessionFolder, SessionItem } from './types'

export const mockSessionsList: SessionItem[] = [
  {
    id: 'web',
    name: 'prod-web-01',
    host: 'deploy@10.0.4.21',
    type: 'ssh',
    online: true,
    defaultPath: '/var/www',
    uptime: '3д 4ч',
    termText: `Connected to 10.0.4.21 · Ubuntu 22.04 · host key SHA256:k3Nq…xP0 доверенный
deploy@prod-web-01:/var/www$ ls -la
total 24
drwxr-xr-x  5 www-data www-data 4096 Sep 30 18:02 .
drwxr-xr-x 14 root     root     4096 Aug 11 09:40 ..
drwxr-xr-x  7 deploy   deploy   4096 Sep 30 18:02 app
-rw-r--r--  1 deploy   deploy    612 Sep 28 12:15 deploy.sh
drwxr-xr-x  2 www-data www-data 4096 Sep 12 07:31 static
deploy@prod-web-01:/var/www$ tail -n 3 /var/log/nginx/error.log
2026/10/01 08:41:12 [warn] upstream response is buffered to a temporary file
2026/10/01 09:03:55 [error] connect() failed (111) while connecting to upstream
2026/10/01 09:04:02 [info] upstream recovered
deploy@prod-web-01:/var/www$ `
  },
  {
    id: 'db',
    name: 'db-staging',
    host: 'postgres@10.0.7.5',
    type: 'ssh',
    online: true,
    defaultPath: '/var/lib/postgresql',
    uptime: '12д 1ч',
    termText: `Connected via jump host bastion.corp → 10.0.7.5
postgres@db-staging:~$ psql -c "select count(*) from orders;"
 count
--------
 184203
(1 row)

postgres@db-staging:~$ `
  },
  {
    id: 'loc',
    name: 'zsh (local)',
    host: 'anna@laptop',
    type: 'local',
    online: false,
    defaultPath: '/home/anna',
    uptime: '—',
    termText: `anna@laptop ~/projects/termdeck % git status -sb
## main...origin/main
 M src/main/services/ssh/SshConnectionManager.ts
?? src/renderer/features/sftp/
anna@laptop ~/projects/termdeck % `
  },
  {
    id: 'prod2',
    name: 'prod-web-02',
    host: 'deploy@10.0.4.22',
    type: 'ssh',
    online: false,
    defaultPath: '/var/www'
  },
  {
    id: 'bastion',
    name: 'bastion.corp',
    host: 'admin@10.0.1.1',
    type: 'ssh',
    online: false,
    defaultPath: '/home/admin'
  },
  {
    id: 'cache',
    name: 'cache-01',
    host: 'redis@10.0.7.20',
    type: 'ssh',
    online: false,
    defaultPath: '/var/lib/redis'
  },
  {
    id: 'nas',
    name: 'nas.lan',
    host: 'admin@192.168.1.100',
    type: 'ssh',
    online: false,
    defaultPath: '/volume1'
  },
  {
    id: 'pi',
    name: 'pi-zero',
    host: 'pi@192.168.1.150',
    type: 'ssh',
    online: false,
    defaultPath: '/home/pi'
  }
]

export const mockSessionFolders: SessionFolder[] = [
  {
    id: 'fav',
    name: '★ Избранное',
    items: [mockSessionsList[0], mockSessionsList[1]]
  },
  {
    id: 'prod',
    name: 'Production',
    items: [mockSessionsList[0], mockSessionsList[3], mockSessionsList[4]]
  },
  {
    id: 'staging',
    name: 'Staging',
    items: [mockSessionsList[1], mockSessionsList[5]]
  },
  {
    id: 'home',
    name: 'Домашний сервер',
    items: [mockSessionsList[6], mockSessionsList[7]]
  }
]
