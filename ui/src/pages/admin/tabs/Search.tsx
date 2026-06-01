import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  message,
  Image,
  Switch,
  Spin,
  Tooltip,
  Popconfirm,
} from 'antd';
import { DragOutlined, DeleteOutlined, EditOutlined, PlusOutlined, CloudDownloadOutlined } from '@ant-design/icons';
import { DndContext } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  fetchGetAllSearchEngines,
  fetchAddSearchEngine,
  fetchUpdateSearchEngine,
  fetchDeleteSearchEngine,
  fetchUpdateSearchEnginesSort,
  fetchGetFaviconFromApi,
  fetchPageInfo,
} from '../../../utils/api';
import { clearSearchEngineCache } from '../../../utils/serachEngine';
import { useTranslation } from '../../../i18n';

interface SearchEngine {
  id: number;
  name: string;
  urlTemplate: string;
  logo: string;
  sort: number;
  enabled: boolean;
  description: string;
}

const DraggableRow = ({ children, ...props }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props['data-row-key'],
  });

  // 暗色模式下，只要存在 transform（拖拽中或动画过渡中），就显式设置背景色
  // 防止浏览器合成层（compositing layer）导致 <td> 背景色短暂丢失
  const isDarkMode = typeof document !== 'undefined' && document.body.classList.contains('dark-mode');
  const style = {
    ...props.style,
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging ? { zIndex: 9999 } : {}),
    ...(isDarkMode ? { backgroundColor: '#1a1a1a' } : {}),
  };

  const modifiedListeners = {
    ...listeners,
    onPointerDown: (e: any) => {
      if (e.target.closest('.drag-handle')) {
        listeners.onPointerDown?.(e);
      }
    }
  };

  return (
    <tr {...props} ref={setNodeRef} style={style} {...attributes} {...modifiedListeners}>
      {children}
    </tr>
  );
};

