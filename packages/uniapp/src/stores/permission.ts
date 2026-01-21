import { ref, computed } from 'vue'

interface Permission {
  tool: string
  action: 'allow' | 'ask' | 'deny'
}

export const usePermissionStore = defineStore(
  'permission',
  () => {
    const permissions = ref<Map<string, Map<string, 'allow' | 'ask' | 'deny'>>>(new Map())
    const autoApprove = ref(false)

    const init = () => {
      const saved = uni.getStorageSync('permissions') as
        | Record<string, Record<string, 'allow' | 'ask' | 'deny'>>
        | undefined
      if (saved) {
        Object.entries(saved).forEach(([sessionId, perms]) => {
          permissions.value.set(sessionId, new Map(Object.entries(perms)))
        })
      }
      const savedAutoApprove = uni.getStorageSync('permissions-auto-approve') as boolean | undefined
      if (savedAutoApprove !== undefined) {
        autoApprove.value = savedAutoApprove
      }
    }

    const save = () => {
      const obj: Record<string, Record<string, 'allow' | 'ask' | 'deny'>> = {}
      permissions.value.forEach((perms, sessionId) => {
        obj[sessionId] = Object.fromEntries(perms)
      })
      uni.setStorageSync('permissions', obj)
      uni.setStorageSync('permissions-auto-approve', autoApprove.value)
    }

    const getPermission = (sessionId: string, tool: string): 'allow' | 'ask' | 'deny' => {
      const sessionPerms = permissions.value.get(sessionId)
      if (sessionPerms) {
        const perm = sessionPerms.get(tool)
        if (perm) return perm
      }
      return 'ask'
    }

    const setPermission = (sessionId: string, tool: string, action: 'allow' | 'ask' | 'deny') => {
      let sessionPerms = permissions.value.get(sessionId)
      if (!sessionPerms) {
        sessionPerms = new Map()
        permissions.value.set(sessionId, sessionPerms)
      }
      sessionPerms.set(tool, action)
      save()
    }

    const setAutoApprove = (value: boolean) => {
      autoApprove.value = value
      save()
    }

    const isAutoApproving = (sessionId: string): boolean => {
      return autoApprove.value
    }

    const needsPermission = (sessionId: string, tool: string): boolean => {
      return getPermission(sessionId, tool) === 'ask'
    }

    const clearSessionPermissions = (sessionId: string) => {
      permissions.value.delete(sessionId)
      save()
    }

    const clearAllPermissions = () => {
      permissions.value.clear()
      save()
    }

    const defaultTools = [
      'read',
      'edit',
      'glob',
      'grep',
      'list',
      'bash',
      'task',
      'skill',
      'lsp',
      'webfetch',
      'websearch',
      'codesearch',
    ]

    return {
      permissions,
      autoApprove,
      init,
      getPermission,
      setPermission,
      setAutoApprove,
      isAutoApproving,
      needsPermission,
      clearSessionPermissions,
      clearAllPermissions,
      defaultTools,
    }
  },
  {
    persist: {
      key: 'permissions-store',
    },
  }
)
