package service

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/mereith/nav/database"
	"github.com/mereith/nav/types"
)

// 预编译正则表达式，避免重复编译
var (
	dangerousCSSPatterns []*regexp.Regexp
)

func init() {
	// 预编译危险CSS关键字正则（使用RE2兼容语法，不使用lookahead）
	patterns := []string{
		`(?i)expression\s*\(`,      // IE expression()
		`(?i)behavior\s*:`,         // IE behavior
		`(?i)-moz-binding\s*:`,     // Firefox binding
		`(?i)@import\s+`,           // 外部样式导入
		`(?i)url\s*\(`,            // url() 调用（后续逻辑检测协议）
	}
	
	for _, pattern := range patterns {
		compiled, err := regexp.Compile(pattern)
		if err != nil {
			panic(fmt.Sprintf("编译CSS净化正则失败: %v", err))
		}
		dangerousCSSPatterns = append(dangerousCSSPatterns, compiled)
	}
}

// 默认主题配置
func getDefaultThemeConfig() types.ThemeConfig {
	return types.ThemeConfig{
		Version: "1.0",
		Colors: types.ThemeColors{
			Primary:       "#1677ff",
			BgBase:        "#f5f5f5",
			BgCard:        "#ffffff",
			TextPrimary:   "#000000e0",
			TextSecondary: "#000000a6",
			Border:        "#d9d9d9",
		},
		ColorsDark: types.ThemeColors{
			Primary:       "#1668dc",
			BgBase:        "#141414",
			BgCard:        "#1f1f1f",
			TextPrimary:   "#ffffffe0",
			TextSecondary: "#ffffffa6",
			Border:        "#424242",
		},
		Layout: types.ThemeLayout{
			CardBorderRadius: "8px",
			CardShadow:       "0 1px 2px 0 rgba(0,0,0,0.03), 0 1px 6px -1px rgba(0,0,0,0.02), 0 2px 4px 0 rgba(0,0,0,0.02)",
			CardPadding:      "16px",
			CardGap:          "12px",
			HeaderHeight:     "64px",
		},
		Typography: types.ThemeTypography{
			FontFamily:      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
			TitleFontSize:   "16px",
			TitleFontWeight: "600",
			DescFontSize:    "13px",
		},
		CustomCSS: "",
	}
}

// sanitizeCustomCSS 净化自定义CSS，过滤危险关键字
func sanitizeCustomCSS(css string) (string, error) {
	// 1. 长度校验
	if len(css) > 10240 { // 10KB
		return "", fmt.Errorf("customCSS长度超过10KB限制")
	}
	
	if css == "" {
		return "", nil
	}
	
	// 2. 危险关键字过滤（使用预编译正则）
	for _, pattern := range dangerousCSSPatterns {
		if pattern.MatchString(css) {
			// 特殊处理 url()：允许 data: 协议
			if pattern.String() == `(?i)url\s*\(` {
				// 检测所有 url() 调用，验证是否为 data: 协议
				if !isDataURL(css) {
					return "", fmt.Errorf("检测到非 data: 协议的 url() 引用，请移除外部资源引用")
				}
				continue
			}
			return "", fmt.Errorf("检测到潜在危险CSS关键字，请移除后重试")
		}
	}
	
	// 3. 去除首尾空白
	css = strings.TrimSpace(css)
	
	return css, nil
}

// isDataURL 检查CSS中的url()是否只使用data:协议
func isDataURL(css string) bool {
	// 匹配所有 url(...) 调用
	re := regexp.MustCompile(`(?i)url\s*\(\s*['"]?([^)'"]*)`)
	matches := re.FindAllStringSubmatch(css, -1)
	
	for _, match := range matches {
		if len(match) < 2 {
			continue
		}
		url := strings.TrimSpace(match[1])
		// 空url或data:协议是安全的
		if url == "" || strings.HasPrefix(strings.ToLower(url), "data:") {
			continue
		}
		// 其他协议都不允许
		return false
	}
	return true
}

