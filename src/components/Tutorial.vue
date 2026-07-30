<template>
  <div class="tut-overlay" role="dialog" aria-modal="true" aria-label="操作指南">
    <!-- 环境声纳背景 -->
    <div class="tut-ambient" aria-hidden="true">
      <span class="ring r1"></span>
      <span class="ring r2"></span>
      <span class="ring r3"></span>
      <span class="glow g1"></span>
      <span class="glow g2"></span>
    </div>

    <div ref="rootRef" class="tut-scroll">
      <div class="tut-inner">
        <!-- 顶栏 -->
        <header class="tut-bar">
          <div class="tut-bar-title">
            <span class="tut-kicker">ECHO MAZE</span>
            <span class="tut-bar-h">操作指南</span>
          </div>
          <button class="tut-close" aria-label="关闭" @click="onClose">✕</button>
        </header>

        <!-- 序章 -->
        <section class="tut-intro tut-section">
          <p class="intro-lead">在绝对的黑暗里，<br><em>声音是你唯一的光。</em></p>
          <p class="intro-sub">对麦克风发声，声波荡开、墙壁浮现；循着回声，穿过平面与立方，抵达那束常亮的绿光。下面是你会用到的全部能力——每一段都带着真实运行的演示。</p>
        </section>

        <!-- 1 回声 / 移动 / 终点 -->
        <section class="tut-card tut-section">
          <span class="idx">01</span>
          <h2>回声探路 · 移动 · 终点</h2>
          <p>发出声音，一圈声波自你扩散，扫到的墙壁短暂浮现，随后重归黑暗——你只能记住与推断。滑动屏幕或按 <b>方向键 / WASD</b> 在格子里移动，墙会挡住你。找到并抵达那格<span class="hl">绿色出口</span>即可过关。</p>
          <div class="chips">
            <span class="chip">出声 = 点亮</span>
            <span class="chip">滑动 / 方向键 = 移动</span>
            <span class="chip">绿格 = 出口</span>
          </div>
          <Demo2D class="demo-wrap" variant="play" />
        </section>

        <!-- 2 镜头模式 -->
        <section class="tut-card tut-section">
          <span class="idx">02</span>
          <h2>镜头模式 · 探图</h2>
          <p>小地图用固定全局视角即可；地图变大时，在暂停菜单开启<span class="hl">探图模式</span>，镜头会追踪你并支持<span class="hl">双指缩放 / 平移</span>。左为固定视角，右为追踪缩放——同一张迷宫的两种看法。</p>
          <div class="chips">
            <span class="chip">暂停菜单切换</span>
            <span class="chip">双指缩放 / 拖动平移</span>
          </div>
          <Demo2D class="demo-wrap" variant="camera" />
        </section>

        <!-- 3 布鲁斯 -->
        <section class="tut-card tut-section">
          <span class="idx">03</span>
          <h2>帮帮我 · 布鲁斯</h2>
          <p>卡住了？点顶栏的 <span class="dogmark">🐾</span> 召唤布鲁斯。它会沿一条解路径前行，边走边用微弱的叫声替你点亮迷宫。注意：每召唤<span class="hl">三次</span>，布鲁斯会给你一点小惊喜。</p>
          <div class="chips">
            <span class="chip">顶栏 🐾 召唤</span>
            <span class="chip">沿解路径点亮</span>
            <span class="chip">每 3 次 = 彩蛋</span>
          </div>
          <Demo2D class="demo-wrap" variant="dog" />
        </section>

        <!-- 4 立体声纳 3D 平面 -->
        <section class="tut-card tut-section s3d">
          <span class="idx">04</span>
          <h2>第三幕 · 立体声纳</h2>
          <p>迷宫升维成真正的三维空间。拖动画面即可<span class="hl">环绕观察</span>，声波变成<span class="hl">球面</span>向四周荡开，把立体的墙壁从黑暗里敲出来。</p>
          <div class="chips">
            <span class="chip">拖拽 = 环绕</span>
            <span class="chip">球面回声</span>
            <span class="chip">滚轮 / 双指缩放</span>
          </div>
          <Demo3D class="demo-wrap" variant="plane" />
        </section>

        <!-- 5 立方迷宫 3D 多层 -->
        <section class="tut-card tut-section s3d">
          <span class="idx">05</span>
          <h2>第四幕 · 立方迷宫</h2>
          <p>若干层迷宫叠成立方，你可以在<span class="hl">任意位置自由升降层</span>。左侧的层选择器是读图的关键：<span class="hl">全</span>=整立方透明总览，<span class="hl">本</span>=只看脚下层，<span class="hl">数字</span>=该层完整蓝图。终点是<span class="hl">常亮信标</span>；布鲁斯的导航线里，<span class="amber">橙色段=升降层</span>、绿色段=平移。</p>
          <div class="chips">
            <span class="chip">Q / E 或 ▲▼ = 升降层</span>
            <span class="chip">全 / 本 / 数字 = 层视野</span>
            <span class="chip amber">橙线 = 升降</span>
          </div>
          <Demo3D class="demo-wrap" variant="cube" />
        </section>

        <!-- 6 彩蛋 -->
        <section class="tut-card tut-section">
          <span class="idx">06</span>
          <h2>布鲁斯的彩蛋</h2>
          <p>每第三次召唤，布鲁斯会以它的方式登场——别紧张，点一下或等它自己落幕，它会用另一种声音继续为你带路。</p>
          <div class="egg-stage" aria-hidden="true">
            <span class="egg-ring"></span>
            <svg class="egg-dog" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
              <path d="M307.4048 936.5504h-78.6432c-22.9376 0-41.7792-20.48-41.7792-45.6704s18.8416-45.6704 41.7792-45.6704h20.0704c0.6144 0 1.2288-0.6144 1.2288-1.2288l2.8672-293.4784-74.5472-155.4432c-68.1984-3.4816-122.4704-60.0064-122.4704-128.8192v-10.24h96.0512L235.52 200.2944l36.864-109.9776L400.5888 362.496l376.6272 183.7056c15.36 5.12 99.1232 7.9872 141.7216-48.7424l18.432-24.576v30.72c0 65.9456-28.2624 98.5088-52.0192 114.0736-14.9504 9.8304-30.1056 14.336-40.1408 16.384 2.048 9.4208 3.2768 19.2512 3.2768 29.2864 0 40.3456-18.0224 78.0288-49.5616 103.2192-4.5056 3.4816-10.8544 2.8672-14.336-1.6384-3.4816-4.5056-2.8672-10.8544 1.6384-14.336 26.624-21.2992 41.7792-53.0432 41.7792-87.2448 0-12.0832-1.8432-23.7568-5.5296-34.6112l-4.3008-12.9024 13.7216-0.4096c3.072-0.2048 70.4512-3.8912 83.1488-84.1728-50.176 41.984-124.5184 41.3696-144.9984 33.9968l-1.024-0.4096L385.024 377.6512 275.6608 145.2032l-22.9376 68.1984L158.1056 276.48H76.8c5.12 55.0912 51.6096 98.304 108.1344 98.304h6.3488l82.1248 171.2128v2.4576l-2.8672 295.7312c0 11.8784-9.8304 21.7088-21.7088 21.7088h-20.0704c-11.4688 0-21.2992 11.4688-21.2992 25.1904 0 13.9264 9.6256 25.1904 21.2992 25.1904h78.6432c5.7344 0 15.9744-14.7456 21.7088-28.2624L376.0128 649.216c1.024-5.5296 6.5536-9.216 12.0832-7.9872 5.5296 1.024 9.216 6.5536 7.9872 12.0832l-47.3088 240.8448-0.4096 0.8192c-2.6624 6.7584-18.0224 41.5744-40.96 41.5744z" fill="#4CAF50"/>
              <path d="M240.64 279.7568m-19.6608 0a19.6608 19.6608 0 1 0 39.3216 0 19.6608 19.6608 0 1 0-39.3216 0Z" fill="#4CAF50"/>
              <path d="M559.3088 771.2768c-0.6144 0-1.4336 0-2.048-0.2048-100.352-20.6848-175.7184-109.7728-178.7904-113.664-3.6864-4.3008-3.072-10.8544 1.2288-14.336 4.3008-3.6864 10.8544-3.072 14.336 1.2288 0.8192 0.8192 73.9328 87.4496 167.3216 106.7008 5.5296 1.2288 9.0112 6.5536 7.9872 12.0832-1.024 4.9152-5.3248 8.192-10.0352 8.192zM766.1568 936.5504h-128.4096c-22.9376 0-41.7792-20.48-41.7792-45.6704s18.8416-45.6704 41.7792-45.6704h19.6608c0.4096-0.6144 1.2288-1.8432 2.2528-4.9152 11.8784-32.5632-4.5056-42.3936-6.3488-43.4176l-1.2288-0.6144-0.6144-0.6144c-25.1904-20.0704-39.7312-49.9712-39.7312-82.1248 0-57.7536 46.8992-104.6528 104.6528-104.6528 10.6496 0 21.2992 1.6384 31.744 4.9152 5.3248 1.6384 8.3968 7.3728 6.5536 12.9024-1.6384 5.3248-7.3728 8.3968-12.9024 6.5536-8.3968-2.6624-16.9984-4.096-25.6-4.096-46.4896 0-84.1728 37.6832-84.1728 84.1728 0 25.6 11.4688 49.3568 31.1296 65.536 12.288 6.7584 29.696 28.672 15.1552 68.1984-1.8432 5.12-6.9632 18.2272-21.0944 18.2272h-20.0704c-11.4688 0-21.2992 11.4688-21.2992 25.1904 0 13.9264 9.6256 25.1904 21.2992 25.1904h107.52l-1.8432-111.4112c0-5.7344 4.5056-10.24 10.0352-10.4448h0.2048c5.5296 0 10.24 4.5056 10.24 10.0352l2.8672 132.7104z" fill="#4CAF50"/>
            </svg>
          </div>
        </section>

        <!-- 7 功能速览 -->
        <section class="tut-card tut-section">
          <span class="idx">07</span>
          <h2>功能速览</h2>
          <div class="tiles">
            <div class="tile">
              <span class="tile-glyph">🎙</span>
              <span class="tile-t">麦克风授权</span>
              <span class="tile-d">首次进入需允许麦克风；在 Toy / B 站内会自动走容器授权。</span>
            </div>
            <div class="tile">
              <span class="tile-glyph">▦</span>
              <span class="tile-t">选关与解锁</span>
              <span class="tile-d">通关逐关解锁；选关页可左右翻页，已通关打勾。</span>
            </div>
            <div class="tile">
              <span class="tile-glyph">☁</span>
              <span class="tile-t">进度云存档</span>
              <span class="tile-d">在 Toy 环境自动云端保存解锁进度，换设备也在。</span>
            </div>
            <div class="tile">
              <span class="tile-glyph">▲</span>
              <span class="tile-t">四幕递进</span>
              <span class="tile-d">觉醒 → 深渊 → 升维(3D) → 立方(多层)，难度与维度一同攀升。</span>
            </div>
          </div>
        </section>

        <!-- 收尾 -->
        <section class="tut-end tut-section">
          <p class="end-line">记住迷宫，相信回声。</p>
          <button class="end-btn" @click="onClose">准备好了 · 开始探索</button>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, defineAsyncComponent } from 'vue'
