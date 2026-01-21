import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useGlobalStore = defineStore('global', () => {
  const serverUrl = ref('http://localhost:4096')
  const directory = ref('')
  const connected = ref(false)
  const connecting = ref(false)

  const init = () => {
    const savedUrl = uni.getStorageSync('server-url') as string | undefined
    if (savedUrl) {
      serverUrl.value = savedUrl
    }
  }

  const setServerUrl = (url: string) => {
    serverUrl.value = url
    uni.setStorageSync('server-url', url)
  }

  const setDirectory = (dir: string) => {
    directory.value = dir
  }

  const setConnected = (value: boolean) => {
    connected.value = value
  }

  const setConnecting = (value: boolean) => {
    connecting.value = value
  }

  return {
    serverUrl,
    directory,
    connected,
    connecting,
    init,
    setServerUrl,
    setDirectory,
    setConnected,
    setConnecting,
  }
})
