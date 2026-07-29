// 音频/麦克风处理逻辑
import { ref } from 'vue'

/**
 * 自动检测当前环境是否为 B站 Toy 平台：
 * - Toy 平台会注入 toy-sdk.js，window.toy 上挂载 requestMicrophone / stopMedia 等方法
 * - 本地调试 / 普通浏览器则走标准 Web API
 */
function isToyPlatform() {
  return typeof window.toy !== 'undefined'
    && typeof window.toy.requestMicrophone === 'function'
}

export function useAudio() {
  const isMicOn = ref(false)
  const toySDK = ref(isToyPlatform())

  let audioContext = null
  let analyser = null
  let microphone = null
  let dataArray = null
  let mediaStream = null

  async function startMicrophone() {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    audioContext = new AudioContext()

    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }

    // 自动检测：Toy 平台走 SDK，失败回退到浏览器原生 API
    if (toySDK.value) {
      try {
        mediaStream = await window.toy.requestMicrophone()
      } catch (e) {
        // Toy SDK 加载了但不在 B站 App 内（如部署在 Cloudflare），回退浏览器 API
        console.warn('Toy SDK 麦克风调用失败，回退浏览器原生 API:', e.message)
        toySDK.value = false
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      }
    } else {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    }

    analyser = audioContext.createAnalyser()
    microphone = audioContext.createMediaStreamSource(mediaStream)
    analyser.fftSize = 128
    dataArray = new Uint8Array(analyser.frequencyBinCount)
    microphone.connect(analyser)

    isMicOn.value = true
  }

  function getAudioLevels() {
    if (!analyser) return { peak: 0, average: 0 }
    analyser.getByteFrequencyData(dataArray)

    let peak = 0
    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      if (dataArray[i] > peak) peak = dataArray[i]
      sum += dataArray[i]
    }
    return { peak, average: sum / dataArray.length }
  }

  function stopMicrophone() {
    if (mediaStream) {
      if (toySDK.value) {
        window.toy.stopMedia(mediaStream).catch(() => {})
      } else {
        mediaStream.getTracks().forEach(track => track.stop())
      }
    }
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close()
    }
    audioContext = null
    analyser = null
    microphone = null
    dataArray = null
    mediaStream = null
    isMicOn.value = false
  }

  return { isMicOn, toySDK, startMicrophone, getAudioLevels, stopMicrophone }
}
