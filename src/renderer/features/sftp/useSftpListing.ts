import { useMemo } from 'react'
import type { SftpFileItem, SftpPanelState } from '@shared/types'

export type { SftpPanelState }

export interface UseSftpListingOptions {
  stateOverride?: SftpPanelState
  files?: SftpFileItem[]
}

export interface UseSftpListingResult {
  files: SftpFileItem[]
  isLoading: boolean
  error: string | null
  isEmpty: boolean
  state: SftpPanelState
}

export function useSftpListing(
  _currentPath: string,
  options?: UseSftpListingOptions
): UseSftpListingResult {
  const state = options?.stateOverride ?? 'normal'
  const filesOption = options?.files

  const { files, isLoading, error, isEmpty } = useMemo(() => {
    const providedFiles = filesOption ?? []
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

    return {
      files: providedFiles,
      isLoading: false,
      error: null,
      isEmpty: providedFiles.length === 0
    }
  }, [filesOption, state])

  return {
    files,
    isLoading,
    error,
    isEmpty,
    state
  }
}
