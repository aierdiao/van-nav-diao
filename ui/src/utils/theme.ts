export function decodeAuto() {
  const d = new Date().getHours();
  const night = d > 18 || d < 8;
  if (typeof window == "undefined") {
    if (night) {
      return "auto-dark";
    } else {
      return "auto-light";
    }
  }
  if (night || window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "auto-dark";
  } else {
    return "auto-light";
  }
}

export const decodeTheme = (t: "auto" | "light" | "dark") => {
  if (t === "auto") {
    return decodeAuto();
  } else {
    return t;
  }
};

export const applyTheme = (t: string, source: string, disableLog: boolean) => {
  if (t.includes("light")) {
    const bodyEl = document.querySelector("body")!;
    bodyEl.classList.toggle("dark-mode", false);
    if (!disableLog) {
      console.log(`[Apply Theme][${source}] ${t}`);
    }
  } else {
    const bodyEl = document.querySelector("body")!;
    bodyEl.classList.toggle("dark-mode", true);
    if (!disableLog) {
      console.log(`[Apply Theme][${source}] ${t}`);
    }
  }
  // 主题切换后重新应用CSS变量
  reapplyThemeVars();
};

export const initTheme = () => {
  if (typeof localStorage == "undefined") {
    return "auto";
  }
  // 2 种情况：1. 自动。2.手动
  if (!("theme" in localStorage) || localStorage.theme === "auto") {
    return "auto";
  } else {
    if (localStorage.theme === "dark") {
      return "dark";
    } else {
      return "light";
    }
  }
};

/**
 * 广播主题变更事件，通知其他标签页/页面同步主题
 */
export const broadcastThemeChange = () => {
  if (typeof window !== "undefined" && window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent("theme-change"));
  }
};

// ==================== 主题美化配置相关 ====================

// 主题配置类型定义
export interface ThemeColors {
  primary: string;
  bgBase: string;
  bgCard: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
}

export interface ThemeLayout {
  cardBorderRadius: string;
  cardShadow: string;
  cardPadding: string;
  cardGap: string;
  headerHeight: string;
}

export interface ThemeTypography {
  fontFamily: string;
  titleFontSize: string;
  titleFontWeight: string;
  descFontSize: string;
}

export interface ThemeConfig {
  version: string;
  colors: ThemeColors;
  layout: ThemeLayout;
  typography: ThemeTypography;
  customCSS: string;
}

// 缓存当前主题配置
let currentThemeConfig: ThemeConfig | null = null;

// 设置当前主题配置
export const setCurrentThemeConfig = (config: ThemeConfig | null) => {
  currentThemeConfig = config;
};

// 获取当前主题配置
export const getCurrentThemeConfig = (): ThemeConfig | null => {
  return currentThemeConfig;
};

// 应用主题CSS变量到:root
export const applyThemeVars = (config: ThemeConfig) => {
  const root = document.documentElement;
  const colors = config.colors;
  
  // 应用色彩变量
  root.style.setProperty('--van-nav-primary', colors.primary);
  root.style.setProperty('--van-nav-bg-base', colors.bgBase);
  root.style.setProperty('--van-nav-bg-card', colors.bgCard);
  root.style.setProperty('--van-nav-text-primary', colors.textPrimary);
  root.style.setProperty('--van-nav-text-secondary', colors.textSecondary);
  root.style.setProperty('--van-nav-border', colors.border);
  
  // 应用布局变量
  root.style.setProperty('--van-nav-card-radius', config.layout.cardBorderRadius);
  root.style.setProperty('--van-nav-card-shadow', config.layout.cardShadow);
  root.style.setProperty('--van-nav-card-padding', config.layout.cardPadding);
  root.style.setProperty('--van-nav-card-gap', config.layout.cardGap);
  root.style.setProperty('--van-nav-header-height', config.layout.headerHeight);
  
  // 应用排版变量
  root.style.setProperty('--van-nav-font-family', config.typography.fontFamily);
  root.style.setProperty('--van-nav-title-size', config.typography.titleFontSize);
  root.style.setProperty('--van-nav-title-weight', config.typography.titleFontWeight);
  root.style.setProperty('--van-nav-desc-size', config.typography.descFontSize);
  
  // 应用自定义CSS
  let styleEl = document.getElementById('van-nav-custom-css');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'van-nav-custom-css';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = config.customCSS || '';
  
  // 缓存配置
  setCurrentThemeConfig(config);
};

// 重新应用当前缓存的主题变量（用于主题切换时）
export const reapplyThemeVars = () => {
  if (currentThemeConfig) {
    applyThemeVars(currentThemeConfig);
  }
};

// 清除自定义主题变量（恢复默认）
export const clearThemeVars = () => {
  const root = document.documentElement;
  const customProps = [
    '--van-nav-primary',
    '--van-nav-bg-base', '--van-nav-bg-card',
    '--van-nav-text-primary', '--van-nav-text-secondary', '--van-nav-border',
    '--van-nav-card-radius', '--van-nav-card-shadow', '--van-nav-card-padding',
    '--van-nav-card-gap', '--van-nav-header-height',
    '--van-nav-font-family', '--van-nav-title-size',
    '--van-nav-title-weight', '--van-nav-desc-size',
  ];
  
  customProps.forEach(prop => root.style.removeProperty(prop));
  
  // 清除自定义CSS
  const styleEl = document.getElementById('van-nav-custom-css');
  if (styleEl) {
    styleEl.textContent = '';
  }
  
  setCurrentThemeConfig(null);
};
