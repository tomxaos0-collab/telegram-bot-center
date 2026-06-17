import React, { useState, useEffect } from 'react';
import { Route, Plus, Send, Copy, FileJson, Trash2, Edit3, CheckCircle, AlertCircle, RefreshCw, Info, ExternalLink, Power } from 'lucide-react';
import { db } from '../db';
import { NotificationRoute, BotRecord, EventType } from '../types';

interface RoutesManagerProps {
  bots: BotRecord[];
  onLogMessage: (message: string, level: 'info' | 'success' | 'warn' | 'error') => void;
  // Optional route to pre-fill (from updates)
  initialRouteData?: Partial<NotificationRoute> | null;
  onRouteCreated?: () => void;
}

const EVENT_TYPES: { value: EventType; label: string; prefix: string }[] = [
  { value: 'release_updates', label: 'Релизы проекта', prefix: 'RELEASE' },
  { value: 'system_error', label: 'Ошибки сайта', prefix: 'SYSTEM_ERROR' },
  { value: 'purchase_request', label: 'Заявки на закупку', prefix: 'PURCHASE_REQUEST' },
  { value: 'purchase_approved', label: 'Заявки одобрены', prefix: 'PURCHASE_APPROVED' },
  { value: 'purchase_received', label: 'Заявки получены', prefix: 'PURCHASE_RECEIVED' },
  { value: 'z_report', label: 'Z-отчёты', prefix: 'Z_REPORT' },
  { value: 'encashment', label: 'Инкассации', prefix: 'ENCASHMENT' },
  { value: 'shift_open', label: 'Открытие смены', prefix: 'SHIFT_OPEN' },
  { value: 'shift_close', label: 'Закрытие смены', prefix: 'SHIFT_CLOSE' },
  { value: 'waste', label: 'Списания', prefix: 'WASTE' },
  { value: 'announcement', label: 'Объявления', prefix: 'ANNOUNCEMENT' },
  { value: 'custom', label: 'Свой тип', prefix: 'CUSTOM' },
];

