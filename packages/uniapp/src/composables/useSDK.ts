import { ref, computed, watch } from 'vue'
import { useGlobalStore } from '@/stores/global'
import { initClient, getClient } from '@/api/client'

export function useSDK() {
  const globalStore = useGlobalStore()
  const ready = ref(false)
  const client = computed(() => {
    try {
      return getClient()
    } catch {
      return null
    }
  })

  const init = async () => {
    if (!globalStore.directory) {
      console.warn('Directory not set')
      return
    }

    initClient({
      baseUrl: globalStore.serverUrl,
      directory: globalStore.directory,
    })

    try {
      const config = await getClient().getConfig()
      if (config.data) {
        ready.value = true
        globalStore.setConnected(true)
      }
    } catch (e) {
      console.error('Failed to connect to server:', e)
      globalStore.setConnected(false)
    }
  }

  const setDirectory = (directory: string) => {
    globalStore.setDirectory(directory)
    init()
  }

  return {
    ready,
    client,
    init,
    setDirectory,
  }
}

export type SDK = ReturnType<typeof useSDK>
