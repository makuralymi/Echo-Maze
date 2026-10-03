// 关卡配置文件
// 每个关卡的迷宫尺寸与难度参数

export const LEVELS = [
  // ===== 第一幕：觉醒 =====
  { id: 1,  name: '初探暗影', c: 8,  r: 8,  extraRate: 0.08, desc: '8×8 · 小试身手' },
  { id: 2,  name: '回声渐远', c: 12, r: 12, extraRate: 0.10, desc: '12×12 · 难度提升' },
  { id: 3,  name: '深海余响', c: 16, r: 16, extraRate: 0.12, desc: '16×16 · 注意方向' },
  { id: 4,  name: '迷宫深处', c: 20, r: 20, extraRate: 0.14, desc: '20×20 · 小心迷失' },
  { id: 5,  name: '终点之光', c: 24, r: 24, extraRate: 0.16, desc: '24×24 · 第一幕终章' },

  // ===== 第二幕：深渊 =====
  { id: 6,  name: '裂谷回廊', c: 12, r: 36, extraRate: 0.10, desc: '12×36 · 狭长裂谷' },
  { id: 7,  name: '幽暗长廊', c: 40, r: 14, extraRate: 0.12, desc: '40×14 · 无尽长廊' },
  { id: 8,  name: '迷途之庭', c: 28, r: 28, extraRate: 0.15, desc: '28×28 · 岔路丛生' },
  { id: 9,  name: '虚无大殿', c: 32, r: 32, extraRate: 0.17, desc: '32×32 · 恢弘深渊' },
  { id: 10, name: '永夜尽头', c: 36, r: 36, extraRate: 0.18, desc: '36×36 · 最终觉醒' },

  // ===== 第三幕：升维 =====
  // view: '3d' → 由 GameCanvas3D.vue 以三维声纳渲染（自由环绕视角）
  { id: 11, name: '破壁回响', c: 14, r: 14, extraRate: 0.12, desc: '14×14 · 立体声纳', view: '3d' },
  { id: 12, name: '棱镜回廊', c: 16, r: 16, extraRate: 0.13, desc: '16×16 · 立体声纳', view: '3d' },
  { id: 13, name: '折叠深渊', c: 18, r: 18, extraRate: 0.14, desc: '18×18 · 空间折叠', view: '3d' },
  { id: 14, name: '悬浮迷阵', c: 20, r: 20, extraRate: 0.15, desc: '20×20 · 悬浮迷阵', view: '3d' },
  { id: 15, name: '升维彼岸', c: 24, r: 24, extraRate: 0.16, desc: '24×24 · 升维终章', view: '3d' },

  // ===== 第四幕：立方 =====
  // view: '3d' + cube: true → 真三维立方迷宫：在多层之间升降穿行，层数随难度递增
  { id: 16, name: '双层回环', c: 8,  r: 8,  layers: 2, extraRate: 0.10, desc: '8×8×2 · 立方声纳',  view: '3d', cube: true },
  { id: 17, name: '三重维度', c: 8,  r: 8,  layers: 3, extraRate: 0.11, desc: '8×8×3 · 立方声纳',  view: '3d', cube: true },
  { id: 18, name: '折叠立方', c: 9,  r: 9,  layers: 3, extraRate: 0.12, desc: '9×9×3 · 折叠立方',  view: '3d', cube: true },
  { id: 19, name: '四维阶梯', c: 10, r: 10, layers: 4, extraRate: 0.13, desc: '10×10×4 · 四维阶梯', view: '3d', cube: true },
  { id: 20, name: '超立方终章', c: 10, r: 10, layers: 5, extraRate: 0.14, desc: '10×10×5 · 超立方体', view: '3d', cube: true },

  // ===== 第五幕：极面声呐 =====
  // 极坐标同心环迷宫：圆弧墙与径向射线，彻底不同于直角方格，声波环与圆环共振
  { id: 21, name: '极点初鸣', rings: 4,  sectors: 12, extraRate: 0.08, desc: '4环 12扇区 · 极坐标声呐', polar: true, act: 5 },
  { id: 22, name: '涟漪回环', rings: 5,  sectors: 14, extraRate: 0.10, desc: '5环 14扇区 · 弧向迂回',   polar: true, act: 5 },
  { id: 23, name: '涡旋深海', rings: 6,  sectors: 16, extraRate: 0.11, desc: '6环 16扇区 · 顺逆交错',   polar: true, act: 5 },
  { id: 24, name: '离心长廊', rings: 6,  sectors: 20, extraRate: 0.12, desc: '6环 20扇区 · 宽幅扇区',   polar: true, act: 5 },
  { id: 25, name: '同心迷阵', rings: 7,  sectors: 20, extraRate: 0.13, desc: '7环 20扇区 · 径向错位',   polar: true, act: 5 },
  { id: 26, name: '谐波星轨', rings: 8,  sectors: 24, extraRate: 0.13, desc: '8环 24扇区 · 环网回声',   polar: true, act: 5 },
  { id: 27, name: '雷达深渊', rings: 9,  sectors: 24, extraRate: 0.14, desc: '9环 24扇区 · 长程声纳',   polar: true, act: 5 },
  { id: 28, name: '脉冲视界', rings: 10, sectors: 28, extraRate: 0.15, desc: '10环 28扇区 · 高密圆环',  polar: true, act: 5 },
  { id: 29, name: '暗影星环', rings: 11, sectors: 32, extraRate: 0.16, desc: '11环 32扇区 · 极端环阻',  polar: true, act: 5 },
  { id: 30, name: '回声奇点之眼', rings: 12, sectors: 36, extraRate: 0.18, desc: '12环 36扇区 · 终极声呐', polar: true, act: 5 },

  // ===== 第六幕：折跃星环 =====
  // 极坐标断层折跃迷宫：内外区域被断层环绝对物理阻隔，必须且只能通过双向传送阵进行空间折跃通关
  // 第 31~34 关：单组传送阵（量子青蓝 α 门，2 个色段）
  // 第 35~40 关：双组传送阵（量子青蓝 α 门 + 日珥金橙 β 门，3 个色段）
  { id: 31, name: '时空缝隙', rings: 5,  sectors: 14, splitRings: [2],    splitRing: 2, extraRate: 0.08, desc: '5环 14扇区 · 空间初跃 (α门)', polar: true, warp: true, act: 6 },
  { id: 32, name: '断层回响', rings: 6,  sectors: 16, splitRings: [3],    splitRing: 3, extraRate: 0.10, desc: '6环 16扇区 · 区域隔离 (α门)', polar: true, warp: true, act: 6 },
  { id: 33, name: '双域涡旋', rings: 7,  sectors: 18, splitRings: [3],    splitRing: 3, extraRate: 0.10, desc: '7环 18扇区 · 环隙幽径 (α门)', polar: true, warp: true, act: 6 },
  { id: 34, name: '量子裂痕', rings: 7,  sectors: 20, splitRings: [4],    splitRing: 4, extraRate: 0.12, desc: '7环 20扇区 · 双域交错 (α门)', polar: true, warp: true, act: 6 },
  { id: 35, name: '对跖双跃', rings: 8,  sectors: 22, splitRings: [3, 6], splitRing: 3, extraRate: 0.12, desc: '8环 22扇区 · 双重折跃 (α/β门)', polar: true, warp: true, act: 6 },
  { id: 36, name: '星门共振', rings: 8,  sectors: 24, splitRings: [3, 6], splitRing: 3, extraRate: 0.13, desc: '8环 24扇区 · 奇点虫洞 (α/β门)', polar: true, warp: true, act: 6 },
  { id: 37, name: '虚空引渡', rings: 9,  sectors: 26, splitRings: [3, 6], splitRing: 3, extraRate: 0.14, desc: '9环 26扇区 · 三域虚空 (α/β门)', polar: true, warp: true, act: 6 },
  { id: 38, name: '超弦双环', rings: 10, sectors: 28, splitRings: [3, 7], splitRing: 3, extraRate: 0.15, desc: '10环 28扇区 · 极昼星环 (α/β门)', polar: true, warp: true, act: 6 },
  { id: 39, name: '莫比乌斯', rings: 11, sectors: 32, splitRings: [4, 8], splitRing: 4, extraRate: 0.16, desc: '11环 32扇区 · 超维双跃 (α/β门)', polar: true, warp: true, act: 6 },
  { id: 40, name: '终极星门枢纽', rings: 12, sectors: 36, splitRings: [4, 8], splitRing: 4, extraRate: 0.18, desc: '12环 36扇区 · 终极星门 (α/β门)', polar: true, warp: true, act: 6 },
  // ===== 第七幕：寰宇天球 =====
  // 归一化立方球体迷宫（Spherified Cube）：6个主面均匀覆盖三维球体，无极点畸变
  // 默认状态下支持自由旋转拖拽浏览整颗星球全貌；
  // 进入“探图模式”切换为第一人称沉浸式走廊漫游，手势滑动/按键控制移动方向
  { id: 41, name: '初入天球',     sphereN: 3, extraRate: 0.10, desc: '6面 3×3 · 天球漫步 (第一人称探图)', view: '3d', sphere: true, act: 7 },
  { id: 42, name: '引力回环',     sphereN: 3, extraRate: 0.15, desc: '6面 3×3 · 环球回声',              view: '3d', sphere: true, act: 7 },
  { id: 43, name: '四方天穹',     sphereN: 4, extraRate: 0.10, desc: '6面 4×4 · 曲面迷阵',              view: '3d', sphere: true, act: 7 },
  { id: 44, name: '视界漫游',     sphereN: 4, extraRate: 0.14, desc: '6面 4×4 · 视界漫游',              view: '3d', sphere: true, act: 7 },
  { id: 45, name: '行星地幔',     sphereN: 5, extraRate: 0.12, desc: '6面 5×5 · 幽深峡谷',              view: '3d', sphere: true, act: 7 },
  { id: 46, name: '赤道裂谷',     sphereN: 5, extraRate: 0.15, desc: '6面 5×5 · 跨洋深渊',              view: '3d', sphere: true, act: 7 },
  { id: 47, name: '星核共振',     sphereN: 6, extraRate: 0.12, desc: '6面 6×6 · 巨型天体',              view: '3d', sphere: true, act: 7 },
  { id: 48, name: '日珥穹顶',     sphereN: 6, extraRate: 0.15, desc: '6面 6×6 · 盲区探巡',              view: '3d', sphere: true, act: 7 },
  { id: 49, name: '潮汐锁止',     sphereN: 7, extraRate: 0.14, desc: '6面 7×7 · 寰宇深空',              view: '3d', sphere: true, act: 7 },
  { id: 50, name: '宇宙回声奇点', sphereN: 8, extraRate: 0.16, desc: '6面 8×8 · 终极天球 (寰宇终章)',    view: '3d', sphere: true, act: 7 },
]

