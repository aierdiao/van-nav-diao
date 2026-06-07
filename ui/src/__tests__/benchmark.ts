/**
 * 施瓦茨变换性能压测脚本 — 2000 条大样本量极限测试
 * 运行方式: cd ui && npx ts-node --project tsconfig.benchmark.json src/utils/benchmark.ts
 */

// ---- Node.js 环境 polyfill：注入 localStorage ----
if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = String(v); },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
}

import { getSearchRelevanceScore } from "../utils/searchScore";
import { getTotalScore } from "../utils/clickTracker";

// ---- 构造 2000 条模拟工具数据 ----
const mockTools: any[] = [];
for (let i = 0; i < 2000; i++) {
  mockTools.push({
    id: i,
    name: `Tool_${i}_开源项目_开发加速器_ABCDEF_${i % 10 === 0 ? 'Target' : 'Noise'}`,
    desc: `这是一个用于企业级开发的导航工具，支持快速检索、智能分类和拼音唤醒 pinyin test ${i}`,
    url: `https://github.com/mereith/nav/tool_${i}`,
    catelog: "全部工具",
    created_at: i % 5 === 0 ? "2026-06-01 10:00:00" : "2020-01-01 00:00:00",
  });
}

// ---- 测试用例集 ----
const testCases = [
  { name: "A. 英文字母精准包含", query: "target" },
  { name: "B. 多词分词 AND 检索", query: "tool target" },
  { name: "C. 纯拼音模糊检索", query: "kaifa" },
  { name: "D. 完全不匹配穿透（高危熔断测试）", query: "xyz999" },
];

console.log("==================================================");
console.log("🚀 开始执行 2000 条工具样本量下的核心检索算法压测...");
console.log(`   数据规模: ${mockTools.length} 条工具`);
console.log(`   每项迭代: 100 次 (消除 CPU 抖动)`);
console.log("==================================================");
console.log("");

testCases.forEach(tc => {
  const iterations = 100;

  // 预热 10 次，让 V8 JIT 编译器充分优化
  for (let w = 0; w < 10; w++) {
    mockTools
      .map(item => ({ item, relevanceScore: getSearchRelevanceScore(item, tc.query) }))
      .filter(node => node.relevanceScore > 0);
  }

  const start = process.hrtime.bigint();

  for (let i = 0; i < iterations; i++) {
    // 模拟 Schwartzian Transform 完整链路
    const scoredList = mockTools
      .map(item => ({ item, relevanceScore: getSearchRelevanceScore(item, tc.query) }))
      .filter(node => node.relevanceScore > 0);

    scoredList.sort((a, b) => {
      if (a.relevanceScore !== b.relevanceScore) return b.relevanceScore - a.relevanceScore;
      return getTotalScore(b.item.id, b.item.created_at) - getTotalScore(a.item.id, a.item.created_at);
    });
  }

  const end = process.hrtime.bigint();
  const totalMs = Number(end - start) / 1_000_000;
  const avgMs = totalMs / iterations;

  // 统计命中数（仅最后一次迭代的结果）
  const hitCount = mockTools
    .map(item => ({ item, relevanceScore: getSearchRelevanceScore(item, tc.query) }))
    .filter(node => node.relevanceScore > 0).length;

  const pass = avgMs < 2;
  const verdict = pass ? "✅ PASS (< 2ms)" : "❌ FAIL (≥ 2ms)";

  console.log(`📌 测试项: ${tc.name}`);
  console.log(`   搜索词: "${tc.query}"`);
  console.log(`   命中数: ${hitCount} / ${mockTools.length}`);
  console.log(`   平均单次耗时: ${avgMs.toFixed(4)} ms`);
  console.log(`   100次迭代总计: ${totalMs.toFixed(2)} ms`);
  console.log(`   性能判定: ${verdict}`);
  console.log("--------------------------------------------------");
});

console.log("");
console.log("🏁 压测完成。");
