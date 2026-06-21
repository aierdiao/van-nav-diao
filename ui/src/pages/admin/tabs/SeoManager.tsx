import { Button, Card, Form, Input, message, Spin, Tabs, Tag, Typography } from "antd";
import { useCallback, useEffect, useState } from "react";
import { fetchUpdateCatelogSeo, fetchUpdateTagSlugSeo, fetchUpdateSetting } from "../../../utils/api";
import { useData } from "../hooks/useData";
import { useTranslation } from "../../../i18n";
import { GlobalOutlined, HomeOutlined } from "@ant-design/icons";

const { Text } = Typography;

interface SeoItem {
  id?: number;
  name: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogImage: string;
  type: "category" | "tag";
}

type SelectedTarget = SeoItem | "home" | null;

const SeoForm: React.FC<{
  item: SeoItem;
  pageTitle: string;
  onSave: (values: { metaTitle: string; metaDescription: string; metaKeywords: string; ogImage: string }) => Promise<void>;
  saving: boolean;
  t: (key: string) => string;
}> = ({ item, pageTitle, onSave, saving, t }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    form.setFieldsValue({
      metaTitle: item.metaTitle || "",
      metaDescription: item.metaDescription || "",
      metaKeywords: item.metaKeywords || "",
      ogImage: item.ogImage || "",
    });
  }, [item, form]);

  const autoTitle =
    item.type === "category"
      ? `${item.name} - ${pageTitle}`
      : `${item.name}${t("admin.seo.tagSuffix")} - ${pageTitle}`;

  const autoDesc =
    item.type === "category"
      ? `${pageTitle} 的 ${item.name} 分类页，整理相关工具和常用网址。`
      : `${pageTitle} 的 ${item.name} 标签页，整理相关工具和常用网址。`;

  return (
    <Form form={form} onFinish={onSave} labelCol={{ span: 5 }}>
      <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 8, background: "var(--ant-color-fill-quaternary, #f5f5f5)" }}>
        <div style={{ marginBottom: 6 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>{t("admin.seo.previewTitle")}</Text>
          <div style={{ fontWeight: 500, fontSize: 15, color: "#1a0dab", marginTop: 2 }}>{autoTitle}</div>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>{t("admin.seo.previewDesc")}</Text>
          <div style={{ fontSize: 13, color: "#545454", marginTop: 2 }}>{autoDesc}</div>
        </div>
      </div>

      <Form.Item label={t("admin.seo.metaTitle")} name="metaTitle" tooltip={t("admin.seo.metaTitleTooltip")}>
        <Input placeholder={t("admin.seo.metaTitlePlaceholder")} maxLength={100} showCount />
      </Form.Item>

      <Form.Item label={t("admin.seo.metaDescription")} name="metaDescription" tooltip={t("admin.seo.metaDescriptionTooltip")}>
        <Input.TextArea rows={3} placeholder={t("admin.seo.metaDescriptionPlaceholder")} showCount maxLength={300} />
      </Form.Item>

      <Form.Item label={t("admin.seo.metaKeywords")} name="metaKeywords" tooltip={t("admin.seo.metaKeywordsTooltip")}>
        <Input placeholder={t("admin.seo.metaKeywordsPlaceholder")} />
      </Form.Item>

      <Form.Item label={t("admin.seo.ogImage")} name="ogImage" tooltip={t("admin.seo.ogImageTooltip")}>
        <Input placeholder={t("admin.seo.ogImagePlaceholder")} />
      </Form.Item>

      <Form.Item wrapperCol={{ offset: 5, span: 19 }}>
        <Button type="primary" htmlType="submit" loading={saving} icon={<GlobalOutlined />}>
          {t("admin.seo.save")}
        </Button>
        <Text type="secondary" style={{ marginLeft: 12, fontSize: 12 }}>
          {t("admin.seo.saveHint")}
        </Text>
      </Form.Item>
    </Form>
  );
};

