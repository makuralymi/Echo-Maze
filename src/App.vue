<template>
  <div class="app">
    <TopBar
      :game-phase="gamePhase"
      :level="currentLevel"
      :total="totalLevels"
      :is-mic-on="isMicOn"
      @restart="onRestart"
      @levels="onMenu"
      @home="onHome"
      @toggle-camera="onToggleCamera"
    />

    <GameCanvas
      :game-phase="gamePhase"
      :current-level="currentLevel"
      :is-playing="isPlaying"
      :is-mic-on="isMicOn"
      :player="player"
      :exit-cell="exitCell"
      :grid="grid"
      :pings="pings"
      :cell-size="cellSize"
      :offset-x="offsetX"
      :offset-y="offsetY"
      :error-msg="errorMsg"
      :get-audio-levels="getAudioLevels"
      :move-player="movePlayer"
      :check-win="checkWin"
      :trigger-ping="triggerPing"
      :finalize-level-setup="finalizeLevelSetup"
      :calc-maze-transform="calcMazeTransform"
      :handle-level-complete="handleLevelComplete"
      :start-microphone="startMicrophone"
      :level-list="levelList"
      @next-level="onNextLevel"
      @menu="onMenu"
      @restart="onRestart"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import TopBar from './components/TopBar.vue'
import GameCanvas from './components/GameCanvas.vue'
import { useAudio } from './composables/useAudio.js'
import { useGame } from './composables/useGame.js'
import { useCloudStorage } from './composables/useCloudStorage.js'
import { LEVELS, TOTAL_LEVELS } from './config/levelConfig.js'

const { isMicOn, startMicrophone, getAudioLevels, stopMicrophone } = useAudio()
const { load: loadSave, save: saveProgress } = useCloudStorage()

const {
  isPlaying,
  currentLevel,
  gamePhase,
  unlockedLevel,
  player,
  exitCell,
  grid,
  pings,
  cellSize,
  offsetX,
  offsetY,
  calcMazeTransform,
  triggerPing,
  movePlayer,
  checkWin,
  startLevel,
  nextLevel,
  restart,
  goToMenu,
  goToLevelMenu,
  finalizeLevelSetup,
  handleLevelComplete
} = useGame()

const errorMsg = ref('')
const totalLevels = TOTAL_LEVELS

const levelList = computed(() => {
  return LEVELS.map(l => ({
    ...l,
    locked: l.id > unlockedLevel.value,
    cleared: l.id < unlockedLevel.value,
  }))
})

onMounted(async () => {
  const saved = await loadSave()
  if (saved && typeof saved.unlocked === 'number') {
    unlockedLevel.value = Math.max(1, Math.min(TOTAL_LEVELS, saved.unlocked))
  }
})

onUnmounted(() => {
  stopMicrophone()
  delete window.__startLevel
  delete window.__onMicReady
})

async function persistProgress() {
  if (unlockedLevel.value <= 1) return
  try {
    await saveProgress({ unlocked: unlockedLevel.value })
  } catch (err) {
    console.warn('存档失败:', err.message)
  }
}

async function onNextLevel() {
  await persistProgress()
  nextLevel()
}

function onMenu() {
  persistProgress()
  goToMenu()
}

function onRestart() {
  restart()
}

// "迷失" → 回到标题页（start），放弃当前进度
function onHome() {
  gamePhase.value = 'start'
  isPlaying.value = false
}

function onToggleCamera() {
  if (typeof window.__toggleCamera === 'function') {
    window.__toggleCamera()
  }
}

// 提供给 GameCanvas 中 StartScreen / LevelMenu 的回调
window.__startLevel = (id) => {
  startLevel(id)
}

// StartScreen 麦克风就绪后进入关卡菜单
window.__onMicReady = () => {
  goToLevelMenu()
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background-color: #000;
  color: #fff;
  font-family: 'Courier New', Courier, monospace;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}

#app {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.app {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

button {
  background-color: transparent;
  color: #fff;
  border: 2px solid #fff;
  padding: 12px clamp(20px, 5vw, 30px);
  font-size: clamp(14px, 4vw, 16px);
  font-family: inherit;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  border-radius: 8px;
  -webkit-tap-highlight-color: transparent;
}

button:active {
  background-color: #fff;
  color: #000;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-msg {
  color: #ff5252;
  margin-top: 15px;
  font-size: 14px;
  text-align: center;
  max-width: 80%;
}
</style>
