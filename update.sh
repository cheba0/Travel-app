#!/bin/bash
echo "🔄 Обновление Travel-app..."
cd ~/Travel-app

echo "1. Получаю обновления из Git..."
git pull

echo "2. Останавливаю приложение..."
docker compose stop travel-app 2>/dev/null
docker compose rm -f travel-app 2>/dev/null

echo "3. Пересобираю образ..."
docker compose build travel-app

echo "4. Запускаю приложение..."
docker compose up -d travel-app

echo "5. Проверяю..."
sleep 3
docker compose ps --filter "name=travel-app"

echo "✅ Обновление завершено!"
echo "🌐 Сайт: http://$(hostname -I | awk '{print $1}'):3000"
