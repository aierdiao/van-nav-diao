import { useEffect, useCallback } from "react";
import { useTranslation } from "../../i18n";
import "./index.css";

interface SearchBarProps {
  setSearchText: (t: string) => void;
  searchString: string;
}
const SearchBar = (props: SearchBarProps) => {
  const { t } = useTranslation();
  const onKeyDown = useCallback((ev: KeyboardEvent) => {
    // 仅 Enter 键聚焦搜索框，不拦截字母按键
    // （避免抢在输入法 composition 之前导致中文首字符变英文）
    if (ev.code !== "Enter") return;
    const el = document.getElementById("search-bar");
    if (el && document.activeElement !== el) {
      el.focus();
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onKeyDown]);

  return (
    <div className="search span-3">
      <div className="search-wraper">
        <input
          id="search-bar"
          type="search"
          placeholder={t('home.search.placeholder')}
          value={props.searchString}
          onChange={(ev) => {
            props.setSearchText(ev.target.value);
          }}
        ></input>
      </div>
    </div>
  );
};

export default SearchBar;
