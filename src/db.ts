import { BotRecord, NotificationRoute } from './types';

const IS_TAURI = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '___TAURI__' in window || (window as any).__TAURI_IPC__ !== undefined);

let tauriDbInstance: any = null;

// Ensure local storage database is initialized
const LOCAL_STORAGE_KEY = 'tbc_bots_database';
const ROUTES_STORAGE_KEY = 'tbc_routes_database';

function getLocalBots(): BotRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Ошибка чтения из localStorage:', e);
    return [];
  }
}

function saveLocalBots(bots: BotRecord[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(bots));
  } catch (e) {
    console.error('Ошибка записи в localStorage:', e);
  }
}

function getLocalRoutes(): NotificationRoute[] {
  try {
    const raw = localStorage.getItem(ROUTES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Ошибка чтения маршрутов из localStorage:', e);
    return [];
  }
}

function saveLocalRoutes(routes: NotificationRoute[]) {
  try {
    localStorage.setItem(ROUTES_STORAGE_KEY, JSON.stringify(routes));
  } catch (e) {
    console.error('Ошибка записи маршрутов в localStorage:', e);
  }
}

function getLocalFoundChats(): any[] {
  try {
    const raw = localStorage.getItem(FOUND_CHATS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalFoundChats(chats: any[]) {
  try {
    localStorage.setItem(FOUND_CHATS_KEY, JSON.stringify(chats));
  } catch (e) {}
}

function getLocalTemplates(): any[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalTemplates(templates: any[]) {
  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  } catch (e) {}
}

export const db = {
  async init(): Promise<void> {
    if (IS_TAURI) {
      try {
        const tauriSql = await import('@tauri-apps/plugin-sql');
        tauriDbInstance = await tauriSql.default.load('sqlite:bots.db');
        
        // Create bots table
        await tauriDbInstance.execute(`
          CREATE TABLE IF NOT EXISTS bots (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            token TEXT NOT NULL,
            username TEXT NOT NULL,
            telegram_bot_id TEXT,
            is_enabled INTEGER DEFAULT 1,
            last_checked_at TEXT,
            last_error TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          )
        `);

        // Create notification_routes table
        await tauriDbInstance.execute(`
          CREATE TABLE IF NOT EXISTS notification_routes (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            event_type TEXT NOT NULL,
            bot_id TEXT NOT NULL,
            chat_id TEXT NOT NULL,
            chat_title TEXT NOT NULL,
            message_thread_id TEXT,
            thread_title TEXT,
            is_enabled INTEGER DEFAULT 1,
            last_test_at TEXT,
            last_test_status TEXT,
            last_error TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          )
        `);

        console.log('SQLite база данных успешно инициализирована через Tauri-plugin-sql.');
      } catch (err) {
        console.error('Не удалось загрузить плагин Tauri SQL, переключение на локальный симулятор:', err);
        tauriDbInstance = null;
      }
    } else {
      console.log('Запущено в браузере/AI Studio. Подключен SQLite эмулятор на базе LocalStorage.');
      // Initialize local storage table if empty
      const bots = getLocalBots();
      if (bots.length === 0) {
        saveLocalBots([]);
      }
      const routes = getLocalRoutes();
      if (routes.length === 0) {
        saveLocalRoutes([]);
      }
      const templates = getLocalTemplates();
      if (templates.length === 0) {
        saveLocalTemplates([]);
      }
    }
  },

  async getAllBots(): Promise<BotRecord[]> {
    if (IS_TAURI && tauriDbInstance) {
      try {
        return await tauriDbInstance.select('SELECT * FROM bots ORDER BY created_at DESC');
      } catch (err) {
        console.error('SQLite Error select:', err);
        return getLocalBots();
      }
    } else {
      // Local fallback
      return getLocalBots();
    }
  },

  async getBotById(id: string): Promise<BotRecord | null> {
    if (IS_TAURI && tauriDbInstance) {
      try {
        const res: BotRecord[] = await tauriDbInstance.select('SELECT * FROM bots WHERE id = ?', [id]);
        return res.length > 0 ? res[0] : null;
      } catch (err) {
        console.error('SQLite Error select by id:', err);
        return getLocalBots().find(b => b.id === id) || null;
      }
    } else {
      return getLocalBots().find(b => b.id === id) || null;
    }
  },

  async insertBot(bot: Omit<BotRecord, 'created_at' | 'updated_at'>): Promise<BotRecord> {
    const now = new Date().toISOString();
    const newRecord: BotRecord = {
      ...bot,
      created_at: now,
      updated_at: now
    };

    if (IS_TAURI && tauriDbInstance) {
      try {
        await tauriDbInstance.execute(`
          INSERT INTO bots (id, name, token, username, telegram_bot_id, is_enabled, last_checked_at, last_error, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          newRecord.id,
          newRecord.name,
          newRecord.token,
          newRecord.username,
          newRecord.telegram_bot_id,
          newRecord.is_enabled,
          newRecord.last_checked_at,
          newRecord.last_error,
          newRecord.created_at,
          newRecord.updated_at
        ]);
        return newRecord;
      } catch (err) {
        console.error('SQLite Error insert:', err);
      }
    }

    // Local fallback
    const bots = getLocalBots();
    bots.unshift(newRecord);
    saveLocalBots(bots);
    return newRecord;
  },

  async updateBotName(id: string, newName: string): Promise<void> {
    const now = new Date().toISOString();
    if (IS_TAURI && tauriDbInstance) {
      try {
        await tauriDbInstance.execute(
          'UPDATE bots SET name = ?, updated_at = ? WHERE id = ?',
          [newName, now, id]
        );
        return;
      } catch (err) {
        console.error('SQLite Error update:', err);
      }
    }

    // Local fallback
    const bots = getLocalBots();
    const updated = bots.map(b => b.id === id ? { ...b, name: newName, updated_at: now } : b);
    saveLocalBots(updated);
  },

  async updateBotEnabled(id: string, isEnabled: boolean): Promise<void> {
    const now = new Date().toISOString();
    const enabledVal = isEnabled ? 1 : 0;
    if (IS_TAURI && tauriDbInstance) {
      try {
        await tauriDbInstance.execute(
          'UPDATE bots SET is_enabled = ?, updated_at = ? WHERE id = ?',
          [enabledVal, now, id]
        );
        return;
      } catch (err) {
        console.error('SQLite Error update status:', err);
      }
    }

    // Local fallback
    const bots = getLocalBots();
    const updated = bots.map(b => b.id === id ? { ...b, is_enabled: enabledVal, updated_at: now } : b);
    saveLocalBots(updated);
  },

  async deleteBot(id: string): Promise<void> {
    if (IS_TAURI && tauriDbInstance) {
      try {
        await tauriDbInstance.execute('DELETE FROM bots WHERE id = ?', [id]);
        return;
      } catch (err) {
        console.error('SQLite Error delete:', err);
      }
    }

    // Local fallback
    const bots = getLocalBots();
    const filtered = bots.filter(b => b.id !== id);
    saveLocalBots(filtered);
  },

  async updateBotVerification(
    id: string,
    username: string,
    telegramBotId: string | null,
    lastError: string | null
  ): Promise<void> {
    const now = new Date().toISOString();
    const lastCheckedAt = now;
    if (IS_TAURI && tauriDbInstance) {
      try {
        await tauriDbInstance.execute(
          `UPDATE bots 
           SET username = ?, telegram_bot_id = ?, last_checked_at = ?, last_error = ?, updated_at = ? 
           WHERE id = ?`,
          [username, telegramBotId, lastCheckedAt, lastError, now, id]
        );
        return;
      } catch (err) {
        console.error('SQLite Error update verification:', err);
      }
    }

    // Local fallback
    const bots = getLocalBots();
    const updated = bots.map((b) =>
      b.id === id
        ? {
            ...b,
            username,
            telegram_bot_id: telegramBotId,
            last_checked_at: lastCheckedAt,
            last_error: lastError,
            updated_at: now
          }
        : b
    );
    saveLocalBots(updated);
  },

  // Notification Routes CRUD
  async getAllRoutes(): Promise<NotificationRoute[]> {
    if (IS_TAURI && tauriDbInstance) {
      try {
        return await tauriDbInstance.select('SELECT * FROM notification_routes ORDER BY created_at DESC');
      } catch (err) {
        console.error('SQLite Error select routes:', err);
        return getLocalRoutes();
      }
    } else {
      return getLocalRoutes();
    }
  },

  async insertRoute(route: Omit<NotificationRoute, 'created_at' | 'updated_at'>): Promise<NotificationRoute> {
    const now = new Date().toISOString();
    const newRecord: NotificationRoute = {
      ...route,
      created_at: now,
      updated_at: now
    };

    if (IS_TAURI && tauriDbInstance) {
      try {
        await tauriDbInstance.execute(`
          INSERT INTO notification_routes (
            id, name, event_type, bot_id, chat_id, chat_title, 
            message_thread_id, thread_title, is_enabled, 
            last_test_at, last_test_status, last_error, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          newRecord.id,
          newRecord.name,
          newRecord.event_type,
          newRecord.bot_id,
          newRecord.chat_id,
          newRecord.chat_title,
          newRecord.message_thread_id,
          newRecord.thread_title,
          newRecord.is_enabled,
          newRecord.last_test_at,
          newRecord.last_test_status,
          newRecord.last_error,
          newRecord.created_at,
          newRecord.updated_at
        ]);
        return newRecord;
      } catch (err) {
        console.error('SQLite Error insert route:', err);
      }
    }

    const routes = getLocalRoutes();
    routes.unshift(newRecord);
    saveLocalRoutes(routes);
    return newRecord;
  },

  async updateRoute(route: NotificationRoute): Promise<void> {
    const now = new Date().toISOString();
    const updatedRecord = { ...route, updated_at: now };

    if (IS_TAURI && tauriDbInstance) {
      try {
        await tauriDbInstance.execute(`
          UPDATE notification_routes SET 
            name = ?, event_type = ?, bot_id = ?, chat_id = ?, chat_title = ?, 
            message_thread_id = ?, thread_title = ?, is_enabled = ?, 
            last_test_at = ?, last_test_status = ?, last_error = ?, updated_at = ?
          WHERE id = ?
        `, [
          updatedRecord.name,
          updatedRecord.event_type,
          updatedRecord.bot_id,
          updatedRecord.chat_id,
          updatedRecord.chat_title,
          updatedRecord.message_thread_id,
          updatedRecord.thread_title,
          updatedRecord.is_enabled,
          updatedRecord.last_test_at,
          updatedRecord.last_test_status,
          updatedRecord.last_error,
          updatedRecord.updated_at,
          updatedRecord.id
        ]);
        return;
      } catch (err) {
        console.error('SQLite Error update route:', err);
      }
    }

    const routes = getLocalRoutes();
    const updated = routes.map(r => r.id === updatedRecord.id ? updatedRecord : r);
    saveLocalRoutes(updated);
  },

  async deleteRoute(id: string): Promise<void> {
    if (IS_TAURI && tauriDbInstance) {
      try {
        await tauriDbInstance.execute('DELETE FROM notification_routes WHERE id = ?', [id]);
        return;
      } catch (err) {
        console.error('SQLite Error delete route:', err);
      }
    }

    const routes = getLocalRoutes();
    const filtered = routes.filter(r => r.id !== id);
    saveLocalRoutes(filtered);
  },

  async updateRouteTestStatus(
    id: string, 
    status: 'success' | 'error', 
    error: string | null
  ): Promise<void> {
    const now = new Date().toISOString();
    if (IS_TAURI && tauriDbInstance) {
      try {
        await tauriDbInstance.execute(`
          UPDATE notification_routes 
          SET last_test_at = ?, last_test_status = ?, last_error = ?, updated_at = ?
          WHERE id = ?
        `, [now, status, error, now, id]);
        return;
      } catch (err) {
        console.error('SQLite Error update route test status:', err);
      }
    }

    const routes = getLocalRoutes();
    const updated = routes.map(r => r.id === id ? { 
      ...r, 
      last_test_at: now, 
      last_test_status: status, 
      last_error: error, 
      updated_at: now 
    } : r);
    saveLocalRoutes(updated);
  },

  // Found Chats methods
  async getAllFoundChats(): Promise<any[]> {
    if (IS_TAURI && tauriDbInstance) {
      try {
        const rows: any[] = await tauriDbInstance.select('SELECT * FROM found_chats ORDER BY updated_at DESC');
        return rows.map(r => ({
          ...r,
          topics: JSON.parse(r.topics_json)
        }));
      } catch (err) {
        return getLocalFoundChats();
      }
    }
    return getLocalFoundChats();
  },

  async upsertFoundChat(chat: any): Promise<void> {
    const now = new Date().toISOString();
    const topicsJson = JSON.stringify(chat.topics || []);
    
    if (IS_TAURI && tauriDbInstance) {
      try {
        // Try to select first
        const existing: any[] = await tauriDbInstance.select(
          'SELECT topics_json FROM found_chats WHERE chat_id = ? AND bot_id = ?',
          [chat.chat_id, chat.bot_id]
        );

        if (existing.length > 0) {
          // Merge topics
          let topics = JSON.parse(existing[0].topics_json);
          const newTopics = chat.topics || [];
          newTopics.forEach((nt: any) => {
            if (!topics.find((t: any) => t.id === nt.id)) {
              topics.push(nt);
            }
          });
          
          await tauriDbInstance.execute(
            'UPDATE found_chats SET chat_title = ?, chat_type = ?, topics_json = ?, updated_at = ? WHERE chat_id = ? AND bot_id = ?',
            [chat.chat_title, chat.chat_type, JSON.stringify(topics), now, chat.chat_id, chat.bot_id]
          );
        } else {
          await tauriDbInstance.execute(
            'INSERT INTO found_chats (chat_id, bot_id, chat_title, chat_type, topics_json, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            [chat.chat_id, chat.bot_id, chat.chat_title, chat.chat_type, topicsJson, now]
          );
        }
        return;
      } catch (err) {}
    }

    const chats = getLocalFoundChats();
    const idx = chats.findIndex(c => c.chat_id === chat.chat_id && c.bot_id === chat.bot_id);
    if (idx !== -1) {
      const existing = chats[idx];
      let topics = existing.topics || [];
      (chat.topics || []).forEach((nt: any) => {
        if (!topics.find((t: any) => t.id === nt.id)) {
          topics.push(nt);
        }
      });
      chats[idx] = { ...existing, chat_title: chat.chat_title, chat_type: chat.chat_type, topics, updated_at: now };
    } else {
      chats.push({ ...chat, topics: chat.topics || [], updated_at: now });
    }
    saveLocalFoundChats(chats);
  },

  // Message Templates methods
  async getAllTemplates(): Promise<any[]> {
    if (IS_TAURI && tauriDbInstance) {
      try {
        return await tauriDbInstance.select('SELECT * FROM message_templates ORDER BY created_at DESC');
      } catch (err) {
        return getLocalTemplates();
      }
    }
    return getLocalTemplates();
  },

  async insertTemplate(template: any): Promise<void> {
    const now = new Date().toISOString();
    const record = { ...template, created_at: now, updated_at: now };

    if (IS_TAURI && tauriDbInstance) {
      try {
        await tauriDbInstance.execute(`
          INSERT INTO message_templates (
            id, name, event_type, description, body_html, variables_json, 
            status, last_test_at, last_test_status, last_error, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          record.id, record.name, record.event_type, record.description, record.body_html, 
          record.variables_json, record.status, record.last_test_at, record.last_test_status, 
          record.last_error, record.created_at, record.updated_at
        ]);
        return;
      } catch (err) {}
    }

    const templates = getLocalTemplates();
    templates.unshift(record);
    saveLocalTemplates(templates);
  },

  async updateTemplate(template: any): Promise<void> {
    const now = new Date().toISOString();
    const record = { ...template, updated_at: now };

    if (IS_TAURI && tauriDbInstance) {
      try {
        await tauriDbInstance.execute(`
          UPDATE message_templates SET 
            name = ?, event_type = ?, description = ?, body_html = ?, 
            variables_json = ?, status = ?, last_test_at = ?, 
            last_test_status = ?, last_error = ?, updated_at = ?
          WHERE id = ?
        `, [
          record.name, record.event_type, record.description, record.body_html, 
          record.variables_json, record.status, record.last_test_at, 
          record.last_test_status, record.last_error, record.updated_at, record.id
        ]);
        return;
      } catch (err) {}
    }

    const templates = getLocalTemplates();
    const idx = templates.findIndex(t => t.id === record.id);
    if (idx !== -1) {
      templates[idx] = record;
      saveLocalTemplates(templates);
    }
  },

  async deleteTemplate(id: string): Promise<void> {
    if (IS_TAURI && tauriDbInstance) {
      try {
        await tauriDbInstance.execute('DELETE FROM message_templates WHERE id = ?', [id]);
        return;
      } catch (err) {}
    }

    const templates = getLocalTemplates();
    const filtered = templates.filter(t => t.id !== id);
    saveLocalTemplates(filtered);
  },

  async updateTemplateTestStatus(id: string, status: 'success' | 'error', error: string | null): Promise<void> {
    const now = new Date().toISOString();
    if (IS_TAURI && tauriDbInstance) {
      try {
        await tauriDbInstance.execute(
          'UPDATE message_templates SET last_test_at = ?, last_test_status = ?, last_error = ?, updated_at = ? WHERE id = ?',
          [now, status, error, now, id]
        );
        return;
      } catch (err) {}
    }

    const templates = getLocalTemplates();
    const idx = templates.findIndex(t => t.id === id);
    if (idx !== -1) {
      templates[idx] = { ...templates[idx], last_test_at: now, last_test_status: status, last_error: error, updated_at: now };
      saveLocalTemplates(templates);
    }
  }
};
