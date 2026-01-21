import { ref, computed } from 'vue'

export interface PTY {
  id: string
  title: string
  titleNumber: number
  rows?: number
  cols?: number
  buffer?: string
  scrollY?: number
}

export const useTerminalStore = defineStore(
  'terminal',
  () => {
    const terminals = ref<PTY[]>([])
    const activeTerminalId = ref<string | null>(null)
    const terminalOutput = ref<Map<string, string[]>>(new Map())
    const terminalInput = ref<Map<string, string>>(new Map())

    const activeTerminal = computed(() => {
      if (!activeTerminalId.value) return null
      return terminals.value.find(t => t.id === activeTerminalId.value) || null
    })

    const init = () => {
      const saved = uni.getStorageSync('terminals') as PTY[] | undefined
      if (saved) {
        terminals.value = saved
      }
      const savedOutput = uni.getStorageSync('terminal-output') as
        | Record<string, string[]>
        | undefined
      if (savedOutput) {
        terminalOutput.value = new Map(Object.entries(savedOutput))
      }
    }

    const save = () => {
      uni.setStorageSync('terminals', terminals.value)
      const outputObj = Object.fromEntries(terminalOutput.value)
      uni.setStorageSync('terminal-output', outputObj)
    }

    const createTerminal = async (): Promise<PTY | null> => {
      try {
        const res = await uni.request({
          url: '/api/pty/create',
          method: 'POST',
          data: { title: `Terminal ${terminals.value.length + 1}` },
        })

        if (res.statusCode === 200 && res.data) {
          const pty = res.data as PTY
          terminals.value.push(pty)
          terminalOutput.value.set(pty.id, [])
          terminalInput.value.set(pty.id, '')
          if (!activeTerminalId.value) {
            activeTerminalId.value = pty.id
          }
          save()
          return pty
        }
        return null
      } catch {
        return null
      }
    }

    const closeTerminal = async (id: string) => {
      try {
        await uni.request({
          url: `/api/pty/${id}`,
          method: 'DELETE',
        })
      } catch {
        console.error('Failed to close terminal on server')
      }

      terminals.value = terminals.value.filter(t => t.id !== id)
      terminalOutput.value.delete(id)
      terminalInput.value.delete(id)

      if (activeTerminalId.value === id) {
        activeTerminalId.value = terminals.value[0]?.id || null
      }
      save()
    }

    const setActiveTerminal = (id: string) => {
      activeTerminalId.value = id
    }

    const addOutput = (id: string, data: string) => {
      const outputs = terminalOutput.value.get(id) || []
      outputs.push(data)
      terminalOutput.value.set(id, outputs)
      save()
    }

    const clearOutput = (id: string) => {
      terminalOutput.value.set(id, [])
      save()
    }

    const setInput = (id: string, value: string) => {
      terminalInput.value.set(id, value)
    }

    const getOutput = (id: string): string[] => {
      return terminalOutput.value.get(id) || []
    }

    const updateTerminal = (id: string, updates: Partial<PTY>) => {
      const index = terminals.value.findIndex(t => t.id === id)
      if (index > -1) {
        terminals.value[index] = { ...terminals.value[index], ...updates }
        save()
      }
    }

    return {
      terminals,
      activeTerminalId,
      activeTerminal,
      terminalOutput,
      terminalInput,
      init,
      createTerminal,
      closeTerminal,
      setActiveTerminal,
      addOutput,
      clearOutput,
      setInput,
      getOutput,
      updateTerminal,
    }
  },
  {
    persist: false,
  }
)
