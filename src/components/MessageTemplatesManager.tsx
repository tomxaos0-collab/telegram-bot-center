import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileCode, Plus, Send, Copy, FileJson, Trash2, Edit3, 
  CheckCircle, AlertCircle, RefreshCw, Info, Layout, 
  Eye, Code2, Save, X, Layers, CopyPlus
} from 'lucide-react';
import { db } from '../db';
import { MessageTemplate, EventType, TemplateVariable, NotificationRoute, BotRecord } from '../types';

interface MessageTemplatesManagerProps {
  bots: BotRecord[];
  onLogMessage: (message: string, level: 'info' | 'success' | 'warn' | 'error') => void;
}

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'release_updates', label: 'Релизы проекта' },
  { value: 'system_error', label: 'Ошибки сайта' },
  { value: 'purchase_request', label: 'Заявки на закупку' },
  { value: 'purchase_approved', label: 'Заявки одобрены' },
  { value: 'purchase_received', label: 'Заявки получены' },
  { value: 'z_report', label: 'Z-отчёты' },
  { value: 'encashment', label: 'Инкассации' },
  { value: 'shift_open', label: 'Открытие смены' },
  { value: 'shift_close', label: 'Закрытие смены' },
  { value: 'waste', label: 'Списания' },
  { value: 'announcement', label: 'Объявления' },
  { value: 'custom', label: 'Свой тип' },
];

const TEMPLATE_EXAMPLES = [
  {
    name: 'Релиз проекта',
    event_type: 'release_updates' as EventType,
    description: 'Для публикации обновлений проекта в Telegram-группу.',
    body_html: '🚀 <b>Retail Core обновился</b>\n\n<b>{title}</b>\n\n{summary}\n\n<b>Что нового:</b>\n{features}\n\n<b>Зачем это нужно:</b>\n{why}\n\n<code>Версия: {version}</code>',
    variables: [
      { key: 'title', label: 'Заголовок', defaultValue: 'Новая функция' },
      { key: 'summary', label: 'Краткое описание', defaultValue: 'Мы улучшили работу системы.' },
      { key: 'features', label: 'Что нового', defaultValue: '- Оптимизация БД\n- Новый UI' },
      { key: 'why', label: 'Зачем это нужно', defaultValue: 'Для ускорения работы кассиров.' },
      { key: 'version', label: 'Версия', defaultValue: '1.2.0' },
    ]
  },
  {
    name: 'Ошибка сайта',
    event_type: 'system_error' as EventType,
    description: 'Уведомление о критических сбоях в работе сервисов.',
    body_html: '🚨 <b>Ошибка Retail Core</b>\n\n<b>Сервис:</b> {service}\n<b>Статус:</b> {status}\n<b>Время:</b> {time}\n\n<code>{error}</code>',
    variables: [
      { key: 'service', label: 'Сервис', defaultValue: 'API Gateway' },
      { key: 'status', label: 'Статус', defaultValue: '500 Internal Server Error' },
      { key: 'time', label: 'Время', defaultValue: new Date().toLocaleString() },
      { key: 'error', label: 'Текст ошибки', defaultValue: 'NullPointerException at handler.js:42' },
    ]
  },
  {
    name: 'Заявка на закупку',
    event_type: 'purchase_request' as EventType,
    description: 'Новая заявка от сотрудников точек.',
    body_html: '📦 <b>Заявка на закупку</b>\n\n<b>Точка:</b> {location}\n<b>Сотрудник:</b> {employee}\n\n{items}',
    variables: [
      { key: 'location', label: 'Точка', defaultValue: 'Магазин №5' },
      { key: 'employee', label: 'Сотрудник', defaultValue: 'Иван Иванов' },
      { key: 'items', label: 'Товары', defaultValue: '1. Молоко - 10 шт\n2. Хлеб - 5 шт' },
    ]
  },
  {
    name: 'Z-отчёт',
    event_type: 'z_report' as EventType,
    description: 'Итоговый отчет за смену.',
    body_html: '📊 <b>Z-отчёт</b>\n\n<b>Точка:</b> {location}\n<b>Дата:</b> {date}\n<b>Выручка:</b> {revenue}\n<b>Чеки:</b> {checks}\n<b>Средний чек:</b> {average_check}',
    variables: [
      { key: 'location', label: 'Точка', defaultValue: 'Магазин №5' },
      { key: 'date', label: 'Дата', defaultValue: new Date().toLocaleDateString() },
      { key: 'revenue', label: 'Выручка', defaultValue: '45 000 ₽' },
      { key: 'checks', label: 'Чеки', defaultValue: '124' },
      { key: 'average_check', label: 'Средний чек', defaultValue: '362 ₽' },
    ]
  },
  {
    name: 'Инкассация',
    event_type: 'encashment' as EventType,
    description: 'Уведомление о передаче наличности.',
    body_html: '💰 <b>Инкассация</b>\n\n<b>Точка:</b> {location}\n<b>Сумма:</b> {amount}\n<b>Сотрудник:</b> {employee}\n<b>Время:</b> {time}',
    variables: [
      { key: 'location', label: 'Точка', defaultValue: 'Магазин №5' },
      { key: 'amount', label: 'Сумма', defaultValue: '120 000 ₽' },
      { key: 'employee', label: 'Марина С.', defaultValue: 'Марина С.' },
      { key: 'time', label: 'Время', defaultValue: new Date().toLocaleTimeString() },
    ]
  }
];

