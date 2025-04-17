# Используем более новую версию Node.js
FROM node:18-alpine

# Устанавливаем зависимости для сборки
RUN apk add --no-cache python3 make g++

# Создаем директорию приложения
WORKDIR /app

# Копируем файлы package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем все файлы проекта
COPY . .

# Создаем директорию для SSL сертификатов если её нет
RUN mkdir -p /app/ssl

# Устанавливаем правильные права на файлы
RUN chmod -R 755 /app && \
    find /app -type f -exec chmod 644 {} \; && \
    find /app -type d -exec chmod 755 {} \;

# Особые права для SSL файлов
RUN chmod 600 /app/ssl/server.key /app/ssl/server.crt

# Открываем порт
EXPOSE 443

# Запускаем приложение
CMD ["node", "server.js"] 