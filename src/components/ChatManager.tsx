import React, { useState, useEffect, useRef } from 'react';
import { Send, User, ChevronRight, MessageSquareCode, Sparkles, MessageSquare, RefreshCw, Copy, Check, Info, AlertCircle, FileCode, Globe, Trash2, Route } from 'lucide-react';
import { TelegramBot, ChatSession, ChatMessage } from '../types';

interface ChatManagerProps {
  bots: TelegramBot[];
  selectedBotId: string | null;
  chats: ChatSession[];
  onSendMessage: (botId: string, userId: string, text: string) => void;
  onReceiveMessageSimulated: (botId: string, userId: string, text: string, fullName: string, username: string) => void;
  onCreateRouteFromUpdate?: (updateData: any) => void;
}

interface ParsedUpdate {
  updateId: number;
  eventType: string;
  chatId: string;
  chatTitle: string;
  chatType: string;
  userId: string;
  username: string;
  topicId: string;
  text: string;
  dateStr: string;
}

export default function ChatManager({
  bots,
  selectedBotId,
  chats,
  onSendMessage,
  onReceiveMessageSimulated
}: ChatManagerProps) {
  const [subTab, setSubTab] = useState<'chats' | 'updates' | 'messages' | 'webhook'>('chats');
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // States for Updates tab
  const [updatesList, setUpdatesList] = useState<any[]>([]);
  const [isLoadingUpdates, setIsLoadingUpdates] = useState(false);
  const [updatesError, setUpdatesError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // States for Messages tab (Stage 5)
  const [msgChatId, setMsgChatId] = useState('');
  const [msgThreadId, setMsgThreadId] = useState('');
  const [msgText, setMsgText] = useState('');
  const [msgParseMode, setMsgParseMode] = useState<'HTML' | ''>('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const [msgResult, setMsgResult] = useState<{
    success: boolean;
    messageId?: number;
    error?: string;
  } | null>(null);

  // States for Webhook tab (Stage 6)
  const [webhookInfo, setWebhookInfo] = useState<any>(null);
  const [isLoadingWebhook, setIsLoadingWebhook] = useState(false);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [webhookSuccessMsg, setWebhookSuccessMsg] = useState<string | null>(null);

  const [inputWebhookUrl, setInputWebhookUrl] = useState('');
  const [inputSecretToken, setInputSecretToken] = useState('');
  const [dropPendingUpdates, setDropPendingUpdates] = useState(false);
  const [isSettingWebhook, setIsSettingWebhook] = useState(false);
  const [isDeletingWebhook, setIsDeletingWebhook] = useState(false);
  const [showConfirmSetWebhook, setShowConfirmSetWebhook] = useState(false);

  // Selected bot or default
  const activeBot = bots.find((b) => b.id === selectedBotId) || bots[0];

  // Filter chats by active bot
  const filteredChats = chats.filter((c) => activeBot && c.botId === activeBot.id);

  // Set first chat as active by default if none selected
  useEffect(() => {
    if (filteredChats.length > 0 && !selectedChatUserId) {
      setSelectedChatUserId(filteredChats[0].userId);
    }
  }, [filteredChats, selectedChatUserId]);

  const activeChat = filteredChats.find((c) => c.userId === selectedChatUserId);

  // Auto scroll chat list
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, selectedChatUserId, subTab]);

  // Clean updates when user switches bots
  useEffect(() => {
    setUpdatesList([]);
    setUpdatesError(null);
  }, [selectedBotId]);

  // Load Webhook Info when bot or webhook subTab changes
  useEffect(() => {
    if (subTab === 'webhook') {
      fetchWebhookInfo();
    } else {
      setWebhookInfo(null);
      setWebhookError(null);
      setWebhookSuccessMsg(null);
    }
  }, [selectedBotId, subTab]);

  // Fetch Webhook Info
  const fetchWebhookInfo = async () => {
    if (!activeBot || !activeBot.token) return;
    setIsLoadingWebhook(true);
    setWebhookError(null);
    setWebhookSuccessMsg(null);

    const IS_TAURI = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '___TAURI__' in window || (window as any).__TAURI_IPC__ !== undefined);

    try {
      let data: any;
      if (IS_TAURI) {
        const { invoke } = await import('@tauri-apps/api/core');
        data = await invoke('get_webhook_info', { token: activeBot.token });
      } else {
        const response = await fetch('/api/getWebhookInfo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: activeBot.token })
        });
        data = await response.json();
      }

      if (data && data.ok) {
        setWebhookInfo(data.result);
        if (data.result?.url) {
          setInputWebhookUrl(data.result.url);
        } else {
          setInputWebhookUrl('');
        }
      } else {
        setWebhookError(data.description || 'Не удалось получить данные о вебхуке.');
      }
    } catch (err: any) {
      console.error('Ошибка получения WebhookInfo:', err);
      setWebhookError('Не удалось выполнить запрос информации. Проверьте соединение.');
    } finally {
      setIsLoadingWebhook(false);
    }
  };

  // Delete Webhook
  const handleDeleteWebhook = async () => {
    if (!activeBot || !activeBot.token) return;
    setIsDeletingWebhook(true);
    setWebhookError(null);
    setWebhookSuccessMsg(null);

    const IS_TAURI = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '___TAURI__' in window || (window as any).__TAURI_IPC__ !== undefined);

    try {
      let data: any;
      if (IS_TAURI) {
        const { invoke } = await import('@tauri-apps/api/core');
        data = await invoke('delete_webhook', { 
          token: activeBot.token,
          dropPendingUpdates: dropPendingUpdates
        });
      } else {
        const response = await fetch('/api/deleteWebhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            token: activeBot.token,
            drop_pending_updates: dropPendingUpdates
          })
        });
        data = await response.json();
      }

      if (data && data.ok) {
        setWebhookSuccessMsg('Вебхук успешно удален. Теперь можно использовать getUpdates.');
        fetchWebhookInfo();
      } else {
        setWebhookError(data.description || 'Не удалось удалить вебхук.');
      }
    } catch (err: any) {
      console.error('Ошибка удаления Webhook:', err);
      setWebhookError('Не удалось выполнить запрос на удаление вебхука.');
    } finally {
      setIsDeletingWebhook(false);
    }
  };

  // Set Webhook
  const handleSetWebhook = async () => {
    if (!activeBot || !activeBot.token) return;
    setIsSettingWebhook(true);
    setWebhookError(null);
    setWebhookSuccessMsg(null);
    setShowConfirmSetWebhook(false);

    const IS_TAURI = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '___TAURI__' in window || (window as any).__TAURI_IPC__ !== undefined);

    try {
      let data: any;
      if (IS_TAURI) {
        const { invoke } = await import('@tauri-apps/api/core');
        data = await invoke('set_webhook', { 
          token: activeBot.token, 
          url: inputWebhookUrl.trim(),
          secretToken: inputSecretToken.trim() || null
        });
      } else {
        const response = await fetch('/api/setWebhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            token: activeBot.token, 
            url: inputWebhookUrl.trim(),
            secret_token: inputSecretToken.trim() || undefined
          })
        });
        data = await response.json();
      }

      if (data && data.ok) {
        setWebhookSuccessMsg(`Вебхук успешно установлен: ${inputWebhookUrl.trim()}`);
        fetchWebhookInfo();
      } else {
        setWebhookError(data.description || 'Не удалось установить вебхук. Убедитесь, что это валидный HTTPS URL.');
      }
    } catch (err: any) {
      console.error('Ошибка установки Webhook:', err);
      setWebhookError('Не удалось выполнить запрос на установку вебхука.');
    } finally {
      setIsSettingWebhook(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeBot || !selectedChatUserId || !activeChat) return;

    onSendMessage(activeBot.id, selectedChatUserId, inputText.trim());
    setInputText('');

    // Simulate standard Telegram client response after 1.5 seconds
    const possibleReplies = [
      'Спасибо за информацию! 👍',
      'Отлично, я понял вас.',
      'А как подключить вебхук обратно?',
      'Бот работает очень быстро, спасибо за сборку ⚡',
      'Подскажите, какие команды поддерживаются?',
      'Работает как швейцарские часы.',
    ];
    const triggerReplyText = possibleReplies[Math.floor(Math.random() * possibleReplies.length)];

    setTimeout(() => {
      onReceiveMessageSimulated(
        activeBot.id,
        activeChat.userId,
        triggerReplyText,
        activeChat.fullName,
        activeChat.username
      );
    }, 1500);
  };

  // Fetch real updates from API
  const fetchBotUpdates = async () => {
    if (!activeBot || !activeBot.token) return;
    setIsLoadingUpdates(true);
    setUpdatesError(null);

    const IS_TAURI = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '___TAURI__' in window || (window as any).__TAURI_IPC__ !== undefined);

    try {
      let data: any;
      if (IS_TAURI) {
        const { invoke } = await import('@tauri-apps/api/core');
        data = await invoke('get_updates', { token: activeBot.token });
      } else {
        const response = await fetch('/api/getUpdates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ token: activeBot.token })
        });
        data = await response.json();
      }

      if (data && data.ok) {
        setUpdatesList(data.result || []);
        
        // Automatically save found chats and topics
        if (data.result && data.result.length > 0) {
          for (const rawUpd of data.result) {
            const upd = parseTelegramUpdate(rawUpd);
            if (upd.chatId !== '—') {
              await db.upsertFoundChat({
                chat_id: upd.chatId,
                bot_id: activeBot.id,
                chat_title: upd.chatTitle,
                chat_type: upd.chatType,
                topics: upd.topicId !== '—' ? [{ id: upd.topicId, title: 'Found via Update' }] : []
              });
            }
          }
        }
      } else {
        setUpdatesError(data.description || 'Не удалось получить обновления. Проверьте token.');
      }
    } catch (err: any) {
      console.error('Ошибка получения обновлений:', err);
      setUpdatesError('Не удалось подключиться к боту. Проверьте token.');
    } finally {
      setIsLoadingUpdates(false);
    }
  };

  const handleCopyClipboard = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Detailed parsing for various update events
  const parseTelegramUpdate = (upd: any): ParsedUpdate => {
    const updateId = upd.update_id;
    let eventType = 'unknown';
    let innerObj: any = null;

    if (upd.message) {
      eventType = 'message';
      innerObj = upd.message;
    } else if (upd.edited_message) {
      eventType = 'edited_message';
      innerObj = upd.edited_message;
    } else if (upd.channel_post) {
      eventType = 'channel_post';
      innerObj = upd.channel_post;
    } else if (upd.edited_channel_post) {
      eventType = 'edited_channel_post';
      innerObj = upd.edited_channel_post;
    } else if (upd.callback_query) {
      eventType = 'callback_query';
      innerObj = upd.callback_query;
    } else if (upd.my_chat_member) {
      eventType = 'my_chat_member';
      innerObj = upd.my_chat_member;
    } else if (upd.chat_member) {
      eventType = 'chat_member';
      innerObj = upd.chat_member;
    } else if (upd.chat_join_request) {
      eventType = 'chat_join_request';
      innerObj = upd.chat_join_request;
    }

    let chatId = '—';
    let chatTitle = '—';
    let chatType = '—';
    let userId = '—';
    let username = '—';
    let topicId = '—';
    let text = '—';
    let dateVal = 0;

    if (innerObj) {
      if (eventType === 'callback_query') {
        text = innerObj.data ? `Кнопка: "${innerObj.data}"` : 'Нажата кнопка';
        if (innerObj.message) {
          chatId = String(innerObj.message.chat.id);
          chatType = innerObj.message.chat.type || '—';
          chatTitle = innerObj.message.chat.title || innerObj.message.chat.username || 'Приватный';
          dateVal = innerObj.message.date || 0;
        }
        if (innerObj.from) {
          userId = String(innerObj.from.id);
          username = innerObj.from.username 
            ? `@${innerObj.from.username}` 
            : `${innerObj.from.first_name || ''} ${innerObj.from.last_name || ''}`.trim() || '—';
        }
      } else {
        if (innerObj.chat) {
          chatId = String(innerObj.chat.id);
          chatType = innerObj.chat.type || '—';
          chatTitle = innerObj.chat.title || 
            (innerObj.chat.username ? `@${innerObj.chat.username}` : '') || 
            `${innerObj.chat.first_name || ''} ${innerObj.chat.last_name || ''}`.trim() || 
            'Приватный';
        }
        if (innerObj.from) {
          userId = String(innerObj.from.id);
          username = innerObj.from.username 
            ? `@${innerObj.from.username}` 
            : `${innerObj.from.first_name || ''} ${innerObj.from.last_name || ''}`.trim() || '—';
        }
        
        text = innerObj.text || innerObj.caption || (innerObj.new_chat_members ? 'Добавлены участники' : '') || '—';
        
        if (innerObj.message_thread_id) {
          topicId = String(innerObj.message_thread_id);
        }
        
        dateVal = innerObj.date || 0;
      }
    }

    let dateStr = '—';
    if (dateVal > 0) {
      try {
        dateStr = new Date(dateVal * 1000).toLocaleString('ru-RU');
      } catch (_) {}
    }

    return {
      updateId,
      eventType,
      chatId,
      chatTitle,
      chatType,
      userId,
      username,
      topicId,
      text,
      dateStr
    };
  };

  const handleSendTelegramMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBot || !activeBot.token || !msgChatId.trim() || !msgText.trim()) return;

    setIsSendingMsg(true);
    setMsgResult(null);

    const IS_TAURI = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '___TAURI__' in window || (window as any).__TAURI_IPC__ !== undefined);

    try {
      let data: any;
      const threadParam = msgThreadId.trim() ? parseInt(msgThreadId.trim(), 10) : null;

      if (IS_TAURI) {
        const { invoke } = await import('@tauri-apps/api/core');
        data = await invoke('send_message', {
          token: activeBot.token,
          chatId: msgChatId.trim(),
          messageThreadId: isNaN(Number(threadParam)) ? null : threadParam,
          text: msgText,
          parseMode: msgParseMode || null
        });
      } else {
        const response = await fetch('/api/sendMessage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            token: activeBot.token,
            chatId: msgChatId.trim(),
            text: msgText,
            messageThreadId: msgThreadId.trim() || undefined,
            parseMode: msgParseMode || undefined
          })
        });
        data = await response.json();
      }

      if (data && data.ok) {
        setMsgResult({
          success: true,
          messageId: data.result?.message_id
        });
      } else {
        setMsgResult({
          success: false,
          error: data.description || 'Не удалось отправить сообщение. Проверьте права бота и Chat ID.'
        });
      }
    } catch (err: any) {
      console.error('Ошибка отправки сообщения:', err);
      setMsgResult({
        success: false,
        error: 'Не удалось установить соединение. Проверьте сеть или токен бота.'
      });
    } finally {
      setIsSendingMsg(false);
    }
  };

  const renderHTMLPreview = (txt: string) => {
    // Simple escapes and replacements for safe visual preview of HTML formatting tags
    let html = txt
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Re-enable tags
    html = html
      .replace(/&lt;b&gt;([\s\S]*?)&lt;\/b&gt;/g, '<strong>$1</strong>')
      .replace(/&lt;strong&gt;([\s\S]*?)&lt;\/strong&gt;/g, '<strong>$1</strong>')
      .replace(/&lt;i&gt;([\s\S]*?)&lt;\/i&gt;/g, '<em>$1</em>')
      .replace(/&lt;em&gt;([\s\S]*?)&lt;\/em&gt;/g, '<em>$1</em>')
      .replace(/&lt;u&gt;([\s\S]*?)&lt;\/u&gt;/g, '<u>$1</u>')
      .replace(/&lt;code&gt;([\s\S]*?)&lt;\/code&gt;/g, '<code class="bg-[#242427] text-amber-300 px-1 py-0.5 rounded font-mono text-xs">$1</code>')
      .replace(/&lt;pre&gt;([\s\S]*?)&lt;\/pre&gt;/g, '<pre class="bg-zinc-950 p-2 rounded text-zinc-300 font-mono text-xs overflow-auto block whitespace-pre-wrap select-all">$1</pre>')
      .replace(/&lt;a\s+href=["\']([^"\']+)["\']&gt;([\s\S]*?)&lt;\/a&gt;/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:underline hover:text-sky-300 inline-flex items-center gap-1">$2 ↗</a>');

    return (
      <div 
        className="text-xs text-zinc-350 leading-relaxed whitespace-pre-wrap select-text font-sans"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };

  if (bots.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
          <MessageSquareCode className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-zinc-200 font-semibold text-sm">Нет активных чатов</h3>
          <p className="text-xs text-zinc-500 max-w-xs">
            Добавьте хотя бы одного бота в разделе "Боты", чтобы открыть систему симуляции диалогов.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Horizontal Sub tabs */}
      <div className="border-b border-[#1f1f22] bg-[#0d0d0e]/95 px-4 py-2 flex items-center justify-between select-none shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSubTab('chats')}
            className={`px-3 py-1.5 rounded text-[11px] font-medium transition-all flex items-center gap-2 border ${
              subTab === 'chats'
                ? 'bg-zinc-900 border-zinc-800 text-zinc-100 shadow-sm'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#0088cc]" />
            <span>Симулятор диалогов</span>
          </button>
          
          <button
            onClick={() => setSubTab('updates')}
            className={`px-3 py-1.5 rounded text-[11px] font-medium transition-all flex items-center gap-2 border ${
              subTab === 'updates'
                ? 'bg-zinc-900 border-zinc-800 text-zinc-100 shadow-sm'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5 text-green-400" />
            <span>Telegram Updates (getUpdates)</span>
          </button>

          <button
            onClick={() => setSubTab('messages')}
            className={`px-3 py-1.5 rounded text-[11px] font-medium transition-all flex items-center gap-2 border ${
              subTab === 'messages'
                ? 'bg-zinc-900 border-zinc-800 text-zinc-100 shadow-sm'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-blue-400" />
            <span>Сообщения (sendMessage)</span>
          </button>

          <button
            onClick={() => setSubTab('webhook')}
            className={`px-3 py-1.5 rounded text-[11px] font-medium transition-all flex items-center gap-2 border ${
              subTab === 'webhook'
                ? 'bg-zinc-900 border-zinc-800 text-zinc-100 shadow-sm'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span>Вебхук (setWebhook)</span>
          </button>
        </div>
        
        <div className="text-[10px] font-mono text-zinc-500 flex items-center gap-2">
          <span>Бот: <strong className="text-zinc-300">{activeBot.name}</strong></span>
          <span className="text-zinc-700">|</span>
          <span>Токен: <strong className="text-zinc-400">{activeBot.token.split(':')[0]}:••••••••••</strong></span>
        </div>
      </div>

      {subTab === 'chats' ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Chats Index Sidebar */}
          <div className="w-72 border-r border-[#1f1f22] bg-[#0c0c0d] flex flex-col">
            <div className="p-3 border-b border-[#1b1b1c] bg-[#121214]/60">
              <span className="text-[10px] uppercase font-mono text-zinc-500 font-semibold block mb-1">
                Активный бот фильтр
              </span>
              <div className="text-xs text-zinc-200 font-medium truncate flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${activeBot ? 'bg-[#10b981]' : 'bg-red-500'}`} />
                {activeBot ? `${activeBot.name} (@${activeBot.username})` : 'Бот не выбран'}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#131315]">
              {filteredChats.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-500 font-sans mt-8">
                  Нет диалогов. Они появятся при входящих запросах.
                </div>
              ) : (
                filteredChats.map((c) => {
                  const isSelected = c.userId === selectedChatUserId;
                  return (
                    <button
                      key={c.userId}
                      onClick={() => setSelectedChatUserId(c.userId)}
                      className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors ${
                        isSelected ? 'bg-zinc-900/60' : 'bg-[#0c0c0d] hover:bg-zinc-900/20'
                      }`}
                    >
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 font-mono text-xs uppercase font-medium">
                          {c.fullName.slice(0, 1)}
                        </div>
                        {c.unread && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#0088cc] border-2 border-[#0c0c0d]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-xs font-semibold truncate ${isSelected ? 'text-zinc-100' : 'text-zinc-300'}`}>
                            {c.fullName}
                          </p>
                          <span className="text-[10px] text-zinc-500 font-mono shrink-0">{c.timestamp}</span>
                        </div>
                        <p className="text-[10px] text-[#0088cc] font-mono truncate">@{c.username}</p>
                        <p className="text-xs text-zinc-500 truncate mt-0.5 leading-normal">{c.lastMessage}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Main Conversation Canvas */}
          <div className="flex-1 flex flex-col bg-[#080809] overflow-hidden">
            {activeChat ? (
              <>
                {/* Active chat header */}
                <div className="h-12 border-b border-[#1f1f22] px-4 flex items-center justify-between bg-[#0c0c0d]/60 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 font-bold text-[10px]">
                      {activeChat.fullName.slice(0, 1)}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-200 hover:underline cursor-pointer">
                        {activeChat.fullName}{' '}
                        <span className="text-[10px] text-zinc-500 font-mono ml-1">(@{activeChat.username})</span>
                      </h4>
                      <span className="text-[9px] text-zinc-500 font-mono tracking-wider block">ID: {activeChat.userId}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-zinc-900/80 border border-zinc-800 rounded text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 animate-bounce" />
                      <span>Симуляция API</span>
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">Польз. ID {activeChat.userId}</span>
                  </div>
                </div>

                {/* Bubble list */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                  <div className="text-center my-2 select-none">
                    <span className="text-[9px] font-mono text-zinc-600 bg-zinc-950/40 border border-zinc-900 px-2.5 py-1 rounded">
                      Начало диалога с ботом @{activeBot.username}
                    </span>
                  </div>

                  {activeChat.messages.map((m) => {
                    const isOut = m.direction === 'out';
                    return (
                      <div key={m.id} className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[70%] px-3 py-2 rounded-lg text-xs leading-relaxed border ${
                            isOut
                              ? 'bg-zinc-900 text-zinc-100 border-zinc-800 rounded-tr-none'
                              : 'bg-[#121214] text-zinc-300 border-[#1f1f22] rounded-tl-none'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.text}</p>
                          <div className="flex items-center justify-end gap-1.5 mt-1 text-[9px] text-zinc-500 font-mono text-right select-none">
                            <span>{m.timestamp}</span>
                            {isOut && <span className="text-[#0088cc]">✓✓</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* Input Form */}
                <form onSubmit={handleSend} className="p-3 border-t border-[#1f1f22] bg-[#0c0c0d]/60 flex items-center gap-2 shrink-0">
                  <input
                    type="text"
                    placeholder={`Ответить от имени @${activeBot.username}...`}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="flex-1 bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 rounded-md py-2 px-3 focus-ring focus:bg-zinc-950 font-sans"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="p-2 bg-zinc-100 hover:bg-zinc-200 disabled:bg-zinc-800/60 disabled:text-zinc-600 text-zinc-950 rounded-md transition-all text-xs flex items-center justify-center font-medium"
                    title="Отправить сообщение"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-zinc-500 space-y-2 select-none">
                <User className="w-8 h-8 text-zinc-650" />
                <h4 className="text-xs font-semibold text-zinc-400">Диалог не выбран</h4>
                <p className="text-[11px] text-zinc-600 max-w-xs">
                  Выберите чат в левой колонке для просмотра переписки и управления общением.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Real Updates Tab */
        <div className="flex-1 flex flex-col bg-[#080809] p-4 overflow-hidden">
          {/* Header Controls for Updates */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-900 select-none">
            <div className="flex items-center gap-2.5">
              <button
                onClick={fetchBotUpdates}
                disabled={isLoadingUpdates}
                className={`py-2 px-4 rounded-md text-xs font-semibold tracking-tight transition-all flex items-center gap-2 border bg-zinc-100 text-zinc-950 hover:bg-zinc-200 ${
                  isLoadingUpdates ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUpdates ? 'animate-spin' : ''}`} />
                <span>{isLoadingUpdates ? 'Получение обновлений...' : 'Получить updates'}</span>
              </button>

              <button
                onClick={() => setUpdatesList([])}
                disabled={updatesList.length === 0}
                className="py-2 px-3 border border-zinc-800 rounded-md text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 flex items-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
              >
                Очистить логи
              </button>
            </div>

            <span className="text-[11px] font-mono text-zinc-500 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#0088cc]" />
              Метод: getUpdates. Возвращает последние активные транзакции на стороне Telegram Cloud.
            </span>
          </div>

          {/* Error notice if token not valid */}
          {updatesError && (
            <div className="mb-4 bg-red-950/20 border border-red-900/40 rounded-lg p-3.5 text-xs text-red-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                {updatesError.includes('409') || updatesError.toLowerCase().includes('conflict') || updatesError.toLowerCase().includes('webhook is active') ? (
                  <>
                    <p className="font-semibold text-red-200">У бота включён webhook</p>
                    <p className="text-[11px] text-red-400/80 mt-1 leading-relaxed">
                      Telegram не разрешает одновременно использовать webhook и getUpdates. 
                      Перейдите во вкладку Webhook и удалите его, чтобы получать обновления здесь.
                    </p>
                    <button 
                      onClick={() => setSubTab('webhook')}
                      className="mt-2 text-[11px] font-bold text-white bg-red-900/40 hover:bg-red-900/60 px-3 py-1 rounded transition-colors flex items-center gap-1.5"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      Перейти к Webhook
                    </button>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-red-200">Не удалось получить обновления. Проверьте token.</p>
                    <p className="text-[11px] text-red-400/80 mt-1 font-mono text-xs">{updatesError}</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Updates lists rendering */}
          {updatesList.length === 0 ? (
            <div className="flex-1 border border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center text-center p-8 select-none">
              <div className="w-12 h-12 rounded-full bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-center text-zinc-500 mb-3 font-mono">
                getMe
              </div>
              <h3 className="text-zinc-300 font-semibold text-sm">Обновления не загружены</h3>
              <p className="text-xs text-zinc-500 max-w-sm mt-1 leading-relaxed">
                Напишите любое сообщение в группу или боту, затем нажмите <strong className="text-zinc-300">"Получить updates"</strong>.
              </p>
              <div className="mt-4 p-3 bg-zinc-950 border border-zinc-900/80 max-w-md rounded-lg text-[11px] text-zinc-400 text-left space-y-1 font-sans">
                <p className="font-semibold text-zinc-300">Как это работает?</p>
                <p>1. Добавьте вашего бота в группу или начните диалог с ним напрямую.</p>
                <p>2. Отправьте команду или текстовое сообщение.</p>
                <p>3. Нажмите кнопку выше для мгновенного считывания transaction log.</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto border border-zinc-900 bg-[#0a0a0b]/60 rounded-lg">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-zinc-900 text-[10px] uppercase font-mono font-bold text-zinc-500 tracking-wider bg-zinc-950/60">
                    <th className="py-2.5 px-4">Update ID</th>
                    <th className="py-2.5 px-4">Событие</th>
                    <th className="py-2.5 px-4">Chat ID</th>
                    <th className="py-2.5 px-4">Chat Title</th>
                    <th className="py-2.5 px-4">Chat Type</th>
                    <th className="py-2.5 px-4">User ID</th>
                    <th className="py-2.5 px-4">Отправитель</th>
                    <th className="py-2.5 px-4">Topic ID</th>
                    <th className="py-2.5 px-4">Текст сообщения</th>
                    <th className="py-2.5 px-4 text-right">Время</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-950 text-xs text-zinc-300">
                  {updatesList.map((rawUpd, index) => {
                    const upd = parseTelegramUpdate(rawUpd);
                    const isChatCopied = copiedKey === `chatId-${upd.updateId}`;
                    const isUserCopied = copiedKey === `userId-${upd.updateId}`;
                    const isTopicCopied = copiedKey === `topicId-${upd.updateId}`;

                    return (
                      <tr key={index} className="hover:bg-zinc-900/20 transition-colors group">
                        {/* Update ID */}
                        <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                          <div className="flex items-center gap-2">
                            {upd.updateId}
                            <button
                              onClick={() => onCreateRouteFromUpdate?.(rawUpd)}
                              className="opacity-0 group-hover:opacity-100 p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-all"
                              title="Создать маршрут из этого update"
                            >
                              <Route className="w-3 h-3" />
                            </button>
                          </div>
                        </td>

                        {/* Event type */}
                        <td className="py-3 px-4 font-mono text-xs">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase ${
                            upd.eventType === 'message' ? 'bg-[#0088cc]/10 text-[#0088cc]' :
                            upd.eventType === 'edited_message' ? 'bg-amber-500/10 text-amber-500' :
                            upd.eventType === 'callback_query' ? 'bg-green-500/10 text-green-500' :
                            'bg-zinc-800 text-zinc-400'
                          }`}>
                            {upd.eventType}
                          </span>
                        </td>

                        {/* Chat ID copiable */}
                        <td className="py-3 px-4 font-mono text-[11px]">
                          {upd.chatId !== '—' ? (
                            <div className="flex items-center gap-1.5 group/copy">
                              <span className="text-zinc-200 font-bold">{upd.chatId}</span>
                              <button
                                onClick={() => handleCopyClipboard(`chatId-${upd.updateId}`, upd.chatId)}
                                className="opacity-0 group-hover/copy:opacity-100 p-0.5 text-zinc-500 hover:text-zinc-200 transition-all ml-1 shrink-0"
                                title="Скопировать Chat ID"
                              >
                                {isChatCopied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          ) : '—'}
                        </td>

                        {/* Chat Title */}
                        <td className="py-3 px-4 truncate max-w-[150px]" title={upd.chatTitle}>
                          {upd.chatTitle}
                        </td>

                        {/* Chat Type */}
                        <td className="py-3 px-4 font-mono text-[10px] text-zinc-500">
                          {upd.chatType}
                        </td>

                        {/* User ID copiable */}
                        <td className="py-3 px-4 font-mono text-[11px]">
                          {upd.userId !== '—' ? (
                            <div className="flex items-center gap-1.5 group/copy">
                              <span className="text-zinc-200 font-bold">{upd.userId}</span>
                              <button
                                onClick={() => handleCopyClipboard(`userId-${upd.updateId}`, upd.userId)}
                                className="opacity-0 group-hover/copy:opacity-100 p-0.5 text-zinc-500 hover:text-zinc-200 transition-all ml-1 shrink-0"
                                title="Скопировать User ID"
                              >
                                {isUserCopied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          ) : '—'}
                        </td>

                        {/* Username */}
                        <td className="py-3 px-4 truncate max-w-[120px]" title={upd.username}>
                          {upd.username}
                        </td>

                        {/* Topic ID / Message Thread ID copiable */}
                        <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                          {upd.topicId !== '—' ? (
                            <div className="flex items-center gap-1.5 group/copy">
                              <span className="text-amber-400 font-bold">{upd.topicId}</span>
                              <button
                                onClick={() => handleCopyClipboard(`topicId-${upd.updateId}`, upd.topicId)}
                                className="opacity-0 group-hover/copy:opacity-100 p-0.5 text-zinc-500 hover:text-zinc-200 transition-all ml-1 shrink-0"
                                title="Скопировать Topic ID"
                              >
                                {isTopicCopied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          ) : '—'}
                        </td>

                        {/* Message payload text */}
                        <td className="py-3 px-4 text-zinc-300 truncate max-w-[200px]" title={upd.text}>
                          {upd.text}
                        </td>

                        {/* Received At */}
                        <td className="py-3 px-4 font-mono text-[10px] text-zinc-500 text-right">
                          {upd.dateStr}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {subTab === 'messages' && (
        <div className="flex-1 flex overflow-hidden min-h-0 bg-[#080809] p-4 font-sans select-none">
          <div className="flex-1 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-y-auto pr-1">
            {/* Left side: Form controls */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-[#0c0c0d]/80 border border-zinc-900 rounded-xl p-4 space-y-4 shadow-sm">
                <div className="border-b border-zinc-900 pb-2">
                  <h3 className="text-xs font-semibold text-zinc-200 tracking-tight flex items-center gap-2">
                    <Send className="w-4 h-4 text-blue-400" />
                    <span>Ручная отправка тестового сообщения</span>
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                    Метод API: sendMessage
                  </p>
                </div>

                <form onSubmit={handleSendTelegramMessage} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Chat ID (required) */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider flex items-center gap-1">
                        <span>Chat ID</span>
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Например: -1001234567890 или 532389"
                        required
                        value={msgChatId}
                        onChange={(e) => setMsgChatId(e.target.value)}
                        className="w-full bg-[#111113] border border-zinc-800 text-xs text-zinc-200 rounded-md py-2 px-3 placeholder-zinc-650 focus-ring font-mono"
                      />
                    </div>

                    {/* Topic ID / message_thread_id (optional) */}
                    <div className="space-y-1 text-zinc-300">
                      <label className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider block">
                        Topic ID (message_thread_id)
                      </label>
                      <input
                        type="text"
                        placeholder="Опционально (для тем в супергруппах)"
                        value={msgThreadId}
                        onChange={(e) => setMsgThreadId(e.target.value)}
                        className="w-full bg-[#111113] border border-zinc-800 text-xs text-zinc-200 rounded-md py-2 px-3 placeholder-zinc-650 focus-ring font-mono"
                      />
                    </div>
                  </div>

                  {/* Parse Mode */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider block">
                      Форматирование сообщения (parse_mode)
                    </label>
                    <div className="flex bg-[#111113] border border-zinc-805 rounded-md p-0.5 max-w-[280px]">
                      <button
                        type="button"
                        onClick={() => setMsgParseMode('')}
                        className={`flex-1 text-center py-1 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                          msgParseMode === ''
                            ? 'bg-[#1b1b1f] text-zinc-150 border border-zinc-700/50'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        Без форматирования
                      </button>
                      <button
                        type="button"
                        onClick={() => setMsgParseMode('HTML')}
                        className={`flex-1 text-center py-1 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                          msgParseMode === 'HTML'
                            ? 'bg-[#1b1b1f] text-zinc-150 border border-zinc-700/50'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        HTML
                      </button>
                    </div>
                  </div>

                  {/* Message Text */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider block">
                      Текст сообщения
                    </label>
                    <textarea
                      placeholder="Введите текст сообщения. Поддерживаются базовые HTML-теги при ParseMode=HTML (b, i, u, code, pre, a)..."
                      required
                      rows={5}
                      value={msgText}
                      onChange={(e) => setMsgText(e.target.value)}
                      className="w-full bg-[#111113] border border-zinc-800 text-xs text-zinc-200 rounded-md py-2 px-3 placeholder-zinc-650 focus-ring font-sans resize-y"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSendingMsg || !msgChatId.trim() || !msgText.trim()}
                      className="w-full py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 disabled:bg-zinc-800/60 disabled:text-zinc-600 text-zinc-950 font-bold rounded-md transition-all text-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className={`w-3.5 h-3.5 ${isSendingMsg ? 'animate-pulse' : ''}`} />
                      <span>{isSendingMsg ? 'Идет отправка...' : 'Отправить тестовое сообщение'}</span>
                    </button>
                  </div>
                </form>

                {/* Status response displaying inside card */}
                {msgResult && (
                  <div className={`mt-2 border rounded-lg p-3 text-xs leading-normal ${
                    msgResult.success 
                      ? 'bg-green-950/10 border-green-900/30 text-green-300' 
                      : 'bg-red-950/10 border-red-900/30 text-red-300'
                  }`}>
                    {msgResult.success ? (
                      <div className="space-y-1">
                        <p className="font-semibold text-green-200 flex items-center gap-1.5">
                          <Check className="w-4 h-4 text-green-400 shrink-0" />
                          Сообщение отправлено успешно!
                        </p>
                        <p className="text-[11px] font-mono mt-1 pt-1 border-t border-green-900/40">
                          ID сообщения (message_id): <span className="font-bold text-white selection:bg-green-800">{msgResult.messageId || '—'}</span>
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="font-semibold text-red-200 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                          Ошибка отправки в Telegram API
                        </p>
                        <p className="text-[11px] text-red-400/85 font-mono select-text selection:bg-red-900">
                          {msgResult.error}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Template picker widgets */}
              <div className="bg-[#0c0c0d]/40 border border-zinc-900/60 rounded-xl p-4 space-y-3">
                <h4 className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider">
                  Быстрые шаблоны
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setMsgText('Тестовое сообщение от Telegram Bot Center');
                      setMsgParseMode('');
                      setMsgResult(null);
                    }}
                    type="button"
                    className="text-left p-3.5 bg-zinc-900/40 hover:bg-[#111113] border border-zinc-900 rounded-lg text-xs transition-all shrink-0 space-y-1 cursor-pointer"
                  >
                    <p className="font-semibold text-zinc-300">Обычный текст</p>
                    <p className="text-[10px] text-zinc-500 font-mono italic truncate">
                      "Тестовое сообщение от Telegram Bot Center"
                    </p>
                  </button>

                  <button
                    onClick={() => {
                      setMsgText(
                        '<b>Тестовое сообщение</b> от <i>Telegram Bot Center</i>\n\n' +
                        '⚡ Статус системы: <code>online</code>\n' +
                        '📅 Время отправки: <code>' + new Date().toLocaleTimeString('ru-RU') + '</code>'
                      );
                      setMsgParseMode('HTML');
                      setMsgResult(null);
                    }}
                    type="button"
                    className="text-left p-3.5 bg-zinc-900/40 hover:bg-[#111113] border border-zinc-900 rounded-lg text-xs transition-all shrink-0 space-y-1 cursor-pointer"
                  >
                    <p className="font-semibold text-zinc-300">HTML Уведомление</p>
                    <p className="text-[10px] text-amber-400/80 font-mono italic truncate">
                      <b>Жирный</b>, <i>курсив</i>, <code>код</code>
                    </p>
                  </button>
                </div>
              </div>
            </div>

            {/* Right side: Beautiful visual Client telegram mockup preview and helper instructions */}
            <div className="lg:col-span-5 space-y-4">
              {/* Telegram Phone Simulator for rendering */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[320px]">
                {/* Simulated Header */}
                <div className="bg-[#121214] border-b border-zinc-900 p-2.5 px-4 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#0088cc] flex items-center justify-center font-bold text-xs uppercase font-sans text-white">
                    {activeBot.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-zinc-100 truncate">{activeBot.name}</p>
                    <p className="text-[9px] text-[#0088cc] font-mono leading-none">бот</p>
                  </div>
                </div>

                {/* Simulated Chat Area */}
                <div className="flex-1 bg-zinc-950 bg-[radial-gradient(#1f2230_1px,transparent_1px)] [background-size:16px_16px] p-4 flex flex-col justify-end min-h-0">
                  <div className="flex justify-end">
                    <div className="bg-[#121214] border border-[#1f1f22] text-zinc-300 py-2.5 px-3 rounded-2xl rounded-tr-none text-xs leading-relaxed max-w-[90%] shadow-lg">
                      {msgText.trim() ? (
                        msgParseMode === 'HTML' ? (
                          renderHTMLPreview(msgText)
                        ) : (
                          <p className="whitespace-pre-wrap">{msgText}</p>
                        )
                      ) : (
                        <p className="italic text-zinc-650 font-mono text-[11px]">
                          [ Начните печатать, чтобы увидеть визуальный рендеринг сообщения ]
                        </p>
                      )}
                      <div className="text-right text-[8px] font-mono text-zinc-500 mt-1 select-none">
                        {new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} ✓✓
                      </div>
                    </div>
                  </div>
                </div>

                {/* Simulated Input footer bar */}
                <div className="p-2 border-t border-zinc-900 bg-[#0d0d0e]/80 text-[10px] text-zinc-500 font-mono text-center select-none">
                  Визуальный симулятор отображения в Telegram
                </div>
              </div>

              {/* Step instructions */}
              <div className="bg-zinc-950/40 border border-zinc-900/60 rounded-xl p-4 space-y-2.5">
                <h4 className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider flex items-center gap-1">
                  <span>Инструкция по отправке</span>
                </h4>
                <div className="text-xs text-zinc-500 leading-relaxed space-y-1.5 font-sans">
                  <p>
                    1. <strong className="text-zinc-300">Найдите Chat ID</strong> вашей целевой группы, канала или личного чата на соседней вкладке <strong className="text-zinc-300">"Updates"</strong>.
                  </p>
                  <p>
                    2. Вставьте его в поле <strong className="text-zinc-300">Chat ID</strong>.
                  </p>
                  <p>
                    3. При необходимости укажите <strong className="text-zinc-300">Topic ID</strong> (полезно для обсуждений/тем внутри супергрупп).
                  </p>
                  <p>
                    4. Составьте текстовое сообщение и нажмите кнопку <strong className="text-zinc-300">"Отправить"</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === 'webhook' && (
        <div className="flex-1 flex overflow-hidden min-h-0 bg-[#080809] p-4 font-sans select-none animate-in fade-in duration-200">
          <div className="flex-1 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-y-auto pr-1">
            {/* Left Column: Webhook Information Status */}
            <div className="lg:col-span-12 xl:col-span-7 space-y-4">
              <div className="bg-[#0c0c0d]/80 border border-zinc-900 rounded-xl p-4 space-y-4 shadow-sm">
                <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-200 tracking-tight flex items-center gap-2">
                      <Globe className="w-4 h-4 text-indigo-400" />
                      <span>Текущий Webhook</span>
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                      Метод API: getWebhookInfo
                    </p>
                  </div>
                  <button
                    onClick={fetchWebhookInfo}
                    disabled={isLoadingWebhook}
                    className="flex items-center gap-1.5 py-1 px-3 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-zinc-350 hover:text-white rounded-md text-[11px] font-medium border border-zinc-805 transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 text-indigo-450 ${isLoadingWebhook ? 'animate-spin' : ''}`} />
                    <span>Проверить webhook</span>
                  </button>
                </div>

                {isLoadingWebhook ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                    <p className="text-xs text-zinc-500 font-mono">Запрос сведений о вебхуке из Telegram...</p>
                  </div>
                ) : webhookError ? (
                  <div className="bg-red-950/10 border border-red-900/30 rounded-lg p-3 text-xs text-red-300 flex items-start gap-2 leading-relaxed">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-red-205">Не удалось загрузить статус вебхука</p>
                      <p className="text-[11px] text-red-400/80 font-mono">{webhookError}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* General state banner */}
                    <div className={`p-3 rounded-lg border flex items-center gap-3 ${
                      webhookInfo?.url 
                        ? 'bg-indigo-950/10 border-indigo-900/35 text-indigo-300' 
                        : 'bg-emerald-950/10 border-emerald-900/30 text-emerald-300'
                    }`}>
                      <div className={`w-2.5 h-2.5 rounded-full ${webhookInfo?.url ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                      <div className="text-xs leading-normal">
                        {webhookInfo?.url ? (
                          <p>Статус: <span className="text-indigo-400 font-semibold">Webhook включён</span>. Telegram пересылает обновления на указанный URL.</p>
                        ) : (
                          <p>Статус: <span className="text-emerald-400 font-semibold">Webhook не установлен</span>. Можно использовать getUpdates (Long Polling).</p>
                        )}
                      </div>
                    </div>

                    {/* Detailed info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* URL */}
                      <div className="bg-zinc-900/30 p-3 rounded-lg border border-zinc-900/80 space-y-0.5 min-w-0">
                        <p className="text-[9px] uppercase font-mono font-bold text-zinc-500 tracking-wider">URL вебхука</p>
                        <p className="text-xs font-semibold text-zinc-100 font-mono truncate select-all" title={webhookInfo?.url || '—'}>
                          {webhookInfo?.url || '—'}
                        </p>
                      </div>

                      {/* Pending updates */}
                      <div className="bg-zinc-900/30 p-3 rounded-lg border border-zinc-900/80 space-y-0.5">
                        <p className="text-[9px] uppercase font-mono font-bold text-zinc-500 tracking-wider">updates в очереди</p>
                        <p className="text-xs font-semibold text-zinc-200 font-mono">
                          {webhookInfo?.pending_update_count !== undefined ? webhookInfo.pending_update_count : '—'}
                        </p>
                      </div>

                      {/* Max connections */}
                      <div className="bg-zinc-900/30 p-3 rounded-lg border border-zinc-900/80 space-y-0.5">
                        <p className="text-[9px] uppercase font-mono font-bold text-zinc-500 tracking-wider font-bold">Лимит соединений</p>
                        <p className="text-xs font-semibold text-zinc-200 font-mono">
                          {webhookInfo?.max_connections !== undefined ? webhookInfo.max_connections : '—'}
                        </p>
                      </div>

                      {/* Allowed updates */}
                      <div className="bg-zinc-900/30 p-3 rounded-lg border border-zinc-900/80 space-y-0.5">
                        <p className="text-[9px] uppercase font-mono font-bold text-zinc-500 tracking-wider">Allowed Updates</p>
                        <p className="text-xs font-semibold text-zinc-200 font-mono truncate">
                          {webhookInfo?.allowed_updates ? webhookInfo.allowed_updates.join(', ') : 'Все'}
                        </p>
                      </div>
                    </div>

                    {/* Error diagnostics */}
                    {(webhookInfo?.last_error_date || webhookInfo?.last_error_message) && (
                      <div className="bg-red-950/10 border border-red-900/30 rounded-lg p-3 space-y-2 text-xs text-red-300">
                        <div className="flex items-center gap-1.5 font-semibold text-red-200">
                          <AlertCircle className="w-4 h-4 text-red-400" />
                          <span>Последняя ошибка</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 text-[11px] pt-1.5 border-t border-red-900/10 font-sans">
                          {webhookInfo.last_error_date && (
                            <div>
                              <span className="text-zinc-500 font-mono">Дата:</span>{' '}
                              <span className="font-semibold font-mono text-zinc-300">
                                {new Date(webhookInfo.last_error_date * 1000).toLocaleString('ru-RU')}
                              </span>
                            </div>
                          )}
                          {webhookInfo.last_error_message && (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-zinc-500 font-mono">Сообщение:</span>
                              <span className="font-semibold font-mono text-red-400 bg-red-950/20 p-2 rounded border border-red-900/20 block select-text whitespace-pre-wrap">
                                {webhookInfo.last_error_message}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Operations success banner feedback */}
                {webhookSuccessMsg && (
                  <div className="bg-emerald-950/10 border border-emerald-950/30 rounded-lg p-3 text-xs text-emerald-300 flex items-start gap-1.5 leading-relaxed">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-emerald-200">Успех</p>
                      <p className="text-[11px] text-emerald-400/80 font-mono mt-0.5">{webhookSuccessMsg}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Deletion Block */}
              {webhookInfo?.url && (
                <div className="bg-[#0c0c0d]/80 border border-zinc-900 rounded-xl p-4 space-y-4 shadow-sm">
                  <h3 className="text-xs font-semibold text-zinc-200 tracking-tight flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <span>Удаление webhook</span>
                  </h3>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={dropPendingUpdates}
                          onChange={(e) => setDropPendingUpdates(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-indigo-600 focus:ring-indigo-600 focus:ring-offset-zinc-900"
                        />
                        <span className="text-[11px] text-zinc-400 group-hover:text-zinc-200 transition-colors">
                          Очистить ожидающие updates (drop_pending_updates)
                        </span>
                      </label>
                      <p className="text-[10px] text-zinc-500 font-mono leading-normal max-w-md">
                        Удаление вебхука мгновенно возвращает бот в классический режим Long Polling. 
                        После этого можно снова нажать "Получить updates".
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isDeletingWebhook}
                      onClick={handleDeleteWebhook}
                      className="py-2 px-4 bg-red-900/20 hover:bg-red-900/40 border border-red-900/40 hover:border-red-900 text-red-200 font-bold rounded-md transition-all text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isDeletingWebhook ? 'Удаление...' : 'Удалить webhook'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Webhook Setup Form & safety checks */}
            <div className="lg:col-span-12 xl:col-span-5 space-y-4">
              <div className="bg-[#0c0c0d]/80 border border-zinc-900 rounded-xl p-4 space-y-4 shadow-sm">
                <div className="border-b border-zinc-900 pb-2">
                  <h3 className="text-xs font-semibold text-zinc-200 tracking-tight flex items-center gap-2">
                    <Globe className="w-4 h-4 text-indigo-400" />
                    <span>Установка webhook</span>
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                    Метод API: setWebhook
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider">
                      URL Обработчика (HTTPS)
                    </label>
                    <input
                      type="url"
                      placeholder="https://yourdomain.com/api/telegram"
                      value={inputWebhookUrl}
                      onChange={(e) => setInputWebhookUrl(e.target.value)}
                      className="w-full bg-[#111113] border border-zinc-805 text-xs text-zinc-200 rounded-md py-2 px-3 placeholder-zinc-650 focus-ring font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider">
                      Secret Token (опционально)
                    </label>
                    <input
                      type="password"
                      placeholder="Секретный токен для проверки"
                      value={inputSecretToken}
                      onChange={(e) => setInputSecretToken(e.target.value)}
                      className="w-full bg-[#111113] border border-zinc-805 text-xs text-zinc-200 rounded-md py-2 px-3 placeholder-zinc-650 focus-ring font-mono"
                    />
                    <p className="text-[9px] text-zinc-600 mt-1">
                      Будет отправлен в заголовке X-Telegram-Bot-Api-Secret-Token
                    </p>
                  </div>

                  {showConfirmSetWebhook ? (
                    <div className="bg-amber-950/10 border border-amber-900/30 rounded-lg p-3.5 space-y-3">
                      <p className="text-[11px] text-amber-300 leading-normal font-sans">
                        ⚠️ После установки webhook метод getUpdates работать не будет.
                      </p>
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setShowConfirmSetWebhook(false)}
                          className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-[10px] text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
                        >
                          Отмена
                        </button>
                        <button
                          type="button"
                          onClick={handleSetWebhook}
                          disabled={isSettingWebhook}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-550 text-white font-semibold rounded text-[10px] shadow transition-all cursor-pointer"
                        >
                          {isSettingWebhook ? 'Сохранение...' : 'Установить webhook'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isSettingWebhook || !inputWebhookUrl.trim()}
                      onClick={() => setShowConfirmSetWebhook(true)}
                      className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-550 disabled:bg-zinc-800/40 disabled:text-zinc-550 text-white font-bold rounded-md transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Установить webhook</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Informational Guidelines Card */}
              <div className="bg-zinc-950/40 border border-zinc-900/60 rounded-xl p-4 space-y-3">
                <h4 className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-zinc-500 font-bold" />
                  <span>Важно</span>
                </h4>
                <div className="text-xs text-zinc-500 leading-relaxed space-y-2 font-sans">
                  <p>
                    • <strong className="text-zinc-450">SSL:</strong> Telegram работает только с HTTPS.
                  </p>
                  <p>
                    • <strong className="text-zinc-450">Conflict:</strong> Webhook и getUpdates не могут работать одновременно.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
