import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface NotificationSettings {
  agent: boolean
  permissions: boolean
  errors: boolean
}

interface SoundSettings {
  agent: string
  permissions: string
  errors: string
}

interface Settings {
  general: {
    autoSave: boolean
  }
  appearance: {
    fontSize: number
    font: string
  }
  keybinds: Record<string, string>
  permissions: {
    autoApprove: boolean
  }
  notifications: NotificationSettings
  sounds: SoundSettings
}

const defaultSettings: Settings = {
  general: {
    autoSave: true,
  },
  appearance: {
    fontSize: 14,
    font: 'ibm-plex-mono',
  },
  keybinds: {},
  permissions: {
    autoApprove: false,
  },
  notifications: {
    agent: true,
    permissions: true,
    errors: false,
  },
  sounds: {
    agent: 'staplebops-01',
    permissions: 'staplebops-02',
    errors: 'nope-03',
  },
}

export const useSettingsStore = defineStore(
  'settings',
  () => {
    const settings = ref<Settings>({ ...defaultSettings })

    const init = () => {
      const saved = uni.getStorageSync('settings.v3') as Settings | undefined
      if (saved) {
        settings.value = { ...defaultSettings, ...saved }
      }
    }

    const save = () => {
      uni.setStorageSync('settings.v3', settings.value)
    }

    const general = computed(() => settings.value.general)
    const appearance = computed(() => settings.value.appearance)
    const keybinds = computed(() => settings.value.keybinds)
    const permissions = computed(() => settings.value.permissions)
    const notifications = computed(() => settings.value.notifications)
    const sounds = computed(() => settings.value.sounds)

    const setGeneralAutoSave = (value: boolean) => {
      settings.value.general.autoSave = value
      save()
    }

    const setAppearanceFontSize = (value: number) => {
      settings.value.appearance.fontSize = value
      save()
    }

    const setAppearanceFont = (value: string) => {
      settings.value.appearance.font = value
      save()
    }

    const setKeybind = (action: string, keybind: string) => {
      settings.value.keybinds[action] = keybind
      save()
    }

    const resetKeybind = (action: string) => {
      delete settings.value.keybinds[action]
      save()
    }

    const resetAllKeybinds = () => {
      settings.value.keybinds = {}
      save()
    }

    const setPermissionsAutoApprove = (value: boolean) => {
      settings.value.permissions.autoApprove = value
      save()
    }

    const setNotificationsAgent = (value: boolean) => {
      settings.value.notifications.agent = value
      save()
    }

    const setNotificationsPermissions = (value: boolean) => {
      settings.value.notifications.permissions = value
      save()
    }

    const setNotificationsErrors = (value: boolean) => {
      settings.value.notifications.errors = value
      save()
    }

    return {
      settings,
      init,
      general,
      appearance,
      keybinds,
      permissions,
      notifications,
      sounds,
      setGeneralAutoSave,
      setAppearanceFontSize,
      setAppearanceFont,
      setKeybind,
      resetKeybind,
      resetAllKeybinds,
      setPermissionsAutoApprove,
      setNotificationsAgent,
      setNotificationsPermissions,
      setNotificationsErrors,
    }
  },
  {
    persist: {
      key: 'settings.v3',
      paths: ['settings'],
    },
  }
)
