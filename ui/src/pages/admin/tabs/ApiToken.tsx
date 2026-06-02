import { Button, Card, Form, Input, Modal, message, Popconfirm, Space, Spin, Table, Typography } from 'antd';
import { useCallback, useState } from 'react';
import { fetchAddApiToken, fetchDeleteApiToken } from '../../../utils/api';
import { useData } from '../hooks/useData';
import { useTranslation } from '../../../i18n';

export interface ApiTokenProps {}

export const ApiToken: React.FC<ApiTokenProps> = (props) => {
  const { t } = useTranslation();
  const [addForm] = Form.useForm();
  const [showAddModel, setShowAddModel] = useState(false);
  const { store, loading, reload } = useData();

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await fetchDeleteApiToken(id);
        message.success(t('admin.apiToken.msg.deleteSuccess'));
      } catch (err) {
        message.warning(t('admin.apiToken.msg.deleteFailed'));
      } finally {
        reload();
      }
    },
    [reload, t]
  );

  const handleCreate = useCallback(
    async (record: any) => {
      try {
        await fetchAddApiToken(record);
        message.success(t('admin.apiToken.msg.addSuccess'));
      } catch (err) {
        message.warning(t('admin.apiToken.msg.addFailed'));
      } finally {
        setShowAddModel(false);
        reload();
      }
    },
    [reload, setShowAddModel, t]
  );

  return (
    <Card
      title={
        <Space>
          <span>{t('admin.apiToken.title')}</span>
          <span style={{ color: '#999', fontSize: 13 }}>{t('admin.apiToken.total', { count: store?.tokens?.length ?? 0 })}</span>
        </Space>
      }
      extra={
        <Space>
          <Button type="primary" onClick={() => setShowAddModel(true)}>
            {t('admin.apiToken.btn.add')}
          </Button>
          <Button type="primary" onClick={() => reload()}>
            {t('admin.apiToken.btn.refresh')}
          </Button>
        </Space>
      }
    >
      <Spin spinning={loading}>
        <Table dataSource={store?.tokens || []} rowKey="id" size="small" pagination={{
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          defaultPageSize: 10,
          showTotal: (total) => t("admin.apiToken.table.total", { total }),
        }}>
          <Table.Column title={t('admin.apiToken.table.id')} dataIndex="id" width={30} />
          <Table.Column title={t('admin.apiToken.table.name')} dataIndex="name" width={150}
            render={(_, record: any) => (
              <div><span style={{ marginLeft: 8 }}>{record.name}</span></div>
            )}
          />
          <Table.Column title={t('admin.apiToken.table.value')} dataIndex="value" width={200}
            render={(val) => (
              <div style={{ maxWidth: "300px" }}>
                <Typography.Text copyable ellipsis={true}>{val}</Typography.Text>
              </div>
            )}
          />
          <Table.Column title={t('admin.apiToken.table.action')} width={120} dataIndex="action" key="action"
            render={(_, record: any) => (
              <Space>
                <Popconfirm onConfirm={() => handleDelete(record.id)}
                  title={t('admin.apiToken.confirm.delete', { name: record.name })}>
                  <Button type="link" danger>{t('common.delete')}</Button>
                </Popconfirm>
              </Space>
            )}
          />
        </Table>
      </Spin>
      <Modal visible={showAddModel} title={t('admin.apiToken.modal.add')}
        onCancel={() => setShowAddModel(false)}
        onOk={() => { const values = addForm?.getFieldsValue(); handleCreate(values); }}>
        <Form form={addForm}>
          <Form.Item name="name" required label={t('admin.apiToken.table.name')} labelCol={{ span: 4 }}>
            <Input placeholder={t('admin.apiToken.form.namePlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
