import { AntdRegistry } from '@ant-design/nextjs-registry';
import type { Metadata } from 'next';
import './globals.css';

/** 页面元数据 */
export const metadata: Metadata = {
  title: 'Collab Docs - 多人协作文档',
  description: '基于 Next.js + Tiptap + Yjs 的多人实时协作文档系统',
};

/**
 * 根布局组件
 * - 集成 AntdRegistry 解决 Ant Design SSR 样式闪烁
 * - 设置基础 HTML 结构
 * - 全局字体和基础样式
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased bg-gray-50 text-gray-900">
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  );
}
