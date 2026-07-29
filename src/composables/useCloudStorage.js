// Toy SDK 云存档封装
// key 只含字母、数字、下划线、短横线，≤128 字节；value 字符串 ≤1024 字节
// 自动检测 Toy 平台：Toy 容器可用则走云存储，否则回退 localStorage
// 所有 Toy SDK 调用均带超时保护，避免在非 Toy 环境（如 Cloudflare 部署）长期阻塞

const STORAGE_KEY = 'save'
const LOCAL_KEY = 'echo-maze-save'

/** 快速检测是否在真正的 Toy 容器内 */
function isToyCapable() {
  return typeof window.toy !== 'undefined'
    && typeof window.toy.requestMicrophone === 'function'
}

/** 带超时的 Promise 包装 */
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ])
}

export function useCloudStorage() {
  // 初始化时检测一次
  const capable = isToyCapable()

  /** 加载存档，失败或无存档返回 null */
  async function load() {
    if (!capable) {
      return loadLocal()
    }
    try {
      const data = await withTimeout(window.toy.getCloudStorage([STORAGE_KEY]), 3000)
      if (data && data[STORAGE_KEY]) {
        return JSON.parse(data[STORAGE_KEY])
      }
      return null
    } catch (err) {
      console.warn('Toy 云存档读取失败，回退本地:', err.message)
      return loadLocal()
    }
  }

  function loadLocal() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  /** 保存存档对象（不阻塞——写入本地，云端异步） */
  function save(data) {
    const json = JSON.stringify(data)
    // 本地写入立即完成，不阻塞任何流程
    try {
      localStorage.setItem(LOCAL_KEY, json)
    } catch { /* ignore */ }

    if (!capable) return

    // 云端写入失败不抛错，静默降级
    withTimeout(window.toy.setCloudStorage({ [STORAGE_KEY]: json }), 3000)
      .catch(err => console.warn('Toy 云存档保存失败:', err.message))
  }

  return { load, save }
}