export default function RoutesManager({
  bots,
  onLogMessage,
  initialRouteData,
  onRouteCreated
}: RoutesManagerProps) {
  const [routes, setRoutes] = useState<NotificationRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<NotificationRoute | null>(null);
  const [isTesting, setIsTesting] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    event_type: 'release_updates' as EventType,
    bot_id: '',
    chat_id: '',
    chat_title: '',
    message_thread_id: '',
    thread_title: '',
    is_enabled: 1
  });

  useEffect(() => {
    loadRoutes();
  }, []);

  useEffect(() => {
    if (initialRouteData) {
      setFormData({
        name: initialRouteData.name || '',
        event_type: initialRouteData.event_type || 'release_updates',
        bot_id: initialRouteData.bot_id || (bots[0]?.id || ''),
        chat_id: initialRouteData.chat_id || '',
        chat_title: initialRouteData.chat_title || '',
        message_thread_id: initialRouteData.message_thread_id || '',
        thread_title: initialRouteData.thread_title || '',
        is_enabled: 1
      });
      setShowForm(true);
    }
  }, [initialRouteData, bots]);

  const loadRoutes = async () => {
    setIsLoading(true);
    const data = await db.getAllRoutes();
    setRoutes(data);
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const routeToSave: Omit<NotificationRoute, 'created_at' | 'updated_at'> = {
      id: editingRoute?.id || crypto.randomUUID(),
      name: formData.name,
      event_type: formData.event_type,
      bot_id: formData.bot_id,
      chat_id: formData.chat_id,
      chat_title: formData.chat_title,
      message_thread_id: formData.message_thread_id || null,
      thread_title: formData.thread_title || null,
      is_enabled: formData.is_enabled,
      last_test_at: editingRoute?.last_test_at || null,
      last_test_status: editingRoute?.last_test_status || 'none',
      last_error: editingRoute?.last_error || null,
    };

    if (editingRoute) {
      await db.updateRoute({ ...routeToSave, created_at: editingRoute.created_at, updated_at: '' } as any);
      onLogMessage(`Маршрут "${formData.name}" обновлен.`, 'success');
    } else {
      await db.insertRoute(routeToSave);
      onLogMessage(`Маршрут "${formData.name}" создан успешно.`, 'success');
    }

    setShowForm(false);
    setEditingRoute(null);
    loadRoutes();
    if (onRouteCreated) onRouteCreated();
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Вы уверены, что хотите удалить маршрут "${name}"?`)) {
      await db.deleteRoute(id);
      onLogMessage(`Маршрут "${name}" удален.`, 'info');
      loadRoutes();
    }
  };

  const handleToggleEnabled = async (route: NotificationRoute) => {
    const updated = { ...route, is_enabled: route.is_enabled === 1 ? 0 : 1 };
    await db.updateRoute(updated);
    loadRoutes();
  };

  const handleTestRoute = async (route: NotificationRoute) => {
    const bot = bots.find(b => b.id === route.bot_id);
    if (!bot) {
      onLogMessage(`Бот для маршрута "${route.name}" не найден.`, 'error');
      return;
    }

    setIsTesting(route.id);
    onLogMessage(`Тестирование маршрута "${route.name}"...`, 'info');

    const IS_TAURI = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '___TAURI__' in window || (window as any).__TAURI_IPC__ !== undefined);

    const eventLabel = EVENT_TYPES.find(e => e.value === route.event_type)?.label || route.event_type;
    const testText = `🧪 <b>Тест маршрута Telegram Bot Center</b>\n\n` +
      `<b>Маршрут:</b> ${route.name}\n` +
      `<b>Тип события:</b> ${eventLabel}\n` +
      `<b>Чат:</b> ${route.chat_title}\n` +
      `<b>Топик:</b> ${route.thread_title || 'без топика'}\n\n` +
      `<code>chat_id: ${route.chat_id}</code>\n` +
      `<code>thread_id: ${route.message_thread_id || '—'}</code>`;

    try {
      let result: any;
      if (IS_TAURI) {
        const { invoke } = await import('@tauri-apps/api/core');
        result = await invoke('send_message', {
          token: bot.token,
          chatId: route.chat_id,
          messageThreadId: route.message_thread_id ? parseInt(route.message_thread_id) : null,
          text: testText,
          parseMode: 'HTML'
        });
      } else {
        // Simulation mode
        await new Promise(r => setTimeout(r, 1000));
        result = { ok: true };
      }

      if (result.ok) {
        await db.updateRouteTestStatus(route.id, 'success', null);
        onLogMessage(`Тест маршрута "${route.name}" успешен. Сообщение отправлено.`, 'success');
      } else {
        const errMsg = result.description || 'Ошибка API Telegram';
        await db.updateRouteTestStatus(route.id, 'error', errMsg);
        onLogMessage(`Ошибка теста маршрута "${route.name}": ${errMsg}`, 'error');
      }
    } catch (err: any) {
      const errMsg = err.toString();
      await db.updateRouteTestStatus(route.id, 'error', errMsg);
      onLogMessage(`Ошибка при отправке теста: ${errMsg}`, 'error');
    } finally {
      setIsTesting(null);
      loadRoutes();
    }
  };

  const handleCopyEnv = (route: NotificationRoute) => {
    const bot = bots.find(b => b.id === route.bot_id);
    const event = EVENT_TYPES.find(e => e.value === route.event_type);
    const prefix = event?.prefix || 'CUSTOM';

    const env = `${prefix}_TELEGRAM_BOT_USERNAME=@${bot?.username || 'unknown_bot'}\n` +
      `${prefix}_TELEGRAM_CHAT_ID=${route.chat_id}\n` +
      `${prefix}_TELEGRAM_THREAD_ID=${route.message_thread_id || ''}`;

    navigator.clipboard.writeText(env);
    onLogMessage(`ENV для маршрута "${route.name}" скопирован.`, 'success');
  };

  const handleCopyJson = (route: NotificationRoute) => {
    const bot = bots.find(b => b.id === route.bot_id);
    const json = JSON.stringify({
      event_type: route.event_type,
      bot_username: `@${bot?.username || 'unknown_bot'}`,
      chat_id: route.chat_id,
      chat_title: route.chat_title,
      message_thread_id: route.message_thread_id,
      thread_title: route.thread_title
    }, null, 2);

    navigator.clipboard.writeText(json);
    onLogMessage(`JSON для маршрута "${route.name}" скопирован.`, 'success');
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-[#080809]">
      {/* Toolbar */}
      <div className="border-b border-[#1f1f22] bg-[#0d0d0e]/95 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Route className="w-4 h-4 text-indigo-400" />
          <h2 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">Маршруты уведомлений</h2>
        </div>
        <button
          onClick={() => {
            setEditingRoute(null);
            setFormData({
              name: '',
              event_type: 'release_updates',
              bot_id: bots[0]?.id || '',
              chat_id: '',
              chat_title: '',
              message_thread_id: '',
              thread_title: '',
              is_enabled: 1
            });
            setShowForm(true);
          }}
          className="flex items-center gap-1.5 py-1.5 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 rounded-md text-[11px] font-bold transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Создать маршрут</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
            <p className="text-xs text-zinc-500 font-mono">Загрузка маршрутов...</p>
          </div>
        ) : routes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/10">
            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600">
              <Route className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-zinc-300 font-semibold text-sm">Маршруты ещё не настроены</h3>
              <p className="text-xs text-zinc-500 max-w-sm px-6">
                Получите updates в разделе "Диалоги" или создайте маршрут вручную для управления уведомлениями.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto border border-zinc-900 bg-[#0a0a0b]/60 rounded-lg">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-zinc-900 text-[10px] uppercase font-mono font-bold text-zinc-500 tracking-wider bg-zinc-950/60">
                  <th className="py-2.5 px-4">Название</th>
                  <th className="py-2.5 px-4">Тип события</th>
                  <th className="py-2.5 px-4">Бот</th>
                  <th className="py-2.5 px-4">Чат / Группа</th>
                  <th className="py-2.5 px-4">chat_id / topic_id</th>
                  <th className="py-2.5 px-4">Статус</th>
                  <th className="py-2.5 px-4 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-950 text-xs text-zinc-300">
                {routes.map((route) => {
                  const bot = bots.find(b => b.id === route.bot_id);
                  const event = EVENT_TYPES.find(e => e.value === route.event_type);
                  return (
                    <tr key={route.id} className="hover:bg-zinc-900/20 transition-colors group">
                      <td className="py-3 px-4 font-semibold text-zinc-200">
                        {route.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-1.5 py-0.5 rounded bg-indigo-900/20 text-indigo-400 border border-indigo-900/30 text-[10px] font-mono">
                          {event?.label || route.event_type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-zinc-400">@{bot?.username || 'unknown'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="text-zinc-200">{route.chat_title}</span>
                          {route.thread_title && (
                            <span className="text-[10px] text-zinc-500 font-mono">Topic: {route.thread_title}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px]">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-zinc-400">{route.chat_id}</span>
                          {route.message_thread_id && (
                            <span className="text-amber-500/80">thread: {route.message_thread_id}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {route.is_enabled === 1 ? (
                          <div className="flex items-center gap-1.5">
                            {route.last_test_status === 'success' ? (
                              <div className="flex items-center gap-1.5 text-emerald-400" title="Активен и проверен">
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span className="text-[10px]">Активен</span>
                              </div>
                            ) : route.last_test_status === 'error' ? (
                              <div className="flex items-center gap-1.5 text-red-400" title={route.last_error || 'Ошибка теста'}>
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span className="text-[10px]">Ошибка</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-zinc-500" title="Не проверен тестом">
                                <Info className="w-3.5 h-3.5" />
                                <span className="text-[10px]">Не проверен</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-zinc-650">
                            <Power className="w-3.5 h-3.5" />
                            <span className="text-[10px]">Выключен</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleTestRoute(route)}
                            disabled={isTesting === route.id}
                            className="p-1.5 text-zinc-400 hover:text-emerald-400 transition-colors"
                            title="Отправить тест"
                          >
                            <Send className={`w-3.5 h-3.5 ${isTesting === route.id ? 'animate-pulse' : ''}`} />
                          </button>
                          <button
                            onClick={() => handleCopyEnv(route)}
                            className="p-1.5 text-zinc-400 hover:text-blue-400 transition-colors"
                            title="Скопировать ENV"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleCopyJson(route)}
                            className="p-1.5 text-zinc-400 hover:text-amber-400 transition-colors"
                            title="Скопировать JSON"
                          >
                            <FileJson className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingRoute(route);
                              setFormData({
                                name: route.name,
                                event_type: route.event_type,
                                bot_id: route.bot_id,
                                chat_id: route.chat_id,
                                chat_title: route.chat_title,
                                message_thread_id: route.message_thread_id || '',
                                thread_title: route.thread_title || '',
                                is_enabled: route.is_enabled
                              });
                              setShowForm(true);
                            }}
                            className="p-1.5 text-zinc-400 hover:text-white transition-colors"
                            title="Редактировать"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(route.id, route.name)}
                            className="p-1.5 text-zinc-400 hover:text-red-400 transition-colors"
                            title="Удалить"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Route Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#0c0c0d] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-[#121214]">
              <h3 className="text-sm font-bold text-zinc-100">
                {editingRoute ? 'Редактирование маршрута' : 'Создание нового маршрута'}
              </h3>
              <button 
                onClick={() => { setShowForm(false); setEditingRoute(null); }}
                className="text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 font-sans">
              {/* Mode Toggle */}
              <div className="flex bg-zinc-900/60 p-1 rounded-lg border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsManualMode(false)}
                  className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                    !isManualMode ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-400'
                  }`}
                >
                  Из найденных
                </button>
                <button
                  type="button"
                  onClick={() => setIsManualMode(true)}
                  className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                    isManualMode ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-400'
                  }`}
                >
                  Вручную
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider">
                    Название маршрута
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Пример: Релизы Retail Core"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded-md py-2 px-3 focus-ring"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Event Type */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider">
                      Тип события
                    </label>
                    <select
                      value={formData.event_type}
                      onChange={(e) => setFormData({ ...formData, event_type: e.target.value as EventType })}
                      className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded-md py-2 px-3 focus-ring"
                    >
                      {EVENT_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Bot */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider">
                      Исполнитель (Бот)
                    </label>
                    <select
                      value={formData.bot_id}
                      onChange={(e) => setFormData({ ...formData, bot_id: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded-md py-2 px-3 focus-ring"
                    >
                      {bots.map(bot => (
                        <option key={bot.id} value={bot.id}>@{bot.username}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {!isManualMode ? (
                  <>
                    {/* Select from found chats */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider flex items-center justify-between">
                        <span>Выбрать чат из найденных</span>
                        <span className="text-[9px] text-zinc-600 lowercase font-normal italic">Всего: {foundChats.filter(c => c.bot_id === formData.bot_id).length}</span>
                      </label>
                      <select
                        value={formData.chat_id}
                        onChange={(e) => {
                          const chat = foundChats.find(c => c.chat_id === e.target.value && c.bot_id === formData.bot_id);
                          if (chat) {
                            setFormData({
                              ...formData,
                              chat_id: chat.chat_id,
                              chat_title: chat.chat_title,
                              message_thread_id: '',
                              thread_title: '',
                              name: formData.name || chat.chat_title
                            });
                          }
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded-md py-2 px-3 focus-ring"
                      >
                        <option value="">-- Выберите чат --</option>
                        {foundChats
                          .filter(c => c.bot_id === formData.bot_id)
                          .map(chat => (
                            <option key={`${chat.bot_id}-${chat.chat_id}`} value={chat.chat_id}>
                              {chat.chat_title} ({chat.chat_id})
                            </option>
                          ))}
                      </select>
                      {foundChats.filter(c => c.bot_id === formData.bot_id).length === 0 && (
                        <p className="text-[9px] text-amber-500/80 mt-1">Ничего не найдено. Напишите боту в Telegram и нажмите "Получить updates".</p>
                      )}
                    </div>

                    {/* Select Topic if any */}
                    {formData.chat_id && (
                      <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                        <label className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider">
                          Выбрать топик (если есть)
                        </label>
                        <select
                          value={formData.message_thread_id}
                          onChange={(e) => {
                            const chat = foundChats.find(c => c.chat_id === formData.chat_id && c.bot_id === formData.bot_id);
                            const topic = chat?.topics.find(t => t.id === e.target.value);
                            setFormData({
                              ...formData,
                              message_thread_id: e.target.value,
                              thread_title: topic?.title || ''
                            });
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded-md py-2 px-3 focus-ring"
                        >
                          <option value="">-- Без топика (Основной чат) --</option>
                          {foundChats
                            .find(c => c.chat_id === formData.chat_id && c.bot_id === formData.bot_id)
                            ?.topics.map(topic => (
                              <option key={topic.id} value={topic.id}>{topic.title} (ID: {topic.id})</option>
                            ))}
                        </select>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Chat ID */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
                          Chat ID
                          <div className="group relative">
                            <Info className="w-3 h-3 text-zinc-500 cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-zinc-950 text-[9px] text-zinc-400 rounded-md border border-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                              ID группы, канала или личного чата. Обычно начинается с -100 для групп.
                            </div>
                          </div>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="-1001234567890"
                          value={formData.chat_id}
                          onChange={(e) => setFormData({ ...formData, chat_id: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded-md py-2 px-3 focus-ring font-mono"
                        />
                      </div>

                      {/* Chat Title */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider">
                          Название чата
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Retail Core"
                          value={formData.chat_title}
                          onChange={(e) => setFormData({ ...formData, chat_title: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded-md py-2 px-3 focus-ring"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Topic ID */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
                          Topic ID (thread_id)
                        </label>
                        <input
                          type="text"
                          placeholder="123 (опционально)"
                          value={formData.message_thread_id}
                          onChange={(e) => setFormData({ ...formData, message_thread_id: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded-md py-2 px-3 focus-ring font-mono"
                        />
                      </div>

                      {/* Thread Title */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider">
                          Название топика
                        </label>
                        <input
                          type="text"
                          placeholder="Обновления (опционально)"
                          value={formData.thread_title}
                          onChange={(e) => setFormData({ ...formData, thread_title: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded-md py-2 px-3 focus-ring"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* ENV Preview Section */}
                <div className="space-y-2 mt-2">
                  <label className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider flex items-center gap-2">
                    <FileJson className="w-3 h-3 text-indigo-400" />
                    Preview ENV
                  </label>
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-900/60 font-mono text-[10px] text-zinc-400 overflow-x-auto whitespace-pre">
                    {(() => {
                      const bot = bots.find(b => b.id === formData.bot_id);
                      const event = EVENT_TYPES.find(e => e.value === formData.event_type);
                      const prefix = event?.prefix || 'CUSTOM';
                      return (
                        <>
                          <span className="text-zinc-600">{prefix}_TELEGRAM_BOT_USERNAME=</span>
                          <span className="text-indigo-400">@{bot?.username || 'bot'}</span>
                          {'\n'}
                          <span className="text-zinc-600">{prefix}_TELEGRAM_CHAT_ID=</span>
                          <span className="text-emerald-400">{formData.chat_id || '—'}</span>
                          {'\n'}
                          <span className="text-zinc-600">{prefix}_TELEGRAM_THREAD_ID=</span>
                          <span className="text-amber-500">{formData.message_thread_id || '—'}</span>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Status Toggle */}
                <div className="flex items-center gap-3 pt-2">
                   <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_enabled: formData.is_enabled === 1 ? 0 : 1 })}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-[10px] font-bold uppercase tracking-wider transition-all ${
                      formData.is_enabled === 1
                        ? 'bg-emerald-900/10 border-emerald-900/40 text-emerald-400'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    {formData.is_enabled === 1 ? 'Включён' : 'Выключен'}
                  </button>
                  <span className="text-[10px] text-zinc-500 font-mono italic">
                    {formData.is_enabled === 1 ? 'Маршрут готов к работе' : 'Уведомления отправляться не будут'}
                  </span>
                </div>
              </div>

              <div className="pt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingRoute(null); }}
                  className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold rounded-md transition-all text-xs"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold rounded-md transition-all text-xs"
                >
                  {editingRoute ? 'Сохранить изменения' : 'Создать маршрут'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
