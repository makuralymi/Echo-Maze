// 关卡配置文件
// 每个关卡的迷宫尺寸与难度参数

export const LEVELS = [
  { id: 1, name: '初探暗影', c: 8,  r: 8,  extraRate: 0.08, desc: '8×8 小试身手' },
  { id: 2, name: '回声渐远', c: 12, r: 12, extraRate: 0.10, desc: '12×12 难度提升' },
  { id: 3, name: '深海余响', c: 16, r: 16, extraRate: 0.12, desc: '16×16 注意方向' },
  { id: 4, name: '迷宫深处', c: 20, r: 20, extraRate: 0.14, desc: '20×20 小心迷失' },
  { id: 5, name: '终点之光', c: 24, r: 24, extraRate: 0.16, desc: '24×24 最终考验' },
]

export const TOTAL_LEVELS = LEVELS.length

export function getLevelConfig(levelIndex) {
  return LEVELS[levelIndex] || LEVELS[0]
}
