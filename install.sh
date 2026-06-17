#!/usr/bin/env bash
set -euo pipefail

echo "=== Установка Telegram Bot Center ==="

# 2. Проверяем, что запущен из корня проекта
if [ ! -f "package.json" ] || [ ! -d "src-tauri" ]; then
    echo "Ошибка: Скрипт нужно запускать из корневой директории проекта (где лежит package.json)."
    exit 1
fi

# 4. Закрываем запущенное приложение
echo "Останавливаем запущенные экземпляры..."
pkill -f "telegram-bot-center" 2>/dev/null || true

# 5. Собираем приложение
echo "Сборка приложения (npm run tauri build)..."
if ! npm run tauri build; then
    echo "Ошибка: Сборка не прошла. Установка остановлена."
    exit 1
fi

BIN_PATH="src-tauri/target/release/telegram-bot-center"

# 6. Проверяем бинарник
if [ ! -f "$BIN_PATH" ]; then
    echo "Ошибка: Бинарный файл $BIN_PATH не найден."
    exit 1
fi

# 7 & 8. Копируем бинарник
TARGET_DIR="$HOME/.local/bin/telegram-bot-center"
TARGET_BIN="$TARGET_DIR/telegram-bot-center"

echo "Копирование бинарного файла в $TARGET_DIR..."
mkdir -p "$TARGET_DIR"
cp "$BIN_PATH" "$TARGET_BIN"

# 9. Делаем исполняемым
chmod +x "$TARGET_BIN"

# 9.1. Создаем helper script для обновлений (apply-update.sh)
HELPER_SCRIPT="$TARGET_DIR/apply-update.sh"
echo "Создание скрипта обновления в $HELPER_SCRIPT..."
cat <<'EOF' > "$HELPER_SCRIPT"
#!/bin/bash
set -euo pipefail

APP_BIN="$HOME/.local/bin/telegram-bot-center/telegram-bot-center"
NEW_BIN="$HOME/.cache/telegram-bot-center/update/telegram-bot-center"

# Дождаться закрытия приложения
pkill -f telegram-bot-center 2>/dev/null || true
sleep 1

# Заменить бинарник
cp "$NEW_BIN" "$APP_BIN"
chmod +x "$APP_BIN"

# Перезапустить
nohup "$APP_BIN" >/dev/null 2>&1 &
EOF
chmod +x "$HELPER_SCRIPT"

# 10. Создаем .desktop файл
DESKTOP_DIR="$HOME/.local/share/applications"
DESKTOP_FILE="$DESKTOP_DIR/telegram-bot-center.desktop"

echo "Создание ярлыка в $DESKTOP_FILE..."
mkdir -p "$DESKTOP_DIR"

cat <<EOF > "$DESKTOP_FILE"
[Desktop Entry]
Type=Application
Name=Telegram Bot Center
Comment=Управление Telegram-ботами
Exec=$TARGET_BIN
Icon=utilities-terminal
Terminal=false
Categories=Utility;Development;
StartupNotify=true
EOF

# 11. Обновляем базу desktop
if command -v update-desktop-database >/dev/null 2>&1; then
    echo "Обновление базы ярлыков..."
    update-desktop-database "$DESKTOP_DIR" || true
fi

# 12. Копирование на Рабочий стол (опционально)
XDG_DESKTOP_DIR=$(xdg-user-dir DESKTOP 2>/dev/null || echo "$HOME/Рабочий стол")
if [ -d "$XDG_DESKTOP_DIR" ]; then
    cp "$DESKTOP_FILE" "$XDG_DESKTOP_DIR/"
    chmod +x "$XDG_DESKTOP_DIR/telegram-bot-center.desktop" 2>/dev/null || true
    echo "Ярлык также скопирован на рабочий стол."
fi

echo "=== Успех! ==="
echo "Telegram Bot Center установлен/обновлён."
echo "Теперь можно запускать из меню приложений."
