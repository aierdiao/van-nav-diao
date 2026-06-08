package types

// 默认是 0
type Setting struct {
	Id                   int    `json:"id"`
	Favicon              string `json:"favicon"`
	Title                string `json:"title"`
	GovRecord            string `json:"govRecord"`
	Logo192              string `json:"logo192"`
	Logo512              string `json:"logo512"`
	HideAdmin            bool   `json:"hideAdmin"`
	HideGithub           bool   `json:"hideGithub"`
	HideToggleJumpTarget bool   `json:"hideToggleJumpTarget"`
	JumpTargetBlank      bool   `json:"jumpTargetBlank"`
	ShowSearchEngine     bool   `json:"showSearchEngine"`
	PcColumnCount        int    `json:"pcColumnCount"`
	DeploymentVersion    string `json:"deploymentVersion"`
	Language             string `json:"language"`
}

type Token struct {
	Id       int    `json:"id"`
	Name     string `json:"name"`
	Value    string `json:"value"`
	Disabled int    `json:"disabled"`
}

type User struct {
	Id       int    `json:"id"`
	Name     string `json:"name"`
	Password string `json:"password"`
}
type Img struct {
	Id    int    `json:"id"`
	Url   string `json:"url"`
	Value string `json:"value"`
}

type Tool struct {
	Id          int    `json:"id"`
	Name        string `json:"name"`
	Url         string `json:"url"`
	Logo        string `json:"logo"`
	Catelog     string `json:"catelog"`
	Desc        string `json:"desc"`
	Sort        int    `json:"sort"`
	Hide        bool   `json:"hide"`
	IsAlive     *bool  `json:"is_alive,omitempty"`
	LastChecked string `json:"last_checked,omitempty"`
	CreatedAt   string `json:"created_at,omitempty"`
}

type Catelog struct {
	Id   int    `json:"id"`
	Name string `json:"name"`
	Sort int    `json:"sort"`
	Hide bool   `json:"hide"`
}

// 搜索引擎模型 - 使用 URL 模板方式
type SearchEngine struct {
	Id          int    `json:"id"`
	Name        string `json:"name"`
	UrlTemplate string `json:"urlTemplate"`
	Logo        string `json:"logo"`
	Sort        int    `json:"sort"`
	Enabled     bool   `json:"enabled"`
	Description string `json:"description"`
}

// 网站配置模型
type SiteConfig struct {
	Id                 int    `json:"id"`
	NoImageMode        bool   `json:"noImageMode"`
	CompactMode        bool   `json:"compactMode"`
	FaviconApiEnabled  bool   `json:"faviconApiEnabled"`
	FaviconApiTemplate string `json:"faviconApiTemplate"`
	SortByClicks       bool   `json:"sortByClicks"`
}

// WebDAV 备份配置模型
type BackupConfig struct {
	ID               int    `json:"id"`
	WebDAVURL        string `json:"webdavUrl"`
	Username         string `json:"username"`
	Password         string `json:"password"`
	BackupDir        string `json:"backupDir"`
	ScheduleType     string `json:"scheduleType"`
	ScheduleTime     string `json:"scheduleTime"`
	CronExpr         string `json:"cronExpr"`
	RetentionType    string `json:"retentionType"`
	RetentionValue   int    `json:"retentionValue"`
	LastBackupTime   string `json:"lastBackupTime,omitempty"`
	LastBackupStatus string `json:"lastBackupStatus,omitempty"`
	Enabled          bool   `json:"enabled"`
	CreatedAt        string `json:"createdAt"`
	UpdatedAt        string `json:"updatedAt"`
}

// ==================== 主题美化配置相关 ====================

// 主题色彩配置
type ThemeColors struct {
	Primary        string `json:"primary"`
	BgBase         string `json:"bgBase"`
	BgCard         string `json:"bgCard"`
	TextPrimary    string `json:"textPrimary"`
	TextSecondary  string `json:"textSecondary"`
	Border         string `json:"border"`
}

// 主题布局配置
type ThemeLayout struct {
	CardBorderRadius string `json:"cardBorderRadius"`
	CardShadow       string `json:"cardShadow"`
	CardPadding      string `json:"cardPadding"`
	CardGap          string `json:"cardGap"`
	HeaderHeight     string `json:"headerHeight"`
}

// 主题排版配置
type ThemeTypography struct {
	FontFamily    string `json:"fontFamily"`
	TitleFontSize string `json:"titleFontSize"`
	TitleFontWeight string `json:"titleFontWeight"`
	DescFontSize  string `json:"descFontSize"`
}

// 完整主题配置
type ThemeConfig struct {
	Version    string         `json:"version"`
	Colors     ThemeColors    `json:"colors"`
	ColorsDark ThemeColors    `json:"colorsDark"`
	Layout     ThemeLayout    `json:"layout"`
	Typography ThemeTypography `json:"typography"`
	CustomCSS  string         `json:"customCSS"`
}
