<template>
  <view class="settings-page">
    <view class="settings-container">
      <view class="settings-list">
        <view
          v-for="item in settingsItems"
          :key="item.id"
          class="settings-item"
          @click="navigateTo(item.id)"
        >
          <view class="item-icon">
            <text>{{ item.icon }}</text>
          </view>
          <view class="item-content">
            <text class="item-title">{{ item.title }}</text>
            <text class="item-description">{{ item.description }}</text>
          </view>
          <view class="item-arrow">
            <text>›</text>
          </view>
        </view>
      </view>

      <view class="about-section">
        <text class="about-title">关于 OpenCode</text>
        <text class="about-version">版本 1.0.0</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useLanguage'

const router = useRouter()
const { t } = useI18n()

interface SettingsItem {
  id: string
  icon: string
  title: string
  description: string
}

const settingsItems: SettingsItem[] = [
  {
    id: 'general',
    icon: '⚙️',
    title: t('settings.tab.general'),
    description: '语言、主题、字体等设置',
  },
  {
    id: 'shortcuts',
    icon: '⌨️',
    title: t('settings.tab.shortcuts'),
    description: '键盘快捷键配置',
  },
  {
    id: 'models',
    icon: '🤖',
    title: '模型',
    description: '选择和管理 AI 模型',
  },
  {
    id: 'providers',
    icon: '🔌',
    title: '提供商',
    description: '管理 API 提供商',
  },
  {
    id: 'permissions',
    icon: '🔐',
    title: '权限',
    description: '控制工具访问权限',
  },
  {
    id: 'mcp',
    icon: '🔧',
    title: 'MCP',
    description: '管理 MCP 服务器',
  },
]

const navigateTo = (id: string) => {
  router.push(`/settings/${id}`)
}
</script>

<style lang="scss" scoped>
.settings-page {
  min-height: 100vh;
  background-color: var(--background-base);
  padding: 24px;
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.settings-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background-color: var(--surface-raised-base);
  border-radius: 12px;
  border: 1px solid var(--border-base);
}

.item-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background-color: var(--background-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  margin-right: 16px;
}

.item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.item-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-strong);
  margin-bottom: 4px;
}

.item-description {
  font-size: 13px;
  color: var(--text-weak);
}

.item-arrow {
  font-size: 20px;
  color: var(--text-subtle);
}

.about-section {
  margin-top: 48px;
  text-align: center;
  padding: 24px;
}

.about-title {
  display: block;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-strong);
  margin-bottom: 8px;
}

.about-version {
  font-size: 14px;
  color: var(--text-weak);
}
</style>
