export interface TelegramBot {
  id: string;
  name: string;
  username: string;
  token: string;
  isActive: boolean;
  createdAt: string;
  totalUsers: number;
  totalMessages: number;
  status: 'online' | 'error' | 'offline';
  description?: string;
  webhookUrl?: string;
  lastCheckedAt?: string;
  lastError?: string;
}

export interface ChatMessage {
  id: string;
  botId: string;
  userId: string;
  username: string;
  fullName: string;
  text: string;
  timestamp: string;
  direction: 'in' | 'out';
  status: 'sent' | 'delivered' | 'failed';
}

export interface ChatSession {
  userId: string;
  username: string;
  fullName: string;
  lastMessage: string;
  timestamp: string;
  botId: string;
  messages: ChatMessage[];
  unread?: boolean;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  botId?: string;
  category: 'api' | 'webhook' | 'system' | 'database';
  message: string;
}

export interface AppSettings {
  language: string;
  autoStart: boolean;
  themeStyle: 'pitch-black' | 'slate-dark' | 'deep-space';
  dbPath: string;
  minifyLogs: boolean;
  pollingInterval: number;
}

export interface BotRecord {
  id: string;
  name: string;
  token: string;
  username: string;
  telegram_bot_id: string | null;
  is_enabled: number; // 0 or 1 to match SQLite integers
  last_checked_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface FoundChat {
  chat_id: string;
  chat_title: string;
  chat_type: string;
  bot_id: string;
  topics: { id: string; title: string }[];
  updated_at: string;
}

export interface TemplateVariable {
  key: string;
  label: string;
  defaultValue: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  event_type: EventType;
  description: string;
  body_html: string;
  variables_json: string; // JSON string of TemplateVariable[]
  status: 'draft' | 'ready' | 'error' | 'untested';
  last_test_at: string | null;
  last_test_status: 'success' | 'error' | 'none';
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export type EventType = 
  | 'release_updates'
  | 'system_error'
  | 'purchase_request'
  | 'purchase_approved'
  | 'purchase_received'
  | 'z_report'
  | 'encashment'
  | 'shift_open'
  | 'shift_close'
  | 'waste'
  | 'announcement'
  | 'custom';

export interface NotificationRoute {
  id: string;
  name: string;
  event_type: EventType;
  bot_id: string;
  chat_id: string;
  chat_title: string;
  message_thread_id: string | null;
  thread_title: string | null;
  is_enabled: number; // 0 or 1
  last_test_at: string | null;
  last_test_status: 'success' | 'error' | 'pending' | 'none';
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

