import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SnippetItem {
  id: string
  title: string
  command: string
  category: string
  description?: string
  autoExecute?: boolean
}

const DEFAULT_SNIPPETS: SnippetItem[] = [
  {
    id: 'snip-docker-ps',
    title: 'Docker: Список контейнеров',
    command: 'docker ps -a',
    category: 'Docker',
    description: 'Показать все запущенные и остановленные контейнеры',
    autoExecute: true
  },
  {
    id: 'snip-docker-logs',
    title: 'Docker: Логи контейнера',
    command: 'docker logs -f --tail={{tail_lines}} {{container}}',
    category: 'Docker',
    description: 'Следить за логами контейнера в реальном времени',
    autoExecute: false
  },
  {
    id: 'snip-docker-exec',
    title: 'Docker: Войти в контейнер',
    command: 'docker exec -it {{container}} /bin/sh',
    category: 'Docker',
    description: 'Интерактивная оболочка внутри контейнера',
    autoExecute: true
  },
  {
    id: 'snip-sys-df',
    title: 'Система: Свободное место',
    command: 'df -h',
    category: 'Система',
    description: 'Информация о дисковых разделах в удобном виде',
    autoExecute: true
  },
  {
    id: 'snip-sys-top',
    title: 'Система: Топ процессов по памяти',
    command: 'ps aux --sort=-%mem | head -n 15',
    category: 'Система',
    description: '15 процессов, потребляющих больше всего RAM',
    autoExecute: true
  },
  {
    id: 'snip-sys-journal',
    title: 'Система: Журнал службы (systemd)',
    command: 'journalctl -u {{service}} -f -n {{lines}}',
    category: 'Система',
    description: 'Логи сервиса systemd',
    autoExecute: false
  },
  {
    id: 'snip-nginx-reload',
    title: 'Nginx: Проверить и перезагрузить',
    command: 'nginx -t && systemctl reload nginx',
    category: 'Nginx',
    description: 'Тест конфигурации и безопасный reload без простоя',
    autoExecute: true
  },
  {
    id: 'snip-git-status',
    title: 'Git: Статус репозитория',
    command: 'git status',
    category: 'Git',
    description: 'Проверить изменённые файлы и ветку',
    autoExecute: true
  },
  {
    id: 'snip-git-log',
    title: 'Git: Краткая история коммитов',
    command: 'git log --oneline -n {{count}}',
    category: 'Git',
    description: 'Последние коммиты одной строкой',
    autoExecute: false
  }
]

interface SnippetsState {
  snippets: SnippetItem[]
  addSnippet: (snippet: Omit<SnippetItem, 'id'>) => SnippetItem
  updateSnippet: (id: string, patch: Partial<SnippetItem>) => void
  deleteSnippet: (id: string) => void
  resetToDefaults: () => void
}

export const useSnippetsStore = create<SnippetsState>()(
  persist(
    (set) => ({
      snippets: DEFAULT_SNIPPETS,

      addSnippet: (snippetData) => {
        const item: SnippetItem = {
          ...snippetData,
          id: `snip-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`
        }
        set((state) => ({ snippets: [...state.snippets, item] }))
        return item
      },

      updateSnippet: (id, patch) => {
        set((state) => ({
          snippets: state.snippets.map((s) => (s.id === id ? { ...s, ...patch } : s))
        }))
      },

      deleteSnippet: (id) => {
        set((state) => ({
          snippets: state.snippets.filter((s) => s.id !== id)
        }))
      },

      resetToDefaults: () => {
        set({ snippets: DEFAULT_SNIPPETS })
      }
    }),
    {
      name: 'termdeck-snippets-storage'
    }
  )
)
