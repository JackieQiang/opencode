<template>
  <view class="app">
    <RouterView />
  </view>
</template>

<script setup lang="ts">
import { provide } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { useLanguage } from '@/composables/useLanguage'

const { theme, initTheme } = useTheme()
const { locale, t, initLanguage } = useLanguage()

provide('theme', theme)
provide('language', locale)
provide('t', t)

onLaunch(() => {
  console.log('App Launch')
  initTheme()
  initLanguage()
})

onShow(() => {
  console.log('App Show')
})

onHide(() => {
  console.log('App Hide')
})

onError(err => {
  console.error('App Error:', err)
})
</script>

<style lang="scss">
@import '@/styles/index.scss' .app {
  width: 100%;
  height: 100%;
  min-height: 100vh;
  background-color: var(--background-base);
  color: var(--text-strong);
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
</style>
