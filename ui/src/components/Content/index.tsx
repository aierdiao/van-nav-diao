import "./index.css";
import CardV2 from "../CardV2";
import SearchBar from "../SearchBar";
import { Loading } from "../Loading";
import { Helmet } from "react-helmet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FetchList } from "../../utils/api";
import TagSelector from "../TagSelector";
import GithubLink from "../GithubLink";
import AdminLink from "../AdminLink";
import DarkSwitch from "../DarkSwitch";
import { isLogin } from "../../utils/check";
import { generateSearchEngineCard } from "../../utils/serachEngine";
import { toggleJumpTarget, syncJumpTargetFromServer } from "../../utils/setting";
import { useTranslation } from "../../i18n";
import { batchGetTotalScores } from "../../utils/clickTracker";
import { getSearchRelevanceScore } from "../../utils/searchScore";

// 系统内置工具名称翻译映射（仅限前端硬编码的系统工具，不翻译用户数据）
const systemToolTranslations: Record<string, Record<string, string>> = {
  'zh-CN': {
    '原地跳转': '原地跳转',
    '新建窗口': '新建窗口',
    '本站管理后台': '本站管理后台',
    '管理后台': '管理后台',
    '偏好设置': '偏好设置',
    '点击切换跳转方式': '点击切换跳转方式',
    '本导航站的管理后台哦': '本导航站的管理后台哦',
  },
  'en-US': {
    '原地跳转': 'Same Tab',
    '新建窗口': 'New Tab',
    '本站管理后台': 'Admin Panel',
    '管理后台': 'Admin',
    '偏好设置': 'Settings',
    '点击切换跳转方式': 'Click to toggle jump target',
    '本导航站的管理后台哦': 'Admin panel for this navigation site',
  },
};

