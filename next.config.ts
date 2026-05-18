import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Supabase 图片域名白名单（头像等）
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
    ],
  },
};

export default nextConfig;
