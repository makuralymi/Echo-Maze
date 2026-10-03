import { ref } from 'vue'

// ── 模块级单例 ──
let bgmAudio = null
const bgmOn = ref(false)
let bgmInited = false
const BGM_KEY = 'em_bgm_on_v1'

// 加载持久化的 BGM 偏好
function loadBgmPref() {
  try {
    return localStorage.getItem(BGM_KEY) !== '0' // 默认开启（null 或 '1'）
  } catch {
    return true
  }
}

function saveBgmPref(on) {
  try { localStorage.setItem(BGM_KEY, on ? '1' : '0') } catch { /* 忽略 */ }
}

/**
 * 初始化 BGM —— 必须在用户手势之后调用（浏览器自动播放策略）
 * 可在 App.vue 的 startLevel() 首次调用时触发。
 */
function initBgm() {
  if (bgmInited) return
  bgmInited = true

  // 延迟创建 Audio 实例，减少首屏开销
  bgmAudio = new Audio('./Tracing_Hidden_Walls.mp3')
  bgmAudio.loop = true
  bgmAudio.volume = 0.35

  const pref = loadBgmPref()
  bgmOn.value = pref
  if (pref) {
    bgmAudio.play().catch(() => {
      // 浏览器拦截 —— 下次用户手势时自动重试
      bgmOn.value = false
    })
  }
}

/** 切换 BGM 开关，同时持久化 */
function toggleBgm() {
  if (!bgmAudio) {
    initBgm()
    return
  }
  const next = !bgmOn.value
  bgmOn.value = next
  saveBgmPref(next)
  if (next) {
    bgmAudio.play().catch(() => { bgmOn.value = false })
  } else {
    bgmAudio.pause()
  }
}

/** 确保 BGM 正在播放（由用户手势触发，用于恢复被浏览器暂停的场景） */
function resumeBgm() {
  if (!bgmAudio || !bgmOn.value) return
  bgmAudio.play().catch(() => { bgmOn.value = false })
}

// ── SFX ──

/** 播放短音效 */
function playSfx(path) {
  try {
    const a = new Audio(path)
    a.volume = 0.6
    a.play().catch(() => {})
  } catch { /* 忽略 */ }
}

function playClick()    { playSfx('./UI/ui-click.mp3') }
function playHover()    { playSfx('./UI/ui-hover.mp3') }
function playOpenMenu() { playSfx('./UI/ui-open-menu.mp3') }
function playCloseMenu(){ playSfx('./UI/ui-close-menu.mp3') }

let audioCtx = null
function getAudioContext() {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (AudioCtx) audioCtx = new AudioCtx()
  }
  return audioCtx
}

/** 极坐标折跃传送音效（双振荡器空间频率弯折合成音） */
export function playWarpSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    if (ctx.state === 'suspended') ctx.resume()
    const now = ctx.currentTime

    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    osc1.type = 'sine'
    osc2.type = 'sawtooth'

    // 频率向上快速扫射然后坠落，形成空间折跃空灵声
    osc1.frequency.setValueAtTime(220, now)
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12)
    osc1.frequency.exponentialRampToValueAtTime(110, now + 0.38)

    osc2.frequency.setValueAtTime(330, now)
    osc2.frequency.exponentialRampToValueAtTime(1320, now + 0.12)
    osc2.frequency.exponentialRampToValueAtTime(165, now + 0.38)

    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(600, now)
    filter.frequency.exponentialRampToValueAtTime(2400, now + 0.12)
    filter.frequency.exponentialRampToValueAtTime(400, now + 0.38)
    filter.Q.setValueAtTime(4, now)

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.3, now + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)

    osc1.connect(filter)
    osc2.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + 0.4)
    osc2.stop(now + 0.4)
  } catch {
    // 忽略音频环境未激活
  }
}

/**
 * 全局音效 composable
 * 所有组件可独立 import { useSound } 获取同一模块级单例。
 */
export function useSound() {
  return {
    bgmOn,
    initBgm,
    toggleBgm,
    resumeBgm,
    playClick,
    playHover,
    playOpenMenu,
    playCloseMenu,
    playWarpSound,
  }
}
