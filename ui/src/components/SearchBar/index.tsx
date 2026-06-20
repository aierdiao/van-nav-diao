import { useCallback, useEffect, useRef, type FocusEvent } from "react";
import { useTranslation } from "../../i18n";
import "./index.css";

interface SearchBarProps {
  setSearchText: (t: string) => void;
  searchString: string;
}

const SearchBar = (props: SearchBarProps) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const handleBlur = useCallback((ev: FocusEvent<HTMLInputElement>) => {
    if (!ev.relatedTarget) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, []);

  return (
    <div className="search span-full">
      <div className="search-wraper">
        <svg
          className="search-icon"
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          id="search-bar"
          type="search"
          placeholder={t('home.search.placeholder')}
          value={props.searchString}
          onBlur={handleBlur}
          onChange={(ev) => {
            const v = ev.target.value;
            props.setSearchText(v);
          }}
        />
      </div>
    </div>
  );
};

export default SearchBar;
