import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import zhCN from './zh-CN';
import enUS from './en-US';

type Language = 'zh-CN' | 'en-US';

const messages: Record<Language, Record<string, string>> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType>({
  language: 'zh-CN',
  setLanguage: () => {},
  t: (key: string) => key,
});

export const useTranslation = () => useContext(I18nContext);

// 获取浏览器首选语言
function getBrowserLang(): Language {
  const nav = navigator.language || '';
  if (nav.startsWith('en')) return 'en-US';
  return 'zh-CN';
}

// 语言降级优先级：localStorage → 浏览器 → zh-CN
function resolveInitialLang(): Language {
  const cached = localStorage.getItem('lang') as Language | null;
  if (cached && (cached === 'zh-CN' || cached === 'en-US')) return cached;
  return getBrowserLang();
}

export const I18nProvider: React.FC<{ children: ReactNode; serverLang?: string }> = ({ children, serverLang }) => {
  const [language, setLangState] = useState<Language>(() => {
    // 优先级：后端同步偏好 → localStorage → 浏览器 → zh-CN
    if (serverLang && (serverLang === 'zh-CN' || serverLang === 'en-US')) {
      return serverLang;
    }
    return resolveInitialLang();
  });

  // 后端偏好同步：当 serverLang 变化时（登录后），覆盖本地偏好
  useEffect(() => {
    if (serverLang && (serverLang === 'zh-CN' || serverLang === 'en-US') && serverLang !== language) {
      setLangState(serverLang);
      localStorage.setItem('lang', serverLang);
    }
  }, [serverLang]);

  const setLanguage = useCallback((lang: Language) => {
    setLangState(lang);
    localStorage.setItem('lang', lang);
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let text = messages[language]?.[key] || messages['zh-CN']?.[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\{${k}\}`, 'g'), String(v));
      });
    }
    return text;
  }, [language]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export type { Language };