import Demo2D from './Demo2D.vue'

// 三维演示懒加载：仅在打开指南时才拉取 three.js
const Demo3D = defineAsyncComponent(() => import('./Demo3D.vue'))

const emit = defineEmits(['close'])
const rootRef = ref(null)
let io = null

function onClose() { emit('close') }

function onKey(e) {
  if (e.key === 'Escape') onClose()
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  nextTick(() => {
    const els = rootRef.value ? rootRef.value.querySelectorAll('.tut-section') : []
    io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) e.target.classList.add('in')
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    els.forEach(el => io.observe(el))
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  if (io) io.disconnect()
})
</script>

<style scoped>
.tut-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(3, 6, 9, 0.97);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  color: #c3cfca;
  font-family: ui-sans-serif, system-ui, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

/* 环境声纳 */
.tut-ambient {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.tut-ambient .ring {
  position: absolute;
  left: 50%;
  top: 30%;
  width: 60px;
  height: 60px;
  margin: -30px 0 0 -30px;
  border: 1px solid rgba(76, 175, 80, 0.18);
  border-radius: 50%;
  animation: sonar 7s ease-out infinite;
}
.tut-ambient .r2 { animation-delay: 2.3s; }
.tut-ambient .r3 { animation-delay: 4.6s; }
@keyframes sonar {
  0% { transform: scale(0.2); opacity: 0.5; }
  100% { transform: scale(14); opacity: 0; }
}
.tut-ambient .glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(70px);
  opacity: 0.5;
}
.g1 { width: 360px; height: 360px; left: -80px; top: 10%; background: radial-gradient(circle, rgba(20, 70, 50, 0.5), transparent 70%); }
.g2 { width: 420px; height: 420px; right: -120px; bottom: 6%; background: radial-gradient(circle, rgba(15, 50, 70, 0.45), transparent 70%); }

