import { reactive, ref, computed } from 'vue'
import { zh } from './zh'
import { en } from './en'

type Locale = 'zh' | 'en'

const locale = ref<Locale>('zh')
const messages = { zh, en }

export function t(key: string): string {
  const currentMessages = messages[locale.value]
  if (key in currentMessages) {
    return (currentMessages as Record<string, string>)[key]
  }
  if (key in messages.en) {
    return (messages.en as Record<string, string>)[key]
  }
  return key
}

export function setLocale(newLocale: Locale) {
  locale.value = newLocale
  uni.setStorageSync('opencode-locale', newLocale)
  uni.setLocale(newLocale)
}

export function initLanguage() {
  const saved = uni.getStorageSync('opencode-locale') as Locale | undefined
  if (saved && ['zh', 'en'].includes(saved)) {
    locale.value = saved
  } else {
    const systemInfo = uni.getSystemInfoSync()
    const systemLocale = systemInfo.language || 'en'
    if (systemLocale.includes('zh')) {
      locale.value = 'zh'
    } else {
      locale.value = 'en'
    }
  }
  uni.setLocale(locale.value)
}

export function useLanguage() {
  return {
    locale,
    t,
    setLocale,
    initLanguage,
  }
}

export function initI18n() {
  const saved = uni.getStorageSync('opencode-locale') as Locale | undefined
  if (saved) {
    locale.value = saved
  }
  uni.setLocale(locale.value)
}

export type Language = {
  locale: typeof locale
  t: typeof t
  setLocale: typeof setLocale
  initLanguage: typeof initLanguage
}