const Content = (props: any) => {
  const { t, language } = useTranslation();

  // 翻译系统工具名称
  const translateSystemTool = (name: string) => {
    const map = systemToolTranslations[language] || systemToolTranslations['zh-CN'];
    return map[name] || name;
  };
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [currTag, setCurrTag] = useState('全部工具');
  const [searchString, setSearchString] = useState("");
  const [val, setVal] = useState("");
  const [searchEngineCards, setSearchEngineCards] = useState<any[]>([]);
  const [isDesktop, setIsDesktop] = useState(true);

  const filteredDataRef = useRef<any>([]);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const VISIBLE_BATCH = 20;
  const [visibleCount, setVisibleCount] = useState(VISIBLE_BATCH);

  // 监听窗口大小变化
  // P3: 使用 matchMedia 替代 resize 事件，零 Forcing
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1060px)');
    setIsDesktop(mql.matches);
    const handler = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const showGithub = useMemo(() => {
    const hide = data?.setting?.hideGithub === true
    return !hide;
  }, [data])

  const showAdmin = useMemo(() => {
    const hide = data?.setting?.hideAdmin === true;
    return !hide;
  }, [data])

  // 动态计算 PC 端网格列数
  // 保持卡片大小不变，通过扩大容器 max-width 来容纳更多列
  // 原版基准: repeat(3, minmax(299.67px, 350px)), gap=20px
  const gridStyle = useMemo(() => {
    const pcCols = data?.setting?.pcColumnCount;
    if (isDesktop && pcCols && pcCols > 0 && pcCols !== 3) {
      const gap = 20;
      // 容器最大宽度 = N * 350 + (N-1) * 20
      const containerMax = pcCols * 350 + (pcCols - 1) * gap;
      return {
        gridTemplateColumns: `repeat(${pcCols}, minmax(299.67px, 350px))`,
        maxWidth: `${containerMax}px`,
        margin: '0 auto',
        justifyContent: 'center',
      } as React.CSSProperties;
    }
    return {};
  }, [isDesktop, data?.setting?.pcColumnCount]);
  
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const r = await FetchList();
      setData(r);
      // 同步服务器跳转设置到 localStorage（仅当用户未手动设置时）
      syncJumpTargetFromServer(r?.setting?.jumpTargetBlank);
      // 成功时缓存到 localStorage，断网时可恢复
      try {
        window.localStorage.setItem("van-nav-cache", JSON.stringify(r));
      } catch (e) {
        // localStorage 满或不可用时忽略
      }
      const tagInLocalStorage = window.localStorage.getItem("tag");
      if (tagInLocalStorage && tagInLocalStorage !== "") {
        if (r?.catelogs && r?.catelogs.includes(tagInLocalStorage)) {
          setCurrTag(tagInLocalStorage);
        }
      }
    } catch (e) {
      console.log(t('home.cache.networkError'), e);
      try {
        const cached = window.localStorage.getItem("van-nav-cache");
        if (cached) {
          const r = JSON.parse(cached);
          setData(r);
          console.log(t('home.cache.restored'));
        }
      } catch (cacheErr) {
        console.log(t('home.cache.failed'), cacheErr);
      }
    } finally {
      setLoading(false);
    }
  }, [setData, setLoading, setCurrTag]);
  
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 异步加载搜索引擎卡片
  useEffect(() => {
    const loadSearchEngineCards = async () => {
      // 如果管理员关闭了搜索引擎显示，清空搜索引擎卡片
      if (data?.setting?.showSearchEngine === false) {
        setSearchEngineCards([]);
        return;
      }
      try {
        const cards = await generateSearchEngineCard(searchString);
        setSearchEngineCards(cards);
      } catch (error) {
        console.error('加载搜索引擎卡片失败:', error);
        setSearchEngineCards([]);
      }
    };

    loadSearchEngineCards();
  }, [searchString, data?.setting?.showSearchEngine]);

  const handleSetCurrTag = (tag: string) => {
    setCurrTag(tag);
    // 管理后台不记录了
    if (tag !== '管理后台') {
      window.localStorage.setItem("tag", tag);
    }
    resetSearch(true);
  };

  const resetSearch = (notSetTag?: boolean) => {
    setVal("");
    setSearchString("");
    const tagInLocalStorage = window.localStorage.getItem("tag");
    if (!notSetTag && tagInLocalStorage && tagInLocalStorage !== "" && tagInLocalStorage !== '管理后台') {
      setCurrTag(tagInLocalStorage);
    }
  };

  // P1: 防抖搜索 — 300ms 延迟触发实际搜索，输入框即时响应
  const handleSetSearchText = useCallback((text: string) => {
    setVal(text);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (text.trim() !== "") {
      debounceTimerRef.current = setTimeout(() => {
        setSearchString(text.trim());
        // 搜索时滚到顶部，避免结果被sticky搜索栏遮挡
        requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
      }, 300);
    } else {
      debounceTimerRef.current = setTimeout(() => {
        resetSearch();
      }, 300);
    }
  }, []);

  // 组件卸载时清除防抖计时器，严防内存泄漏
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const filteredData = useMemo(() => {
    if (!data.tools) return [...searchEngineCards];

    // 1. 分类过滤（搜索时跳过分类，搜索全部工具）
    const categoryFiltered = searchString !== ''
      ? data.tools
      : data.tools.filter((item: any) => currTag === '全部工具' || item.catelog === currTag);

    const sortByClicks = data?.siteConfig?.sortByClicks;

    // 2. 搜索状态：Schwartzian Transform 一体化链路
    if (searchString !== '') {
      // O(N)：一次 map 完成拼音匹配 + 得分缓存，严格 N 次 getSearchRelevanceScore 调用
      const scoredList = categoryFiltered
        .map((item: any) => ({ item, relevanceScore: getSearchRelevanceScore(item, searchString) }))
        .filter((node: any) => node.relevanceScore > 0);

      // O(N log N)：纯数字标量比对，零拼音开销
      if (sortByClicks) {
        // P2: 一次性批量计算点击分，避免 sort 中 N·log(N) 次 localStorage 读取
        const scoreMap = batchGetTotalScores(scoredList.map((n: any) => n.item));
        scoredList.sort((a: any, b: any) => {
          if (a.relevanceScore !== b.relevanceScore) {
            return b.relevanceScore - a.relevanceScore;
          }
          return (scoreMap.get(b.item.id) || 0) - (scoreMap.get(a.item.id) || 0);
        });
      }

      // 还原为原生数据结构供渲染
      return [...scoredList.map((node: any) => node.item), ...searchEngineCards];
    }

    // 3. 非搜索 + 全部工具 + 智能排序开启 → 按综合得分
    if (currTag === '全部工具' && sortByClicks) {
      // P2: 批量计算一次，sort 中零 localStorage 开销
      const scoreMap = batchGetTotalScores(categoryFiltered);
      const sorted = [...categoryFiltered].sort((a: any, b: any) =>
        (scoreMap.get(b.id) || 0) - (scoreMap.get(a.id) || 0)
      );
      return [...sorted, ...searchEngineCards];
    }

    // 4. 其他 → 保持后端原始排序
    return [...categoryFiltered, ...searchEngineCards];
  }, [data, currTag, searchString, searchEngineCards]);

  useEffect(() => {
    filteredDataRef.current = filteredData
  }, [filteredData])

  useEffect(() => {
    if (searchString.trim() === "") {
      document.removeEventListener("keydown", onKeyEnter);
    } else {
      document.addEventListener("keydown", onKeyEnter);
    }
    return () => {
      document.removeEventListener("keydown", onKeyEnter);
    }
    // eslint-disable-next-line
  }, [searchString])

  const renderCardsV2 = useCallback(() => {
    // P4: 懒加载 — 只渲染 visibleCount 个卡片
    const visibleItems = filteredData.slice(0, visibleCount);
    return visibleItems.map((item: any, index: number) => {
      return (
        <CardV2
          id={item.id}
          title={translateSystemTool(item.name)}
          url={item.url}
          des={translateSystemTool(item.desc)}
          logo={item.logo}
          key={item.id}
          catelog={translateSystemTool(item.catelog)}
          index={index}
          isSearching={searchString.trim() !== ""}
          noImageMode={data?.siteConfig?.noImageMode || false}
          compactMode={data?.siteConfig?.compactMode || false}
          jumpTargetBlank={data?.setting?.jumpTargetBlank}
          onClick={() => {
            resetSearch();
            if (item.url === "toggleJumpTarget") {
              toggleJumpTarget(data?.setting?.jumpTargetBlank);
              loadData();
            }
          }}
        />
      );
    });
    // eslint-disable-next-line
  // eslint-disable-next-line
  }, [filteredData, visibleCount, searchString, data?.siteConfig?.noImageMode, data?.siteConfig?.compactMode]);

  // P4: 当 filteredData 变化时重置可见批次数量
  useEffect(() => {
    setVisibleCount(VISIBLE_BATCH);
  }, [currTag, searchString]);

  // P4: 滚动触底自动加载更多卡片（passive 事件，零性能影响）
  useEffect(() => {
    let isThrottled = false;
    const handleScroll = () => {
      if (isThrottled) return;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      if (scrollHeight - scrollTop - clientHeight < 300) {
        isThrottled = true;
        setVisibleCount((prev) => Math.min(prev + VISIBLE_BATCH, filteredData.length));
        setTimeout(() => { isThrottled = false; }, 200);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [filteredData.length]);

  const onKeyEnter = (ev: KeyboardEvent) => {
    const cards = filteredDataRef.current;
    // 使用 keyCode 防止与中文输入冲突
    if (ev.keyCode === 13) {
      if (cards && cards.length) {
        window.open(cards[0]?.url, "_blank");
        resetSearch();
      }
    }
    // 如果按了数字键 + ctrl/meta，打开对应的卡片
    if (ev.ctrlKey || ev.metaKey) {
      const num = Number(ev.key);
      if (isNaN(num)) return;
      ev.preventDefault()
      const index = Number(ev.key) - 1;
      if (index >= 0 && index < cards.length) {
        window.open(cards[index]?.url, "_blank");
        resetSearch();
      }
    }

  };

  return (
    <>
      <Helmet>
        <meta charSet="utf-8" />
        <link
          rel="icon"
          href={
            data?.setting?.favicon ?? "favicon.ico"
          }
        />
        <title>{data?.setting?.title ?? "Van Nav"}</title>
      </Helmet>
      <div className="topbar">
        <div className="content">
          <SearchBar
            searchString={val}
            setSearchText={handleSetSearchText}
          />
          <TagSelector
            tags={data?.catelogs ?? ['全部工具']}
            currTag={currTag}
            onTagChange={handleSetCurrTag}
          />
        </div>
      </div>
      <div className="content-wraper">
        <div className={`content cards ${data?.siteConfig?.compactMode ? 'compact-grid' : ''}`} style={gridStyle}>
          {loading ? <Loading></Loading> : renderCardsV2()}
        </div>
      </div>
      {data?.setting?.govRecord && (
        <div className="record-wraper">
          <a href="https://beian.miit.gov.cn" target="_blank" rel="noreferrer">{data.setting.govRecord}</a>
        </div>
      )}
      <div className="floating-actions">
        {showAdmin && <AdminLink jumpTargetBlank={data?.setting?.jumpTargetBlank} />}
        {showGithub && <GithubLink />}
        <DarkSwitch showGithub={showGithub} />
      </div>
    </>
  );
};

export default Content;