const SearchEngineManager: React.FC = () => {
  const { t } = useTranslation();
  const [engines, setEngines] = useState<SearchEngine[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingEngine, setEditingEngine] = useState<SearchEngine | null>(null);
  const [form] = Form.useForm();
  const [selectedRows, setSelectedRows] = useState<SearchEngine[]>([]);
  const [fetchingLogo, setFetchingLogo] = useState(false);
  const [fetchingInfo, setFetchingInfo] = useState(false);

  // 获取搜索引擎描述和图标
  const handleFetchInfo = async () => {
    const urlTemplate = form.getFieldValue('urlTemplate');
    if (!urlTemplate) {
      message.warning(t("admin.search.msg.fillUrlFirst"));
      return;
    }
    // 从 URL 模板中提取域名（用 URL 解析，比字符串替换更可靠）
    let baseUrl = '';
    try {
      const parsed = new URL(urlTemplate);
      baseUrl = parsed.origin + parsed.pathname;
    } catch {
      // 如果 URL 解析失败，尝试简单提取
      const clean = urlTemplate.replace('{query}', '').replace('%s', '').replace('?', '').trim();
      if (clean) {
        baseUrl = clean;
      }
    }
    if (!baseUrl) {
      message.warning(t("admin.search.msg.cannotExtractUrl"));
      return;
    }
    setFetchingInfo(true);
    try {
      // 获取 favicon
      const faviconRes = await fetchGetFaviconFromApi(baseUrl);
      if (faviconRes.success && faviconRes.logoUrl) {
        form.setFieldsValue({ logo: faviconRes.logoUrl });
      }
      // 获取描述
      const pageRes = await fetchPageInfo(baseUrl);
      if (pageRes.success) {
        const desc = pageRes.data.description || pageRes.data.title;
        if (desc) {
          form.setFieldsValue({ description: desc });
        }
      }
      message.success(t("admin.search.msg.fetchComplete"));
      clearSearchEngineCache();
    } catch (err: any) {
      message.error(t("admin.search.msg.fetchFailed") + " " + (err.response?.data?.errorMessage || err.message));
    } finally {
      setFetchingInfo(false);
    }
  };

  const loadEngines = async () => {
    try {
      setLoading(true);
      const data = await fetchGetAllSearchEngines();
      setEngines(data);
    } catch (error) {
      message.error(t("admin.search.msg.loadFailed"));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEngines();
  }, []);

  const validateUrlTemplate = (_: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error(t("admin.search.msg.enterUrlTemplate")));
    }
    if (!value.includes('{query}') && !value.includes('%s')) {
      return Promise.reject(new Error(t("admin.search.msg.urlTemplateRequired")));
    }
    return Promise.resolve();
  };

  const columns = [
    {
      title: t("admin.search.table.sort"),
      dataIndex: 'sort',
      width: 60,
      render: (_: any, record: SearchEngine) => (
        <div
          className="drag-handle"
          style={{
            cursor: 'move',
            padding: '8px',
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center'
          }}
        >
          <DragOutlined style={{ color: '#999' }} />
        </div>
      ),
    },
    {
      title: 'Logo',
      dataIndex: 'logo',
      width: 80,
      render: (logo: string, record: SearchEngine) => (
        // HTTP/dataURI用原值，文件名用根相对路径（管理页面在 /admin，相对路径会404）
        <Image 
          src={logo.startsWith('http') || logo.startsWith('data:') ? logo : '/' + logo} 
          alt={record.name} 
          width={24} 
          height={24}
          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
        />
      ),
    },
    {
      title: t("admin.search.table.name"),
      dataIndex: 'name',
      width: 120,
      ellipsis: true,
    },
    {
      title: t("admin.search.table.urlTemplate"),
      dataIndex: 'urlTemplate',
      width: 280,
      ellipsis: true,
      render: (url: string) => (<Tooltip title={url}><span>{url}</span></Tooltip>),
    },
    {
      title: t("admin.search.table.description"),
      dataIndex: 'description',
      width: 150,
      ellipsis: true,
    },
    {
      title: t("admin.search.table.enabled"),
      dataIndex: 'enabled',
      width: 80,
      render: (enabled: boolean, record: SearchEngine) => (
        <Switch checked={enabled} onChange={(checked) => handleToggleEnabled(record, checked)} />
      ),
    },
    {
      title: t("admin.search.table.action"),
      width: 120,
      render: (_: any, record: SearchEngine) => (
        <Space>
          <Button type="link" onClick={() => handleEdit(record)}>{t("admin.search.btn.edit")}</Button>
          <Popconfirm
            title={t("admin.search.confirm.deleteSingle")}
            onConfirm={() => handleDelete(record)}
          >
            <Button type="link" danger>{t("admin.search.btn.delete")}</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleToggleEnabled = async (engine: SearchEngine, enabled: boolean) => {
    try {
      await fetchUpdateSearchEngine({ ...engine, enabled });
      message.success(t("admin.search.msg.updateSuccess"));
      clearSearchEngineCache();
      loadEngines();
    } catch (error) {
      message.error(t("admin.search.msg.updateFailed"));
    }
  };

  const handleEdit = (engine: SearchEngine) => {
    setEditingEngine(engine);
    form.setFieldsValue({
      name: engine.name,
      urlTemplate: engine.urlTemplate,
      logo: engine.logo,
      description: engine.description,
    });
    setIsModalVisible(true);
  };

  const handleDelete = (engine: SearchEngine) => {
    Modal.confirm({
      title: t("admin.search.confirm.deleteSingle"),
      content: t("admin.search.confirm.deleteContent", { name: engine.name }),
      okText: t("admin.search.confirm.ok"),
      okType: 'danger',
      cancelText: t("admin.search.confirm.cancel"),
      onOk: async () => {
        try {
          await fetchDeleteSearchEngine(engine.id);
          message.success(t("admin.search.msg.deleteSuccess"));
          clearSearchEngineCache();
          loadEngines();
        } catch (error) {
          message.error(t("admin.search.msg.deleteFailed"));
        }
      },
    });
  };

  const handleBulkDelete = () => {
    if (selectedRows.length === 0) return;
    Modal.confirm({
      title: t("admin.search.confirm.bulkDelete"),
      content: t("admin.search.confirm.bulkDeleteContent", { count: selectedRows.length }),
      okText: t("admin.search.confirm.ok"),
      okType: 'danger',
      cancelText: t("admin.search.confirm.cancel"),
      onOk: async () => {
        try {
          for (const engine of selectedRows) {
            await fetchDeleteSearchEngine(engine.id);
          }
          message.success(t("admin.search.msg.deleteSuccess"));
          clearSearchEngineCache();
          setSelectedRows([]);
          loadEngines();
        } catch (error) {
          message.error(t("admin.search.msg.deleteFailed"));
        }
      },
    });
  };

  const handleAdd = () => {
    setEditingEngine(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const saveSortOrder = async (items: SearchEngine[]) => {
    try {
      const updates = items.map((item, index) => ({ id: item.id, sort: index + 1 }));
      await fetchUpdateSearchEnginesSort(updates);
      clearSearchEngineCache();
    } catch (error) {
      message.error(t("admin.search.msg.sortFailed"));
      loadEngines();
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingEngine) {
        await fetchUpdateSearchEngine({ ...values, id: editingEngine.id, enabled: editingEngine.enabled });
        message.success(t("admin.search.msg.updateSuccess"));
      } else {
        await fetchAddSearchEngine({ ...values, enabled: true });
        message.success(t("admin.search.msg.addSuccess"));
      }
      clearSearchEngineCache();
      setIsModalVisible(false);
      loadEngines();
    } catch (error) {
      console.error('Validate Failed:', error);
    }
  };

  const onDragEnd = async ({ active, over }: any) => {
    if (active.id !== over?.id) {
      const activeIndex = engines.findIndex((i) => i.id === active.id);
      const overIndex = engines.findIndex((i) => i.id === over?.id);
      const newItems = [...engines];
      const [reorderedItem] = newItems.splice(activeIndex, 1);
      newItems.splice(overIndex, 0, reorderedItem);
      const reorderedItems = newItems.map((item, index) => ({ ...item, sort: index + 1 }));
      setEngines(reorderedItems);
      await saveSortOrder(reorderedItems);
    }
  };

return (
    <>
      <Card
        title={
          <Space>
            <span>{t("admin.search.title")}</span>
            <span style={{ color: '#999', fontSize: 13 }}>{t("admin.search.total", { count: engines.length })}</span>
            {selectedRows.length > 0 && (
              <Popconfirm
                title={t("admin.search.confirm.bulkDelete")}
                onConfirm={handleBulkDelete}
              >
                <Button type="link" danger>{t("admin.search.btn.delete")} ({selectedRows.length})</Button>
              </Popconfirm>
            )}
          </Space>
        }
        extra={
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>{t("admin.search.btn.add")}</Button>
          </Space>
        }
      >
        <Spin spinning={loading}>
          <DndContext onDragEnd={onDragEnd}>
            <SortableContext items={engines.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <Table
                columns={columns}
                dataSource={engines}
                rowKey="id"
                components={{ body: { row: DraggableRow } }}
                pagination={false}
                size="middle"
                rowSelection={{
                  type: 'checkbox',
                  selectedRowKeys: selectedRows.map(r => r.id),
                  onChange: (_: React.Key[], selectedRows: SearchEngine[]) => {
                    setSelectedRows(selectedRows);
                  },
                }}
              />
            </SortableContext>
          </DndContext>
        </Spin>
      </Card>
      <Modal
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t("admin.search.form.name")} rules={[{ required: true, message: t("admin.search.form.nameRequired") }]}>
            <Input placeholder={t("admin.search.form.namePlaceholder")} />
          </Form.Item>
          <Form.Item
            name="urlTemplate"
            label={t("admin.search.form.urlTemplate")}
            extra={t("admin.search.form.urlTemplateExtra")}
            rules={[{ required: true, message: t("admin.search.msg.enterUrlTemplate") }, { validator: validateUrlTemplate }]}
          >
            <Input placeholder="https://www.google.com/search?q={query}" />
          </Form.Item>
          <Form.Item name="description" label={t("admin.search.form.description")}>
            <Input placeholder={t("admin.search.form.descHint")} />
          </Form.Item>
          <Form.Item
            name="logo"
            label={t("admin.search.form.logo")}
            rules={[
              { required: true, message: t("admin.search.msg.enterLogo") },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  const urlPattern = /^https?:\/\/.+/i;
                  const filePattern = /\.(ico|png|jpg|jpeg|gif|svg|webp)$/i;
                  if (urlPattern.test(value) || filePattern.test(value)) return Promise.resolve();
                  return Promise.reject(new Error(t("admin.search.msg.invalidLogo")));
                }
              }
            ]}
          >
            <Input placeholder={t("admin.search.form.logoPlaceholder")} />
          </Form.Item>
          <div style={{ marginBottom: 16 }}>
            <Button
              type="dashed"
              icon={<CloudDownloadOutlined />}
              loading={fetchingInfo}
              onClick={handleFetchInfo}
            >
              t("admin.search.batch.fetchDesc")
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
};

export default SearchEngineManager;
