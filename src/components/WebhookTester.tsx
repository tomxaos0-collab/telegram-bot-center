import React, { useState } from 'react';
import { Link2, ShieldCheck, Play, HelpCircle, Terminal, RefreshCw, Layers, CheckCircle } from 'lucide-react';
import { TelegramBot } from '../types';

interface WebhookTesterProps {
  bots: TelegramBot[];
  selectedBotId: string | null;
  onLogMessage: (message: string, level: 'info' | 'success' | 'warn' | 'error') => void;
  onReceiveMessageSimulated: (botId: string, userId: string, text: string, fullName: string, username: string) => void;
}

export default function WebhookTester({
  bots,
  selectedBotId,
  onLogMessage,
  onReceiveMessageSimulated
}: WebhookTesterProps) {
  const [activeBotId, setActiveBotId] = useState<string>(selectedBotId || (bots[0]?.id || ''));
  const [webhookUrl, setWebhookUrl] = useState('https://kachios-app.local.dev/api/telegram/webhook');
  const [secretToken, setSecretToken] = useState('MySuperSecr3tToken-X-T');
  const [isSetting, setIsSetting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Simulation Update Type dropdown selection
  const [simType, setSimType] = useState('text');
  
  // Simulated Log of local testing requests
  const [httpLogs, setHttpLogs] = useState<Array<{
    id: string;
    method: 'POST' | 'GET';
    url: string;
    status: number;
    time: string;
    duration: string;
    payload: string;
    response: string;
  }>>([
    {
      id: 'pre-1',
      method: 'POST',
      url: 'https://kachios-app.local.dev/api/telegram/webhook',
      status: 200,
      time: '17.06.2026, 12:44:03',
      duration: '42ms',
      payload: '{"update_id": 10582, "message": {"text": "/start", "from": {"id": 1421, "first_name": "Павел"}}}',
      response: '{"ok": true, "result": "Message handled by command dispatcher"}'
    }
  ]);

  const selectedBot = bots.find((b) => b.id === activeBotId) || bots[0];

  const handleSetWebhook = () => {
    if (!selectedBot) return;
    setIsSetting(true);
    onLogMessage(`Установка Webhook для бота @${selectedBot.username} на адрес URL: ${webhookUrl}`, 'info');

    setTimeout(() => {
      setIsSetting(false);
      setStatusMessage(`Webhook успешно настроен для @${selectedBot.username}!`);
      onLogMessage(`Telegram Bot API: webhook установлен успешно! (Адрес: ${webhookUrl})`, 'success');
      setTimeout(() => setStatusMessage(null), 3000);
    }, 1200);
  };

  const getMockPayload = () => {
    switch (simType) {
      case 'text':
        return JSON.stringify({
          update_id: Math.floor(Math.random() * 100000),
          message: {
            message_id: Math.floor(Math.random() * 1000),
            from: { id: 728491, is_bot: false, first_name: "Дмитрий", username: "dmitry_arch" },
            chat: { id: 728491, first_name: "Дмитрий", type: "private" },
            date: Math.floor(Date.now() / 1000),
            text: "Привет! Помоги настроить автодобавление логов бота"
          }
        }, null, 2);

      case 'callback':
        return JSON.stringify({
          update_id: Math.floor(Math.random() * 100000),
          callback_query: {
            id: "9482105421",
            from: { id: 728491, is_bot: false, first_name: "Дмитрий", username: "dmitry_arch" },
            message: {
              message_id: 104,
              text: "Выберите необходимое действие:"
            },
            data: "action_get_logs"
          }
        }, null, 2);

      case 'join':
        return JSON.stringify({
          update_id: Math.floor(Math.random() * 100000),
          chat_member: {
            chat: { id: -100492815, title: "KachiOS Russian Community", type: "supergroup" },
            from: { id: 849204, is_bot: false, first_name: "Анна" },
            date: Math.floor(Date.now() / 1000),
            old_chat_member: { status: "left" },
            new_chat_member: { status: "member" }
          }
        }, null, 2);

      default:
        return '{}';
    }
  };

  const [customPayload, setCustomPayload] = useState(getMockPayload());

  // Handle template selection change
  const handleSimTypeChange = (type: string) => {
    setSimType(type);
    // Generate fresh payload according to selection
    setTimeout(() => {
      switch (type) {
        case 'text':
          setCustomPayload(JSON.stringify({
            update_id: Math.floor(Math.random() * 100000),
            message: {
              message_id: Math.floor(Math.random() * 1000),
              from: { id: 728491, is_bot: false, first_name: "Дмитрий", username: "dmitry_arch" },
              chat: { id: 728491, first_name: "Дмитрий", type: "private" },
              date: Math.floor(Date.now() / 1000),
              text: "Привет! Помоги настроить автодобавление логов в Arch Linux"
            }
          }, null, 2));
          break;
        case 'callback':
          setCustomPayload(JSON.stringify({
            update_id: Math.floor(Math.random() * 100000),
            callback_query: {
              id: "9482105421",
              from: { id: 728491, is_bot: false, first_name: "Дмитрий", username: "dmitry_arch" },
              message: {
                message_id: 104,
                text: "Выберите необходимое действие:"
              },
              data: "action_get_logs"
            }
          }, null, 2));
          break;
        case 'join':
          setCustomPayload(JSON.stringify({
            update_id: Math.floor(Math.random() * 100000),
            chat_member: {
              chat: { id: -100492815, title: "KachiOS Russian Community", type: "supergroup" },
              from: { id: 849204, is_bot: false, first_name: "Анна" },
              date: Math.floor(Date.now() / 1000),
              old_chat_member: { status: "left" },
              new_chat_member: { status: "member" }
            }
          }, null, 2));
          break;
      }
    }, 50);
  };

  const handleTestWebhookSimulate = () => {
    if (!selectedBot) return;
    setIsTesting(true);

    onLogMessage(`Webhook Имитация: Отправка HTTP POST на ${webhookUrl}...`, 'info');

    setTimeout(() => {
      setIsTesting(false);
      let parsed;
      try {
        parsed = JSON.parse(customPayload);
      } catch (err) {
        parsed = {};
      }

      const duration = `${Math.floor(Math.random() * 50) + 15}ms`;
      const time = new Date().toLocaleString('ru-RU').replace(',', '');

      const isText = parsed.message !== undefined;
      const userName = isText ? parsed.message.from.first_name : "Дмитрий";
      const uId = isText ? parsed.message.from.id : 728491;
      const uName = isText ? parsed.message.from.username : "dmitry_arch";
      const textMsg = isText ? parsed.message.text : `Произошел callback триггер: ${parsed.callback_query?.data || ''}`;

      // Register mock text message in Chat list if it's text update
      if (isText && activeBotId) {
        onReceiveMessageSimulated(activeBotId, String(uId), textMsg, userName, uName);
      }

      onLogMessage(`Webhook: входящий апдейт обработан успешно за ${duration}! HTTP 200 OK`, 'success');

      setHttpLogs([
        {
          id: Date.now().toString(),
          method: 'POST',
          url: webhookUrl,
          status: 200,
          time,
          duration,
          payload: customPayload,
          response: JSON.stringify({ ok: true, update_id: parsed.update_id || 10599, status: "completed" })
        },
        ...httpLogs
      ]);
    }, 1000);
  };

  if (bots.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
          <Link2 className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-zinc-200 font-semibold text-sm">Вебхуки не настроены</h3>
          <p className="text-xs text-zinc-500 max-w-xs">
            Добавьте вашего первого бота, чтобы получить доступ к симулятору тестирования вебхуков.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Settings Area - 5 cols */}
        <div className="lg:col-span-5 bg-[#121214]/60 border border-[#1f1f22] rounded-lg p-5 space-y-4 shadow-sm">
          <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <Link2 className="w-4 h-4 text-[#0088cc]" />
            Регистрация Webhook URL
          </h3>

          {statusMessage && (
            <div className="p-2.5 bg-emerald-950/20 border border-emerald-900/40 rounded-md text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>{statusMessage}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] text-zinc-400">Выберите бота для привязки</label>
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
              <label className="text-[11px] text-zinc-400">Адрес вашего обработчика (URL)</label>
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full bg-[#0c0c0d] border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 focus-ring font-mono"
                placeholder="https://mysite.com/api/telegram"
              />
              <span className="text-[9px] text-zinc-500 block leading-tight">
                Должен быть HTTPS с валидным SSL-сертификатом для работы с реальным API Telegram.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-zinc-400 flex items-center justify-between">
                <span>Secret Token для верификации</span>
                <span className="text-[9px] text-zinc-650 flex items-center gap-0.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" /> X-Telegram-Bot-Api-Secret-Token
                </span>
              </label>
              <input
                type="password"
                value={secretToken}
                onChange={(e) => setSecretToken(e.target.value)}
                className="w-full bg-[#0c0c0d] border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 focus-ring font-mono"
                placeholder="Секрет-токен безопасности"
              />
            </div>

            <div className="pt-2">
              <button
                onClick={handleSetWebhook}
                disabled={isSetting || !webhookUrl.trim()}
                className="w-full py-1.5 border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              >
                {isSetting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Устанавливаем...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" /> Set Webhook (Зарегистрировать)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Payload simulator - 7 cols */}
        <div className="lg:col-span-7 bg-[#121214]/60 border border-[#1f1f22] rounded-lg p-5 space-y-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-500" />
                Симулятор входящих обновлений Update
              </h3>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500">Тип:</span>
                <select
                  value={simType}
                  onChange={(e) => handleSimTypeChange(e.target.value)}
                  className="bg-[#0c0c0d] border border-zinc-800 rounded px-2 py-0.5 text-[10px] text-zinc-350"
                >
                  <option value="text">Текстовое сообщение (Message)</option>
                  <option value="callback">Callback-кнопка (Callback Query)</option>
                  <option value="join">Вход в супергруппу (Chat Member)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5 mt-4">
              <label className="text-[10px] text-zinc-500 font-mono flex items-center justify-between">
                <span>JSON Payload (Входящий вебхук)</span>
                <span>Метод: HTTP POST</span>
              </label>
              <textarea
                rows={9}
                value={customPayload}
                onChange={(e) => setCustomPayload(e.target.value)}
                className="w-full bg-[#09090a] border border-zinc-850 font-mono text-[11px] text-[#a4ef5c] p-3 rounded focus-ring leading-normal resize-none"
              />
            </div>
          </div>

          <button
            onClick={handleTestWebhookSimulate}
            disabled={isTesting}
            className="w-full py-2 bg-[#10b981] hover:bg-[#0da472] disabled:bg-zinc-800 disabled:text-zinc-650 text-white rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 mt-4"
          >
            {isTesting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Тестирование эмуляции...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Отправить симулированный Update на указанный Webhook
              </>
            )}
          </button>
        </div>
      </div>

      {/* HTTP Webhook HTTP Request Monitor */}
      <div className="bg-[#121214]/60 border border-[#1f1f22] rounded-lg p-5 space-y-4 shadow-sm">
        <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center justify-between">
          <span>Монитор локальных POST запросов</span>
          <span className="text-[10px] text-zinc-500 lowercase">Логи очищаются при перезапуске</span>
        </h3>

        <div className="space-y-3 max-h-60 overflow-y-auto">
          {httpLogs.map((log) => (
            <div
              key={log.id}
              className="border border-[#1f1f22] bg-[#0c0c0d] rounded-md p-3 font-mono text-[11px] text-zinc-400 space-y-2"
            >
              <div className="flex items-center justify-between text-[10px] border-b border-zinc-900 pb-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 bg-yellow-950/20 text-yellow-400 border border-yellow-905/30 rounded font-bold">
                    {log.method}
                  </span>
                  <span className="text-zinc-300 truncate max-w-[300px]">{log.url}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-500">{log.time}</span>
                  <span className="text-zinc-500">Задержка: {log.duration}</span>
                  <span className="px-1.5 py-0.2 bg-emerald-950/20 text-[#10b981] border border-emerald-900/30 rounded font-bold">
                    HTTP {log.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-600 uppercase font-sans">Полезная нагрузка (Payload)</span>
                  <pre className="p-2 bg-[#09090a]/85 border border-[#1a1a1c] text-zinc-400 rounded text-[10px] overflow-x-auto truncate max-h-24">
                    {log.payload}
                  </pre>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-600 uppercase font-sans">Ответ сервера (Response)</span>
                  <pre className="p-2 bg-[#09090a]/85 border border-[#1a1a1c] text-[#a4ef5c] rounded text-[10px] overflow-x-auto truncate max-h-24">
                    {log.response}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
