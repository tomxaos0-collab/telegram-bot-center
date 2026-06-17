#!/usr/bin/env bash
set -euo pipefail

echo "=== Подготовка релиза Telegram Bot Center ==="

# 1. Запуск сборки
echo "Сборка (npm run tauri build)..."
if ! npm run tauri build; then
    echo "Ошибка: Сборка не прошла. Релиз остановлен."
    exit 1
fi

BIN_PATH="src-tauri/target/release/telegram-bot-center"

if [ ! -f "$BIN_PATH" ]; then
    echo "Ошибка: Бинарный файл $BIN_PATH не найден."
    exit 1
fi

# 2. Создание директории релиза
RELEASE_DIR="release"
mkdir -p "$RELEASE_DIR"

# 3. Копирование бинарника
RELEASE_BIN="$RELEASE_DIR/telegram-bot-center-linux-x86_64"
echo "Копирование бинарного файла в $RELEASE_BIN..."
cp "$BIN_PATH" "$RELEASE_BIN"

# 4. Делаем исполняемым
chmod +x "$RELEASE_BIN"

echo "=== Готово ==="
echo "Файл для релиза подготовлен:"
echo "$RELEASE_BIN"
echo ""
echo "Загрузите этот файл (telegram-bot-center-linux-x86_64) в новый Release на GitHub."
