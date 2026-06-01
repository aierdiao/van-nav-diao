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
        message.success(t('admin.token.msg.deleteSuccess'));
      } catch (err) {
        message.warning(t('admin.token.msg.deleteFailed'));
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
        message.success(t('admin.token.msg.addSuccess'));
      } catch (err) {
        message.warning(t('admin.token.msg.addFailed'));
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
          <span>{t('admin.token.title')}</span>
          <span style={{ color: '#999', fontSize: 13 }}>{t('admin.token.total', { count: store?.tokens?.length ?? 0 })}</span>
        </Space>
      }
      extra={
        <Space>
          <Button type="primary" onClick={() => setShowAddModel(true)}>
            {t('admin.token.btn.add')}
          </Button>
          <Button type="primary" onClick={() => reload()}>
            {t('admin.token.btn.refresh')}
          </Button>
        </Space>
      }
    >
      <Spin spinning={loading}>
        <Table dataSource={store?.tokens || []} rowKey="id" size="small" pagination={{
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          defaultPageSize: 10,
          showTotal: (total) => `共 ${total} 条`,
        }}>
          <Table.Column title={t('admin.token.table.id')} dataIndex="id" width={30} />
          <Table.Column title={t('admin.token.table.name')} dataIndex="name" width={150}
            render={(_, record: any) => (
              <div><span style={{ marginLeft: 8 }}>{record.name}</span></div>
            )}
          />
          <Table.Column title={t('admin.token.table.value')} dataIndex="value" width={200}
            render={(val) => (
              <div style={{ maxWidth: "300px" }}>
                <Typography.Text copyable ellipsis={true}>{val}</Typography.Text>
              </div>
            )}
          />
          <Table.Column title={t('admin.token.table.action')} width={120} dataIndex="action" key="action"
            render={(_, record: any) => (
              <Space>
                <Popconfirm onConfirm={() => handleDelete(record.id)}
                  title={t('admin.token.confirm.delete', { name: record.name })}>
                  <Button type="link" danger>{t('common.delete')}</Button>
                </Popconfirm>
              </Space>
            )}
          />
        </Table>
      </Spin>
      <Modal visible={showAddModel} title={t('admin.token.modal.add')}
        onCancel={() => setShowAddModel(false)}
        onOk={() => { const values = addForm?.getFieldsValue(); handleCreate(values); }}>
        <Form form={addForm}>
          <Form.Item name="name" required label={t('admin.token.table.name')} labelCol={{ span: 4 }}>
            <Input placeholder={t('admin.token.form.name')} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
