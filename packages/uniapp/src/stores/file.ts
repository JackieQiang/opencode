import { ref } from 'vue'

interface FileContent {
  path: string
  content: string
  language?: string
}

interface FileState {
  path: string
  name: string
  loaded?: boolean
  loading?: boolean
  error?: string
  content?: FileContent
}

export const useFileStore = defineStore(
  'file',
  () => {
    const files = ref<Map<string, FileState>>(new Map())
    const activeFile = ref<string | null>(null)
    const recentFiles = ref<string[]>([])

    const init = () => {
      const saved = uni.getStorageSync('recent-files') as string[] | undefined
      if (saved) {
        recentFiles.value = saved
      }
    }

    const loadFile = async (path: string): Promise<FileContent | null> => {
      const cached = files.value.get(path)
      if (cached?.loaded) {
        return cached.content || null
      }

      try {
        const res = await uni.request({
          url: `/api/file/read?path=${encodeURIComponent(path)}`,
          method: 'GET',
        })

        if (res.statusCode === 200 && res.data) {
          const fileState: FileState = {
            path,
            name: path.split('/').pop() || path,
            loaded: true,
            loading: false,
            content: res.data as FileContent,
          }
          files.value.set(path, fileState)
          addToRecent(path)
          return res.data as FileContent
        }
        return null
      } catch (e) {
        const fileState: FileState = {
          path,
          name: path.split('/').pop() || path,
          loaded: false,
          loading: false,
          error: (e as Error).message,
        }
        files.value.set(path, fileState)
        return null
      }
    }

    const addToRecent = (path: string) => {
      const index = recentFiles.value.indexOf(path)
      if (index > -1) {
        recentFiles.value.splice(index, 1)
      }
      recentFiles.value.unshift(path)
      if (recentFiles.value.length > 50) {
        recentFiles.value = recentFiles.value.slice(0, 50)
      }
      uni.setStorageSync('recent-files', recentFiles.value)
    }

    const getFile = (path: string) => {
      return files.value.get(path)
    }

    const setActiveFile = (path: string | null) => {
      activeFile.value = path
    }

    const searchFiles = async (query: string): Promise<string[]> => {
      try {
        const res = await uni.request({
          url: `/api/find/files?query=${encodeURIComponent(query)}&dirs=false`,
          method: 'GET',
        })
        if (res.statusCode === 200 && res.data) {
          return (res.data as { data?: string[] }).data || []
        }
        return []
      } catch {
        return []
      }
    }

    const clearCache = () => {
      files.value.clear()
    }

    return {
      files,
      activeFile,
      recentFiles,
      init,
      loadFile,
      getFile,
      setActiveFile,
      searchFiles,
      addToRecent,
      clearCache,
    }
  },
  {
    persist: false,
  }
)
