import { ref, reactive, computed, watch, onMounted } from 'vue'

export type ThemeMode = 'dark' | 'light' | 'system'

interface ThemeState {
  mode: ThemeMode
  themeId: string
}

const defaultTheme: ThemeState = {
  mode: 'system',
  themeId: 'default',
}

const state = reactive<ThemeState>({
  mode: uni.getStorageSync('opencode-theme-mode') || 'system',
  themeId: uni.getStorageSync('opencode-theme-id') || 'default',
})

const isDark = computed(() => {
  if (state.mode === 'dark') return true
  if (state.mode === 'light') return false
  return uni.getSystemInfoSync().theme === 'dark'
})

const updateTheme = () => {
  const dark = isDark.value
  const html = document.documentElement
  if (dark) {
    html.classList.remove('light-theme')
  } else {
    html.classList.add('light-theme')
  }
}

const setThemeMode = (mode: ThemeMode) => {
  state.mode = mode
  uni.setStorageSync('opencode-theme-mode', mode)
  updateTheme()
}

const setThemeId = (themeId: string) => {
  state.themeId = themeId
  uni.setStorageSync('opencode-theme-id', themeId)
}

const initTheme = () => {
  updateTheme()
  watch(() => state.mode, updateTheme)
}

export function useTheme() {
  return {
    theme: state,
    isDark,
    setThemeMode,
    setThemeId,
    initTheme,
  }
}

export type Theme = ReturnType<typeof useTheme>
