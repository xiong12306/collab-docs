'use client';

/**
 * 文档列表组件
 * 网格布局展示文档卡片
 * P1 增强：传递搜索关键词用于高亮，删除提示改为移入回收站
 */
import { Row, Col, message, Modal } from 'antd';
import { DocCard } from './DocCard';
import { ShareModal } from './ShareModal';
import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/utils';
import type { DocumentListItem } from '@/types/document';

interface DocListProps {
  documents: DocumentListItem[];
  /** P1 新增：搜索关键词，用于标题高亮 */
  searchKeyword?: string;
}

export function DocList({ documents, searchKeyword = '' }: DocListProps) {
  const [shareDocId, setShareDocId] = useState<string | null>(null);
  const [docList, setDocList] = useState<DocumentListItem[]>(documents);

  // 当外部 documents 变化时同步内部状态
  useEffect(() => {
    setDocList(documents);
  }, [documents]);

  /** 删除文档 — P1 改为移入回收站提示 */
  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '移入回收站',
      content: '文档将移入回收站，30 天后自动删除',
      okText: '移入回收站',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        const res = await fetchApi(`/api/documents/${id}`, {
          method: 'DELETE',
        });
        if (res.code === 200) {
          message.success('文档已移入回收站');
          setDocList((prev) => prev.filter((d) => d.id !== id));
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
              searchKeyword={searchKeyword}
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
