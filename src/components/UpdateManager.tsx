import React, { useState, useEffect } from 'react';
import { DownloadCloud, RefreshCw, CheckCircle, AlertCircle, Package, ArrowRight, ShieldAlert } from 'lucide-react';

interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: bool;
  releaseName: string;
  releaseNotes: string;
  publishedAt: string;
  assetName: string;
  assetSize: number;
  downloadUrl: string;
}

interface UpdateManagerProps {
  onLogMessage: (message: string, level: 'info' | 'success' | 'warn' | 'error') => void;
}

const IS_TAURI = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '___TAURI__' in window || (window as any).__TAURI_IPC__ !== undefined);

export default function UpdateManager({ onLogMessage }: UpdateManagerProps) {
  const [currentVersion, setCurrentVersion] = useState<string>('0.1.0');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (IS_TAURI) {
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke<string>('get_app_version')
          .then(v => setCurrentVersion(v))
          .catch(e => console.error('Failed to get app version', e));
      });
    }
  }, []);

  const handleCheckUpdate = async () => {
    if (!IS_TAURI) {
      setError('Обновления доступны только в скомпилированном desktop-приложении.');
      return;
    }

    setIsChecking(true);
    setError(null);
    setUpdateInfo(null);
    setDownloadSuccess(false);

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const info = await invoke<UpdateInfo>('check_for_updates');
      setUpdateInfo(info);
      onLogMessage(`Проверка обновлений: текущая v${info.currentVersion}, последняя v${info.latestVersion}`, 'info');
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err.message || String(err);
      setError(msg);
      onLogMessage(`Ошибка проверки обновлений: ${msg}`, 'error');
    } finally {
      setIsChecking(false);
    }
  };

  const handleDownload = async () => {
    if (!IS_TAURI || !updateInfo) return;
    
    setIsDownloading(true);
    setError(null);

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      onLogMessage(`Скачивание обновления ${updateInfo.assetName}...`, 'info');
      await invoke('download_update', { downloadUrl: updateInfo.downloadUrl });
      setDownloadSuccess(true);
      onLogMessage(`Обновление успешно скачано и готово к установке.`, 'success');
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err.message || String(err);
      setError(msg);
      onLogMessage(`Ошибка скачивания: ${msg}`, 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleInstall = async () => {
    if (!IS_TAURI) return;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      onLogMessage(`Запуск helper script для установки...`, 'info');
      await invoke('install_downloaded_update');
      // App will exit here
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err.message || String(err);
      setError(msg);
      onLogMessage(`Ошибка запуска установки: ${msg}`, 'error');
    }
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-[#080809]">
      <div className="border-b border-[#1f1f22] bg-[#0d0d0e]/95 px-4 py-3 shrink-0 flex items-center gap-2">
        <DownloadCloud className="w-4 h-4 text-sky-400" />
        <h2 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">Обновления системы</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex justify-center">
        <div className="w-full max-w-2xl space-y-6">
          
          {/* Status Card */}
          <div className="bg-[#121214] border border-zinc-800 rounded-xl p-6 flex flex-col items-center text-center space-y-4 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-500/20 via-sky-400 to-indigo-500/20"></div>
            
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner">
              <Package className="w-8 h-8 text-sky-400" />
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-zinc-100">Telegram Bot Center</h3>
              <p className="text-sm font-mono text-zinc-500 mt-1">Текущая версия: v{currentVersion}</p>
            </div>

            {error && (
              <div className="w-full bg-red-950/20 border border-red-900/40 rounded-lg p-3 text-[11px] text-red-400 flex items-start gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {!updateInfo && !isChecking && (
              <button
                onClick={handleCheckUpdate}
                className="py-2.5 px-6 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold rounded-md transition-all text-xs flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Проверить обновления</span>
              </button>
            )}

            {isChecking && (
              <div className="py-2.5 px-6 text-zinc-400 text-xs flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                <span>Поиск обновлений на GitHub...</span>
              </div>
            )}

            {updateInfo && !updateInfo.hasUpdate && (
              <div className="space-y-4 w-full">
                <div className="flex items-center justify-center gap-2 text-emerald-400 bg-emerald-500/10 py-2 rounded-lg border border-emerald-500/20">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">У вас актуальная версия</span>
                </div>
                <button
                  onClick={handleCheckUpdate}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
                >
                  Проверить снова
                </button>
              </div>
            )}

            {updateInfo && updateInfo.hasUpdate && !downloadSuccess && (
              <div className="w-full text-left space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-sky-950/20 border border-sky-900/40 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-sky-400 flex items-center gap-2">
                      <DownloadCloud className="w-4 h-4" />
                      Доступна новая версия: {updateInfo.latestVersion}
                    </h4>
                    <p className="text-[10px] text-zinc-500 mt-1">Опубликовано: {new Date(updateInfo.publishedAt).toLocaleDateString('ru-RU')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-mono text-zinc-400">{updateInfo.assetName}</p>
                    <p className="text-[10px] text-zinc-500">{(updateInfo.assetSize / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                  <h4 className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-2">Что нового:</h4>
                  <div className="text-xs text-zinc-300 whitespace-pre-wrap font-sans">
                    {updateInfo.releaseNotes || 'Нет описания релиза.'}
                  </div>
                </div>

                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-900 disabled:text-sky-700 text-white font-bold rounded-md transition-all text-xs flex items-center justify-center gap-2"
                >
                  {isDownloading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Скачивание...</span>
                    </>
                  ) : (
                    <>
                      <DownloadCloud className="w-4 h-4" />
                      <span>Скачать и подготовить обновление</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {downloadSuccess && (
              <div className="w-full text-left space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-lg p-4 text-center space-y-2">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-emerald-400">Обновление загружено!</h4>
                  <p className="text-xs text-emerald-500/80">
                    Нажмите кнопку ниже, чтобы применить обновление. Приложение будет перезапущено.
                  </p>
                </div>
                
                <button
                  onClick={handleInstall}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-md transition-all text-xs flex items-center justify-center gap-2 group"
                >
                  <span>Закрыть и установить</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}
          </div>

          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4 text-[10px] text-zinc-500 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 shrink-0 text-amber-500/50" />
            <div className="space-y-1">
              <p><strong className="text-zinc-400">Информация о безопасности обновлений</strong></p>
              <p>На раннем этапе (v0.1) updater полностью доверяет GitHub Releases из официального репозитория <code className="bg-zinc-800 px-1 rounded text-zinc-400">tomxaos0-collab/telegram-bot-center</code>.</p>
              <p>Ваши пользовательские данные, включая SQLite базу с ботами и добавленными шаблонами, **не удаляются** и **не затрагиваются** в процессе обновления.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
