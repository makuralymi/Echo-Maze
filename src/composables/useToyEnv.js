/**
 * Toy SDK 环境检测 —— 一次性判断，全局复用
 *
 * 检测逻辑：
 * 1. window.toy 是否存在
 * 2. toy-sdk.js 是否正常挂载了核心方法
 * 3. 只有通过麦克风验证才算真正在 Toy 容器内
 *
 * 原理：Cloudflare 等外部部署可能加载了 toy-sdk.js（index.html 检测非 localhost 就引入），
 * 但不在 B站 App 内时 requestMicrophone 调用会抛错。一旦确认不可用，标记为 false，
 * 后续所有 Toy SDK 调用（云存档等）全部跳过，直接走浏览器原生 API。
 */

let _toyAvailable = null

/** 检查 Toy SDK 对象是否存在 */
function hasToyObject() {
  return typeof window.toy !== 'undefined' && typeof window.toy.requestMicrophone === 'function'
}

/**
 * Toy SDK 是否可用 —— 惰性检测，首次调用后缓存结果。
 * 如果启动时对象存在但后续麦克风调用失败，useAudio 会调用 markToyUnavailable() 将其降级。
 */
export function isToyAvailable() {
  if (_toyAvailable === null) {
    _toyAvailable = hasToyObject()
  }
  return _toyAvailable
}

/** 标记 Toy SDK 不可用（由 useAudio 在 requestMicrophone 失败时调用） */
export function markToyUnavailable() {
  _toyAvailable = false
}
