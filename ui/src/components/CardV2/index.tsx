import { useMemo, useState, useEffect } from "react";
import "./index.css";
import { getLogoUrl } from "../../utils/check";
import { getJumpTarget } from "../../utils/setting";

const FALLBACK_LOGO = "/github-mark.svg";

const normalizeTags = (value: any): string[] => {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : String(value).split(/[,，]/);
  const seen = new Set<string>();
  return raw
    .map((item) => String(item).trim())
    .filter((item) => {
      if (!item || seen.has(item.toLowerCase())) return false;
      seen.add(item.toLowerCase());
      return true;
    });
};

const Card = ({ title, url, des, logo, catelog, tags, onClick, onTagClick, index, isSearching, noImageMode, compactMode, jumpTargetBlank }: any) => {
  const [imageError, setImageError] = useState(false);

  const imageSrc = useMemo(() => {
    return url === "admin" ? logo : getLogoUrl(logo);
  }, [logo, url]);

  useEffect(() => {
    setImageError(false);

    if (!imageSrc) {
      return;
    }

    const timeout = setTimeout(() => {
      setImageError(true);
    }, 10000);

    return () => clearTimeout(timeout);
  }, [imageSrc]);

  const handleImageError = () => {
    setImageError(true);
  };

  const el = useMemo(() => {
    const displayImageSrc = imageError || !imageSrc ? FALLBACK_LOGO : imageSrc;

    return (
      <img
        src={displayImageSrc}
        alt={title}
        decoding="async"
        loading="lazy"
        onError={handleImageError}
      />
    );
  }, [imageSrc, title, imageError]);

  // 空分类不显示角标，避免迁移标签后出现大量“未分类”。
  const displayCatelog = useMemo(() => {
    return catelog === null || catelog === undefined || catelog === "" || (typeof catelog === 'string' && catelog.trim() === "") 
      ? ""
      : catelog;
  }, [catelog]);

  const displayTags = useMemo(() => normalizeTags(tags), [tags]);

  const showNumIndex = index < 10 && isSearching;
  return (
    <a
      href={url === "toggleJumpTarget" ? undefined : url}
      onClick={() => {
        onClick();
      }}
      target={getJumpTarget(jumpTargetBlank) === "blank" ? "_blank" : "_self"}
      rel="noreferrer"
      className="card-box"
    >
      {showNumIndex && <span className="card-index">{index + 1}</span>}
      <div className={`card-content ${compactMode ? 'compact-mode' : ''}`}>
        {!noImageMode && (
          <div className="card-left">
            {el}
          </div>
        )}
        <div className="card-right">
          <div className="card-right-top">
            <span className="card-right-title" title={title}>{title}</span>
          </div>
          {!compactMode && <div className="card-right-bottom" title={des}>{des}</div>}
          {!compactMode && (displayCatelog || displayTags.length > 0) && (
            <div
              className={`card-label-row ${displayTags.length > 0 ? "has-extra-labels" : "only-category"}`}
              aria-label="tool labels"
            >
              {displayCatelog && <span className="card-tag" title={displayCatelog}>{displayCatelog}</span>}
              {displayTags.map((tag) => (
                <span
                  key={tag}
                  className={`card-label card-label-clickable ${tag.toLowerCase() === "aff" ? "card-label-aff" : ""}`}
                  title={tag}
                  role="link"
                  tabIndex={0}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onTagClick?.(tag);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      onTagClick?.(tag);
                    }
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </a>
  );
};

export default Card;
