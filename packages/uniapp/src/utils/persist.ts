export function persist<T>(key: string, initial: T): [() => T, (value: T) => void] {
  const get = () => {
    const saved = uni.getStorageSync(key)
    if (saved !== '') {
      return saved as T
    }
    return initial
  }

  const set = (value: T) => {
    uni.setStorageSync(key, value)
  }

  return [get, set]
}

export function persisted<T>(
  key: string,
  initial: T
): [() => T, (value: T) => void, () => void, () => boolean] {
  const [get, set] = persist(key, initial)

  let loaded = false
  let ready = false

  const load = () => {
    if (loaded) return
    loaded = true
    const saved = uni.getStorageSync(key)
    if (saved !== '') {
      const parsed = saved as T
      set(parsed)
    }
    ready = true
  }

  const isReady = () => ready

  return [get, set, load, isReady]
}
