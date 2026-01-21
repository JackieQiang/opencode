<template>
  <view class="error-page">
    <view class="error-content">
      <view class="error-icon">
        <text>⚠️</text>
      </view>
      <text class="error-title">{{ t('error.page.title') }}</text>
      <text class="error-description">{{ t('error.page.description') }}</text>
      <button class="restart-btn" @click="restart">
        <text>{{ t('error.page.action.restart') }}</text>
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useLanguage'

const { t } = useI18n()

const restart = () => {
  uni.reLaunch({
    url: '/pages/index/index',
  })
}
</script>

<style lang="scss" scoped>
.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--background-base);
  padding: 24px;
}

.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.error-icon {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background-color: var(--surface-raised-base);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.error-icon text {
  font-size: 40px;
}

.error-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-strong);
  margin-bottom: 8px;
}

.error-description {
  font-size: 16px;
  color: var(--text-weak);
  margin-bottom: 32px;
}

.restart-btn {
  background-color: var(--icon-info-active);
  color: white;
  padding: 12px 32px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
}
</style>
