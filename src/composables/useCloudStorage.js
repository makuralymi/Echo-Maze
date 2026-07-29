// Toy SDK 云存档封装
// key 只含字母、数字、下划线、短横线，≤128 字节；value 字符串 ≤1024 字节

const STORAGE_KEY = 'save'

export function useCloudStorage() {
  /** 加载存档，返回解析后的对象；失败或无存档返回 null */
  async function load() {
    if (typeof window.toy === 'undefined') {
      // 本地调试：从 localStorage 读取
      try {
        const raw = localStorage.getItem('echo-maze-save')
        return raw ? JSON.parse(raw) : null
      } catch {
        return null
      }
    }
    try {
      const data = await window.toy.getCloudStorage([STORAGE_KEY])
      if (data && data[STORAGE_KEY]) {
        return JSON.parse(data[STORAGE_KEY])
      }
      return null
    } catch {
      return null
    }
  }

  /** 保存存档对象 */
  async function save(data) {
    const json = JSON.stringify(data)
    if (typeof window.toy === 'undefined') {
      localStorage.setItem('echo-maze-save', json)
      return
    }
    try {
      await window.toy.setCloudStorage({ [STORAGE_KEY]: json })
    } catch (err) {
      console.warn('云存档保存失败:', err.message)
    }
  }

  return { load, save }
}
