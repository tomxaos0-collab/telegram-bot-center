import React, { useState } from 'react';
import { Settings, Save, Sparkles, FolderOpen, HardDrive, RefreshCw, AlertTriangle } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onResetApp: () => void;
  onSeedLogs: () => void;
}

export default function SettingsView({
  settings,
  onSaveSettings,
  onResetApp,
  onSeedLogs
}: SettingsViewProps) {
  const [lang, setLang] = useState(settings.language);
  const [auto, setAuto] = useState(settings.autoStart);
  const [theme, setTheme] = useState(settings.themeStyle);
  const [dbPath, setDbPath] = useState(settings.dbPath);
  const [minify, setMinify] = useState(settings.minifyLogs);
  const [interval, setIntervalVal] = useState(settings.pollingInterval);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      language: lang,
      autoStart: auto,
      themeStyle: theme,
      dbPath: dbPath,
      minifyLogs: minify,
      pollingInterval: interval
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2050);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between border-b border-[#1b1b1c] pb-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#0088cc]" />
            Параметры Telegram Bot Center
          </h2>
          <p className="text-[11px] text-zinc-500">
            Конфигурация поведения десктопного ядра и визуальной оболочки приложения в KachiOS
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {savedSuccess && (
          <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 rounded-md text-emerald-400 text-xs font-medium flex items-center gap-1.5 animate-scale">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Конфигурационные параметры успешно сохранены в tauri.conf!</span>
          </div>
        )}

        {/* Database setting Card */}
        <div className="bg-[#121214]/60 border border-[#1f1f22] p-5 rounded-lg space-y-4 shadow-sm">
          <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-emerald-400" /> Хранилище SQLite3 локальное
          </h3>

          <div className="space-y-1.5">
            <label className="text-[11px] text-zinc-400">Системный путь к БД SQLite</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={dbPath}
                onChange={(e) => setDbPath(e.target.value)}
                className="flex-1 bg-[#0c0c0d] border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-320 focus-ring font-mono"
                placeholder="/home/user/.config/telegram_bot_center/main.sqlite"
              />
              <button
                type="button"
                className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-zinc-150 rounded text-xs flex items-center gap-1"
                title="Обзор проводника Tauri"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Выбор</span>
              </button>
            </div>
            <span className="text-[10px] text-zinc-550 block leading-tight">
              Tauri создаст базу данных автоматически по этому пути при первой инициализации приложения.
            </span>
          </div>
        </div>

        {/* GUI Visuals setting Card */}
        <div className="bg-[#121214]/60 border border-[#1f1f22] p-5 rounded-lg space-y-4 shadow-sm">
          <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
            Интерфейс и Темизация (Linear Style)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dark themes options */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-zinc-400">Цветовая палитра тёмной темы</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="w-full bg-[#0c0c0d] border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 focus-ring"
              >
                <option value="slate-dark">Slate Dark (Стандартный графит - #0c0c0d)</option>
                <option value="pitch-black">Pitch Black (Чистый черный OLED - #000000)</option>
                <option value="deep-space">Deep Space (Космический синий - #0e111a)</option>
              </select>
            </div>

            {/* Language */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-zinc-400">Язык интерфейса приложения</label>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="w-full bg-[#0c0c0d] border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 focus-ring"
              >
                <option value="ru">Русский (Локальный)</option>
                <option value="en">English (Справочный)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Auto Start check */}
            <label className="flex items-center gap-2 px-3 py-2 bg-[#0c0c0d] border border-zinc-850 rounded-md cursor-pointer select-none">
              <input
                type="checkbox"
                checked={auto}
                onChange={(e) => setAuto(e.target.checked)}
                className="rounded border-zinc-800 bg-[#0c0c0d] text-sky-500 w-4 h-4"
              />
              <div>
                <span className="text-xs font-medium text-zinc-200 block">Запуск при старте системы</span>
                <span className="text-[9px] text-zinc-500">Автодобавление в автозагрузку Arch (.desktop)</span>
              </div>
            </label>

            {/* Minified Logs check */}
            <label className="flex items-center gap-2 px-3 py-2 bg-[#0c0c0d] border border-zinc-850 rounded-md cursor-pointer select-none">
              <input
                type="checkbox"
                checked={minify}
                onChange={(e) => setMinify(e.target.checked)}
                className="rounded border-zinc-800 bg-[#0c0c0d] text-sky-500 w-4 h-4"
              />
              <div>
                <span className="text-xs font-medium text-zinc-200 block">Сжатие лог-вывода в ОЗУ</span>
                <span className="text-[9px] text-zinc-500">Откат переполнения консоли свыше 300 строк</span>
              </div>
            </label>
          </div>
        </div>

        {/* Simulation testing stats info Card */}
        <div className="bg-[#121214]/60 border border-[#1f1f22] p-5 rounded-lg space-y-4 shadow-sm">
          <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />Опасная зона / Секция разработчика
          </h3>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onSeedLogs}
              className="px-3 py-1.5 bg-[#1b1912] hover:bg-[#2e2b1e] border border-amber-900/40 text-amber-400 rounded text-xs flex items-center gap-1 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Сгенерировать пакет логов</span>
            </button>

            <button
              type="button"
              onClick={onResetApp}
              className="px-3 py-1.5 bg-[#211214] hover:bg-[#341c20] border border-red-900/40 text-red-400 rounded text-xs flex items-center gap-1 transition-all"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Очистить кэш приложения</span>
            </button>
          </div>
        </div>

        {/* Primary Save Bar */}
        <div className="flex justify-end pt-3">
          <button
            type="submit"
            className="px-5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-semibold rounded-md text-xs flex items-center gap-1.5 transition-all shadow-md focus-ring"
          >
            <Save className="w-4 h-4" />
            Сохранить параметры
          </button>
        </div>
      </form>
    </div>
  );
}
