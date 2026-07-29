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

    <!-- 弹窗菜单 -->
    <Teleport to="body">
      <div v-if="showMenu" class="menu-backdrop" @click="showMenu = false"></div>
    </Teleport>
    <div v-if="showMenu" class="menu-popover">
      <button class="menu-item" @click="handle('restart')">
        <span class="menu-icon">🔄</span>
        <span class="menu-label">回到起点</span>
      </button>
      <button class="menu-item" @click="handle('levels')">
        <span class="menu-icon">🗺️</span>
        <span class="menu-label">再探前路</span>
      </button>
      <button class="menu-item danger" @click="handle('home')">
        <span class="menu-icon">🚪</span>
        <span class="menu-label">迷失</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  level: { type: Number, required: true },
  total: { type: Number, default: 5 },
  isMicOn: { type: Boolean, default: false }
})

const emit = defineEmits(['restart', 'levels', 'home'])

const showMenu = ref(false)

function handle(action) {
  showMenu.value = false
  emit(action)
}
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
  border: none;
  color: #aaa;
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}
#menu-toggle:active {
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

/* 弹窗 */
.menu-popover {
  position: absolute;
  top: 100%;
  left: 12px;
  background: #111;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 6px 0;
  min-width: 180px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.8);
  z-index: 31;
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: #ccc;
  font-family: inherit;
  font-size: 14px;
  cursor: pointer;
  text-transform: none;
  text-align: left;
  border-radius: 0;
}
.menu-item:hover {
  background: rgba(255,255,255,0.05);
  color: #fff;
}
.menu-item:active {
  background: rgba(255,255,255,0.1);
}
.menu-item.danger {
  color: #ff5252;
}
.menu-icon {
  font-size: 16px;
  width: 22px;
  text-align: center;
}
.menu-label {
  font-size: 14px;
}
.menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 29;
}
</style>
