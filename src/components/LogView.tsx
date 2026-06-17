import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Trash2, Pause, Play, Download, Search, Settings, ShieldAlert } from 'lucide-react';
import { SystemLog } from '../types';

interface LogViewProps {
  logs: SystemLog[];
  onClearLogs: () => void;
  isRunningModel: boolean;
  setIsRunningModel: (run: boolean) => void;
}

export default function LogView({ logs, onClearLogs, isRunningModel, setIsRunningModel }: LogViewProps) {
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Download Logs Function
  const handleDownload = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.category.toUpperCase()}] - ${l.message}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bot_center_logs_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== 'all' && log.level !== filterLevel) return false;
    if (filterCategory !== 'all' && log.category !== filterCategory) return false;
    if (searchQuery.trim() !== '') {
      return log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
             log.category.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'success':
        return 'text-[#10b981]';
      case 'warn':
        return 'text-amber-400';
      case 'error':
        return 'text-red-400 font-semibold';
      case 'info':
      default:
        return 'text-sky-400';
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'api':
        return 'text-[#0088cc] border-[#0088cc]/20 bg-[#0088cc]/5';
      case 'webhook':
        return 'text-emerald-400 border-emerald-500/10 bg-emerald-500/5';
      case 'database':
        return 'text-purple-400 border-purple-500/10 bg-purple-500/5';
      case 'system':
      default:
        return 'text-zinc-400 border-zinc-800 bg-zinc-900/50';
    }
  };

  return (
    <div className="flex-1 overflow-hidden p-6 flex flex-col space-y-4">
      {/* Filters bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#121214]/60 border border-[#1f1f22] p-3 rounded-lg">
        <div className="flex flex-wrap items-center gap-2">
          {/* Level selector */}
          <div className="flex items-center gap-1.5 bg-[#0c0c0d] border border-zinc-800 rounded-md px-2 py-1">
            <span className="text-[10px] text-zinc-500 uppercase font-mono">Важность:</span>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="bg-transparent text-xs text-zinc-350 focus:outline-none"
            >
              <option value="all">Все уровни</option>
              <option value="info">INFO</option>
              <option value="success">SUCCESS</option>
              <option value="warn">WARN</option>
              <option value="error">ERROR</option>
            </select>
          </div>

          {/* Category selector */}
          <div className="flex items-center gap-1.5 bg-[#0c0c0d] border border-zinc-800 rounded-md px-2 py-1">
            <span className="text-[10px] text-zinc-500 uppercase font-mono">Раздел:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-transparent text-xs text-zinc-350 focus:outline-none"
            >
              <option value="all">Все категории</option>
              <option value="api">API</option>
              <option value="webhook">Webhook</option>
              <option value="database">Database</option>
              <option value="system">System</option>
            </select>
          </div>

          {/* Search bar inside logs */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-3 h-3 text-zinc-500" />
            <input
              type="text"
              placeholder="Поиск логов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#0c0c0d] border border-zinc-800 rounded-md py-1 pl-7 pr-2 text-xs text-zinc-350 w-44 placeholder-zinc-650 focus-ring font-sans"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {/* Stream trigger */}
          <button
            onClick={() => setIsRunningModel(!isRunningModel)}
            className={`px-2.5 py-1 border rounded flex items-center gap-1.5 transition-all ${
              isRunningModel
                ? 'bg-zinc-900 border-zinc-805 text-zinc-300 hover:text-zinc-150'
                : 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400 hover:bg-emerald-950/40'
            }`}
            title={isRunningModel ? 'Приостановить поток логов' : 'Запустить поток логов'}
          >
            {isRunningModel ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>ПАУЗА</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>ЗАПУСК</span>
              </>
            )}
          </button>

          {/* Auto scroll toggle */}
          <label className="flex items-center gap-1.5 text-zinc-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded border-zinc-800 bg-[#0c0c0d] text-sky-500 focus:ring-0 w-3 h-3"
            />
            <span>АВТОПРОКРУТКА</span>
          </label>

          <div className="h-4 w-[1px] bg-zinc-800 mx-1" />

          {/* Clean Terminal */}
          <button
            onClick={onClearLogs}
            className="p-1.5 bg-[#0c0c0d] border border-zinc-800 rounded text-zinc-500 hover:text-red-400 hover:border-red-950/50 transition-colors"
            title="Очистить терминал"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Download txt */}
          <button
            onClick={handleDownload}
            disabled={logs.length === 0}
            className="p-1.5 bg-[#0c0c0d] border border-zinc-800 rounded text-zinc-350 disabled:opacity-40 disabled:pointer-events-none hover:text-[#0088cc] hover:border-[#0088cc]/30 transition-colors"
            title="Экспортировать логи (.txt)"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal panel */}
      <div className="flex-1 bg-[#070708] border border-[#1f1f22] rounded-xl flex flex-col overflow-hidden relative shadow-inner">
        {/* Terminal Titlebar banner */}
        <div className="bg-[#0b0b0c] border-b border-[#141416] p-2.5 flex items-center justify-between text-[11px] font-mono select-none">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-zinc-500 font-semibold tracking-wider">SYSTEM CONSOLE STREAM</span>
          </div>
          <span className="text-zinc-650 text-[10px] lowercase">строк в кэше: {filteredLogs.length}</span>
        </div>

        {/* Stream Canvas */}
        <div
          ref={terminalRef}
          className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-800 select-text"
        >
          {filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-zinc-650 space-y-2">
              <ShieldAlert className="w-5 h-5 text-zinc-700" />
              <p>Терминал пуст. Нет сообщений лога под выбранные фильтры.</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-2.5 group hover:bg-zinc-950/30 py-0.5 rounded px-1 transition-colors">
                <span className="text-zinc-600 select-none shrink-0">
                  [{log.timestamp}]
                </span>
                
                {/* Category label */}
                <span className={`px-1.5 py-0.1 border rounded text-[9px] uppercase font-bold shrink-0 leading-none self-center ${getCategoryColor(log.category)}`}>
                  {log.category}
                </span>

                <span className={`${getLevelColor(log.level)} break-all`}>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
