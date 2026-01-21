import { ref, computed } from 'vue'

const locale = ref('zh-CN')
const messages: Record<string, Record<string, string>> = {
  'zh-CN': {},
  'en': {}
}

export function useLanguage() {
  const setLocale = (newLocale: string) => {
    locale.value = newLocale
  }

  const initLanguage = () => {
    const savedLocale = uni.getStorageSync('locale') as string | undefined
    if (savedLocale && messages[savedLocale]) {
      locale.value = savedLocale
    }
  }

  const t = (key: string): string => {
    const keys = key.split('.')
    let result: any = messages[locale.value]
    for (const k of keys) {
      result = result?.[k]
    }
    return result || key
  }

  return {
    locale,
    t,
    setLocale,
    initLanguage
  }
}

export function useI18n() {
  return useLanguage()
}