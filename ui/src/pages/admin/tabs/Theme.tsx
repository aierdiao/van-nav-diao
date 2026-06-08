import { Button, Card, ColorPicker, Form, Input, message, Modal, Select, Space, Spin } from "antd";
import type { Color } from "antd/es/color-picker";
import { useCallback, useEffect, useState } from "react";
import { fetchGetTheme, fetchUpdateTheme, fetchResetTheme } from "../../../utils/api";
import { applyThemeVars, clearThemeVars, type ThemeConfig } from "../../../utils/theme";
import { BgColorsOutlined, ReloadOutlined, SaveOutlined } from "@ant-design/icons";
import { useTranslation } from '../../../i18n';

// 预设主题
const presetThemes: Record<string, { name: string; config: ThemeConfig }> = {
  default: {
    name: "经典蓝",
    config: {
      version: "1.0",
      colors: {
        primary: "#1677ff",
        bgBase: "#f0f2f5",
        bgCard: "#ffffff",
        textPrimary: "#1f1f1f",
        textSecondary: "#666666",
        border: "#e8e8e8",
      },
            layout: {
        cardBorderRadius: "8px",
        cardShadow: "0 1px 2px rgba(0,0,0,0.03), 0 1px 6px rgba(0,0,0,0.02)",
        cardPadding: "16px",
        cardGap: "16px",
      },
      typography: {
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        titleFontSize: "15px",
        titleFontWeight: "600",
        descFontSize: "13px",
      },
      customCSS: "",
    },
  },
  techPurple: {
    name: "科技紫",
    config: {
      version: "1.0",
      colors: {
        primary: "#722ed1",
        bgBase: "#f9f0ff",
        bgCard: "#ffffff",
        textPrimary: "#1f1f1f",
        textSecondary: "#666666",
        border: "#d3adf7",
      },
            layout: {
        cardBorderRadius: "8px",
        cardShadow: "0 1px 2px rgba(0,0,0,0.03), 0 1px 6px rgba(0,0,0,0.02)",
        cardPadding: "16px",
        cardGap: "16px",
      },
      typography: {
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        titleFontSize: "15px",
        titleFontWeight: "600",
        descFontSize: "13px",
      },
      customCSS: "",
    },
  },
  minimalGray: {
    name: "极简灰",
    config: {
      version: "1.0",
      colors: {
        primary: "#434343",
        bgBase: "#f7f7f7",
        bgCard: "#ffffff",
        textPrimary: "#262626",
        textSecondary: "#8c8c8c",
        border: "#e0e0e0",
      },
            layout: {
        cardBorderRadius: "8px",
        cardShadow: "0 1px 2px rgba(0,0,0,0.03), 0 1px 6px rgba(0,0,0,0.02)",
        cardPadding: "16px",
        cardGap: "16px",
      },
      typography: {
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        titleFontSize: "15px",
        titleFontWeight: "600",
        descFontSize: "13px",
      },
      customCSS: "",
    },
  },
  forestGreen: {
    name: "自然绿",
    config: {
      version: "1.0",
      colors: {
        primary: "#389e0d",
        bgBase: "#f6ffed",
        bgCard: "#ffffff",
        textPrimary: "#1f1f1f",
        textSecondary: "#666666",
        border: "#b7eb8f",
      },
            layout: {
        cardBorderRadius: "8px",
        cardShadow: "0 1px 2px rgba(0,0,0,0.03), 0 1px 6px rgba(0,0,0,0.02)",
        cardPadding: "16px",
        cardGap: "16px",
      },
      typography: {
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        titleFontSize: "15px",
        titleFontWeight: "600",
        descFontSize: "13px",
      },
      customCSS: "",
    },
  },
  sunsetOrange: {
    name: "日落橙",
    config: {
      version: "1.0",
      colors: {
        primary: "#d46b08",
        bgBase: "#fff7e6",
        bgCard: "#ffffff",
        textPrimary: "#1f1f1f",
        textSecondary: "#666666",
        border: "#ffd591",
      },
            layout: {
        cardBorderRadius: "8px",
        cardShadow: "0 1px 2px rgba(0,0,0,0.03), 0 1px 6px rgba(0,0,0,0.02)",
        cardPadding: "16px",
        cardGap: "16px",
      },
      typography: {
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        titleFontSize: "15px",
        titleFontWeight: "600",
        descFontSize: "13px",
      },
      customCSS: "",
    },
  },
  sakuraPink: {
    name: "樱花粉",
    config: {
      version: "1.0",
      colors: {
        primary: "#eb2f96",
        bgBase: "#fff0f6",
        bgCard: "#ffffff",
        textPrimary: "#1f1f1f",
        textSecondary: "#666666",
        border: "#ffadd2",
      },
            layout: {
        cardBorderRadius: "8px",
        cardShadow: "0 1px 2px rgba(0,0,0,0.03), 0 1px 6px rgba(0,0,0,0.02)",
        cardPadding: "16px",
        cardGap: "16px",
      },
      typography: {
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        titleFontSize: "15px",
        titleFontWeight: "600",
        descFontSize: "13px",
      },
      customCSS: "",
    },
  },
};

