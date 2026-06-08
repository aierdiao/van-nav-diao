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
          onChange={(ev) => {
            props.setSearchText(ev.target.value);
          }}
        ></input>
      </div>
    </div>
  );
};

export default SearchBar;
