import { ref, watch } from 'vue'

export function usePrompt() {
  const currentPrompt = ref('')
  const promptHistory = ref<string[]>([])
  const historyIndex = ref(-1)
  const imageAttachments = ref<Array<{ id: string; filename: string; dataUrl: string }>>([])

  const setPrompt = (value: string) => {
    currentPrompt.value = value
  }

  const addToHistory = (prompt: string) => {
    if (prompt.trim() && prompt !== promptHistory.value[0]) {
      promptHistory.value.unshift(prompt)
      if (promptHistory.value.length > 100) {
        promptHistory.value = promptHistory.value.slice(0, 100)
      }
      uni.setStorageSync('prompt-history', promptHistory.value)
    }
  }

  const loadHistory = () => {
    const saved = uni.getStorageSync('prompt-history') as string[] | undefined
    if (saved) {
      promptHistory.value = saved
    }
  }

  const navigateHistory = (direction: 'up' | 'down') => {
    if (direction === 'up' && historyIndex.value < promptHistory.value.length - 1) {
      historyIndex.value++
      currentPrompt.value = promptHistory.value[historyIndex.value]
    } else if (direction === 'down' && historyIndex.value > 0) {
      historyIndex.value--
      currentPrompt.value = promptHistory.value[historyIndex.value]
    } else if (direction === 'down' && historyIndex.value === 0) {
      historyIndex.value = -1
      currentPrompt.value = ''
    }
  }

  const resetHistoryNavigation = () => {
    historyIndex.value = -1
  }

  const addImage = (file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const dataUrl = e.target?.result as string
      imageAttachments.value.push({
        id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        filename: file.name,
        dataUrl,
      })
    }
    reader.readAsDataURL(file)
  }

  const removeImage = (id: string) => {
    imageAttachments.value = imageAttachments.value.filter(img => img.id !== id)
  }

  const clearImages = () => {
    imageAttachments.value = []
  }

  const clear = () => {
    currentPrompt.value = ''
    resetHistoryNavigation()
  }

  const submit = async () => {
    const prompt = currentPrompt.value.trim()
    if (!prompt) return null

    addToHistory(prompt)
    const result = {
      prompt,
      images: imageAttachments.value,
    }
    clear()
    return result
  }

  return {
    currentPrompt,
    promptHistory,
    historyIndex,
    imageAttachments,
    setPrompt,
    addToHistory,
    loadHistory,
    navigateHistory,
    resetHistoryNavigation,
    addImage,
    removeImage,
    clearImages,
    clear,
    submit,
  }
}

export type Prompt = ReturnType<typeof usePrompt>
