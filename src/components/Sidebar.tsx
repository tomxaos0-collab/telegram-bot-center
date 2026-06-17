import React from 'react';
import { Bot, MessageSquare, Send, Link as LinkIcon, Terminal, Settings, Disc, Route, Layout } from 'lucide-react';
import { TelegramBot } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  bots: TelegramBot[];
  selectedBotId: string | null;
  setSelectedBotId: (id: string | null) => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  bots,
  selectedBotId,
  setSelectedBotId
}: SidebarProps) {
  const menuItems = [
    { id: 'bots', name: 'Боты', icon: Bot },
    { id: 'chats', name: 'Чаты', icon: MessageSquare, badge: bots.length > 0 ? 3 : undefined },
    { id: 'messages', name: 'Сообщения', icon: Send },
    { id: 'webhook', name: 'Webhook', icon: LinkIcon },
    { id: 'templates', name: 'Шаблоны', icon: Layout },
    { id: 'logs', name: 'Логи', icon: Terminal },
    { id: 'updates', name: 'Обновления', icon: DownloadCloud },
    { id: 'settings', name: 'Настройки', icon: Settings }
    ];


  return (
    <aside className="w-64 border-r border-[#1f1f22] bg-[#0c0c0d] flex flex-col select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#1b1b1c] flex items-center gap-3">
        <div className="w-7 h-7 bg-zinc-900 border border-zinc-700/80 rounded-lg flex items-center justify-center shadow-inner">
          <div className="w-2.5 h-2.5 bg-[#0088cc] rounded-full animate-pulse" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-zinc-100 tracking-tight leading-none">
            Bot Center
          </h1>
          <span className="text-[10px] font-mono text-zinc-500 mt-1 block">
            Telegram Desktop v1.0
          </span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-600 px-3 mb-2">
          Меню управления
        </div>
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-zinc-900 text-zinc-100 border border-zinc-800'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <IconComponent
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-[#0088cc]' : 'text-zinc-500 group-hover:text-[#0088cc]'
                  }`}
                />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-zinc-800 text-zinc-300 rounded border border-zinc-700">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Selected Bot Quick Selector if bots exist */}
        {bots.length > 0 && (
          <div className="mt-8 pt-6 border-t border-[#1b1b1c]">
            <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-600 px-3 mb-2">
              Текущий бот
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {bots.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBotId(b.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-xs transition-colors border ${
                    selectedBotId === b.id
                      ? 'bg-[#1b1b1c]/60 text-zinc-100 border-zinc-800'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1b1b1c]/20 border-transparent'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    b.isActive ? 'bg-[#10b981]' : 'bg-red-500'
                  }`} />
                  <div className="flex-1 truncate">
                    <p className="font-medium text-zinc-300 truncate leading-tight">{b.name}</p>
                    <p className="text-[10px] text-zinc-500 font-mono truncate">@{b.username}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-[#1b1b1c] bg-[#09090a]/50 text-[11px] text-zinc-500 flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <Disc className="w-3 h-3 text-[#10b981] animate-spin" style={{ animationDuration: '8s' }} />
          <span>KachiOS / Arch</span>
        </div>
        <span className="text-[9px] font-medium uppercase px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-400">
          Tauri build
        </span>
      </div>
    </aside>
  );
}
