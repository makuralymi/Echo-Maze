<template>
  <div class="overlay">
    <h1>LEVEL CLEAR</h1>
    <p>黑暗迅速聚拢，你的声音是唯一的救赎...</p>
    <button @click="emit('next')">进入下一层</button>
  </div>
</template>

<script setup>
const emit = defineEmits(['next'])
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
</style>