// validateThemeConfig 校验主题配置的有效性
func validateThemeConfig(config *types.ThemeConfig) error {
	// 校验颜色值格式（支持6位和8位hex）
	colorPattern := regexp.MustCompile(`^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$`)
	
	// 校验亮色主题颜色
	if !colorPattern.MatchString(config.Colors.Primary) {
		return fmt.Errorf("亮色主题主色调格式无效")
	}
	if !colorPattern.MatchString(config.Colors.BgBase) {
		return fmt.Errorf("亮色主题背景色格式无效")
	}
	if !colorPattern.MatchString(config.Colors.BgCard) {
		return fmt.Errorf("亮色主题卡片背景色格式无效")
	}
	
	// 校验暗色主题颜色
	if !colorPattern.MatchString(config.ColorsDark.Primary) {
		return fmt.Errorf("暗色主题主色调格式无效")
	}
	if !colorPattern.MatchString(config.ColorsDark.BgBase) {
		return fmt.Errorf("暗色主题背景色格式无效")
	}
	if !colorPattern.MatchString(config.ColorsDark.BgCard) {
		return fmt.Errorf("暗色主题卡片背景色格式无效")
	}
	
	// 校验布局数值（使用正则提取数字）
	pxPattern := regexp.MustCompile(`^(\d+(?:\.\d+)?)px$`)
	
	if match := pxPattern.FindStringSubmatch(config.Layout.CardBorderRadius); match != nil {
		// 允许 0-50px
	} else if config.Layout.CardBorderRadius != "0" {
		return fmt.Errorf("卡片圆角格式无效，应为 0-50px")
	}
	
	return nil
}

// GetThemeConfig 获取主题配置
func GetThemeConfig() (*types.ThemeConfig, error) {
	configMap, err := database.GetThemeConfig()
	if err != nil {
		return nil, err
	}
	
	// 如果数据库中没有配置，返回默认配置
	if len(configMap) == 0 {
		defaultConfig := getDefaultThemeConfig()
		return &defaultConfig, nil
	}
	
	// 将map转换为结构体
	config := getDefaultThemeConfig() // 先填充默认值
	
	// 解析colors
	if colors, ok := configMap["colors"].(map[string]interface{}); ok {
		if v, ok := colors["primary"].(string); ok {
			config.Colors.Primary = v
		}
		if v, ok := colors["bgBase"].(string); ok {
			config.Colors.BgBase = v
		}
		if v, ok := colors["bgCard"].(string); ok {
			config.Colors.BgCard = v
		}
		if v, ok := colors["textPrimary"].(string); ok {
			config.Colors.TextPrimary = v
		}
		if v, ok := colors["textSecondary"].(string); ok {
			config.Colors.TextSecondary = v
		}
		if v, ok := colors["border"].(string); ok {
			config.Colors.Border = v
		}
	}
	
	// 解析colorsDark
	if colorsDark, ok := configMap["colorsDark"].(map[string]interface{}); ok {
		if v, ok := colorsDark["primary"].(string); ok {
			config.ColorsDark.Primary = v
		}
		if v, ok := colorsDark["bgBase"].(string); ok {
			config.ColorsDark.BgBase = v
		}
		if v, ok := colorsDark["bgCard"].(string); ok {
			config.ColorsDark.BgCard = v
		}
		if v, ok := colorsDark["textPrimary"].(string); ok {
			config.ColorsDark.TextPrimary = v
		}
		if v, ok := colorsDark["textSecondary"].(string); ok {
			config.ColorsDark.TextSecondary = v
		}
		if v, ok := colorsDark["border"].(string); ok {
			config.ColorsDark.Border = v
		}
	}
	
	// 解析layout
	if layout, ok := configMap["layout"].(map[string]interface{}); ok {
		if v, ok := layout["cardBorderRadius"].(string); ok {
			config.Layout.CardBorderRadius = v
		}
		if v, ok := layout["cardShadow"].(string); ok {
			config.Layout.CardShadow = v
		}
		if v, ok := layout["cardPadding"].(string); ok {
			config.Layout.CardPadding = v
		}
		if v, ok := layout["cardGap"].(string); ok {
			config.Layout.CardGap = v
		}
		if v, ok := layout["headerHeight"].(string); ok {
			config.Layout.HeaderHeight = v
		}
	}
	
	// 解析typography
	if typography, ok := configMap["typography"].(map[string]interface{}); ok {
		if v, ok := typography["fontFamily"].(string); ok {
			config.Typography.FontFamily = v
		}
		if v, ok := typography["titleFontSize"].(string); ok {
			config.Typography.TitleFontSize = v
		}
		if v, ok := typography["titleFontWeight"].(string); ok {
			config.Typography.TitleFontWeight = v
		}
		if v, ok := typography["descFontSize"].(string); ok {
			config.Typography.DescFontSize = v
		}
	}
	
	// 解析customCSS
	if v, ok := configMap["customCSS"].(string); ok {
		config.CustomCSS = v
	}
	
	// 解析version
	if v, ok := configMap["version"].(string); ok {
		config.Version = v
	}
	
	return &config, nil
}

