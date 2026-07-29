<template>
  <div id="top-ui-bar">
    <div id="game-title">回声迷宫</div>
    <div id="level-display">LEVEL {{ level }} / {{ total }}</div>
    <div id="mic-status">
      MIC:
      <span id="mic-indicator" :style="{ color: isMicOn ? '#4CAF50' : '#fff' }">
        {{ isMicOn ? 'ON' : 'OFF' }}
      </span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  level: { type: Number, required: true },
  total: { type: Number, default: 5 },
  isMicOn: { type: Boolean, default: false }
})
</script>

<style scoped>
#top-ui-bar {
  width: 100%;
  max-width: 800px;
  height: 8vh;
  min-height: 50px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 5%;
  box-sizing: border-box;
  border-bottom: 1px dashed #333;
  z-index: 10;
}
#game-title {
  font-size: clamp(16px, 4vw, 18px);
  font-weight: bold;
  letter-spacing: 2px;
}
#level-display {
  font-size: clamp(16px, 4vw, 18px);
  color: #4CAF50;
  font-weight: bold;
}
#mic-status {
  font-size: clamp(10px, 3vw, 12px);
  color: #aaa;
}
#mic-indicator {
  font-weight: bold;
}
</style>
