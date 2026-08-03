<template>
  <div class="overlay">
    <h1 class="victory-title">逃出生天</h1>
    <p>你凭借声纳走出了所有的深渊！</p>
    <button @click="emit('restart'); playClick()">重头再来</button>
    <button class="menu-btn" @click="emit('menu'); playClick()">返回菜单</button>
  </div>
</template>

<script setup>
import { useSound } from '../composables/useSound.js'

const { playClick } = useSound()

const emit = defineEmits(['restart', 'menu'])
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
.victory-title {
  color: #4CAF50;
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
.menu-btn {
  margin-top: 12px;
  border-color: #555;
  color: #888;
  font-size: clamp(12px, 3vw, 14px);
  padding: 8px 16px;
}
</style>