// SaveThemeConfig 保存主题配置
func SaveThemeConfig(config types.ThemeConfig) error {
	// 1. 校验配置有效性
	if err := validateThemeConfig(&config); err != nil {
		return fmt.Errorf("配置校验失败: %w", err)
	}
	
	// 2. 净化自定义CSS
	sanitizedCSS, err := sanitizeCustomCSS(config.CustomCSS)
	if err != nil {
		return fmt.Errorf("自定义CSS校验失败: %w", err)
	}
	config.CustomCSS = sanitizedCSS
	
	// 3. 设置版本号
	config.Version = "1.0"
	
	// 4. 转换为map存储
	configMap := map[string]interface{}{
		"version": config.Version,
		"colors": map[string]interface{}{
			"primary":       config.Colors.Primary,
			"bgBase":        config.Colors.BgBase,
			"bgCard":        config.Colors.BgCard,
			"textPrimary":   config.Colors.TextPrimary,
			"textSecondary": config.Colors.TextSecondary,
			"border":        config.Colors.Border,
		},
		"colorsDark": map[string]interface{}{
			"primary":       config.ColorsDark.Primary,
			"bgBase":        config.ColorsDark.BgBase,
			"bgCard":        config.ColorsDark.BgCard,
			"textPrimary":   config.ColorsDark.TextPrimary,
			"textSecondary": config.ColorsDark.TextSecondary,
			"border":        config.ColorsDark.Border,
		},
		"layout": map[string]interface{}{
			"cardBorderRadius": config.Layout.CardBorderRadius,
			"cardShadow":       config.Layout.CardShadow,
			"cardPadding":      config.Layout.CardPadding,
			"cardGap":          config.Layout.CardGap,
			"headerHeight":     config.Layout.HeaderHeight,
		},
		"typography": map[string]interface{}{
			"fontFamily":      config.Typography.FontFamily,
			"titleFontSize":   config.Typography.TitleFontSize,
			"titleFontWeight": config.Typography.TitleFontWeight,
			"descFontSize":    config.Typography.DescFontSize,
		},
		"customCSS": config.CustomCSS,
	}
	
	// 5. 保存到数据库
	return database.SaveThemeConfig(configMap)
}

// ResetThemeConfig 重置主题配置为默认值
func ResetThemeConfig() error {
	return database.DeleteThemeConfig()
}

// GetThemeConfigAsMap 获取主题配置（map格式，用于导出）
func GetThemeConfigAsMap() (map[string]interface{}, error) {
	return database.GetThemeConfig()
}