export default function MessageTemplatesManager({
  bots,
  onLogMessage
}: MessageTemplatesManagerProps) {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    event_type: 'release_updates' as EventType,
    description: '',
    body_html: '',
    variables: [] as TemplateVariable[],
    status: 'draft' as MessageTemplate['status']
  });

  const [testModal, setTestModal] = useState<{ show: boolean; templateId: string | null }>({
    show: false,
    templateId: null
  });
  const [routes, setRoutes] = useState<NotificationRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    const data = await db.getAllTemplates();
    setTemplates(data);
    setIsLoading(false);
  };

  const loadRoutes = async () => {
    const data = await db.getAllRoutes();
    setRoutes(data);
    if (data.length > 0) setSelectedRouteId(data[0].id);
  };

  const extractVariables = (html: string): string[] => {
    const regex = /\{([a-zA-Z0-9_]+)\}/g;
    const vars: string[] = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
      if (!vars.includes(match[1])) {
        vars.push(match[1]);
      }
    }
    return vars;
  };

  useEffect(() => {
    const foundVars = extractVariables(formData.body_html);
    const currentVars = [...formData.variables];
    
    // Remove variables no longer in HTML
    const filtered = currentVars.filter(v => foundVars.includes(v.key));
    
    // Add new variables
    foundVars.forEach(v => {
      if (!filtered.find(fv => fv.key === v)) {
        filtered.push({ key: v, label: v, defaultValue: '' });
      }
    });

    if (JSON.stringify(filtered) !== JSON.stringify(formData.variables)) {
      setFormData(prev => ({ ...prev, variables: filtered }));
    }
  }, [formData.body_html]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const templateToSave = {
      id: editingTemplate?.id || crypto.randomUUID(),
      name: formData.name,
      event_type: formData.event_type,
      description: formData.description,
      body_html: formData.body_html,
      variables_json: JSON.stringify(formData.variables),
      status: formData.status,
      last_test_at: editingTemplate?.last_test_at || null,
      last_test_status: editingTemplate?.last_test_status || 'none',
      last_error: editingTemplate?.last_error || null,
    };

    if (editingTemplate) {
      await db.updateTemplate(templateToSave);
      onLogMessage(`Шаблон "${formData.name}" обновлен.`, 'success');
    } else {
      await db.insertTemplate(templateToSave);
      onLogMessage(`Шаблон "${formData.name}" создан успешно.`, 'success');
    }

    setShowForm(false);
    setEditingTemplate(null);
    loadTemplates();
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Вы уверены, что хотите удалить шаблон "${name}"?`)) {
      await db.deleteTemplate(id);
      onLogMessage(`Шаблон "${name}" удален.`, 'info');
      loadTemplates();
    }
  };

  const handleDuplicate = async (template: MessageTemplate) => {
    const duplicate = {
      ...template,
      id: crypto.randomUUID(),
      name: `${template.name} (копия)`,
      created_at: undefined,
      updated_at: undefined
    };
    await db.insertTemplate(duplicate);
    onLogMessage(`Шаблон "${template.name}" продублирован.`, 'success');
    loadTemplates();
  };

  const handleTestTemplate = async (templateId: string) => {
    setTestModal({ show: true, templateId });
    await loadRoutes();
  };

  const runTestSend = async () => {
    if (!selectedRouteId || !testModal.templateId) return;
    
    const template = templates.find(t => t.id === testModal.templateId);
    const route = routes.find(r => r.id === selectedRouteId);
    if (!template || !route) return;

    const bot = bots.find(b => b.id === route.bot_id);
    if (!bot) {
      onLogMessage(`Бот для маршрута не найден.`, 'error');
      return;
    }

    setIsSendingTest(true);
    onLogMessage(`Отправка тестового сообщения для шаблона "${template.name}"...`, 'info');

    // Prepare content
    let finalHtml = template.body_html;
    const variables: TemplateVariable[] = JSON.parse(template.variables_json);
    variables.forEach(v => {
      finalHtml = finalHtml.replace(new RegExp(`\\{${v.key}\\}`, 'g'), v.defaultValue || `[${v.label}]`);
    });

    const IS_TAURI = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '___TAURI__' in window || (window as any).__TAURI_IPC__ !== undefined);

    try {
      let result: any;
      if (IS_TAURI) {
        const { invoke } = await import('@tauri-apps/api/core');
        result = await invoke('send_message', {
          token: bot.token,
          chatId: route.chat_id,
          messageThreadId: route.message_thread_id ? parseInt(route.message_thread_id) : null,
          text: finalHtml,
          parseMode: 'HTML'
        });
      } else {
        await new Promise(r => setTimeout(r, 1000));
        result = { ok: true };
      }

      if (result.ok) {
        await db.updateTemplateTestStatus(template.id, 'success', null);
        onLogMessage(`Тест шаблона "${template.name}" успешен.`, 'success');
        setTestModal({ show: false, templateId: null });
      } else {
        const errMsg = result.description || 'Ошибка API Telegram';
        await db.updateTemplateTestStatus(template.id, 'error', errMsg);
        onLogMessage(`Ошибка теста шаблона: ${errMsg}`, 'error');
      }
    } catch (err: any) {
      const errMsg = err.toString();
      await db.updateTemplateTestStatus(template.id, 'error', errMsg);
      onLogMessage(`Ошибка при отправке: ${errMsg}`, 'error');
    } finally {
      setIsSendingTest(false);
      loadTemplates();
    }
  };

  const handleCopyHtml = (html: string) => {
    navigator.clipboard.writeText(html);
    onLogMessage(`HTML шаблона скопирован.`, 'success');
  };

  const handleCopyJson = (template: MessageTemplate) => {
    const json = JSON.stringify({
      name: template.name,
      event_type: template.event_type,
      description: template.description,
      body_html: template.body_html,
      variables: JSON.parse(template.variables_json)
    }, null, 2);
    navigator.clipboard.writeText(json);
    onLogMessage(`JSON шаблона скопирован.`, 'success');
  };

  const renderHTMLPreview = (txt: string, vars: TemplateVariable[]) => {
    let preview = txt;
    vars.forEach(v => {
      preview = preview.replace(new RegExp(`\\{${v.key}\\}`, 'g'), v.defaultValue || `[${v.label}]`);
    });

    // Simple Telegram HTML simulation
    let html = preview
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    html = html
      .replace(/&lt;b&gt;([\s\S]*?)&lt;\/b&gt;/g, '<strong>$1</strong>')
      .replace(/&lt;strong&gt;([\s\S]*?)&lt;\/strong&gt;/g, '<strong>$1</strong>')
      .replace(/&lt;i&gt;([\s\S]*?)&lt;\/i&gt;/g, '<em>$1</em>')
      .replace(/&lt;em&gt;([\s\S]*?)&lt;\/em&gt;/g, '<em>$1</em>')
      .replace(/&lt;u&gt;([\s\S]*?)&lt;\/u&gt;/g, '<u>$1</u>')
      .replace(/&lt;s&gt;([\s\S]*?)&lt;\/s&gt;/g, '<del>$1</del>')
      .replace(/&lt;del&gt;([\s\S]*?)&lt;\/del&gt;/g, '<del>$1</del>')
      .replace(/&lt;strike&gt;([\s\S]*?)&lt;\/strike&gt;/g, '<del>$1</del>')
      .replace(/&lt;code&gt;([\s\S]*?)&lt;\/code&gt;/g, '<code class="bg-zinc-800 px-1 rounded font-mono text-amber-300">$1</code>')
      .replace(/&lt;pre&gt;([\s\S]*?)&lt;\/pre&gt;/g, '<pre class="bg-zinc-950 p-2 rounded text-zinc-300 font-mono text-[10px] overflow-auto block">$1</pre>')
      .replace(/&lt;a\s+href=["\']([^"\']+)["\']&gt;([\s\S]*?)&lt;\/a&gt;/g, '<a href="$1" class="text-sky-400">$2</a>')
      .replace(/&lt;blockquote&gt;([\s\S]*?)&lt;\/blockquote&gt;/g, '<blockquote class="border-l-2 border-zinc-700 pl-2 italic text-zinc-400">$1</blockquote>');

    return (
      <div 
        className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap font-sans"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };

  const validateHTML = (html: string) => {
    const allowedTags = ['b', 'strong', 'i', 'em', 'u', 's', 'del', 'strike', 'code', 'pre', 'a', 'blockquote'];
    const errors: string[] = [];
    
    // Find all tags
    const tagRegex = /<\/?[a-zA-Z0-9]+(\s+[^>]*)?>/g;
    let match;
    const stack: string[] = [];

    while ((match = tagRegex.exec(html)) !== null) {
      const tagStr = match[0];
      const isClosing = tagStr.startsWith('</');
      const tagName = tagStr.replace(/[<>\/]/g, '').split(' ')[0].toLowerCase();

      if (!allowedTags.includes(tagName)) {
        errors.push(`Неподдерживаемый тег: <${tagName}>`);
        continue;
      }

      if (isClosing) {
        if (stack.length === 0 || stack.pop() !== tagName) {
          errors.push(`Ошибка закрытия тега: ${tagStr}`);
        }
      } else {
        // Self-closing tags are not supported in Telegram HTML for these tags generally
        stack.push(tagName);
      }
    }

    if (stack.length > 0) {
      errors.push(`Незакрытые теги: ${stack.map(t => `<${t}>`).join(', ')}`);
    }

    if (!html.trim()) {
      errors.push('Шаблон пустой.');
    }

    if (html.length > 4096) {
      errors.push('Сообщение слишком длинное для Telegram (макс 4096 симв).');
    }

    return errors;
  };

  const validationErrors = useMemo(() => validateHTML(formData.body_html), [formData.body_html]);

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-[#080809]">
      {/* Toolbar */}
      <div className="border-b border-[#1f1f22] bg-[#0d0d0e]/95 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Layout className="w-4 h-4 text-amber-400" />
          <h2 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">Шаблоны сообщений</h2>
        </div>
        <div className="flex items-center gap-2">
           <div className="group relative">
            <button
              className="flex items-center gap-1.5 py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md text-[11px] font-bold transition-all"
            >
              <CopyPlus className="w-3.5 h-3.5" />
              <span>Создать из примера</span>
            </button>
            <div className="absolute top-full right-0 mt-1 w-56 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl invisible group-hover:visible z-20 overflow-hidden">
              {TEMPLATE_EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setEditingTemplate(null);
                    setFormData({
                      name: ex.name,
                      event_type: ex.event_type,
                      description: ex.description,
                      body_html: ex.body_html,
                      variables: ex.variables,
                      status: 'ready'
                    });
                    setShowForm(true);
                  }}
                  className="w-full text-left px-4 py-2 text-[11px] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors border-b border-zinc-800/50 last:border-0"
                >
                  {ex.name}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => {
              setEditingTemplate(null);
              setFormData({
                name: '',
                event_type: 'release_updates',
                description: '',
                body_html: '',
                variables: [],
                status: 'draft'
              });
              setShowForm(true);
            }}
            className="flex items-center gap-1.5 py-1.5 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 rounded-md text-[11px] font-bold transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Создать шаблон</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
            <p className="text-xs text-zinc-500 font-mono">Загрузка шаблонов...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/10">
            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600">
              <FileCode className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-zinc-300 font-semibold text-sm">Шаблоны ещё не созданы</h3>
              <p className="text-xs text-zinc-500 max-w-sm px-6">
                Создайте шаблон для релиза, заявки, отчёта или ошибки для автоматизации уведомлений.
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
                  <th className="py-2.5 px-4">Переменные</th>
                  <th className="py-2.5 px-4">Последний тест</th>
                  <th className="py-2.5 px-4">Статус</th>
                  <th className="py-2.5 px-4 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-950 text-xs text-zinc-300">
                {templates.map((template) => {
                  const event = EVENT_TYPES.find(e => e.value === template.event_type);
                  const vars: TemplateVariable[] = JSON.parse(template.variables_json);
                  return (
                    <tr key={template.id} className="hover:bg-zinc-900/20 transition-colors group">
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-zinc-200">{template.name}</span>
                          <span className="text-[10px] text-zinc-500 truncate max-w-xs">{template.description}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 text-[10px] font-mono">
                          {event?.label || template.event_type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {vars.length > 0 ? vars.map(v => (
                            <span key={v.key} className="text-[9px] font-mono text-amber-500/70 bg-amber-500/5 px-1 rounded">
                              {v.key}
                            </span>
                          )) : <span className="text-zinc-600 italic">нет</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-zinc-500">
                        {template.last_test_at ? new Date(template.last_test_at).toLocaleString('ru-RU') : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {template.status === 'draft' ? (
                            <div className="flex items-center gap-1 text-zinc-500">
                              <Edit3 className="w-3 h-3" />
                              <span className="text-[10px]">Черновик</span>
                            </div>
                          ) : template.last_test_status === 'success' ? (
                            <div className="flex items-center gap-1 text-emerald-400">
                              <CheckCircle className="w-3 h-3" />
                              <span className="text-[10px]">Готов</span>
                            </div>
                          ) : template.last_test_status === 'error' ? (
                            <div className="flex items-center gap-1 text-red-400" title={template.last_error || ''}>
                              <AlertCircle className="w-3 h-3" />
                              <span className="text-[10px]">Ошибка теста</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-zinc-400">
                              <Info className="w-3 h-3" />
                              <span className="text-[10px]">Не проверен</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleTestTemplate(template.id)}
                            className="p-1.5 text-zinc-400 hover:text-amber-400 transition-colors"
                            title="Отправить тест"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDuplicate(template)}
                            className="p-1.5 text-zinc-400 hover:text-indigo-400 transition-colors"
                            title="Дублировать"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleCopyHtml(template.body_html)}
                            className="p-1.5 text-zinc-400 hover:text-blue-400 transition-colors"
                            title="Скопировать HTML"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleCopyJson(template)}
                            className="p-1.5 text-zinc-400 hover:text-amber-400 transition-colors"
                            title="Скопировать JSON"
                          >
                            <FileJson className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingTemplate(template);
                              setFormData({
                                name: template.name,
                                event_type: template.event_type,
                                description: template.description,
                                body_html: template.body_html,
                                variables: JSON.parse(template.variables_json),
                                status: template.status
                              });
                              setShowForm(true);
                            }}
                            className="p-1.5 text-zinc-400 hover:text-white transition-colors"
                            title="Редактировать"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(template.id, template.name)}
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

      {/* Template Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-5xl bg-[#0c0c0d] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-[#121214]">
              <h3 className="text-sm font-bold text-zinc-100">
                {editingTemplate ? 'Редактирование шаблона' : 'Создание нового шаблона'}
              </h3>
              <button 
                onClick={() => { setShowForm(false); setEditingTemplate(null); }}
                className="text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex divide-x divide-zinc-800">
              {/* Left: Editor */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider">
                      Название шаблона
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Пример: Релиз проекта"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded-md py-2 px-3 focus-ring"
                    />
                  </div>
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
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider">
                    Описание
                  </label>
                  <input
                    type="text"
                    placeholder="Коротко о назначении шаблона"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded-md py-2 px-3 focus-ring"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider flex items-center justify-between">
                    <span>HTML-тело сообщения</span>
                    <div className="flex items-center gap-2">
                      <Code2 className="w-3 h-3 text-amber-500" />
                      <span className="text-[9px] lowercase font-normal italic text-zinc-500">Поддерживаются теги Telegram</span>
                    </div>
                  </label>
                  <textarea
                    required
                    rows={12}
                    value={formData.body_html}
                    onChange={(e) => setFormData({ ...formData, body_html: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 rounded-md py-3 px-4 focus-ring font-mono resize-none"
                    placeholder="🚀 <b>Retail Core обновился</b>..."
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider">
                    Переменные шаблона
                  </label>
                  {formData.variables.length === 0 ? (
                    <div className="p-4 rounded-lg bg-zinc-900/40 border border-dashed border-zinc-800 text-center">
                      <p className="text-[10px] text-zinc-500 italic">Добавьте {'{variable_name}'} в HTML-код, чтобы они появились здесь.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {formData.variables.map((v, idx) => (
                        <div key={v.key} className="flex items-center gap-2 bg-zinc-900/60 p-2 rounded-lg border border-zinc-800/60">
                          <div className="w-20 text-[10px] font-mono text-amber-500 truncate">{v.key}</div>
                          <input
                            type="text"
                            placeholder="Метка (напр. Заголовок)"
                            value={v.label}
                            onChange={(e) => {
                              const newVars = [...formData.variables];
                              newVars[idx].label = e.target.value;
                              setFormData({ ...formData, variables: newVars });
                            }}
                            className="flex-1 bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300 rounded px-2 py-1 focus-ring"
                          />
                          <input
                            type="text"
                            placeholder="Значение по умолчанию"
                            value={v.defaultValue}
                            onChange={(e) => {
                              const newVars = [...formData.variables];
                              newVars[idx].defaultValue = e.target.value;
                              setFormData({ ...formData, variables: newVars });
                            }}
                            className="flex-1 bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300 rounded px-2 py-1 focus-ring"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Preview & Validation */}
              <div className="w-80 bg-[#09090a] flex flex-col overflow-hidden">
                <div className="p-4 border-b border-zinc-800 flex items-center gap-2 bg-[#0d0d0e]">
                  <Eye className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Предпросмотр</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                  {/* Validation section */}
                  {validationErrors.length > 0 && (
                    <div className="bg-red-950/20 border border-red-900/40 rounded-lg p-3 space-y-2 animate-in fade-in slide-in-from-top-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 uppercase font-mono">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Ошибки валидации</span>
                      </div>
                      <ul className="space-y-1">
                        {validationErrors.map((err, i) => (
                          <li key={i} className="text-[9px] text-red-300/80 leading-tight flex items-start gap-1">
                            <span className="mt-1 w-1 h-1 rounded-full bg-red-500 shrink-0" />
                            {err}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Mock Telegram Message */}
                  <div className="bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden shadow-2xl flex flex-col min-h-[200px] max-h-[400px]">
                    <div className="bg-[#121214] border-b border-zinc-900 p-2.5 px-4 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#0088cc] flex items-center justify-center font-bold text-[10px] uppercase text-white">
                        B
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-zinc-100 truncate">Preview Bot</p>
                        <p className="text-[8px] text-[#0088cc] font-mono leading-none">бот</p>
                      </div>
                    </div>
                    <div className="flex-1 bg-zinc-950 bg-[radial-gradient(#1f2230_1px,transparent_1px)] [background-size:16px_16px] p-3 flex flex-col justify-end">
                      <div className="bg-[#121214] border border-[#1f1f22] text-zinc-300 py-2 px-3 rounded-2xl rounded-tl-none text-xs leading-relaxed shadow-lg overflow-auto">
                        {renderHTMLPreview(formData.body_html, formData.variables)}
                        <div className="text-right text-[8px] font-mono text-zinc-600 mt-1">
                          {new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} ✓✓
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status Toggle */}
                  <div className="space-y-1.5 pt-4">
                    <label className="text-[10px] uppercase font-mono font-bold text-zinc-500 tracking-wider">
                      Статус шаблона
                    </label>
                    <div className="flex bg-zinc-900/60 p-1 rounded-lg border border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, status: 'draft' })}
                        className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${
                          formData.status === 'draft' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500'
                        }`}
                      >
                        Черновик
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, status: 'ready' })}
                        className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${
                          formData.status === 'ready' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500'
                        }`}
                      >
                        Готов
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-zinc-800 bg-[#0d0d0e]">
                  <button
                    onClick={handleSubmit}
                    disabled={validationErrors.length > 0}
                    className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-bold rounded-md transition-all text-xs flex items-center justify-center gap-2"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editingTemplate ? 'Сохранить изменения' : 'Создать шаблон'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Modal */}
      {testModal.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0c0c0d] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-[#121214]">
              <h3 className="text-sm font-bold text-zinc-100">Тестовая отправка</h3>
              <button onClick={() => setTestModal({ show: false, templateId: null })} className="text-zinc-500 hover:text-zinc-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider">
                  Выберите маршрут
                </label>
                <select
                  value={selectedRouteId}
                  onChange={(e) => setSelectedRouteId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded-md py-2 px-3 focus-ring"
                >
                  <option value="">-- Выберите маршрут --</option>
                  {routes.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.chat_title})
                    </option>
                  ))}
                </select>
                {routes.length === 0 && (
                  <p className="text-[10px] text-amber-500">У вас нет созданных маршрутов. Сначала создайте маршрут в разделе "Маршруты".</p>
                )}
              </div>
              
              <button
                onClick={runTestSend}
                disabled={!selectedRouteId || isSendingTest}
                className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-bold rounded-md transition-all text-xs flex items-center justify-center gap-2"
              >
                <Send className={`w-3.5 h-3.5 ${isSendingTest ? 'animate-pulse' : ''}`} />
                <span>{isSendingTest ? 'Отправка...' : 'Отправить тестовое сообщение'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