const HomeSeoForm: React.FC<{
  setting: any;
  pageTitle: string;
  onSave: (values: { metaTitle: string; metaDescription: string; metaKeywords: string; ogImage: string }) => Promise<void>;
  saving: boolean;
  t: (key: string) => string;
}> = ({ setting, pageTitle, onSave, saving, t }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    form.setFieldsValue({
      metaTitle: setting?.metaTitle || "",
      metaDescription: setting?.metaDescription || "",
      metaKeywords: setting?.metaKeywords || "",
      ogImage: setting?.ogImage || "",
    });
  }, [setting, form]);

  return (
    <Form form={form} onFinish={onSave} labelCol={{ span: 5 }}>
      <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 8, background: "var(--ant-color-fill-quaternary, #f5f5f5)" }}>
        <div style={{ marginBottom: 6 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>{t("admin.seo.previewTitle")}</Text>
          <div style={{ fontWeight: 500, fontSize: 15, color: "#1a0dab", marginTop: 2 }}>{pageTitle}</div>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>{t("admin.seo.previewDesc")}</Text>
          <div style={{ fontSize: 13, color: "#545454", marginTop: 2 }}>{t("admin.seo.homeAutoDesc")}</div>
        </div>
      </div>

      <Form.Item label={t("admin.seo.metaTitle")} name="metaTitle" tooltip={t("admin.seo.homeTitleTooltip")}>
        <Input placeholder={t("admin.seo.homeTitlePlaceholder")} maxLength={100} showCount />
      </Form.Item>

      <Form.Item label={t("admin.seo.metaDescription")} name="metaDescription" tooltip={t("admin.seo.metaDescriptionTooltip")}>
        <Input.TextArea rows={3} placeholder={t("admin.seo.homeDescPlaceholder")} showCount maxLength={300} />
      </Form.Item>

      <Form.Item label={t("admin.seo.metaKeywords")} name="metaKeywords" tooltip={t("admin.seo.metaKeywordsTooltip")}>
        <Input placeholder={t("admin.seo.metaKeywordsPlaceholder")} />
      </Form.Item>

      <Form.Item label={t("admin.seo.ogImage")} name="ogImage" tooltip={t("admin.seo.ogImageTooltip")}>
        <Input placeholder={t("admin.seo.ogImagePlaceholder")} />
      </Form.Item>

      <Form.Item wrapperCol={{ offset: 5, span: 19 }}>
        <Button type="primary" htmlType="submit" loading={saving} icon={<GlobalOutlined />}>
          {t("admin.seo.save")}
        </Button>
        <Text type="secondary" style={{ marginLeft: 12, fontSize: 12 }}>
          {t("admin.seo.saveHint")}
        </Text>
      </Form.Item>
    </Form>
  );
};

