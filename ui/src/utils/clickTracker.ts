/**
 * 点击追踪模块 — 纯 localStorage 实现
 * 
 * 算法：时间衰减加权（半衰期 30 天）+ 14 天冷启动曝光分
 * 
 * 存储键: van_nav_clicks
 * 数据结构: { [toolId: number]: { score: number, lastClick: number } }
 */

const STORAGE_KEY = 'van_nav_clicks';
const HALF_LIFE_MS = 30 * 24 * 60 * 60 * 1000; // 30 天
const DECAY = 0.5;
const NEWBIE_PERIOD_DAYS = 14;
const BOOST_BASE = 8;

interface ClickEntry {
  score: number;
  lastClick: number;
}

interface ClickMap {
  [toolId: string]: ClickEntry;
}

/** 从 localStorage 读取点击数据 */
function loadClicks(): ClickMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // localStorage 不可用或数据损坏时静默降级
  }
  return {};
}

/** 写入 localStorage */
function saveClicks(clicks: ClickMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clicks));
  } catch {
    // localStorage 满或不可用时静默降级
  }
}

/** 记录一次点击（衰减旧分 + 叠加新分） */
export function recordClick(toolId: number): void {
  const now = Date.now();
  const clicks = loadClicks();
  const key = String(toolId);
  const entry = clicks[key] || { score: 0, lastClick: now };

  // 将旧分数衰减到当前时刻，再 +1
  const elapsed = (now - entry.lastClick) / HALF_LIFE_MS;
  entry.score = entry.score * Math.pow(DECAY, elapsed) + 1;
  entry.lastClick = now;

  clicks[key] = entry;
  saveClicks(clicks);
}

/**
 * 计算工具的综合得分 = 点击衰减分 + 冷启动曝光分
 * @param toolId 工具 ID
 * @param createdAt 工具创建时间（ISO 字符串），可选
 * @returns 综合得分（只读，不修改 localStorage）
 */
export function getTotalScore(toolId: number, createdAt?: string): number {
  // ① 点击衰减分
  const clicks = loadClicks();
  const entry = clicks[String(toolId)];
  let clickScore = 0;
  if (entry) {
    const elapsed = (Date.now() - entry.lastClick) / HALF_LIFE_MS;
    clickScore = entry.score * Math.pow(DECAY, elapsed);
  }

  // ② 冷启动曝光分（仅 14 天内的新工具）
  let newbieBoost = 0;
  if (createdAt) {
    const createdTime = new Date(createdAt).getTime();
    if (!isNaN(createdTime)) {
      const ageDays = (Date.now() - createdTime) / (24 * 60 * 60 * 1000);
      if (ageDays >= 0 && ageDays < NEWBIE_PERIOD_DAYS) {
        newbieBoost = BOOST_BASE * (1 - ageDays / NEWBIE_PERIOD_DAYS);
      }
    }
  }

  return clickScore + newbieBoost;
}

/**
 * 批量计算综合得分 — 一次性读取 localStorage，避免 sort 中 N·log(N) 次重复读取
 * @param items 工具列表（需含 id 和可选 created_at）
 * @returns Map<toolId, totalScore> 与单条 getTotalScore 计算结果完全一致
 */
export function batchGetTotalScores(
  items: { id: number; created_at?: string }[]
): Map<number, number> {
  const clicks = loadClicks();
  const now = Date.now();
  const result = new Map<number, number>();

  for (const item of items) {
    const entry = clicks[String(item.id)];
    let clickScore = 0;
    if (entry) {
      const elapsed = (now - entry.lastClick) / HALF_LIFE_MS;
      clickScore = entry.score * Math.pow(DECAY, elapsed);
    }

    let newbieBoost = 0;
    if (item.created_at) {
      const createdTime = new Date(item.created_at).getTime();
      if (!isNaN(createdTime)) {
        const ageDays = (now - createdTime) / (24 * 60 * 60 * 1000);
        if (ageDays >= 0 && ageDays < NEWBIE_PERIOD_DAYS) {
          newbieBoost = BOOST_BASE * (1 - ageDays / NEWBIE_PERIOD_DAYS);
        }
      }
    }

    result.set(item.id, clickScore + newbieBoost);
  }
  return result;
}
