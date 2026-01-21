import { ref } from 'vue'

interface DialogState {
  show: boolean
  component: string | null
  props: Record<string, any>
}

export const useDialogStore = defineStore('dialog', () => {
  const dialogs = ref<DialogState[]>([])
  const activeDialog = ref<DialogState | null>(null)

  const show = (component: string, props: Record<string, any> = {}) => {
    const dialog: DialogState = {
      show: true,
      component,
      props,
    }
    dialogs.value.push(dialog)
    activeDialog.value = dialog
  }

  const close = () => {
    if (dialogs.value.length > 0) {
      dialogs.value.pop()
    }
    activeDialog.value = dialogs.value[dialogs.value.length - 1] || null
  }

  const closeAll = () => {
    dialogs.value = []
    activeDialog.value = null
  }

  const isActive = (component: string): boolean => {
    return activeDialog.value?.component === component
  }

  const getProps = () => {
    return activeDialog.value?.props || {}
  }

  const updateProps = (props: Record<string, any>) => {
    if (activeDialog.value) {
      activeDialog.value.props = { ...activeDialog.value.props, ...props }
    }
  }

  return {
    dialogs,
    activeDialog,
    show,
    close,
    closeAll,
    isActive,
    getProps,
    updateProps,
  }
})