.tut-scroll {
  position: relative;
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.tut-inner {
  position: relative;
  max-width: 760px;
  margin: 0 auto;
  padding: 0 22px 80px;
}

/* 顶栏 */
.tut-bar {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 4px;
  background: linear-gradient(to bottom, rgba(3, 6, 9, 0.95) 60%, rgba(3, 6, 9, 0));
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
.tut-bar-title { display: flex; flex-direction: column; gap: 2px; }
.tut-kicker {
  font-family: 'Courier New', monospace;
  font-size: 10px;
  letter-spacing: 5px;
  color: rgba(76, 175, 80, 0.85);
}
.tut-bar-h {
  font-family: 'Courier New', monospace;
  font-size: clamp(20px, 6vw, 26px);
  font-weight: 700;
  letter-spacing: 4px;
  color: #f2f7f4;
  text-shadow: 0 0 18px rgba(76, 175, 80, 0.25);
}
.tut-close {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.03);
  color: #cdd6d2;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
}
.tut-close:hover {
  border-color: #4CAF50;
  color: #fff;
  background: rgba(76, 175, 80, 0.15);
  transform: rotate(90deg);
}

/* 序章 */
.tut-intro { padding: 26px 2px 8px; }
.intro-lead {
  font-family: 'Courier New', monospace;
  font-size: clamp(26px, 8vw, 44px);
  line-height: 1.25;
  font-weight: 700;
  color: #eef4f1;
  letter-spacing: 1px;
  margin: 0 0 16px;
}
.intro-lead em {
  font-style: normal;
  color: #6dffb0;
  text-shadow: 0 0 22px rgba(76, 175, 80, 0.4);
}
.intro-sub {
  font-size: clamp(13px, 3.6vw, 15px);
  line-height: 1.9;
  color: #93a39c;
  max-width: 60ch;
  margin: 0;
}

/* 卡片 */
.tut-card {
  position: relative;
  margin-top: 26px;
  padding: 22px 22px 24px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  background: linear-gradient(160deg, rgba(18, 26, 24, 0.6), rgba(8, 12, 12, 0.5));
  overflow: hidden;
}
.tut-card::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: linear-gradient(to bottom, #4CAF50, transparent);
}
.tut-card.s3d::before { background: linear-gradient(to bottom, #38c6ff, #4CAF50); }
.idx {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  letter-spacing: 3px;
  color: rgba(76, 175, 80, 0.7);
}
.s3d .idx { color: rgba(56, 198, 255, 0.7); }
.tut-card h2 {
  font-family: 'Courier New', monospace;
  font-size: clamp(17px, 5vw, 22px);
  font-weight: 700;
  letter-spacing: 1px;
  color: #f0f5f2;
  margin: 4px 0 12px;
}
.tut-card p {
  font-size: clamp(13px, 3.6vw, 14.5px);
  line-height: 1.9;
  color: #aab8b2;
  margin: 0 0 14px;
}
.tut-card p b { color: #e6efe9; font-weight: 600; }
.hl { color: #7df0a6; font-weight: 600; }
.amber { color: #ffb347; }
.dogmark { filter: saturate(1.2); }

/* chips */
.chips { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 16px; }
.chip {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  letter-spacing: 0.5px;
  padding: 4px 9px;
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 999px;
  color: #b7e6c6;
  background: rgba(76, 175, 80, 0.06);
}
.chip.amber {
  border-color: rgba(255, 179, 71, 0.4);
  color: #ffcf94;
  background: rgba(255, 179, 71, 0.07);
}
.demo-wrap { margin-top: 4px; }

/* 彩蛋舞台 */
.egg-stage {
  position: relative;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: radial-gradient(circle at 50% 50%, rgba(76, 175, 80, 0.08), transparent 70%);
  overflow: hidden;
}
.egg-ring {
  position: absolute;
  width: 40px; height: 40px;
  border: 1px solid rgba(76, 175, 80, 0.4);
  border-radius: 50%;
  animation: sonar 2.6s ease-out infinite;
}
.egg-dog {
  width: 92px;
  height: 92px;
  animation: egg-pop 2.6s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
  filter: drop-shadow(0 0 14px rgba(76, 175, 80, 0.5));
}
@keyframes egg-pop {
  0% { transform: scale(0.2); opacity: 0.3; }
  35% { transform: scale(1); opacity: 1; }
  70% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.8); opacity: 0; }
}

/* 功能速览 tiles */
.tiles {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.tile {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}
.tile:hover {
  transform: translateY(-3px);
  border-color: rgba(76, 175, 80, 0.45);
  background: rgba(76, 175, 80, 0.06);
}
.tile-glyph { font-size: 20px; line-height: 1; }
.tile-t {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  font-weight: 700;
  color: #e6efe9;
  letter-spacing: 0.5px;
}
.tile-d { font-size: 11.5px; line-height: 1.6; color: #8b9993; }

/* 收尾 */
.tut-end { text-align: center; padding: 40px 0 10px; }
.end-line {
  font-family: 'Courier New', monospace;
  font-size: clamp(18px, 5vw, 24px);
  letter-spacing: 2px;
  color: #d7e2dc;
  margin: 0 0 22px;
}
.end-btn {
  font-family: 'Courier New', monospace;
  font-size: clamp(13px, 4vw, 15px);
  letter-spacing: 2px;
  padding: 14px 30px;
  border: 1px solid #4CAF50;
  border-radius: 999px;
  background: rgba(76, 175, 80, 0.12);
  color: #d8ffe6;
  cursor: pointer;
  transition: all 0.25s ease;
  text-transform: none;
}
.end-btn:hover {
  background: #4CAF50;
  color: #04130b;
  box-shadow: 0 0 24px rgba(76, 175, 80, 0.5);
}

/* 滚动揭示 */
.tut-section {
  opacity: 0;
  transform: translateY(26px);
  transition: opacity 0.6s ease, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}
.tut-section.in { opacity: 1; transform: none; }

@media (max-width: 420px) {
  .tiles { grid-template-columns: 1fr; }
}
</style>
