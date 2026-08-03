<template>
  <div class="app">
    <TopBar
      :game-phase="gamePhase"
      :level="currentLevel"
      :total="totalLevels"
      :is-mic-on="isMicOn"
      :dog-active="dogActive"
      :bgm-on="bgmOn"
      @restart="onRestart"
      @levels="onMenu"
      @home="onHome"
      @toggle-camera="onToggleCamera"
      @help-dog="onHelpDog"
      @toggle-bgm="toggleBgm"
    />

    <GameCanvas3D
      v-if="is3DLevel"
      :game-phase="gamePhase"
      :current-level="currentLevel"
      :view-mode="viewMode"
      :is-playing="isPlaying"
      :is-mic-on="isMicOn"
      :player="player"
      :exit-cell="exitCell"
      :grid="grid"
      :pings="pings"
      :cell-size="cellSize"
      :offset-x="offsetX"
      :offset-y="offsetY"
      :cols="cols"
      :rows="rows"
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
      :dog-active="dogActive"
      :dog-path="dogPath"
      :dog-world-path="dogWorldPath"
      :dog-pos="dogPos"
      :dog-anim-id="dogAnimId"
      :dog-easter-egg="dogEasterEgg"
      :dog-finished="dogFinished"
      :dog-audio-mode="dogAudioMode"
      :update-dog="updateDog"
      @easter-egg-done="easterEggDone"
      @next-level="onNextLevel"
      @menu="onMenu"
      @restart="onRestart"
    />

    <GameCanvas
      v-else
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
      :dog-active="dogActive"
      :dog-path="dogPath"
      :dog-world-path="dogWorldPath"
      :dog-pos="dogPos"
      :dog-anim-id="dogAnimId"
      :dog-easter-egg="dogEasterEgg"
      :dog-finished="dogFinished"
      :dog-audio-mode="dogAudioMode"
      :update-dog="updateDog"
      @easter-egg-done="easterEggDone"
      @next-level="onNextLevel"
      @menu="onMenu"
      @restart="onRestart"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import TopBar from './components/TopBar.vue'
import GameCanvas from './components/GameCanvas.vue'
import { useAudio } from './composables/useAudio.js'
import { useGame } from './composables/useGame.js'
import { useCloudStorage } from './composables/useCloudStorage.js'
import { useSound } from './composables/useSound.js'
import { LEVELS, TOTAL_LEVELS, isLevel3D, isLevelCube } from './config/levelConfig.js'

// 三维渲染组件懒加载：three.js 单独分包，仅在进入第 11 关时加载，
// 不影响 1–10 关（2D）的首屏体积。
const GameCanvas3D = defineAsyncComponent(() => import('./components/GameCanvas3D.vue'))

const { isMicOn, startMicrophone, getAudioLevels, stopMicrophone } = useAudio()
const { load: loadSave, save: saveProgress } = useCloudStorage()
const { bgmOn, toggleBgm, playClick } = useSound()

const {
  isPlaying,
  currentLevel,
  gamePhase,
  unlockedLevel,
  player,
  exitCell,
  grid,
  cols,
  rows,
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
  handleLevelComplete,
  dogActive,
  dogPath,
  dogWorldPath,
  dogPos,
  dogAnimId,
  dogEasterEgg,
  dogFinished,
  dogAudioMode,
  activateDog,
  deactivateDog,
  easterEggDone,
  updateDog,
} = useGame()

const errorMsg = ref('')
const totalLevels = TOTAL_LEVELS

// 当前关卡是否为三维渲染（第 11 关）
const is3DLevel = computed(() => isLevel3D(currentLevel.value - 1))
// 三维渲染模式：'cube'（多层立方，可升降层）或 'plane'（单层俯视）
const viewMode = computed(() => (isLevelCube(currentLevel.value - 1) ? 'cube' : 'plane'))

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

function persistProgress() {
  if (unlockedLevel.value <= 1) return
  saveProgress({ unlocked: unlockedLevel.value })
}

function onNextLevel() {
  persistProgress()
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

function onHelpDog() {
  activateDog()
}

function onEasterEggDone() {
  easterEggDone()
}

// 提供给 GameCanvas 中 StartScreen / LevelMenu 的回调
window.__startLevel = (id) => {
  playClick()
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