export const SeoManager: React.FC = () => {
  const { store, loading, reload } = useData();
  const { t } = useTranslation();
  const [selected, setSelected] = useState<SelectedTarget>("home");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"category" | "tag">("category");

  const pageTitle: string = store?.setting?.title || "Van Nav";

  const categories: SeoItem[] = (store?.catelogs || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    slug: c.slug || c.name,
    metaTitle: c.metaTitle || "",
    metaDescription: c.metaDescription || "",
    metaKeywords: c.metaKeywords || "",
    ogImage: c.ogImage || "",
    type: "category" as const,
  }));

  const tags: SeoItem[] = (store?.tagSlugs || []).map((ts: any) => ({
    name: ts.name,
    slug: ts.slug,
    metaTitle: ts.metaTitle || "",
    metaDescription: ts.metaDescription || "",
    metaKeywords: ts.metaKeywords || "",
    ogImage: ts.ogImage || "",
    type: "tag" as const,
  }));

  const handleTabChange = (key: string) => {
    setActiveTab(key as "category" | "tag");
    setSelected(null);
  };

  const handleSaveItem = useCallback(
    async (values: { metaTitle: string; metaDescription: string; metaKeywords: string; ogImage: string }) => {
      if (!selected || selected === "home") return;
      setSaving(true);
      try {
        if (selected.type === "category" && selected.id != null) {
          const res = await fetchUpdateCatelogSeo(selected.id, values);
          if (res?.success) { message.success(t("admin.seo.saveSuccess")); reload(); }
          else message.error(res?.errorMessage || t("admin.seo.saveFailed"));
        } else if (selected.type === "tag") {
          const res = await fetchUpdateTagSlugSeo(selected.name, values);
          if (res?.success) { message.success(t("admin.seo.saveSuccess")); reload(); }
          else message.error(res?.errorMessage || t("admin.seo.saveFailed"));
        }
      } catch (e: any) {
        message.error(t("admin.seo.saveFailed") + (e?.message || ""));
      } finally {
        setSaving(false);
      }
    },
    [selected, reload, t]
  );

  const handleSaveHome = useCallback(
    async (values: { metaTitle: string; metaDescription: string; metaKeywords: string; ogImage: string }) => {
      setSaving(true);
      try {
        const payload = { ...(store?.setting || {}), ...values };
        await fetchUpdateSetting(payload);
        message.success(t("admin.seo.saveSuccess"));
        reload();
      } catch (e: any) {
        message.error(t("admin.seo.saveFailed") + (e?.message || ""));
      } finally {
        setSaving(false);
      }
    },
    [store?.setting, reload, t]
  );

  const homeHasSeo = store?.setting?.metaTitle || store?.setting?.metaDescription || store?.setting?.metaKeywords || store?.setting?.ogImage;
  const isHomeSelected = selected === "home";

  const renderList = (items: SeoItem[]) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "4px 0" }}>
      {items.length === 0 && (
        <div style={{ padding: "24px 16px", textAlign: "center", color: "#999" }}>
          {t("admin.seo.empty")}
        </div>
      )}
      {items.map((item) => {
        const hasSeo = item.metaTitle || item.metaDescription || item.metaKeywords || item.ogImage;
        const isSelected = selected !== "home" && selected !== null &&
          selected.name === item.name && selected.type === item.type;
        return (
          <div
            key={`${item.type}-${item.name}`}
            onClick={() => setSelected(item)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              borderRadius: 8,
              cursor: "pointer",
              background: isSelected ? "var(--ant-color-primary-bg, #e6f4ff)" : "transparent",
              border: isSelected ? "1px solid var(--ant-color-primary-border, #91caff)" : "1px solid transparent",
              transition: "all 0.15s",
            }}
          >
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{item.name}</div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>/{item.slug}</div>
            </div>
            {hasSeo ? (
              <Tag color="green" style={{ fontSize: 11 }}>{t("admin.seo.customized")}</Tag>
            ) : (
              <Tag color="default" style={{ fontSize: 11 }}>{t("admin.seo.autoGen")}</Tag>
            )}
          </div>
        );
      })}
    </div>
  );

  const rightTitle = isHomeSelected
    ? <span><HomeOutlined style={{ marginRight: 8 }} />{t("admin.seo.homePage")}</span>
    : selected
      ? (
        <span>
          <GlobalOutlined style={{ marginRight: 8 }} />
          {(selected as SeoItem).name}
          <Text type="secondary" style={{ marginLeft: 8, fontSize: 13, fontWeight: 400 }}>
            {(selected as SeoItem).type === "category" ? t("admin.seo.typeCategory") : t("admin.seo.typeTag")}
          </Text>
        </span>
      )
      : t("admin.seo.selectHint");

  return (
    <Spin spinning={loading}>
      <div style={{ display: "flex", gap: 16, height: "calc(100vh - 120px)", minHeight: 400 }}>
        {/* 左侧列表 */}
        <Card
          style={{ width: 280, flexShrink: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}
          styles={{ body: { padding: 0, flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" } }}
        >
          {/* 首页固定入口 */}
          <div style={{ padding: "8px 8px 4px" }}>
            <div
              onClick={() => setSelected("home")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderRadius: 8,
                cursor: "pointer",
                background: isHomeSelected ? "var(--ant-color-primary-bg, #e6f4ff)" : "transparent",
                border: isHomeSelected ? "1px solid var(--ant-color-primary-border, #91caff)" : "1px solid transparent",
                transition: "all 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <HomeOutlined style={{ color: "#666" }} />
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{t("admin.seo.homePage")}</div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>/</div>
                </div>
              </div>
              {homeHasSeo ? (
                <Tag color="green" style={{ fontSize: 11 }}>{t("admin.seo.customized")}</Tag>
              ) : (
                <Tag color="default" style={{ fontSize: 11 }}>{t("admin.seo.autoGen")}</Tag>
              )}
            </div>
          </div>

          <div style={{ height: 1, background: "var(--ant-color-border, #f0f0f0)", margin: "0 8px" }} />

          {/* 分类/标签 tabs */}
          <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            style={{ padding: "0 12px" }}
            tabBarStyle={{ marginBottom: 0 }}
            items={[
              { key: "category", label: t("admin.seo.tab.category") },
              { key: "tag", label: t("admin.seo.tab.tag") },
            ]}
          />
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px 8px" }}>
            {activeTab === "category" ? renderList(categories) : renderList(tags)}
          </div>
        </Card>

        {/* 右侧编辑区 */}
        <Card style={{ flex: 1, overflow: "auto" }} title={rightTitle}>
          {isHomeSelected ? (
            <HomeSeoForm
              key="home"
              setting={store?.setting}
              pageTitle={pageTitle}
              onSave={handleSaveHome}
              saving={saving}
              t={t}
            />
          ) : selected ? (
            <SeoForm
              key={`${(selected as SeoItem).type}-${(selected as SeoItem).name}`}
              item={selected as SeoItem}
              pageTitle={pageTitle}
              onSave={handleSaveItem}
              saving={saving}
              t={t}
            />
          ) : (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#999" }}>
              <GlobalOutlined style={{ fontSize: 48, marginBottom: 16, display: "block" }} />
              {t("admin.seo.selectHint")}
            </div>
          )}
        </Card>
      </div>
    </Spin>
  );
};
