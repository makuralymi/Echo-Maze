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

    // requestMicrophone 必须在用户手势事件中同步调用
    // Toy SDK 文档已确认 App 和 Web 端都支持，无需 isSupport 检查
    if (typeof window.toy !== 'undefined') {
      mediaStream = await window.toy.requestMicrophone()
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
