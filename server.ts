import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser
  app.use(express.json());

  // API Route - Proxy Telegram getMe
  app.post("/api/getMe", async (req: any, res: any) => {
    try {
      const { token } = req.body;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ ok: false, error: "Укажите корректный токен Telegram бота" });
      }

      // Safe logging (DO NOT logging the full token!)
      const botIdHex = token.split(':')[0] || 'unknown';
      console.log(`[Backend Proxy] getMe запрос для bot ID: ${botIdHex}`);

      const telegramUrl = `https://api.telegram.org/bot${token}/getMe`;
      const response = await fetch(telegramUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      });

      const data = await response.json();
      return res.json(data);
    } catch (error: any) {
      console.error("Ошибка во время проксирования getMe:", error);
      return res.status(500).json({ ok: false, description: error?.message || "Internal server error" });
    }
  });

  // API Route - Proxy Telegram getUpdates
  app.post("/api/getUpdates", async (req: any, res: any) => {
    try {
      const { token } = req.body;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ ok: false, error: "Укажите корректный токен Telegram бота" });
      }

      // Safe logging (DO NOT logging the full token!)
      const botIdHex = token.split(':')[0] || 'unknown';
      console.log(`[Backend Proxy] getUpdates запрос для bot ID: ${botIdHex}`);

      const telegramUrl = `https://api.telegram.org/bot${token}/getUpdates?allowed_updates=%5B%5D`;
      const response = await fetch(telegramUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      });

      const data = await response.json();
      return res.json(data);
    } catch (error: any) {
      console.error("Ошибка во время проксирования getUpdates:", error);
      return res.status(500).json({ ok: false, description: error?.message || "Internal server error" });
    }
  });

  // API Route - Proxy Telegram sendMessage
  app.post("/api/sendMessage", async (req: any, res: any) => {
    try {
      const { token, chatId, text, messageThreadId, parseMode } = req.body;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ ok: false, error: "Укажите корректный токен Telegram бота" });
      }
      if (!chatId || typeof chatId !== "string") {
        return res.status(400).json({ ok: false, error: "Укажите корректный Chat ID" });
      }
      if (!text || typeof text !== "string") {
        return res.status(400).json({ ok: false, error: "Укажите текст сообщения" });
      }

      const botIdHex = token.split(':')[0] || 'unknown';
      console.log(`[Backend Proxy] sendMessage запрос для bot ID: ${botIdHex}, Chat ID: ${chatId}`);

      const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;

      const payload: any = {
        chat_id: chatId,
        text: text,
      };

      if (messageThreadId) {
        const threadNum = parseInt(messageThreadId, 10);
        if (!isNaN(threadNum)) {
          payload.message_thread_id = threadNum;
        }
      }

      if (parseMode && parseMode !== "") {
        payload.parse_mode = parseMode;
      }

      const response = await fetch(telegramUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      return res.json(data);
    } catch (error: any) {
      console.error("Ошибка во время проксирования sendMessage:", error);
      return res.status(500).json({ ok: false, description: error?.message || "Internal server error" });
    }
  });

  // API Route - Proxy Telegram getWebhookInfo
  app.post("/api/getWebhookInfo", async (req: any, res: any) => {
    try {
      const { token } = req.body;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ ok: false, error: "Укажите корректный токен Telegram бота" });
      }

      const response = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
      const data = await response.json();
      return res.json(data);
    } catch (error: any) {
      console.error("Ошибка во время проксирования getWebhookInfo:", error);
      return res.status(500).json({ ok: false, description: error?.message || "Internal server error" });
    }
  });

  // API Route - Proxy Telegram deleteWebhook
  app.post("/api/deleteWebhook", async (req: any, res: any) => {
    try {
      const { token } = req.body;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ ok: false, error: "Укажите корректный токен Telegram бота" });
      }

      const response = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, { method: "POST" });
      const data = await response.json();
      return res.json(data);
    } catch (error: any) {
      console.error("Ошибка во время проксирования deleteWebhook:", error);
      return res.status(500).json({ ok: false, description: error?.message || "Internal server error" });
    }
  });

  // API Route - Proxy Telegram setWebhook
  app.post("/api/setWebhook", async (req: any, res: any) => {
    try {
      const { token, url } = req.body;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ ok: false, error: "Укажите корректный токен Telegram бота" });
      }
      if (url === undefined || typeof url !== "string") {
        return res.status(400).json({ ok: false, error: "Укажите корректный URL для вебхука" });
      }

      const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url })
      });
      const data = await response.json();
      return res.json(data);
    } catch (error: any) {
      console.error("Ошибка во время проксирования setWebhook:", error);
      return res.status(500).json({ ok: false, description: error?.message || "Internal server error" });
    }
  });

  // Vite middleware logic
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Сервер запущен на порту: ${PORT}`);
  });
}

startServer();
