import React, { useState, useEffect } from 'react';
import { Search, Database, Cpu, Clock, X, Minus, Square } from 'lucide-react';
import { TelegramBot } from '../types';

interface HeaderProps {
  activeTab: string;
  botsCount: number;
  activeBotsCount: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function Header({
  activeTab,
  botsCount,
  activeBotsCount,
  searchQuery,
  setSearchQuery
}: HeaderProps) {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const getTabTitle = () => {
    switch (activeTab) {
      case 'bots':
        return 'Управление ботами';
      case 'chats':
        return 'Активные чаты и диалоги';
      case 'messages':
        return 'Рассылки и шаблоны';
      case 'webhook':
        return 'Webhook конфигуратор';
      case 'logs':
        return 'Системный терминал';
      case 'settings':
        return 'Системные параметры';
      default:
        return 'Telegram Bot Center';
    }
  };

  return (
    <header className="h-12 border-b border-[#1f1f22] bg-[#0c0c0d] px-4 flex items-center justify-between select-none">
      {/* Search Bar / App Title */}
      <div className="flex items-center gap-4">
        <span className="text-xs font-medium text-zinc-100 uppercase tracking-tight">
          {getTabTitle()}
        </span>
        <div className="h-4 w-[1px] bg-zinc-800" />
        
        {activeTab === 'bots' && (
          <div className="relative w-56">
            <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Поиск по ботам..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/60 border border-zinc-900 rounded-md py-1 pl-8 pr-3 text-[11px] text-zinc-300 placeholder-zinc-500 focus-ring focus:bg-zinc-950 font-sans"
            />
          </div>
        )}
      </div>

      {/* System info & Window Controls */}
      <div className="flex items-center gap-4">
        {/* System telemetry badges */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-mono border border-zinc-900 px-2 py-0.5 rounded-md bg-zinc-950/30">
            <Database className="w-3 h-3 text-[#10b981]" />
            <span>SQLite: OK</span>
          </div>

          <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-mono border border-zinc-900 px-2 py-0.5 rounded-md bg-zinc-950/30">
            <Cpu className="w-3 h-3 text-sky-500" />
            <span>Память: 48Mb</span>
          </div>

          <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-mono border border-zinc-900 px-2 py-0.5 rounded-md bg-zinc-950/30">
            <Clock className="w-3 h-3 text-zinc-400" />
            <span>{time}</span>
          </div>
        </div>

        <div className="h-4 w-[1px] bg-zinc-800" />

        {/* Mock OS Native Window Buttons for Arch-like custom topBar */}
        <div className="flex items-center gap-1">
          <button className="p-1 text-zinc-600 hover:text-zinc-400 rounded transition-colors group">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button className="p-1 text-zinc-600 hover:text-zinc-400 rounded transition-colors">
            <Square className="w-2.5 h-2.5" />
          </button>
          <button className="p-1 text-zinc-600 hover:text-red-400 rounded transition-colors">
            <X className="w-3.5 h-3.5 hover:scale-105 transition-transform" />
          </button>
        </div>
      </div>
    </header>
  );
}
