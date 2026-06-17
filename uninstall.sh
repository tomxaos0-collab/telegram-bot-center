#!/usr/bin/env bash
set -euo pipefail

echo "=== Удаление Telegram Bot Center ==="

# 1. Закрываем запущенное приложение
echo "Останавливаем запущенные экземпляры..."
pkill -f "telegram-bot-center" 2>/dev/null || true

TARGET_DIR="$HOME/.local/bin/telegram-bot-center"
TARGET_BIN="$TARGET_DIR/telegram-bot-center"
DESKTOP_FILE="$HOME/.local/share/applications/telegram-bot-center.desktop"

# 2. Удаление бинарника
if [ -f "$TARGET_BIN" ]; then
    echo "Удаление бинарного файла $TARGET_BIN..."
    rm -f "$TARGET_BIN"
fi

# 3. Удаление папки, если пустая
if [ -d "$TARGET_DIR" ]; then
    echo "Попытка удаления директории $TARGET_DIR..."
    rmdir "$TARGET_DIR" 2>/dev/null || echo "Директория $TARGET_DIR не пуста, пропуск удаления."
fi

# 4. Удаление desktop entry
if [ -f "$DESKTOP_FILE" ]; then
    echo "Удаление ярлыка $DESKTOP_FILE..."
    rm -f "$DESKTOP_FILE"
fi

XDG_DESKTOP_DIR=$(xdg-user-dir DESKTOP 2>/dev/null || echo "$HOME/Рабочий стол")
if [ -f "$XDG_DESKTOP_DIR/telegram-bot-center.desktop" ]; then
    echo "Удаление ярлыка с рабочего стола..."
    rm -f "$XDG_DESKTOP_DIR/telegram-bot-center.desktop"
fi

if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "$HOME/.local/share/applications" || true
fi

# 5 & 6. Финал
echo "=== Готово ==="
echo "Telegram Bot Center удалён. Пользовательские данные не тронуты."
