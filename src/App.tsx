import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import BotManager from './components/BotManager';
import ChatManager from './components/ChatManager';
import MessageSender from './components/MessageSender';
import WebhookTester from './components/WebhookTester';
import RoutesManager from './components/RoutesManager';
import LogView from './components/LogView';
import SettingsView from './components/SettingsView';
import { TelegramBot, ChatSession, ChatMessage, SystemLog, AppSettings, NotificationRoute } from './types';
import { db } from './db';

const IS_TAURI = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '___TAURI__' in window || (window as any).__TAURI_IPC__ !== undefined);

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('bots');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  
  // State for creating route from update
  const [initialRouteData, setInitialRouteData] = useState<Partial<NotificationRoute> | null>(null);

  // Default empty bots list to respect the requirement: "пустое состояние 'Боты ещё не добавлены'"
  const [bots, setBots] = useState<TelegramBot[]>([]);

  // Chats states
  const [chats, setChats] = useState<ChatSession[]>([]);

  // Logs state
  const [logs, setLogs] = useState<SystemLog[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString('ru-RU'),
      level: 'success',
      category: 'system',
      message: 'Ядро Telegram Bot Center успешно инициализировано в Tauri v2.0.0.'
    },
    {
      id: 'init-2',
      timestamp: new Date().toLocaleTimeString('ru-RU'),
      level: 'info',
      category: 'database',
      message: 'SQLite локальный кэш подключен в режиме WAL: /db/main.sqlite'
    }
  ]);

  // Is logs simulation running
  const [isRunningLogsModel, setIsRunningLogsModel] = useState(true);

  // App General parameters
  const [settings, setSettings] = useState<AppSettings>({
    language: 'ru',
    autoStart: true,
    themeStyle: 'slate-dark',
    dbPath: '/home/kachios/.config/telegram_bot_center/db.sqlite',
    minifyLogs: false,
    pollingInterval: 500
  });

  // Load bots from local SQLite database / Emulator on mount
  useEffect(() => {
    const initAndLoad = async () => {
      try {
        await db.init();
        const records = await db.getAllBots();
        if (records.length > 0) {
          const loaded: TelegramBot[] = records.map((b) => ({
            id: b.id,
            name: b.name,
            username: b.username || 'unverified_bot',
            token: b.token,
            isActive: b.is_enabled === 1,
            createdAt: new Date(b.created_at).toLocaleDateString('ru-RU'),
            totalUsers: 3, // Standard mockup count
            totalMessages: 0,
            status: b.last_error ? 'error' : (b.last_checked_at ? 'online' : 'offline'),
            description: 'Загружено из SQLite базы данных',
            lastCheckedAt: b.last_checked_at ? new Date(b.last_checked_at).toLocaleString('ru-RU') : undefined,
            lastError: b.last_error || undefined
          }));
          setBots(loaded);
          setSelectedBotId(loaded[0].id);
        } else {
          setBots([]);
        }
      } catch (err) {
        console.error('Ошибка при инициализации базы данных:', err);
      }
    };
    initAndLoad();
  }, []);

  // Background mock logs generator to simulate real desktop daemon activity
  useEffect(() => {
    if (!isRunningLogsModel || bots.length === 0) return;

    const interval = setInterval(() => {
      const activeBots = bots.filter((b) => b.isActive);
      if (activeBots.length === 0) return;

      const randomBot = activeBots[Math.floor(Math.random() * activeBots.length)];

      const logTemplates: Array<{ level: 'info' | 'success' | 'warn'; cat: 'api' | 'webhook' | 'system' | 'database'; msg: string }> = [
        { level: 'info', cat: 'api', msg: `HTTP GET https://api.telegram.org/bot${randomBot.token.split(':')[0]}:**.../getUpdates status 200 OK` },
        { level: 'info', cat: 'api', msg: `Синхронизация смещения обновлений offset успешна.` },
        { level: 'success', cat: 'database', msg: `Записано состояние пользователей в tauri_sqlite3_db.` },
        { level: 'info', cat: 'system', msg: `Таймаут соединения продлен - TCP Keep-Alive.` },
        { level: 'warn', cat: 'api', msg: `Задержка ответа от Telegram API серверов составила 420мс` },
        { level: 'info', cat: 'webhook', msg: `Проверка SSL сертификата вебхука завершена.` }
      ];

      const selectedTemplate = logTemplates[Math.floor(Math.random() * logTemplates.length)];

      const freshLog: SystemLog = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString('ru-RU'),
        level: selectedTemplate.level,
        category: selectedTemplate.cat as any,
        botId: randomBot.id,
        message: selectedTemplate.msg
      };

      setLogs((prev) => [...prev, freshLog]);

      // Automatically increment bot message count randomly to simulate passive bot usage
      setBots((prevBots) =>
        prevBots.map((b) => {
          if (b.id === randomBot.id) {
            return {
              ...b,
              totalMessages: b.totalMessages + Math.floor(Math.random() * 3) + 1
            };
          }
          return b;
        })
      );
    }, 7000);

    return () => clearInterval(interval);
  }, [isRunningLogsModel, bots]);

  const handleAddBot = async (name: string, token: string) => {
    const freshId = `bot-${Date.now()}`;
    const botIdFromToken = token.trim().split(':')[0] || '';
    
    // Save to SQLite
    const botToInsert = {
      id: freshId,
      name: name.trim(),
      token: token.trim(),
      username: 'pending_bot',
      telegram_bot_id: botIdFromToken || null,
      is_enabled: 1,
      last_checked_at: null,
      last_error: null
    };

    await db.insertBot(botToInsert);

    // Map to client state representation
    const newBot: TelegramBot = {
      id: freshId,
      name: name.trim(),
      username: 'pending_bot',
      token: token.trim(),
      isActive: true,
      createdAt: new Date().toLocaleDateString('ru-RU'),
      totalUsers: 3,
      totalMessages: 0,
      status: 'offline',
      description: 'Добавлен и занесен в локальную базу данных SQLite.'
    };

    setBots((prev) => [...prev, newBot]);
    setSelectedBotId(freshId);

    // Stream logs for sqlite transaction
    const nowStr = new Date().toLocaleTimeString('ru-RU');
    setLogs((prev) => [
      ...prev,
      {
        id: `log-add-${Date.now()}-1`,
        timestamp: nowStr,
        level: 'info',
        category: 'database',
        message: `INSERT INTO bots (id='${freshId}', name='${name}') в файл SQLite.`
      },
      {
        id: `log-add-${Date.now()}-2`,
        timestamp: nowStr,
        level: 'success',
        category: 'system',
        message: `Локальный кэш SQLite: новый бот добавлен в Telegram Bot Center.`
      }
    ]);

    // Seed mock dialogues for this newly added bot so other tabs work instantly!
    const testChats: ChatSession[] = [
      {
        botId: freshId,
        userId: `client-1-${Date.now()}`,
        fullName: 'Александр Кузнецов',
        username: 'alex_kuznetsov_arch',
        lastMessage: 'Привет! Помоги запустить бота tauri',
        timestamp: '15:10',
        unread: true,
        messages: [
          {
            id: 'm1',
            botId: freshId,
            userId: `client-1-${Date.now()}`,
            fullName: 'Александр Кузнецов',
            username: 'alex_kuznetsov_arch',
            text: 'Здравствуйте! Я только что установил приложение.',
            timestamp: '15:08',
            direction: 'in',
            status: 'delivered'
          },
          {
            id: 'm2',
            botId: freshId,
            userId: `client-1-${Date.now()}`,
            fullName: 'Александр Кузнецов',
            username: 'alex_kuznetsov_arch',
            text: 'Привет! Помоги запустить бота tauri',
            timestamp: '15:10',
            direction: 'in',
            status: 'delivered'
          }
        ]
      },
      {
        botId: freshId,
        userId: `client-2-${Date.now()}`,
        fullName: 'Мария Макарова',
        username: 'mariya_makarova',
        lastMessage: 'Планируется ли интеграция автовыгрузки логов?',
        timestamp: '12:44',
        unread: false,
        messages: [
          {
            id: 'mm1',
            botId: freshId,
            userId: `client-2-${Date.now()}`,
            fullName: 'Мария Макарова',
            username: 'mariya_makarova',
            text: 'Приветствую! Бот супер, работает моментально.',
            timestamp: '12:40',
            direction: 'in',
            status: 'delivered'
          },
          {
            id: 'mm2',
            botId: freshId,
            userId: `client-2-${Date.now()}`,
            fullName: 'Мария Макарова',
            username: 'mariya_makarova',
            text: 'Планируется ли интеграция автовыгрузки логов?',
            timestamp: '12:44',
            direction: 'in',
            status: 'delivered'
          }
        ]
      },
      {
        botId: freshId,
        userId: `client-3-${Date.now()}`,
        fullName: 'Игорь Смирнов',
        username: 'igor_smirnoff',
        lastMessage: 'Все работает, спасибо за помощь',
        timestamp: 'Вчера',
        unread: false,
        messages: [
          {
            id: 'ig1',
            botId: freshId,
            userId: `client-3-${Date.now()}`,
            fullName: 'Игорь Смирнов',
            username: 'igor_smirnoff',
            text: 'А тут SQLite работает локально?',
            timestamp: '18:02',
            direction: 'in',
            status: 'delivered'
          },
          {
            id: 'ig2',
            botId: freshId,
            userId: `client-3-${Date.now()}`,
            fullName: 'Игорь Смирнов',
            username: 'igor_smirnoff',
            text: 'Да, база синхронизирована.',
            timestamp: '18:05',
            direction: 'out',
            status: 'sent'
          },
          {
            id: 'ig3',
            botId: freshId,
            userId: `client-3-${Date.now()}`,
            fullName: 'Игорь Смирнов',
            username: 'igor_smirnoff',
            text: 'Все работает, спасибо за помощь',
            timestamp: '18:10',
            direction: 'in',
            status: 'delivered'
          }
        ]
      }
    ];

    setChats((prev) => [...testChats, ...prev]);

    // Automatically verify the bot
    handleVerifyBot(freshId);
  };

  const handleUpdateBotName = async (id: string, newName: string) => {
    // Write in DB SQLite
    await db.updateBotName(id, newName);

    setBots((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          setLogs((l) => [
            ...l,
            {
              id: `log-update-name-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString('ru-RU'),
              level: 'success',
              category: 'database',
              message: `UPDATE bots SET name = '${newName}' WHERE id = '${id}'`
            }
          ]);
          return { ...b, name: newName };
        }
        return b;
      })
    );
  };

  const handleToggleActive = async (id: string) => {
    let nextActive = false;
    setBots((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          nextActive = !b.isActive;
          setLogs((l) => [
            ...l,
            {
              id: `log-active-toggle-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString('ru-RU'),
              level: nextActive ? 'success' : 'warn',
              category: 'database',
              message: `UPDATE bots SET is_enabled = ${nextActive ? 1 : 0} WHERE id = '${id}'`
            }
          ]);
          return { ...b, isActive: nextActive };
        }
        return b;
      })
    );

    await db.updateBotEnabled(id, nextActive);
  };

  const handleDeleteBot = async (id: string) => {
    const targetBot = bots.find((b) => b.id === id);
    if (!targetBot) return;

    setLogs((l) => [
      ...l,
      {
        id: `log-del-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('ru-RU'),
        level: 'warn',
        category: 'database',
        message: `DELETE FROM bots WHERE id = '${id}'`
      }
    ]);

    setBots((prev) => prev.filter((b) => b.id !== id));
    setChats((prev) => prev.filter((c) => c.botId !== id));

    if (selectedBotId === id) {
      const remaining = bots.filter((b) => b.id !== id);
      setSelectedBotId(remaining.length > 0 ? remaining[0].id : null);
    }

    await db.deleteBot(id);
  };

  const handleVerifyBot = async (id: string): Promise<void> => {
    const bot = bots.find(b => b.id === id);
    if (!bot) return;

    const IS_TAURI = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '___TAURI__' in window || (window as any).__TAURI_IPC__ !== undefined);

    let resultOk = false;
    let usernameResult = 'pending_bot';
    let botIdResult: string | null = null;
    let errorMessage: string | null = null;

    try {
      if (IS_TAURI) {
        const { invoke } = await import('@tauri-apps/api/core');
        const res: any = await invoke('get_bot_me', { token: bot.token });
        if (res && res.ok && res.result) {
          resultOk = true;
          usernameResult = res.result.username || 'unnamed_bot';
          botIdResult = String(res.result.id);
        } else {
          errorMessage = res.description || 'Не удалось подключиться к боту. Проверьте token.';
        }
      } else {
        const response = await fetch('/api/getMe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ token: bot.token })
        });
        const res = await response.json();
        if (res && res.ok && res.result) {
          resultOk = true;
          usernameResult = res.result.username || 'unnamed_bot';
          botIdResult = String(res.result.id);
        } else {
          errorMessage = res.description || 'Не удалось подключиться к боту. Проверьте token.';
        }
      }
    } catch (err: any) {
      console.error('Ошибка верификации бота:', err);
      errorMessage = 'Не удалось подключиться к боту. Проверьте token.';
    }

    await db.updateBotVerification(id, usernameResult, botIdResult, errorMessage);

    const nowStr = new Date().toLocaleTimeString('ru-RU');
    setLogs((prev) => [
      ...prev,
      {
        id: `verify-log-${Date.now()}-1`,
        timestamp: nowStr,
        level: 'info',
        category: 'api',
        message: `Проверка bot_id: ${id.slice(4,12)} через метод Telegram Bot API getMe...`
      },
      {
        id: `verify-log-${Date.now()}-2`,
        timestamp: nowStr,
        level: resultOk ? 'success' : 'warn',
        category: resultOk ? 'api' : 'system',
        message: resultOk 
          ? `Успешно подключено к Telegram Bot API (@${usernameResult}, ID: ${botIdResult})` 
          : `Ошибка верификации: Описание [${errorMessage}]`
      }
    ]);

    setBots((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          return {
            ...b,
            username: usernameResult,
            status: resultOk ? 'online' : 'error',
            lastCheckedAt: new Date().toLocaleString('ru-RU'),
            lastError: errorMessage || undefined
          };
        }
        return b;
      })
    );
  };

  // Chat actions
  const handleSendMessage = (botId: string, userId: string, text: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    setChats((prev) =>
      prev.map((c) => {
        if (c.botId === botId && c.userId === userId) {
          return {
            ...c,
            lastMessage: text,
            timestamp: timeStr,
            unread: false,
            messages: [
              ...c.messages,
              {
                id: `msg-sent-${Date.now()}`,
                botId,
                userId,
                fullName: c.fullName,
                username: c.username,
                text,
                timestamp: timeStr,
                direction: 'out',
                status: 'sent'
              }
            ]
          };
        }
        return c;
      })
    );

    // Also write to development logs
    const targetBot = bots.find((b) => b.id === botId);
    setLogs((l) => [
      ...l,
      {
        id: `log-chat-${Date.now()}`,
        timestamp: now.toLocaleTimeString('ru-RU'),
        level: 'info',
        category: 'api',
        message: `Ответное сообщение отправлено пользователю ID ${userId} от @${targetBot?.username || 'bot'}`
      }
    ]);
  };

  // Receive simulated incoming message (e.g., webhook payload test or simulated chat reply)
  const handleReceiveMessageSimulated = (
    botId: string,
    userId: string,
    text: string,
    fullName: string,
    username: string
  ) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    setChats((prev) => {
      // Find if chat session already exists
      const chatExists = prev.some((c) => c.botId === botId && c.userId === userId);

      if (chatExists) {
        return prev.map((c) => {
          if (c.botId === botId && c.userId === userId) {
            return {
              ...c,
              lastMessage: text,
              timestamp: timeStr,
              unread: activeTab !== 'chats', // Mark unread if not looking at the chats dashboard
              messages: [
                ...c.messages,
                {
                  id: `msg-recv-${Date.now()}`,
                  botId,
                  userId,
                  fullName,
                  username,
                  text,
                  timestamp: timeStr,
                  direction: 'in',
                  status: 'delivered'
                }
              ]
            };
          }
          return c;
        });
      } else {
        // Create new session if none exists
        const newSession: ChatSession = {
          botId,
          userId,
          fullName,
          username,
          lastMessage: text,
          timestamp: timeStr,
          unread: true,
          messages: [
            {
              id: `msg-recv-first-${Date.now()}`,
              botId,
              userId,
              fullName,
              username,
              text,
              timestamp: timeStr,
              direction: 'in',
              status: 'delivered'
            }
          ]
        };
        return [newSession, ...prev];
      }
    });

    const targetBot = bots.find((b) => b.id === botId);
    setLogs((l) => [
      ...l,
      {
        id: `log-recv-terminal-${Date.now()}`,
        timestamp: now.toLocaleTimeString('ru-RU'),
        level: 'success',
        category: 'webhook',
        message: `Входящее сообщение от @${username} для @${targetBot?.username || 'bot'}: "${text.length > 30 ? text.slice(0, 30) + '...' : text}"`
      }
    ]);
  };

  const handleLogMessageCustom = (message: string, level: 'info' | 'success' | 'warn' | 'error') => {
    setLogs((prev) => [
      ...prev,
      {
        id: `custom-log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('ru-RU'),
        level,
        category: 'system',
        message
      }
    ]);
  };

  const handleResetApplication = () => {
    if (window.confirm('Вы действительно хотите стереть все данные сессии? Они вернутся в пустое состояние.')) {
      setBots([]);
      setChats([]);
      setSelectedBotId(null);
      setLogs([
        {
          id: `log-reset-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('ru-RU'),
          level: 'warn',
          category: 'system',
          message: 'Произведен сброс локального хранилища данных. Логи очищены.'
        }
      ]);
    }
  };

  const handleSeedLogsForce = () => {
    const freshLogs: SystemLog[] = [
      { id: 'dl-1', timestamp: new Date().toLocaleTimeString('ru-RU'), level: 'success', category: 'database', message: 'Миграция SQLite таблиц завершена. Создано: bots, chats, log_entries.' },
      { id: 'dl-2', timestamp: new Date().toLocaleTimeString('ru-RU'), level: 'info', category: 'system', message: 'Запуск виртуальной ноды Arch Linux / KachiOS.' },
      { id: 'dl-3', timestamp: new Date().toLocaleTimeString('ru-RU'), level: 'info', category: 'api', message: 'Прослушивание локального сокета tauri-IPC.' },
      { id: 'dl-4', timestamp: new Date().toLocaleTimeString('ru-RU'), level: 'error', category: 'api', message: 'Bot API handshake вернул код 401 Unauthorized для невалидного токена.' }
    ];
    setLogs((prev) => [...prev, ...freshLogs]);
  };

  const handleCreateRouteFromUpdate = (rawUpd: any) => {
    let chatId = '';
    let chatTitle = '';
    let threadId = '';
    let threadTitle = '';

    const inner = rawUpd.message || rawUpd.callback_query?.message || rawUpd.channel_post || rawUpd.my_chat_member || rawUpd.chat_member;
    
    if (inner) {
      if (inner.chat) {
        chatId = String(inner.chat.id);
        chatTitle = inner.chat.title || inner.chat.username || inner.chat.first_name || 'Приватный чат';
      }
      if (inner.message_thread_id) {
        threadId = String(inner.message_thread_id);
      }
    }

    setInitialRouteData({
      bot_id: selectedBotId || (bots[0]?.id || ''),
      chat_id: chatId,
      chat_title: chatTitle,
      message_thread_id: threadId || null,
      thread_title: threadTitle || null,
      name: chatTitle ? `Маршрут: ${chatTitle}` : ''
    });
    
    setActiveTab('routes');
  };

  // Determine active background styles based on Settings selected dark theme
  const getThemeBackground = () => {
    switch (settings.themeStyle) {
      case 'pitch-black':
        return 'bg-[#000000]';
      case 'deep-space':
        return 'bg-[#0b0d14]';
      case 'slate-dark':
      default:
        return 'bg-[#0c0c0d]';
    }
  };

  const renderActiveViewport = () => {
    switch (activeTab) {
      case 'bots':
        return (
          <BotManager
            bots={bots}
            onAddBot={handleAddBot}
            onUpdateBotName={handleUpdateBotName}
            onToggleActive={handleToggleActive}
            onDeleteBot={handleDeleteBot}
            onVerifyBot={handleVerifyBot}
            onOpenBot={(id) => {
              setSelectedBotId(id);
              setActiveTab('chats');
            }}
            searchQuery={searchQuery}
          />
        );
      case 'chats':
        return (
          <ChatManager
            bots={bots}
            selectedBotId={selectedBotId}
            chats={chats}
            onSendMessage={handleSendMessage}
            onReceiveMessageSimulated={handleReceiveMessageSimulated}
            onCreateRouteFromUpdate={handleCreateRouteFromUpdate}
          />
        );
      case 'routes':
        return (
          <RoutesManager
            bots={bots.map(b => ({
              id: b.id,
              name: b.name,
              token: b.token,
              username: b.username,
              telegram_bot_id: null,
              is_enabled: b.isActive ? 1 : 0,
              last_checked_at: b.lastCheckedAt || null,
              last_error: b.lastError || null,
              created_at: b.createdAt,
              updated_at: ''
            }))}
            onLogMessage={handleLogMessageCustom}
            initialRouteData={initialRouteData}
            onRouteCreated={() => setInitialRouteData(null)}
          />
        );
      case 'templates':
        return (
          <MessageTemplatesManager
            bots={bots.map(b => ({
              id: b.id,
              name: b.name,
              token: b.token,
              username: b.username,
              telegram_bot_id: null,
              is_enabled: b.isActive ? 1 : 0,
              last_checked_at: b.lastCheckedAt || null,
              last_error: b.lastError || null,
              created_at: b.createdAt,
              updated_at: ''
            }))}
            onLogMessage={handleLogMessageCustom}
          />
        );
      case 'messages':
        return (
          <MessageSender
            bots={bots}
            selectedBotId={selectedBotId}
            onLogMessage={handleLogMessageCustom}
          />
        );
      case 'webhook':
        return (
          <WebhookTester
            bots={bots}
            selectedBotId={selectedBotId}
            onLogMessage={handleLogMessageCustom}
            onReceiveMessageSimulated={handleReceiveMessageSimulated}
          />
        );
      case 'logs':
        return (
          <LogView
            logs={logs}
            onClearLogs={() => setLogs([])}
            isRunningModel={isRunningLogsModel}
            setIsRunningModel={setIsRunningLogsModel}
          />
        );
      case 'settings':
        return (
          <SettingsView
            settings={settings}
            onSaveSettings={(s) => setSettings(s)}
            onResetApp={handleResetApplication}
            onSeedLogs={handleSeedLogsForce}
          />
        );
      default:
        return (
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            В разработке...
          </div>
        );
    }
  };

  return (
    <div className={`h-screen w-screen flex text-zinc-100 ${getThemeBackground()} font-sans overflow-hidden antialiased`}>
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        bots={bots}
        selectedBotId={selectedBotId}
        setSelectedBotId={setSelectedBotId}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          botsCount={bots.length}
          activeBotsCount={bots.filter((b) => b.isActive).length}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* Dynamic Screen Viewport */}
        <main className="flex-1 flex flex-col min-h-0 bg-transparent">
          {renderActiveViewport()}
        </main>
      </div>
    </div>
  );
}