export const TOTAL_LEVELS = LEVELS.length

export function getLevelConfig(levelIndex) {
  return LEVELS[levelIndex] || LEVELS[0]
}

// 是否为三维渲染关卡（默认 2d）
export function isLevel3D(levelIndex) {
  return (LEVELS[levelIndex]?.view ?? '2d') === '3d'
}

// 是否为真三维立方关卡（多层升降）
export function isLevelCube(levelIndex) {
  return LEVELS[levelIndex]?.cube === true
}

// 是否为极坐标同心环关卡
export function isLevelPolar(levelIndex) {
  return LEVELS[levelIndex]?.polar === true
}

// 是否为极坐标传送折跃关卡（第六幕）
export function isLevelWarp(levelIndex) {
  return LEVELS[levelIndex]?.warp === true
}

// 是否为立体球形关卡（第七幕）
export function isLevelSphere(levelIndex) {
  return LEVELS[levelIndex]?.sphere === true
}

// 是否为本地开发/调试测试环境（localhost、127.0.0.1、局域网、DEV 模式或本地文件协议）
export const isLocalTest = typeof window !== 'undefined' && (
  import.meta.env.DEV ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.startsWith('192.168.') ||
  window.location.hostname.startsWith('10.') ||
  window.location.hostname.endsWith('.local') ||
  window.location.protocol === 'file:'
)
