// 存档 IO —— Toy SDK 云存储 / localStorage 自动切换
// 依赖 useToyEnv 统一判断，不在 Toy 容器绝不碰 window.toy

import { isToyAvailable } from './useToyEnv.js'

const STORAGE_KEY = 'save'
const LOCAL_KEY = 'echo-maze-save'

export function useCloudStorage() {
  /** 加载存档，失败或无存档返回 null */
  async function load() {
    // 先读本地（不做网络请求）
    const local = loadLocal()
    if (!isToyAvailable()) return local

    // Toy 环境：读云端，失败回退本地
    try {
      const data = await window.toy.getCloudStorage([STORAGE_KEY])
      if (data && data[STORAGE_KEY]) {
        return JSON.parse(data[STORAGE_KEY])
      }
    } catch {
      // 云端读取失败，用本地
    }
    return local
  }

  function loadLocal() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  /** 保存存档 —— 本地写入立即完成，云端异步（不阻塞） */
  function save(data) {
    const json = JSON.stringify(data)
    try { localStorage.setItem(LOCAL_KEY, json) } catch { /* ignore */ }

    if (!isToyAvailable()) return
    // 云端写入：fire-and-forget，失败不抛
    window.toy.setCloudStorage({ [STORAGE_KEY]: json })
      .catch(() => {})
  }

  return { load, save }
}
