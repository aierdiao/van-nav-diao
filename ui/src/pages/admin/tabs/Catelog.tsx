import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  message,
  Popconfirm,
  Space,
  Spin,
  Table,
  Tooltip,
  Switch,
} from "antd";
import { QuestionCircleOutlined, DragOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useState } from "react";
import {
  fetchAddCateLog,
  fetchDeleteCatelog,
  fetchUpdateCateLog,
  fetchUpdateCatelogsSort,
} from "../../../utils/api";
import { useData } from "../hooks/useData";
import { useTranslation } from "../../../i18n";
import { DndContext } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CatelogItem {
  id: number;
  name: string;
  sort: number;
  hide: boolean;
}

const DraggableRow = ({ children, ...props }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
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

export interface CatelogProps {}
export const Catelog: React.FC<CatelogProps> = (props) => {
  const { t } = useTranslation();
  const { store, loading, reload } = useData();
  const [requestLoading, setRequestLoading] = useState(false);
  const [addForm] = Form.useForm();
  const [updateForm] = Form.useForm();
  const [showAddModel, setShowAddModel] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedRows, setSelectRows] = useState<CatelogItem[]>([]);
  const [dataSource, setDataSource] = useState<CatelogItem[]>([]);

  // 从 store 同步 dataSource
  useEffect(() => {
    if (store?.catelogs) {
      setDataSource([...store.catelogs].sort((a: any, b: any) => a.sort - b.sort));
    }
  }, [store?.catelogs]);

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await fetchDeleteCatelog(id);
        message.success(t("admin.catelog.msg.deleteSuccess"));
      } catch (err) {
        message.warning(t("admin.catelog.msg.deleteFailed"));
      } finally {
        reload();
      }
    },
    [reload]
  );

  const handleCreate = useCallback(
    async (record: any) => {
      try {
        await fetchAddCateLog(record);
        message.success(t("admin.catelog.msg.addSuccess"));
      } catch (err) {
        message.warning(t("admin.catelog.msg.addFailed"));
      } finally {
        setShowAddModel(false);
        reload();
      }
    },
    [reload, setShowAddModel]
  );

  const handleUpdate = useCallback(
    async (record: any) => {
      setRequestLoading(true);
      try {
        await fetchUpdateCateLog(record);
        message.success(t("admin.catelog.msg.updateSuccess"));
        setTimeout(() => {
          reload();
        }, 3000);
      } catch (err) {
        message.warning(t("admin.catelog.msg.updateFailed"));
      } finally {
        setRequestLoading(false);
        setShowEdit(false);
        reload();
      }
    },
    [reload, setShowEdit, setRequestLoading]
  );

  const handleToggleHide = async (record: CatelogItem, hide: boolean) => {
    try {
      await fetchUpdateCateLog({ ...record, hide });
      message.success(t("admin.catelog.msg.updateSuccess"));
      reload();
    } catch (error) {
      message.error(t("admin.catelog.msg.updateFailed"));
    }
  };

  const handleBulkDelete = useCallback(async () => {
    try {
      for (const each of selectedRows) {
        try {
          await fetchDeleteCatelog(each.id);
        } catch (err) {}
      }
      message.success(t("admin.catelog.msg.deleteSuccess"));
    } catch (err) {
      message.success(t("admin.catelog.msg.deleteFailed"));
    } finally {
      setSelectRows([]);
      reload();
    }
  }, [reload, selectedRows]);

  const onDragEnd = async ({ active, over }: any) => {
    if (active.id !== over?.id) {
      const activeIndex = dataSource.findIndex((i) => i.id === active.id);
      const overIndex = dataSource.findIndex((i) => i.id === over?.id);
      const newItems = [...dataSource];
      const [reorderedItem] = newItems.splice(activeIndex, 1);
      newItems.splice(overIndex, 0, reorderedItem);

      const reorderedItems = newItems.map((item, index) => ({
        ...item,
        sort: index + 1,
      }));

      setDataSource(reorderedItems);

      try {
        const updates = reorderedItems.map((item, index) => ({
          id: item.id,
          sort: index + 1,
        }));
        await fetchUpdateCatelogsSort(updates);
        message.success('排序已更新');
      } catch (error) {
        message.error('排序更新失败');
        reload();
      }
    }
  };

  return (
    <Card
      title={
        <Space>
          <span>{t("admin.catelog.title")}</span>
          <span style={{ color: '#999', fontSize: 13 }}>{t("admin.catelog.total", { count: store?.catelogs?.length ?? 0 })}</span>
          {selectedRows.length > 0 && (
            <Popconfirm
              title={t("admin.catelog.confirm.bulkDelete")}
              onConfirm={() => handleBulkDelete()}
            >
              <Button type="link" danger>删除 ({selectedRows.length})</Button>
            </Popconfirm>
          )}
        </Space>
      }
      extra={
        <Space>
          <Button
            type="primary"
            onClick={() => {
              setShowAddModel(true);
            }}
          >
            t("admin.catelog.btn.add")
          </Button>
          <Button
            type="primary"
            onClick={() => {
              reload();
            }}
          >
            刷新
          </Button>
        </Space>
      }
    >
      <Spin spinning={loading}>
        <DndContext onDragEnd={onDragEnd}>
          <SortableContext
            items={dataSource.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <Table
              dataSource={dataSource}
              rowKey="id"
              size="small"
              components={{
                body: {
                  row: DraggableRow,
                },
              }}
              rowSelection={{
                type: 'checkbox',
                onChange: (selectedRowKeys: React.Key[], selectedRows: CatelogItem[]) => {
                  setSelectRows(selectedRows);
                },
              }}
              pagination={{
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50'],
                defaultPageSize: 10,
                showTotal: (total) => `共 ${total} 条`,
              }}
            >
              <Table.Column
                title={<div style={{ textAlign: 'center' }}>排序</div>}
                dataIndex="sort"
                width={60}
                render={(_: any, record: CatelogItem) => (
                  <div
                    className="drag-handle"
                    style={{
                      cursor: 'move',
                      padding: '8px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    <DragOutlined style={{ color: '#999' }} />
                  </div>
                )}
              />
              
              <Table.Column
                title={t("admin.catelog.table.name")}
                dataIndex="name"
                width={150}
              />
              <Table.Column
                title={
                  <span>
                    隐藏
                    <Tooltip title={t("admin.catelog.form.hideHint")}>
                      <QuestionCircleOutlined style={{ marginLeft: "5px" }} />
                    </Tooltip>
                  </span>
                }
                dataIndex="hide"
                width={60}
                render={(val: boolean, record: CatelogItem) => (
                  <Switch
                    checked={Boolean(val)}
                    onChange={(checked) => handleToggleHide(record, checked)}
                  />
                )}
              />
              <Table.Column
                title={t("admin.catelog.table.action")}
                width={120}
                dataIndex="action"
                key="action"
                render={(_: any, record: CatelogItem) => {
                  return (
                    <Space>
                      <Button
                        type="link"
                        onClick={() => {
                          updateForm.setFieldsValue(record);
                          setShowEdit(true);
                        }}
                      >
                        修改
                      </Button>
                      <Popconfirm
                        onConfirm={() => {
                          handleDelete(record.id);
                        }}
                        title={t("admin.catelog.confirm.delete", { name: record.name })}
                      >
                        <Button type="link" danger>删除</Button>
                      </Popconfirm>
                    </Space>
                  );
                }}
              />
            </Table>
          </SortableContext>
        </DndContext>
      </Spin>
      <Modal
        open={showAddModel}
        title={t("admin.catelog.modal.add")}
        onCancel={() => {
          setShowAddModel(false);
        }}
        onOk={() => {
          const values = addForm?.getFieldsValue();
          handleCreate(values);
        }}
      >
        <Form form={addForm}>
          <Form.Item name="name" required label="名称" labelCol={{ span: 4 }}>
            <Input placeholder={t("admin.catelog.form.name")} />
          </Form.Item>
          <Form.Item
            name="sort"
            required
            initialValue={1}
            label={
              <span>
                <Tooltip title={t("admin.catelog.form.sortHint")}>
                  <QuestionCircleOutlined style={{ marginLeft: "5px" }} />
                </Tooltip>
                &nbsp;排序
              </span>
            }
            labelCol={{ span: 4 }}
          >
            <InputNumber
              placeholder={t("admin.catelog.form.sort")}
              type="number"
              defaultValue={1}
            />
          </Form.Item>
          <Form.Item
            name="hide"
            initialValue={false}
            required
            label={
              <span>
                <Tooltip title={t("admin.catelog.form.hideHint")}>
                  <QuestionCircleOutlined style={{ marginLeft: "5px" }} />
                </Tooltip>
                &nbsp;隐藏
              </span>
            }
            labelCol={{ span: 4 }}
          >
            <Switch checkedChildren={t("admin.common.switch.on")} unCheckedChildren={t("admin.common.switch.off")} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={showEdit}
        title={t("admin.catelog.modal.edit")}
        onCancel={() => {
          setShowEdit(false);
        }}
        onOk={() => {
          const values = updateForm?.getFieldsValue();
          handleUpdate(values);
        }}
      >
        <Spin spinning={requestLoading}>
          <Form form={updateForm}>
            <Form.Item name="id" label="序号" labelCol={{ span: 4 }}>
              <Input disabled />
            </Form.Item>
            <Form.Item name="name" required label="名称" labelCol={{ span: 4 }}>
              <Input placeholder={t("admin.catelog.form.name")} />
            </Form.Item>
            <Form.Item
              name="sort"
              required
              label={
                <span>
                  <Tooltip title={t("admin.catelog.form.sortHint")}>
                    <QuestionCircleOutlined style={{ marginLeft: "5px" }} />
                  </Tooltip>
                  &nbsp;排序
                </span>
              }
              labelCol={{ span: 4 }}
            >
              <InputNumber placeholder={t("admin.catelog.form.sort")} defaultValue={1} />
            </Form.Item>
            <Form.Item
              name="hide"
              required
              label={
                <span>
                  <Tooltip title={t("admin.catelog.form.hideHint")}>
                    <QuestionCircleOutlined style={{ marginLeft: "5px" }} />
                  </Tooltip>
                  &nbsp;隐藏
                </span>
              }
              labelCol={{ span: 4 }}
            >
              <Switch checkedChildren={t("admin.common.switch.on")} unCheckedChildren={t("admin.common.switch.off")} />
            </Form.Item>
          </Form>
        </Spin>
      </Modal>
    </Card>
  );
};
