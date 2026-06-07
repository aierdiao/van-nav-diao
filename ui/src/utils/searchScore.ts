/**
 * 搜索相关性评分模块 v2 — 分词聚合 + 亲密加分
 *
 * 算法：
 *   1. 按 \s+ 拆分搜索词为 tokens
 *   2. 每个 token 独立在 name/desc/url 中匹配，取最高维度分
 *   3. TotalSearchScore = Σ MaxScore(Token_i)
 *   4. 若原始 searchString 完整包含在 name 或 desc 中，+2000 亲密分
 *
 * 性能守则：includes 命中即返回，跳过 pinyin.match
 */

import pinyin from "pinyin-match";

/**
 * 计算单个 token 在 name/desc/url 中的最高维度分数
 * 权重分层: 精准匹配(10000) > 名称包含(5000) > 名称拼音(3000)
 *        > 描述包含(1000) > 描述拼音(500) > URL包含(200)
 *
 * 性能守则: includes 命中即返回，跳过 pinyin.match
 */
function getTokenMaxScore(
  name: string, desc: string, url: string, token: string
): number {
  // 名称匹配（最高权重）
  if (name === token) return 10000;
  if (name.includes(token)) return 5000;
  if (pinyin.match(name, token)) return 3000;

  // 描述匹配（中等权重）
  if (desc.includes(token)) return 1000;
  if (pinyin.match(desc, token)) return 500;

  // URL 匹配（最低权重）
  if (url.includes(token)) return 200;

  return 0;
}

/**
 * 多词聚合评分 — 同时承担过滤与排序双重职责
 *
 * 过滤语义: 返回 0 表示有 token 未命中 → 该工具应被过滤
 * 排序语义: 返回值越大 → 相关性越高，应排越前
 *
 * @param item         工具对象（需含 name, desc, url）
 * @param searchString 原始搜索词（未清洗）
 * @returns 分数（0 表示不匹配/有 token 未命中）
 */
export function getSearchRelevanceScore(
  item: any, searchString: string
): number {
  const tokens = searchString.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 0;

  const name = (item.name || '').toLowerCase();
  const desc = (item.desc || '').toLowerCase();
  const url  = (item.url  || '').toLowerCase();

  // 每个 token 取最高维度分，累加
  let totalScore = 0;
  for (const token of tokens) {
    const score = getTokenMaxScore(name, desc, url, token);
    if (score === 0) return 0;  // AND 逻辑：任一 token 未命中 → 整体淘汰
    totalScore += score;
  }

  // 亲密分加成：原始搜索词完整包含在 name 或 desc 中
  const original = searchString.trim().toLowerCase();
  if (original.length > 0 && (name.includes(original) || desc.includes(original))) {
    totalScore += 2000;
  }

  return totalScore;
}
