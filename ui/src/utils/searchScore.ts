/**
 * 搜索相关性评分模块
 * 
 * 分层权重: 精准匹配 > 名称包含 > 名称拼音 > 描述包含 > 描述拼音 > URL 包含
 * 用于在搜索状态下作为主排序键，确保文本匹配相关性具有绝对优先权。
 */

import pinyin from "pinyin-match";

/**
 * 计算单条工具与搜索关键字的相关性分数
 * @returns 分数（越高越相关），0 表示不匹配
 */
export function getSearchRelevanceScore(item: any, searchString: string): number {
  const search = searchString.toLowerCase();
  const name = (item.name || '').toLowerCase();
  const desc = (item.desc || '').toLowerCase();
  const url  = (item.url  || '').toLowerCase();

  let score = 0;

  // 名称匹配（最高权重）
  if (name === search) {
    score += 10000;               // 精准匹配
  } else if (name.includes(search)) {
    score += 5000;                // 包含
  } else if (pinyin.match(name, search)) {
    score += 3000;                // 拼音匹配
  }

  // 描述匹配（中等权重）
  if (desc.includes(search)) {
    score += 1000;
  } else if (pinyin.match(desc, search)) {
    score += 500;
  }

  // URL 匹配（最低权重）
  if (url.includes(search)) {
    score += 200;
  }

  return score;
}
