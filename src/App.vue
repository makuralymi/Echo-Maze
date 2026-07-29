<template>
  <div class="app">
    <TopBar
      :level="currentLevel"
      :total="5"
      :is-mic-on="isMicOn"
    />

    <GameCanvas
      ref="gameCanvasRef"
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
      @started="startGame"
      @next-level="nextLevel"
      @restart="restart"
    />
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import TopBar from './components/TopBar.vue'
import GameCanvas from './components/GameCanvas.vue'
import { useAudio } from './composables/useAudio.js'
import { useGame } from './composables/useGame.js'

const { isMicOn, startMicrophone, getAudioLevels, stopMicrophone } = useAudio()
const {
  isPlaying,
  currentLevel,
  gamePhase,
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
  startGame,
  nextLevel,
  restart,
  finalizeLevelSetup,
  handleLevelComplete
} = useGame()

const errorMsg = ref('')

onUnmounted(() => {
  stopMicrophone()
})
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
