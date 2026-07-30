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
]

export const TOTAL_LEVELS = LEVELS.length

export function getLevelConfig(levelIndex) {
  return LEVELS[levelIndex] || LEVELS[0]
}

// 是否为三维渲染关卡（默认 2d）
export function isLevel3D(levelIndex) {
  return (LEVELS[levelIndex]?.view ?? '2d') === '3d'
}
