<template>
  <div class="overlay">
    <h1>回声迷宫</h1>
    <p class="subtitle">选择关卡</p>

    <div class="menu-list">
      <button
        v-for="lvl in levels"
        :key="lvl.id"
        class="level-btn"
        :class="{ locked: lvl.locked }"
        :disabled="lvl.locked"
        @click="emit('select', lvl.id)"
      >
        <span class="level-id">{{ lvl.id }}</span>
        <span class="level-info">
          <span class="level-name">{{ lvl.name }}</span>
          <span class="level-desc">{{ lvl.desc }}</span>
        </span>
        <span v-if="lvl.locked" class="lock-icon">🔒</span>
        <span v-else-if="lvl.cleared" class="clear-icon">✓</span>
      </button>
    </div>

    <div v-if="loadError" class="error-msg">{{ loadError }}</div>
  </div>
</template>

<script setup>
const props = defineProps({
  levels: Array,     // [{ id, name, desc, locked, cleared }]
  loadError: String,
})
const emit = defineEmits(['select'])
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
  margin-bottom: 6px;
  letter-spacing: 5px;
}
.subtitle {
  font-size: clamp(13px, 3.5vw, 15px);
  margin-bottom: 24px;
  color: #aaa;
}
.menu-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  max-width: 360px;
}
.level-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  border: 1px solid #444;
  border-radius: 8px;
  background: transparent;
  color: #fff;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.25s ease;
  text-transform: none;
  text-align: left;
}
.level-btn:not(:disabled):hover {
  border-color: #fff;
  background: rgba(255,255,255,0.05);
}
.level-btn.locked {
  opacity: 0.35;
  cursor: not-allowed;
}
.level-id {
  font-size: 22px;
  font-weight: bold;
  color: #4CAF50;
  min-width: 30px;
}
.locked .level-id { color: #666; }
.level-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1;
}
.level-name {
  font-size: 14px;
  font-weight: bold;
}
.level-desc {
  font-size: 11px;
  color: #888;
  margin-top: 2px;
}
.lock-icon, .clear-icon {
  font-size: 16px;
}
.error-msg {
  color: #ff5252;
  margin-top: 16px;
  font-size: 13px;
  max-width: 80%;
}
</style>
