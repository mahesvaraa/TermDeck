import { useMemo } from 'react'
import { mockFileSystem } from '../../mocks/sftp'
import type { SftpFileItem } from '../../mocks/types'

export type SftpPanelState = 'normal' | 'loading' | 'empty' | 'permission_denied' | 'no_connection'

export interface UseSftpListingOptions {
  stateOverride?: SftpPanelState
}

export interface UseSftpListingResult {
  files: SftpFileItem[]
  isLoading: boolean
  error: string | null
  isEmpty: boolean
  state: SftpPanelState
}

export function useSftpListing(
  currentPath: string,
  options?: UseSftpListingOptions
): UseSftpListingResult {
  const state = options?.stateOverride ?? 'normal'

  const { files, isLoading, error, isEmpty } = useMemo(() => {
    if (state === 'loading') {
      return { files: [], isLoading: true, error: null, isEmpty: false }
    }
    if (state === 'empty') {
      return { files: [], isLoading: false, error: null, isEmpty: true }
    }
    if (state === 'permission_denied') {
      return {
        files: [],
        isLoading: false,
        error: 'Отказано в доступе (Permission denied)',
        isEmpty: false
      }
    }
    if (state === 'no_connection') {
      return {
        files: [],
        isLoading: false,
        error: 'Нет соединения с сервером SFTP',
        isEmpty: false
      }
    }

    const listedFiles = mockFileSystem[currentPath] || []
    return {
      files: listedFiles,
      isLoading: false,
      error: null,
      isEmpty: listedFiles.length === 0
    }
  }, [currentPath, state])

  return {
    files,
    isLoading,
    error,
    isEmpty,
    state
  }
}
