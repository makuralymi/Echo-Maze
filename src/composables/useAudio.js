// 音频/麦克风处理逻辑
import { ref } from 'vue'

export function useAudio() {
  const isMicOn = ref(false)
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

    // 本地调试（非 Toy 平台环境）：直接走浏览器原生 getUserMedia
    if (typeof window.toy === 'undefined') {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    } else {
      // Toy 平台环境：通过 SDK 获取麦克风，必须在用户手势事件中同步调用
      mediaStream = await window.toy.requestMicrophone()
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
    if (window.toy && mediaStream) {
      window.toy.stopMedia(mediaStream).catch(() => {})
    } else if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop())
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

  return { isMicOn, startMicrophone, getAudioLevels, stopMicrophone }
}
