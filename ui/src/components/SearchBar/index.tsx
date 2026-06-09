import { useEffect, useRef, useCallback } from "react";
import { useTranslation } from "../../i18n";
import "./index.css";

interface SearchBarProps {
  setSearchText: (t: string) => void;
  searchString: string;
}

const SearchBar = (props: SearchBarProps) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  // 页面加载后直接聚焦搜索框，确保输入法从首次按键就正常激活
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 智能唤回：点击空白区域时自动抓回焦点，点击链接/按钮等可聚焦元素时正常放行
  const handleBlur = useCallback((ev: React.FocusEvent<HTMLInputElement>) => {
    // relatedTarget 存在 → 用户点击了可聚焦元素（<a>/<button>/<input>等）→ 放行
    // relatedTarget 为 null → 用户点击了非聚焦区域 → 抓回焦点
    if (!ev.relatedTarget) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, []);

  return (
    <div className="search span-3">
      <div className="search-wraper">
        <input
          ref={inputRef}
          id="search-bar"
          type="search"
          placeholder={t('home.search.placeholder')}
          value={props.searchString}
          onBlur={handleBlur}
          onChange={(ev) => {
            props.setSearchText(ev.target.value);
          }}
        ></input>
      </div>
    </div>
  );
};

export default SearchBar;
