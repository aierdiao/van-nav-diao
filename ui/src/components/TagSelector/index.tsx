import "./index.css";
import { useCallback, useRef } from "react";
import { useTranslation } from "../../i18n";
interface TagSelectorProps {
  tags: any;
  onTagChange: (newTag: string) => void;
  currTag: string;
  customTags?: any[];
  activeCustomTag?: string;
  onCustomTagChange?: (tag: string) => void;
}
const TagSelector = (props: TagSelectorProps) => {
  const { t } = useTranslation();
  const { tags = ["all"], onTagChange, currTag, customTags = [], activeCustomTag = "", onCustomTagChange } = props;
  const lastWheelTime = useRef(0);

  // 滚轮切换分类：在分类栏区域内滚动时阻止页面滚动，切换分类
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      // 节流：防止快速滚动时过于频繁触发，150ms 内只处理一次
      const now = Date.now();
      if (now - lastWheelTime.current < 150) return;
      lastWheelTime.current = now;

      const names = tags.map((item: any) => typeof item === "string" ? item : item?.name);
      const currentIndex = names.indexOf(currTag);
      if (currentIndex === -1) return;

      let newIndex = currentIndex;
      if (e.deltaY < 0) {
        // 向上滚动 → 上一个分类
        newIndex = Math.max(0, currentIndex - 1);
      } else if (e.deltaY > 0) {
        // 向下滚动 → 下一个分类
        newIndex = Math.min(tags.length - 1, currentIndex + 1);
      }

      if (newIndex !== currentIndex) {
        onTagChange(names[newIndex]);
      }
    },
    [tags, currTag, onTagChange]
  );

  const renderTags = useCallback(() => {
    const originTags =  tags.map((item) => {
      const each = typeof item === "string" ? item : item?.name;
      // 处理空分类，显示为"未分类"
      let displayText = each;
      if (each === null || each === undefined || each === "" || (typeof each === 'string' && each.trim() === "")) {
        displayText = t('home.tag.uncategorized');
      } else if (each === '全部工具') {
        displayText = t('home.tag.allTools');
      } else if (each === '管理后台') {
        displayText = t('home.tag.admin');
      }
      
      const selectTag = () => {
        onTagChange(each);
      };

      return (
        <button
          type="button"
          data-tag-name={each}
          data-tag-slug={typeof item === "string" ? "" : item?.slug || ""}
          className={`select-tag ${
            currTag === each ? "select-tag-active" : ""
          }`}
          key={`${each}-select-tag`}
          onPointerDown={(event) => {
            if (event.pointerType === "mouse" && event.button !== 0) return;
            event.preventDefault();
            selectTag();
          }}
          onClick={selectTag}
        >
          {displayText}
        </button>
      );
    });
    return originTags;
  }, [tags, onTagChange, currTag, t]);

  const renderCustomTags = useCallback(() => {
    return customTags
      .map((item) => {
        const name = typeof item === "string" ? item : item?.name;
        if (!name || String(name).trim() === "") return null;
        const label = String(name).trim();
        const isActive = activeCustomTag.toLowerCase() === label.toLowerCase();
        return (
          <button
            type="button"
            className={`custom-tag-button ${isActive ? "custom-tag-button-active" : ""}`}
            key={`${label}-custom-tag`}
            onClick={() => onCustomTagChange?.(label)}
          >
            #{label}
          </button>
        );
      })
      .filter(Boolean);
  }, [customTags, activeCustomTag, onCustomTagChange]);

  const customTagNodes = renderCustomTags();

  return (
    <div className="tag-selector span-full" onWheel={handleWheel}>
      <div className="tag-selector-wrapper">
        {renderTags()}
      </div>
      {customTagNodes.length > 0 && (
        <div className="custom-tag-row">
          <div className="custom-tag-list">
            {customTagNodes}
          </div>
        </div>
      )}
    </div>
  );
};

export default TagSelector;
