/**
 * 数据库表类型定义（Supabase 生成风格）
 * 用于 Supabase 客户端的泛型参数
 */
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          password_hash: string;
          name: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          password_hash: string;
          name: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          password_hash?: string;
          name?: string;
          avatar_url?: string | null;
        };
      };
      documents: {
        Row: {
          id: string;
          title: string;
          content: Record<string, unknown>;
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title?: string;
          content?: Record<string, unknown>;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          content?: Record<string, unknown>;
          updated_at?: string;
        };
      };
      doc_members: {
        Row: {
          doc_id: string;
          user_id: string;
          role: string;
          invited_at: string;
        };
        Insert: {
          doc_id: string;
          user_id: string;
          role: string;
          invited_at?: string;
        };
        Update: {
          role?: string;
        };
      };
      doc_shares: {
        Row: {
          id: string;
          doc_id: string;
          token: string;
          role: string;
          created_by: string;
          expires_at: string | null;
          used: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          doc_id: string;
          token: string;
          role: string;
          created_by: string;
          expires_at?: string | null;
          used?: boolean;
          created_at?: string;
        };
        Update: {
          used?: boolean;
        };
      };
      yjs_updates: {
        Row: {
          id: number;
          doc_id: string;
          update: string;
          created_at: string;
        };
        Insert: {
          doc_id: string;
          update: string;
          created_at?: string;
        };
        Update: {};
      };
      doc_snapshots: {
        Row: {
          id: string;
          doc_id: string;
          content: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          doc_id: string;
          content: Record<string, unknown>;
          created_at?: string;
        };
        Update: {};
      };
    };
  };
}