// 辅助函数：将 Color 对象或字符串转换为 hex 字符串
const colorToHex = (color: any, defaultVal: string): string => {
  if (!color) return defaultVal;
  if (typeof color === 'string') return color;
  if (color.toHexString) return color.toHexString();
  if (color.metaColor) {
    const { r, g, b, a } = color.metaColor;
    if (a === 1) {
      return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    }
    return '#' + [r, g, b, Math.round(a * 255)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  return defaultVal;
};

export interface ThemeProps {}

export const Theme: React.FC<ThemeProps> = () => {
  const { t: _t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDark, setIsDark] = useState(() => document.body.classList.contains("dark-mode"));

  // 监听主题变化
  useEffect(() => {
    const check = () => setIsDark(document.body.classList.contains("dark-mode"));
    check();
    window.addEventListener("theme-change", check);
    return () => window.removeEventListener("theme-change", check);
  }, []);

  // 加载主题配置
  const loadThemeConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchGetTheme();
      if (res?.success && res?.data) {
        form.setFieldsValue(res.data);
      }
    } catch (err) {
      console.error("加载主题配置失败:", err);
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    loadThemeConfig();
  }, [loadThemeConfig]);

  // 保存主题配置
  const handleSave = useCallback(async (values: any) => {
    setSaving(true);
    try {
      // 转换颜色值为字符串（处理 ColorPicker 返回的 Color 对象）
      const config = {
        ...values,
        colors: {
          primary: colorToHex(values.colors?.primary, "#1677ff"),
          bgBase: colorToHex(values.colors?.bgBase, "#f5f5f5"),
          bgCard: colorToHex(values.colors?.bgCard, "#ffffff"),
          textPrimary: colorToHex(values.colors?.textPrimary, "#000000e0"),
          textSecondary: colorToHex(values.colors?.textSecondary, "#000000a6"),
          border: colorToHex(values.colors?.border, "#d9d9d9"),
        },
        layout: {
          cardBorderRadius: values.layout?.cardBorderRadius || "8px",
          cardShadow: values.layout?.cardShadow || "0 1px 2px rgba(0,0,0,0.03), 0 1px 6px rgba(0,0,0,0.02)",
          cardPadding: values.layout?.cardPadding || "16px",
          cardGap: values.layout?.cardGap || "16px",
        },
        typography: values.typography || {},
        customCSS: values.customCSS || "",
      };

      const res = await fetchUpdateTheme(config);
      if (res?.success) {
        message.success("主题配置已保存");
        // 重新拉取最新主题配置并应用
        const themeRes = await fetchGetTheme();
        if (themeRes?.success && themeRes?.data) {
          applyThemeVars(themeRes.data);
        }
      } else {
        message.error(res?.errorMessage || "保存失败");
      }
    } catch (err: any) {
      message.error("保存失败: " + (err.message || "未知错误"));
    } finally {
      setSaving(false);
    }
  }, []);

  // 重置为主题默认值
  const handleReset = useCallback(() => {
    Modal.confirm({
      title: "重置主题",
      content: "确定要重置为默认主题吗？当前的所有自定义配置将丢失。",
      okText: "确定重置",
      cancelText: "取消",
      okType: "danger",
      onOk: async () => {
        try {
          const res = await fetchResetTheme();
          if (res?.success) {
            message.success("已重置为默认主题");
            clearThemeVars();
            loadThemeConfig();
          } else {
            message.error(res?.errorMessage || "重置失败");
          }
        } catch (err: any) {
          message.error("重置失败: " + (err.message || "未知错误"));
        }
      },
    });
  }, [loadThemeConfig]);

  // 应用预设主题（仅填充表单，不写入数据库）
  const handleApplyPreset = useCallback((presetName: string) => {
    const preset = presetThemes[presetName];
    if (preset) {
      form.setFieldsValue(preset.config);
      message.info(`已应用「${preset.name}」预设主题，请点击「保存配置」生效`);
    }
  }, [form]);

  return (
    <div className="overflow-auto">
      <Spin spinning={loading}>
        {/* 预设主题选择 */}
        <Card
          title={
            <span>
              <BgColorsOutlined style={{ marginRight: 8 }} />
              预设主题
            </span>
          }
          style={{ marginBottom: 24 }}
          extra={<span style={{ fontSize: 12, color: '#999' }}>点击预设可快速填充配置，需手动保存生效</span>}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {Object.entries(presetThemes).map(([key, preset]) => (
              <Button
                key={key}
                onClick={() => handleApplyPreset(key)}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    backgroundColor: preset.config.colors.primary,
                  }}
                />
                {preset.name}
              </Button>
            ))}
          </div>
        </Card>

        <Form
          form={form}
          onFinish={handleSave}
          layout="vertical"
          initialValues={{
            version: "1.0",
            colors: {
              primary: "#1677ff",
              bgBase: "#f5f5f5",
              bgCard: "#ffffff",
              textPrimary: "#000000e0",
              textSecondary: "#000000a6",
              border: "#d9d9d9",
            },
                  layout: {
        cardBorderRadius: "8px",
        cardShadow: "0 1px 2px rgba(0,0,0,0.03), 0 1px 6px rgba(0,0,0,0.02)",
        cardPadding: "16px",
        cardGap: "16px",
      },
      typography: {
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        titleFontSize: "15px",
        titleFontWeight: "600",
        descFontSize: "13px",
      },
      customCSS: "",
          }}
        >
          {/* 主题色彩配置 */}
          <Card title="主题色彩" style={{ marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              <Form.Item name={["colors", "primary"]} label="主色调">
                <ColorPicker showText />
              </Form.Item>
              <Form.Item name={["colors", "bgBase"]} label="页面背景色">
                <ColorPicker showText />
              </Form.Item>
              <Form.Item name={["colors", "bgCard"]} label="卡片背景色">
                <ColorPicker showText />
              </Form.Item>
              <Form.Item name={["colors", "textPrimary"]} label="主文字颜色">
                <ColorPicker showText />
              </Form.Item>
              <Form.Item name={["colors", "textSecondary"]} label="次文字颜色">
                <ColorPicker showText />
              </Form.Item>
              <Form.Item name={["colors", "border"]} label="边框颜色">
                <ColorPicker showText />
              </Form.Item>
            </div>
          </Card>

          {/* 布局配置 */}
          <Card title="布局调整" style={{ marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              <Form.Item name={["layout", "cardBorderRadius"]} label="卡片圆角">
                <Input placeholder="8px" />
              </Form.Item>
              <Form.Item name={["layout", "cardPadding"]} label="卡片内边距">
                <Input placeholder="16px" />
              </Form.Item>
              <Form.Item name={["layout", "cardGap"]} label="卡片间距">
                <Input placeholder="12px" />
              </Form.Item>
            </div>
            <Form.Item name={["layout", "cardShadow"]} label="卡片阴影">
              <Select
                options={[
                  { label: "无阴影", value: "none" },
                  { label: "轻微阴影", value: "0 1px 2px rgba(0,0,0,0.03), 0 1px 6px rgba(0,0,0,0.02)" },
                  { label: "柔和阴影", value: "0 2px 8px rgba(0,0,0,0.08)" },
                  { label: "明显阴影", value: "0 4px 16px rgba(0,0,0,0.12)" },
                ]}
              />
            </Form.Item>
          </Card>

          {/* 排版配置 */}
          <Card title="排版设置" style={{ marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              <Form.Item name={["typography", "titleFontSize"]} label="标题字号">
                <Input placeholder="16px" />
              </Form.Item>
              <Form.Item name={["typography", "titleFontWeight"]} label="标题字重">
                <Select
                  options={[
                    { label: "正常 (400)", value: "400" },
                    { label: "中等 (500)", value: "500" },
                    { label: "半粗 (600)", value: "600" },
                    { label: "粗体 (700)", value: "700" },
                  ]}
                />
              </Form.Item>
              <Form.Item name={["typography", "descFontSize"]} label="描述字号">
                <Input placeholder="13px" />
              </Form.Item>
            </div>
            <Form.Item name={["typography", "fontFamily"]} label="字体族">
              <Select
                options={[
                  { label: "系统默认", value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
                  { label: "苹方 (Mac)", value: "'PingFang SC', -apple-system, sans-serif" },
                  { label: "微软雅黑", value: "'Microsoft YaHei', 'PingFang SC', sans-serif" },
                  { label: "思源黑体", value: "'Source Han Sans CN', 'Noto Sans SC', sans-serif" },
                ]}
              />
            </Form.Item>
          </Card>

          {/* 自定义CSS */}
          <Card
            title="自定义CSS"
            style={{ marginBottom: 24 }}
            extra={<span style={{ fontSize: 12, color: '#ff4d4f' }}>⚠️ 高级功能，最大10KB</span>}
          >
            <Form.Item
              name="customCSS"
              rules={[
                {
                  validator: (_, value) => {
                    if (value && value.length > 10240) {
                      return Promise.reject(new Error("自定义CSS长度不能超过10KB"));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input.TextArea
                rows={6}
                placeholder={`/* 在此输入自定义CSS */\n.card-box {\n  /* 自定义样式 */\n}`}
                style={{ fontFamily: 'monospace' }}
              />
            </Form.Item>
            <div style={{ fontSize: 12, color: '#999' }}>
              <p>⚠️ 注意事项：</p>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>自定义CSS优先级最高，可能覆盖上述配置</li>
                <li>禁止使用 expression()、behavior 等危险关键字</li>
                <li>禁止使用非 data: 协议的 url() 引用外部资源</li>
              </ul>
            </div>
          </Card>

          {/* 操作按钮 */}
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} size="large">
                保存配置
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset} size="large">
                重置默认
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Spin>
    </div>
  );
};
