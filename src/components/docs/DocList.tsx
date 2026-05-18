'use client';

/**
 * 文档列表组件
 * 网格布局展示文档卡片
 */
import { Row, Col, message, Modal } from 'antd';
import { DocCard } from './DocCard';
import { ShareModal } from './ShareModal';
import { useState } from 'react';
import { fetchApi } from '@/lib/utils';
import type { DocumentListItem } from '@/types/document';

interface DocListProps {
  documents: DocumentListItem[];
}

export function DocList({ documents }: DocListProps) {
  const [shareDocId, setShareDocId] = useState<string | null>(null);
  const [docList, setDocList] = useState(documents);

  /** 删除文档 */
  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后不可恢复，确定要删除此文档吗？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        const res = await fetchApi(`/api/documents/${id}`, {
          method: 'DELETE',
        });
        if (res.code === 200) {
          message.success('删除成功');
          setDocList(docList.filter((d) => d.id !== id));
        } else {
          message.error(res.message || '删除失败');
        }
      },
    });
  };

  /** 打开分享弹窗 */
  const handleShare = (id: string) => {
    setShareDocId(id);
  };

  return (
    <>
      <Row gutter={[16, 16]}>
        {docList.map((doc) => (
          <Col key={doc.id} xs={24} sm={12} md={8} lg={6}>
            <DocCard
              document={doc}
              onDelete={handleDelete}
              onShare={handleShare}
            />
          </Col>
        ))}
      </Row>

      {/* 分享弹窗 */}
      {shareDocId && (
        <ShareModal
          docId={shareDocId}
          open={!!shareDocId}
          onClose={() => setShareDocId(null)}
        />
      )}
    </>
  );
}
