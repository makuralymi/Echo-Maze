<template>
  <div class="overlay">
    <h1>回声</h1>
    <p>
      在无尽的黑暗中，<span class="highlight">滑动屏幕</span> 摸索前行。<br>
      你需要不断发出声音，利用声波照亮墙壁。<br>
      <span class="highlight">需要一定的音量才能触发声波，声音越大，看的越远。</span><br>
      光影将在 1 秒后消散，不要停下呼喊。<br>
      <span class="highlight">注意：为了游戏的正常运行，需要授予麦克风权限,如果出现失败请退出重进游戏。</span>
    </p>
    <button :disabled="loading" @click="handleClick">
      {{ loading ? '连接中...' : '允许麦克风并潜入' }}
    </button>
    <div v-if="error" class="error-msg">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useSound } from '../composables/useSound.js'

const { playClick, initBgm } = useSound()

const props = defineProps({
  error: String,
  startMicrophone: Function
})
const emit = defineEmits(['started'])

const loading = ref(false)
const error = ref(props.error)

function handleClick() {
  if (loading.value) return
  playClick()
  initBgm() // 首次用户手势触发 BGM 播放
  loading.value = true
  error.value = ''

  props.startMicrophone()
    .then(() => {
      emit('started')
    })
    .catch((err) => {
      console.error('麦克风权限失败:', err.message)
      error.value = `连接麦克风失败，请允许权限。\n${err.message}`
      loading.value = false
    })
}
</script>

<style scoped>
.overlay {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background-color: rgba(0, 0, 0, 0.95);
  display: flex; flex-direction: column;
  justify-content: center; align-items: center;
  pointer-events: auto; z-index: 20;
  padding: 20px; box-sizing: border-box; text-align: center;
}
h1 {
  font-size: clamp(28px, 8vw, 36px);
  margin-bottom: 10px;
  letter-spacing: 5px;
}
p {
  font-size: clamp(13px, 3.5vw, 15px);
  margin-bottom: 30px;
  line-height: 1.8;
  color: #aaa;
}
.highlight {
  color: #fff;
  font-weight: bold;
}
</style>
