import React, { useState } from 'react';
import { Send, Sparkles, Smartphone, Eye, Layout, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { TelegramBot } from '../types';

interface KeyboardButton {
  label: string;
  url: string;
}

interface NewsletterArchive {
  id: string;
  botName: string;
  text: string;
  sentCount: number;
  date: string;
  status: 'sent' | 'scheduled';
}

interface MessageSenderProps {
  bots: TelegramBot[];
  selectedBotId: string | null;
  onLogMessage: (message: string, level: 'info' | 'success' | 'warn' | 'error') => void;
}

export default function MessageSender({ bots, selectedBotId, onLogMessage }: MessageSenderProps) {
  const [activeBotId, setActiveBotId] = useState<string>(selectedBotId || (bots[0]?.id || ''));
  const [recipientGroup, setRecipientGroup] = useState('all');
  const [messageText, setMessageText] = useState(
    'Привет, {first_name}! 👋\n\nРады сообщить, что мы обновили наш бот функционал до версии 2.0!\n\nИспользуйте команду /help, чтобы узнать подробнее о нововведениях.'
  );
  const [buttons, setButtons] = useState<KeyboardButton[]>([
    { label: 'Перейти на сайт', url: 'https://mysite.com' },
    { label: 'Техподдержка', url: 'https://t.me/support_bot' }
  ]);
  const [newButtonLabel, setNewButtonLabel] = useState('');
  const [newButtonUrl, setNewButtonUrl] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [successSent, setSuccessSent] = useState(false);
  const [history, setHistory] = useState<NewsletterArchive[]>([
    {
      id: '1',
      botName: bots[0]?.name || 'Главный Бот',
      text: 'Добро пожаловать в наше сообщество! Пожалуйста пройдите верификацию.',
      sentCount: 120,
      date: '15.06.2026, 14:15',
      status: 'sent'
    },
    {
      id: '2',
      botName: bots[0]?.name || 'Главный Бот',
      text: 'Внимание! Проводятся плановые технические работы на стороне серверов.',
      sentCount: 148,
      date: '10.06.2026, 09:00',
      status: 'sent'
    }
  ]);

  const selectedBot = bots.find((b) => b.id === activeBotId) || bots[0];

  const handleAddButton = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newButtonLabel.trim() || !newButtonUrl.trim()) return;
    setButtons([...buttons, { label: newButtonLabel.trim(), url: newButtonUrl.trim() }]);
    setNewButtonLabel('');
    setNewButtonUrl('');
  };

  const handleRemoveButton = (index: number) => {
    setButtons(buttons.filter((_, idx) => idx !== index));
  };

  const handleSendBroadcast = () => {
    if (!selectedBot) return;
    setIsSending(true);

    setTimeout(() => {
      setIsSending(false);
      setSuccessSent(true);

      const targetCount = recipientGroup === 'all' ? selectedBot.totalUsers : Math.floor(selectedBot.totalUsers * 0.4);
      onLogMessage(
        `Запуск массовой рассылки через @${selectedBot.username} для ${targetCount} пользователей`,
        'info'
      );
      
      onLogMessage(
        `Рассылка завершена успешно! Отправлено: ${targetCount} сообщений. Ошибок: 0.`,
        'success'
      );

      setHistory([
        {
          id: Date.now().toString(),
          botName: selectedBot.name,
          text: messageText,
          sentCount: targetCount,
          date: new Date().toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).replace(',', ''),
          status: 'sent'
        },
        ...history
      ]);

      setTimeout(() => setSuccessSent(false), 4000);
    }, 1800);
  };

  // Replace tags for live preview Mockup
  const renderPreviewText = (text: string) => {
    return text
      .replace(/{first_name}/g, 'Иван')
      .replace(/{username}/g, 'ivan_ivanov')
      .replace(/{bot_name}/g, selectedBot?.name || 'Бот');
  };

  if (bots.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
          <Layout className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-zinc-200 font-semibold text-sm">Недоступно для рассылок</h3>
          <p className="text-xs text-zinc-500 max-w-xs">
            Для создания массовых рассылок добавьте Telegram бота во вкладке "Боты".
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Visual Workspace grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Editor Form - 7 cols */}
        <div className="lg:col-span-7 bg-[#121214]/60 border border-[#1f1f22] rounded-lg p-5 space-y-4 shadow-sm">
          <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <Layout className="w-4 h-4 text-[#0088cc]" />
            Редактор уведомлений и рассылок
          </h3>

          {successSent && (
            <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 rounded-md text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 animate-scale" />
              <span>Рассылка успешно выполнена! Логи рассылки добавлены в терминал.</span>
            </div>
          )}

          {/* Form controls */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] text-zinc-400">Выберите бота-отправителя</label>
              <select
                value={activeBotId}
                onChange={(e) => setActiveBotId(e.target.value)}
                className="w-full bg-[#0c0c0d] border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 focus-ring"
              >
                {bots.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} (@{b.username})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-zinc-400">Группа получателей</label>
              <select
                value={recipientGroup}
                onChange={(e) => setRecipientGroup(e.target.value)}
                className="w-full bg-[#0c0c0d] border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 focus-ring"
              >
                <option value="all">Все пользователи ({selectedBot?.totalUsers || 0})</option>
                <option value="active">Активные в за 48 часов ({Math.floor((selectedBot?.totalUsers || 0) * 0.6)})</option>
                <option value="new">Новые за эту неделю ({Math.floor((selectedBot?.totalUsers || 0) * 0.15)})</option>
              </select>
            </div>
          </div>

          {/* Content field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] text-zinc-400">Шаблон сообщения</label>
              <div className="flex gap-2 text-[10px] text-zinc-500">
                <button
                  type="button"
                  onClick={() => setMessageText((prev) => prev + ' {first_name}')}
                  className="hover:text-[#0088cc] font-mono"
                >
                  +{'{first_name}'}
                </button>
                <button
                  type="button"
                  onClick={() => setMessageText((prev) => prev + ' {username}')}
                  className="hover:text-[#0088cc] font-mono"
                >
                  +{'{username}'}
                </button>
              </div>
            </div>
            <textarea
              rows={6}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full bg-[#0c0c0d] border border-zinc-800 font-sans text-xs text-zinc-200 p-3 rounded-md focus-ring leading-relaxed"
              placeholder="Введите текст сообщения..."
            />
          </div>

          {/* Inline Buttons Builder */}
          <div className="space-y-3.5 border-t border-[#1b1b1c] pt-4">
            <label className="text-[11px] text-zinc-400 block font-medium uppercase tracking-wider">
              Inline-кнопки (под сообщением)
            </label>

            {/* List current buttons */}
            {buttons.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {buttons.map((btn, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1.5 px-2 py-1 bg-[#0c0c0d] border border-zinc-800 rounded text-[11px] text-zinc-350"
                  >
                    <span className="font-medium">{btn.label}</span>
                    <span className="text-zinc-500 text-[10px] truncate max-w-[80px]">({btn.url})</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveButton(index)}
                      className="text-zinc-600 hover:text-red-400 ml-1 font-semibold"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Form to add button row */}
            <form onSubmit={handleAddButton} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-5 space-y-1">
                <input
                  type="text"
                  placeholder="Текст на кнопке"
                  value={newButtonLabel}
                  onChange={(e) => setNewButtonLabel(e.target.value)}
                  className="w-full bg-[#0c0c0d] border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-300 placeholder-zinc-600 focus-ring"
                />
              </div>
              <div className="md:col-span-5 space-y-1">
                <input
                  type="text"
                  placeholder="Ссылка URL (https://...)"
                  value={newButtonUrl}
                  onChange={(e) => setNewButtonUrl(e.target.value)}
                  className="w-full bg-[#0c0c0d] border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-300 placeholder-zinc-600 focus-ring font-mono"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-350 rounded text-xs font-semibold flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Добавить
                </button>
              </div>
            </form>
          </div>

          <button
            onClick={handleSendBroadcast}
            disabled={isSending || !messageText.trim()}
            className="w-full py-2 bg-[#0088cc] hover:bg-[#0077b3] disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-100 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-2 mt-4"
          >
            {isSending ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Идёт массовая рассылка...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Отправить рассылку получателям</span>
              </>
            )}
          </button>
        </div>

        {/* Smartphone Realtime Preview - 5 cols */}
        <div className="lg:col-span-5 space-y-3.5">
          <span className="text-[10px] uppercase font-mono text-zinc-500 font-semibold block px-1">
            <Eye className="w-3.5 h-3.5 inline mr-1 text-[#0088cc]" /> Предпросмотр в клиенте Telegram
          </span>

          <div className="bg-[#121214] border-4 border-zinc-805 rounded-[2.5rem] p-3.5 shadow-2xl relative w-full aspect-[9/16] max-h-[500px] flex flex-col mx-auto overflow-hidden">
            {/* Top Speaker Notch mockup */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-[#0a0a0b] border border-zinc-900 rounded-full flex items-center justify-center z-10">
              <div className="w-12 h-1 bg-zinc-800 rounded" />
            </div>

            {/* Simulated Phone screen */}
            <div className="flex-1 bg-[#151d26] rounded-[2rem] pt-6 px-3 flex flex-col justify-between font-sans relative">
              {/* Header inside phone screen */}
              <div className="flex items-center gap-2 border-b border-[#0f151c]/70 pb-2">
                <div className="w-7 h-7 rounded-full bg-[#1e2c3a] border border-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-300 uppercase">
                  {(selectedBot?.name || 'B').slice(0, 1)}
                </div>
                <div>
                  <div className="text-[11px] font-bold text-zinc-100 flex items-center gap-1">
                    {selectedBot?.name || 'Имя Бота'}
                    <span className="text-[9px] bg-[#0088cc] px-1 py-0.2 rounded text-zinc-100 font-normal">bot</span>
                  </div>
                  <span className="text-[8px] text-zinc-500 leading-none">в сети</span>
                </div>
              </div>

              {/* Chat Canvas inside phone screen */}
              <div className="flex-1 overflow-y-auto py-3 space-y-3 flex flex-col justify-end">
                {/* Simulated Bubble */}
                <div className="flex justify-start">
                  <div className="bg-[#182533] border border-[#213143] text-zinc-200 text-[10.5px] p-2.5 rounded-2xl rounded-tl-none max-w-[85%] relative leading-normal shadow-sm">
                    <p className="whitespace-pre-wrap">{renderPreviewText(messageText)}</p>
                    <span className="text-[8px] text-zinc-500 mt-1 block text-right">10:49 AM</span>
                  </div>
                </div>

                {/* Simulated inline keyboards */}
                {buttons.length > 0 && (
                  <div className="grid grid-cols-2 gap-1.5 mt-1.5 max-w-[85%] pr-2">
                    {buttons.map((btn, idx) => (
                      <div
                        key={idx}
                        className="bg-[#1d2d3d] hover:bg-[#25394d] text-[#4da6ff] rounded-lg py-1.5 px-2 text-[10px] text-center font-medium cursor-pointer truncate border border-zinc-800 shadow-sm flex items-center justify-center gap-1"
                      >
                        <span>{btn.label}</span>
                        <span className="text-[7px] text-[#2c77c2]/80">↗</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Simulated Phone control footer bar */}
              <div className="h-6 border-t border-[#0f151c]/70 flex items-center justify-between text-[9px] text-[#c9d1d9] bg-[#151d26] -mx-1 px-3">
                <span className="text-zinc-500 font-mono">Сообщение...</span>
                <Send className="w-3 h-3 text-[#0088cc] rotate-45" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History Area */}
      <div className="bg-[#121214]/60 border border-[#1f1f22] rounded-lg p-5 space-y-3.5">
        <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">История отправленных рассылок</h3>

        <div className="divide-y divide-zinc-8d0 font-sans space-y-3">
          {history.map((hist) => (
            <div key={hist.id} className="pt-3 flex items-start justify-between text-xs text-zinc-300 gap-4">
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-200">{hist.botName}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">{hist.date}</span>
                </div>
                <p className="text-zinc-400 text-[11px] truncate">{hist.text}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className="font-mono font-medium text-zinc-300">{hist.sentCount} чел.</p>
                  <span className="text-[10px] text-zinc-500">Получатели</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 rounded text-[10px] uppercase font-mono font-medium">
                  готово
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
