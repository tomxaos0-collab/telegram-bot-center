import React, { useState } from 'react';
import { Bot, Plus, ArrowUpRight, Copy, Check, Trash2, Eye, EyeOff, ShieldAlert, Pencil, ExternalLink, AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';
import { TelegramBot } from '../types';

interface BotManagerProps {
  bots: TelegramBot[];
  onAddBot: (name: string, token: string) => void;
  onUpdateBotName: (id: string, newName: string) => void;
  onToggleActive: (id: string) => void;
  onDeleteBot: (id: string) => void;
  onVerifyBot: (id: string) => Promise<void>;
  onOpenBot: (id: string) => void;
  searchQuery: string;
}

export default function BotManager({
  bots,
  onAddBot,
  onUpdateBotName,
  onToggleActive,
  onDeleteBot,
  onVerifyBot,
  onOpenBot,
  searchQuery
}: BotManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [token, setToken] = useState('');
  const [showTokenId, setShowTokenId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Modals / states for Rename & Confirm deletion
  const [editingBot, setEditingBot] = useState<{ id: string; name: string } | null>(null);
  const [botToDelete, setBotToDelete] = useState<{ id: string; name: string } | null>(null);

  // Validation
  const [formError, setFormError] = useState('');

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Укажите название бота');
      return;
    }
    if (!token.trim()) {
      setFormError('Укажите токен API BotFather');
      return;
    }
    // Simple telegram token validation pattern: ddddddddd:AAAAAAA...
    if (!/^\d+:[\w-]{30,50}$/.test(token.trim())) {
      setFormError('Неверный формат токена Telegram (пример: 5821941235:AAH-6vWp_uPzK_...)');
      return;
    }

    onAddBot(name.trim(), token.trim());

    // Reset Form
    setName('');
    setToken('');
    setShowAddForm(false);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBot && editingBot.name.trim()) {
      onUpdateBotName(editingBot.id, editingBot.name.trim());
      setEditingBot(null);
    }
  };

  const filteredBots = bots.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.token.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Upper overview stats if bots exist */}
      {bots.length > 0 && !showAddForm && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#121214] border border-[#1f1f22] rounded-lg p-4 flex flex-col justify-between">
            <span className="text-zinc-500 text-[11px] font-medium uppercase tracking-wider">Всего ботов в SQLite</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-mono text-zinc-100 font-semibold">{bots.length}</span>
              <span className="text-xs text-zinc-500">шт.</span>
            </div>
          </div>
          <div className="bg-[#121214] border border-[#1f1f22] rounded-lg p-4 flex flex-col justify-between">
            <span className="text-zinc-500 text-[11px] font-medium uppercase tracking-wider font-mono">Статус проверки</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-mono text-amber-500 font-semibold">
                {bots.length}
              </span>
              <span className="text-xs text-zinc-500">не проверены</span>
            </div>
          </div>
          <div className="bg-[#121214] border border-[#1f1f22] rounded-lg p-4 flex flex-col justify-between">
            <span className="text-zinc-500 text-[11px] font-medium uppercase tracking-wider">Регион БД</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-lg font-mono text-zinc-100 font-semibold">Локальный</span>
              <span className="text-[10px] text-zinc-500 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded ml-1">SQLite3</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Header inside viewport */}
      <div className="flex items-center justify-between border-b border-[#1b1b1c] pb-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 tracking-tight flex items-center gap-2">
            Telegram Bot Center
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Локальное управление вашими Telegram-ботами с хранением в базе данных SQLite
          </p>
        </div>

        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 rounded-md text-xs font-medium transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Добавить бота
          </button>
        )}
      </div>

      {/* Show beautiful Add Form */}
      {showAddForm && (
        <div className="bg-[#121214] border border-[#1f1f22] rounded-lg max-w-xl mx-auto p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="text-sm font-semibold text-zinc-100">Новый Telegram Бот</h3>
            <button
              onClick={() => {
                setShowAddForm(false);
                setFormError('');
              }}
              className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer"
            >
              Отмена
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="p-2.5 bg-red-950/20 border border-red-900/40 rounded-md flex items-center gap-2 text-red-400 text-xs animate-fade-in">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] text-zinc-400">Название бота</label>
              <input
                type="text"
                placeholder="Бот Техподдержки (например: Поддержка Магазина)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0c0c0d] border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 placeholder-zinc-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-zinc-400 flex items-center justify-between">
                <span>Токен API (от @BotFather)</span>
                <span className="text-[10px] text-zinc-500">Локальное зашифрованное хранение</span>
              </label>
              <input
                type="password"
                placeholder="Пример токена: 5821941235:AAH-6vWp_uPzK_xR9U_T_6zM..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full bg-[#0c0c0d] border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 font-mono placeholder-zinc-600"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Сохранить бота в БД SQLite
            </button>
          </form>
        </div>
      )}

      {/* Empty State vs Table view */}
      {!showAddForm && (
        <>
          {filteredBots.length === 0 ? (
            <div className="border border-[#1f1f22] bg-[#121214]/40 rounded-xl p-12 text-center max-w-xl mx-auto flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center shadow-lg text-zinc-400 animate-pulse">
                <Bot className="w-6 h-6 text-zinc-500" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-zinc-200 text-sm">Боты ещё не добавлены</h3>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                  Создайте или возьмите токен бота у @BotFather в Telegram и подключите его для локального мониторинга в один клик.
                </p>
              </div>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#121214] border border-zinc-800 text-zinc-300 hover:text-zinc-100 rounded-md text-xs font-semibold transition-all hover:bg-zinc-800 shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Добавить бота
              </button>
            </div>
          ) : (
            <div className="border border-[#1f1f22] bg-[#0c0c0d] rounded-lg overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#121214] border-b border-[#1f1f22] text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
                      <th className="py-3 px-4 font-normal">Имя бота</th>
                      <th className="py-3 px-4 font-normal">Локальный токен API</th>
                      <th className="py-3 px-4 font-normal">Дата добавления</th>
                      <th className="py-3 px-4 font-normal">Статус</th>
                      <th className="py-3 px-4 font-normal text-right">Управление</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#18181b]">
                    {filteredBots.map((bot) => (
                      <tr key={bot.id} className="hover:bg-zinc-900/30 transition-colors text-xs text-zinc-300">
                        {/* Bot Name */}
                        <td className="py-3.5 px-4 w-[200px]">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#0088cc] font-mono text-xs font-semibold flex-shrink-0">
                              {bot.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="max-w-[140px] truncate">
                              <p className="font-medium text-zinc-200 leading-tight truncate">{bot.name}</p>
                              {bot.username && bot.username !== 'pending_bot' && bot.username !== 'unverified_bot' ? (
                                <span className="text-[10px] text-[#0088cc] font-mono block truncate">
                                  @{bot.username}
                                </span>
                              ) : (
                                <span className="text-[10px] text-zinc-500 font-mono block">
                                  SQLite ID: {bot.id.slice(4, 12)}...
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Bot API Token masked */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-400">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate max-w-[120px]">
                              {showTokenId === bot.id
                                ? bot.token
                                : `${bot.token.split(':')[0] || 'token'}:••••••••••••••••••••`}
                            </span>
                            <button
                              onClick={() => setShowTokenId(showTokenId === bot.id ? null : bot.id)}
                              className="text-zinc-600 hover:text-zinc-400 p-0.5 pointer-events-auto"
                              title="Показать / Скрыть"
                            >
                              {showTokenId === bot.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleCopy(bot.id, bot.token)}
                              className="text-zinc-600 hover:text-zinc-400 p-0.5 pointer-events-auto"
                              title="Копировать"
                            >
                              {copiedId === bot.id ? (
                                <Check className="w-3.5 h-3.5 text-green-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Created Date */}
                        <td className="py-3.5 px-4 font-mono text-zinc-500">
                          {bot.createdAt}
                        </td>

                        {/* Bot Status - STRICT REQUIREMENT: "Работает", "Ошибка", "Не проверен" */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              {bot.status === 'online' ? (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                  <span className="text-[10px] uppercase font-semibold text-green-400 font-mono select-none">
                                    Работает
                                  </span>
                                </>
                              ) : bot.status === 'error' ? (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                  <span className="text-[10px] uppercase font-semibold text-red-400 font-mono select-none">
                                    Ошибка
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  <span className="text-[10px] uppercase font-semibold text-amber-500 font-mono select-none">
                                    не проверен
                                  </span>
                                </>
                              )}
                            </div>
                            {bot.lastCheckedAt ? (
                              <p className="text-[9px] text-zinc-500 font-mono leading-none">
                                Пров: {bot.lastCheckedAt.split(', ')[1] || bot.lastCheckedAt}
                              </p>
                            ) : (
                              <p className="text-[9px] text-zinc-600 font-mono leading-none">
                                Не проверялся
                              </p>
                            )}
                            {bot.lastError && (
                              <p className="text-[9px] text-red-400/90 leading-tight bg-red-950/20 border border-red-900/30 px-1 py-0.5 rounded font-sans max-w-[140px] truncate" title={bot.lastError}>
                                {bot.lastError}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Actions controls - STRICT REQUIREMENT: "открыть, редактировать, удалить" + "Проверить" */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <button
                              onClick={() => {
                                setVerifyingId(bot.id);
                                onVerifyBot(bot.id).finally(() => setVerifyingId(null));
                              }}
                              disabled={verifyingId === bot.id}
                              className={`p-1 px-2 rounded transition-colors flex items-center gap-1 text-[11px] border border-zinc-800 bg-[#0c0c0d] cursor-pointer ${
                                verifyingId === bot.id ? 'opacity-50 text-zinc-500' : 'text-zinc-300 hover:text-green-400 hover:border-green-900'
                              }`}
                              title="Проверить статус через getMe"
                            >
                              <RefreshCw className={`w-3 h-3 ${verifyingId === bot.id ? 'animate-spin' : ''}`} />
                              <span>{verifyingId === bot.id ? 'Проверяем...' : 'Проверить'}</span>
                            </button>

                            <button
                              onClick={() => onOpenBot(bot.id)}
                              className="p-1 px-2 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1 text-[11px] border border-zinc-800 bg-[#0c0c0d] cursor-pointer"
                              title="Открыть сообщения бота"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Открыть</span>
                            </button>

                            <button
                              onClick={() => setEditingBot({ id: bot.id, name: bot.name })}
                              className="p-1 px-2 rounded hover:bg-zinc-800 text-zinc-400 hover:text-[#0088cc] transition-colors flex items-center gap-1 text-[11px] border border-zinc-800 bg-[#0c0c0d] cursor-pointer"
                              title="Редактировать название бота"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Имя</span>
                            </button>

                            <button
                              onClick={() => setBotToDelete({ id: bot.id, name: bot.name })}
                              className="p-1 px-2 rounded hover:bg-red-950/20 text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1 text-[11px] border border-zinc-800 bg-[#0c0c0d] hover:border-red-950/50 cursor-pointer"
                              title="Удалить бота"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Удалить</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* RENAME MODAL - 100% iframe safe overlay */}
      {editingBot && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#121214] border border-[#1f1f22] rounded-lg max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
              <Pencil className="w-4 h-4 text-[#0088cc]" />
              <h3 className="text-sm font-semibold text-zinc-200">Редактировать название</h3>
            </div>
            <form onSubmit={handleRenameSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">Новое имя бота</label>
                <input
                  type="text"
                  value={editingBot.name}
                  onChange={(e) => setEditingBot({ ...editingBot, name: e.target.value })}
                  className="w-full bg-[#0c0c0d] border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 font-sans"
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBot(null)}
                  className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded text-[11px] font-medium transition-all cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 rounded text-[11px] font-medium transition-all cursor-pointer"
                >
                  Сохранить изменения
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL - 100% iframe safe overlay */}
      {botToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#121214] border border-[#1f1f22] rounded-lg max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-red-500 border-b border-zinc-800 pb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-semibold">Удаление Telegram-бота</h3>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-zinc-300 leading-relaxed">
                Вы действительно хотите навсегда удалить бота <strong className="text-zinc-100">«{botToDelete.name}»</strong> из локальной базы данных SQLite?
              </p>
              <p className="text-[10px] text-zinc-500">
                Это действие необратимо. Связанные логи, ключи и сессии чатов будут очищены.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBotToDelete(null)}
                className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded text-[11px] font-medium transition-all cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteBot(botToDelete.id);
                  setBotToDelete(null);
                }}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-medium transition-all cursor-pointer"
              >
                Да, удалить бота
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
