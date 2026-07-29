<template>
  <div id="top-ui-bar-wrapper">
    <div id="top-ui-bar">
      <button id="menu-toggle" @click="showMenu = !showMenu">☰</button>
      <div id="game-title">回声迷宫</div>
      <div id="level-display">LEVEL {{ level }} / {{ total }}</div>
      <div id="mic-status">
        MIC:
        <span id="mic-indicator" :style="{ color: isMicOn ? '#4CAF50' : '#fff' }">
          {{ isMicOn ? 'ON' : 'OFF' }}
        </span>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showMenu" class="menu-backdrop" @click="showMenu = false">
        <div class="menu-dialog" @click.stop>
          <div class="menu-title">暂停</div>

          <button class="menu-item" @click="handle('restart')">回到起点</button>
          <div class="menu-divider"></div>

          <button class="menu-item" :class="{ active: cameraOn }" @click="handle('toggleCamera')">
            探图模式 {{ cameraOn ? 'ON' : 'OFF' }}
          </button>
          <div class="menu-divider"></div>

          <button class="menu-item" @click="handle('levels')">再探前路</button>
          <div class="menu-divider"></div>

          <button class="menu-item danger" @click="handle('home')">迷失</button>

          <button class="close-btn" @click="showMenu = false">继续</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

defineProps({
  level: { type: Number, required: true },
  total: { type: Number, default: 5 },
  isMicOn: { type: Boolean, default: false }
})

const emit = defineEmits(['restart', 'levels', 'home', 'toggleCamera'])

const showMenu = ref(false)
const cameraOn = ref(false)

function handle(action) {
  if (action === 'toggleCamera') {
    cameraOn.value = !cameraOn.value
    emit('toggleCamera')
    return
  }
  showMenu.value = false
  emit(action)
}

// 同步全局镜头状态
let raf = null
function syncCamera() {
  if (typeof window.__isCameraOn === 'function') {
    cameraOn.value = window.__isCameraOn()
  }
  raf = requestAnimationFrame(syncCamera)
}
onMounted(() => { syncCamera() })
onUnmounted(() => { if (raf) cancelAnimationFrame(raf) })
</script>

<style scoped>
#top-ui-bar-wrapper {
  width: 100%;
  max-width: 800px;
  position: relative;
  z-index: 30;
}
#top-ui-bar {
  width: 100%;
  height: 8vh;
  min-height: 50px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4%;
  box-sizing: border-box;
  border-bottom: 1px dashed #333;
  background-color: #000;
}
#menu-toggle {
  background: transparent;
  border: 1px solid #555;
  color: #aaa;
  font-size: 18px;
  cursor: pointer;
  padding: 2px 10px;
  border-radius: 4px;
  line-height: 1;
}
#menu-toggle:active,
#menu-toggle:hover {
  border-color: #fff;
  color: #fff;
}
#game-title {
  font-size: clamp(14px, 3.5vw, 16px);
  font-weight: bold;
  letter-spacing: 2px;
  flex: 1;
  text-align: center;
}
#level-display {
  font-size: clamp(14px, 3.5vw, 16px);
  color: #4CAF50;
  font-weight: bold;
  margin-right: 8px;
}
#mic-status {
  font-size: clamp(10px, 3vw, 12px);
  color: #aaa;
}
#mic-indicator {
  font-weight: bold;
}

/* 全屏遮罩 + 居中弹窗 */
.menu-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}
.menu-dialog {
  background: #0a0a0a;
  border: 1px solid #333;
  padding: 28px 24px 20px;
  min-width: 260px;
  max-width: 90vw;
  text-align: center;
}
.menu-title {
  font-size: 18px;
  letter-spacing: 3px;
  margin-bottom: 20px;
  color: #fff;
}
.menu-item {
  display: block;
  width: 100%;
  padding: 14px 16px;
  border: none;
  background: transparent;
  color: #ccc;
  font-family: inherit;
  font-size: 14px;
  letter-spacing: 1px;
  cursor: pointer;
  text-transform: none;
  text-align: center;
}
.menu-item:hover {
  color: #fff;
}
.menu-item.active {
  color: #4CAF50;
}
.menu-item.danger {
  color: #888;
}
.menu-item.danger:hover {
  color: #ff5252;
}
.menu-divider {
  height: 1px;
  background: #1a1a1a;
  margin: 0 16px;
}
.close-btn {
  display: block;
  width: 100%;
  margin-top: 20px;
  padding: 12px 16px;
  border: 1px solid #444;
  background: transparent;
  color: #888;
  font-family: inherit;
  font-size: 13px;
  letter-spacing: 2px;
  cursor: pointer;
  text-transform: uppercase;
}
.close-btn:hover {
  border-color: #fff;
  color: #fff;
}
</style>
