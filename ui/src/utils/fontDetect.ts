/**
 * 字体检测工具
 * 通过 Canvas 检测用户系统已安装的字体
 */

// 常见字体列表（按分类）
const commonFonts = [
  // 系统默认
  { name: "系统默认", value: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", category: "系统" },
  
  // 中文字体
  { name: "苹方", value: "'PingFang SC', -apple-system, sans-serif", category: "中文", testFont: "PingFang SC" },
  { name: "微软雅黑", value: "'Microsoft YaHei', sans-serif", category: "中文", testFont: "Microsoft YaHei" },
  { name: "思源黑体", value: "'Source Han Sans CN', 'Noto Sans SC', sans-serif", category: "中文", testFont: "Source Han Sans CN" },
  { name: "思源宋体", value: "'Source Han Serif CN', 'Noto Serif SC', serif", category: "中文", testFont: "Source Han Serif CN" },
  { name: "宋体", value: "SimSun, 'Songti SC', serif", category: "中文", testFont: "SimSun" },
  { name: "黑体", value: "SimHei, 'Heiti SC', sans-serif", category: "中文", testFont: "SimHei" },
  { name: "楷体", value: "KaiTi, 'Kaiti SC', serif", category: "中文", testFont: "KaiTi" },
  { name: "仿宋", value: "FangSong, 'FangSong_GB2312', serif", category: "中文", testFont: "FangSong" },
  
  // 英文字体
  { name: "Arial", value: "Arial, Helvetica, sans-serif", category: "英文", testFont: "Arial" },
  { name: "Helvetica Neue", value: "'Helvetica Neue', Helvetica, sans-serif", category: "英文", testFont: "Helvetica Neue" },
  { name: "Times New Roman", value: "'Times New Roman', Times, serif", category: "英文", testFont: "Times New Roman" },
  { name: "Georgia", value: "Georgia, 'Times New Roman', serif", category: "英文", testFont: "Georgia" },
  { name: "Verdana", value: "Verdana, Geneva, sans-serif", category: "英文", testFont: "Verdana" },
  { name: "Tahoma", value: "Tahoma, Geneva, sans-serif", category: "英文", testFont: "Tahoma" },
  { name: "Courier New", value: "'Courier New', Courier, monospace", category: "英文", testFont: "Courier New" },
  { name: "Monaco", value: "Monaco, 'Courier New', monospace", category: "英文", testFont: "Monaco" },
];

// 字体检测缓存
let fontCache: Map<string, boolean> | null = null;

/**
 * 检测单个字体是否可用
 */
function isFontAvailable(fontName: string): boolean {
  // 使用 Canvas 检测
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return false;

  const testString = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const testFontSize = '72px';

  // 先用默认字体测量
  context.font = `${testFontSize} monospace`;
  const defaultWidth = context.measureText(testString).width;

  // 用待测字体测量
  context.font = `${testFontSize} "${fontName}", monospace`;
  const testWidth = context.measureText(testString).width;

  // 如果宽度不同，说明字体存在
  return defaultWidth !== testWidth;
}

/**
 * 检测所有可用字体
 */
export function detectAvailableFonts(): typeof commonFonts {
  if (fontCache) {
    return commonFonts.filter(f => !f.testFont || fontCache!.get(f.testFont) !== false);
  }

  fontCache = new Map();

  return commonFonts.filter(font => {
    // 系统默认始终可用
    if (!font.testFont) return true;

    const available = isFontAvailable(font.testFont);
    fontCache!.set(font.testFont, available);
    return available;
  });
}

/**
 * 获取字体分类列表
 */
export function getFontCategories(): string[] {
  const categories = new Set(commonFonts.map(f => f.category));
  return Array.from(categories);
}
