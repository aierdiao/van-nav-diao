import { useEffect, useCallback, useRef } from "react";
import { useTranslation } from "../../i18n";
import "./index.css";

interface SearchBarProps {
  setSearchText: (t: string) => void;
  searchString: string;
}
const SearchBar = (props: SearchBarProps) => {
  const { t } = useTranslation();
  const isComposingRef = useRef(false);

  const onKeyDown = useCallback((ev: KeyboardEvent) => {
    // 输入法合成中不拦截，避免打断中文输入
    if (isComposingRef.current) return;
    const el = document.getElementById("search-bar");
    if (!el || document.activeElement === el) return;
    const reg = /[a-zA-Z0-9]|[\u4e00-\u9fa5]/g;
    if (ev.code === "Enter" || reg.test(ev.key)) {
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
          onCompositionStart={() => { isComposingRef.current = true; }}
          onCompositionEnd={(ev) => {
            isComposingRef.current = false;
            props.setSearchText(ev.currentTarget.value);
          }}
          onChange={(ev) => {
            // 输入法合成期间不触发搜索，避免 re-render 打断输入法
            if (!isComposingRef.current) {
              props.setSearchText(ev.target.value);
            }
          }}
        ></input>
      </div>
    </div>
  );
};

export default SearchBar;
