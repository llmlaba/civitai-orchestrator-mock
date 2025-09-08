# 🎨 CIVITAI Orchestrator Mock

**Полнофункциональный мок-сервис для системы оркестрации Civitai** — платформы генерации изображений с помощью искусственного интеллекта.

Проект имитирует работу реального `orchestration.civitai.com` сервиса с полной поддержкой API, управления AI-ресурсами, создания задач генерации и интеграции с ComfyUI.

## 🚀 Быстрый старт

```bash
# Установка зависимостей
npm install

# Настройка переменных окружения
cp .env.example .env

# Запуск API сервера
npm start

# Или запуск всех компонентов (API + Scheduler)
npm run start:monolith
```

## 📋 Содержание

- [Архитектура](#-архитектура)
- [Варианты использования](#-варианты-использования) 
- [Конфигурация](#️-конфигурация)
- [API Endpoints](#-api-endpoints)
- [Режимы запуска](#-режимы-запуска)
- [Примеры использования](#-примеры-использования)
- [Docker](#-docker)

## 🏗️ Архитектура

### Обзор системы

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   REST API      │◄──►│    Scheduler     │◄──►│   Generator     │
│  (Express.js)   │    │   (Pipeline)     │    │  (ComfyUI)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                       │
         ▼                        ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     MongoDB Database                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐   │
│  │ resources   │ │    jobs     │ │      jobEvent          │   │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Компоненты

#### 🌐 **API Layer** (`src/api/`)
- **REST API** на Express.js с полной совместимостью Civitai API
- **Роуты**: `/v2/resources` (CRUD ресурсов), `/v1/consumer/jobs` (создание и мониторинг задач)
- **Валидация**: Проверка URN форматов, существования моделей, сжатие идентификаторов

#### 🔄 **Scheduler** (`src/scheduler/`)
- **Автоматическая обработка** задач каждые 2 секунды (настраивается)
- **Pipeline с 4 этапами**: CLAIMED → PROMPT_PREPARED → SENT_TO_COMFY → COMFY_RESULT
- **Подробное логирование** каждого шага с trace_id

#### 🎯 **Generator** (`src/generator/`)
- **Модульная система** адаптеров для разных типов моделей (SD1.5, SDXL, Flux)
- **Скелеты workflow** — переиспользуемые шаблоны для ComfyUI
- **Динамическое создание** ComfyUI workflow на основе параметров задач

#### 🗄️ **База данных** (MongoDB)
- **resources** — AI-ресурсы с уникальными AIR-идентификаторами
- **jobs** — задачи генерации с UUID и временем жизни 24 часа
- **jobEvent** — события жизненного цикла задач с детальной историей

### AIR (AI Resource Identifiers)

Система использует унифицированные URN идентификаторы:

```
Полный формат: urn:air:sdxl:checkpoint:civitai:101055@128078
Сжатый формат: @civitai/128078
```

**Компоненты URN:**
- `ecosystem`: sd1, sdxl, flux1
- `type`: checkpoint, lora, embedding
- `source`: civitai, huggingface
- `id`: уникальный идентификатор модели
- `version`: версия модели

## 🎯 Варианты использования

### Для разработчиков
- **Тестирование интеграций** без реального Civitai API
- **Разработка клиентских приложений** с полной совместимостью API
- **Отладка workflow** генерации изображений

### Для QA инженеров  
- **Автоматизированное тестирование** пайплайнов генерации
- **Нагрузочное тестирование** без затрат на реальную генерацию
- **Тестирование edge cases** и обработки ошибок

### Для DevOps
- **Настройка инфраструктуры** без зависимости от внешних сервисов
- **Мониторинг и логирование** всех этапов обработки
- **Масштабирование** отдельных компонентов системы

### Для исследователей
- **Экспериментирование** с различными моделями и параметрами
- **Анализ производительности** различных настроек
- **Изучение ComfyUI workflow** без реальной генерации

## ⚙️ Конфигурация

### Переменные окружения (.env)

```bash
# === База данных ===
MONGODB_URI=mongodb://localhost:27017/civitai
MONGODB_DB_NAME=civitai
MONGODB_COLLECTION_NAME=resources
MONGODB_JOBS_COLLECTION_NAME=jobs
MONGODB_JOBEVENT_COLLECTION_NAME=jobEvent

# === Веб-сервер ===
PORT=3000
NODE_ENV=development

# === Scheduler ===
SCHEDULER_POLL_MS=2000

# === ComfyUI интеграция ===
COMFY_HTTP_URL=http://localhost:8188/prompt
COMFY_WS_URL=ws://localhost:8188/ws
```

### Подключение к MongoDB

#### Локальная установка
```bash
# Установка MongoDB
brew install mongodb/brew/mongodb-community

# Запуск сервиса
brew services start mongodb/brew/mongodb-community

# Подключение по умолчанию
MONGODB_URI=mongodb://localhost:27017/civitai
```

#### Docker MongoDB
```bash
# Запуск MongoDB в контейнере
docker run -d --name mongo-civitai -p 27017:27017 mongo:latest

# Подключение
MONGODB_URI=mongodb://localhost:27017/civitai
```

#### MongoDB Atlas (облако)
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/civitai?retryWrites=true&w=majority
```

### Настройка веб-сервера

#### Изменение порта
```bash
PORT=8080  # Запуск на порту 8080
```

#### Production режим
```bash
NODE_ENV=production
```

#### Настройка логирования
Сервер использует Morgan для HTTP логирования и собственную систему для pipeline логирования.

### Подключение к ComfyUI

#### Локальный ComfyUI
```bash
# Запуск ComfyUI с API
python main.py --listen 127.0.0.1 --port 8188

# Конфигурация
COMFY_HTTP_URL=http://localhost:8188/prompt
COMFY_WS_URL=ws://localhost:8188/ws
```

#### Удаленный ComfyUI
```bash
COMFY_HTTP_URL=http://your-comfy-server:8188/prompt
COMFY_WS_URL=ws://your-comfy-server:8188/ws
```

#### Режим симуляции (по умолчанию)
Если `COMFY_HTTP_URL` и `COMFY_WS_URL` не заданы, система работает в режиме симуляции, генерируя mock-результаты.

## 📡 API Endpoints

### Resources Management

#### Список ресурсов
```http
GET /v2/resources?limit=20&page=1&q=sdxl
```

#### Создание ресурса
```http
POST /v2/resources
Content-Type: application/json

{
  "air": "urn:air:sdxl:checkpoint:civitai:101055@128078",
  "modelName": "Realistic Vision",
  "description": "High quality photorealistic model",
  "type": "checkpoint",
  "nsfw": false,
  "allowCommercialUse": "Sell",
  "tags": ["realistic", "photography"]
}
```

#### Получение ресурса
```http
GET /v2/resources/urn:air:sdxl:checkpoint:civitai:101055@128078
```

#### Обновление ресурса
```http
PUT /v2/resources/urn:air:sdxl:checkpoint:civitai:101055@128078
PATCH /v2/resources/urn:air:sdxl:checkpoint:civitai:101055@128078
```

#### Удаление ресурса
```http
DELETE /v2/resources/urn:air:sdxl:checkpoint:civitai:101055@128078
```

### Job Management

#### Создание задачи генерации
```http
POST /v1/consumer/jobs
Content-Type: application/json

{
  "$type": "textToImage",
  "baseModel": "SDXL",
  "model": "urn:air:sdxl:checkpoint:civitai:101055@128078",
  "params": {
    "prompt": "beautiful landscape, sunset over mountains",
    "negativePrompt": "(low quality, blurry)",
    "steps": 20,
    "cfgScale": 7,
    "width": 768,
    "height": 512,
    "seed": -1,
    "scheduler": "EulerA"
  },
  "additionalNetworks": {
    "lora1": {
      "id": "urn:air:sdxl:lora:civitai:12345@67890",
      "strength": 0.8,
      "type": "lora"
    }
  }
}
```

#### Получение статуса задачи
```http
# Сокращенный формат (по умолчанию)
GET /v1/consumer/jobs/550e8400-e29b-41d4-a716-446655440000

# Полный формат
GET /v1/consumer/jobs/550e8400-e29b-41d4-a716-446655440000?detailed=true
```

#### Ответ (сокращенный формат)
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "result": [],
  "lastEvent": {
    "jobId": "550e8400-e29b-41d4-a716-446655440000",
    "type": "Succeeded",
    "dateTime": "2025-01-07T12:34:56.789Z",
    "provider": "local",
    "workerId": "local",
    "context": {
      "worker_group": "local",
      "job_type": "textToImageV2",
      "ecosystems": "sdxl",
      "comfy_prompt_request": "{...}",
      "trace_id": "00-1234567890abcdef-fedcba0987654321-00"
    }
  },
  "serviceProviders": {
    "local": {
      "support": "Available"
    }
  },
  "scheduled": false
}
```

### Health Check
```http
GET /health
```

## 🔧 Режимы запуска

### API только
```bash
npm run start:api
# или
node src/api/server.js
```

### Scheduler только  
```bash
npm run start:scheduler
# или
node src/scheduler/scheduler.js
```

### Monolith (API + Scheduler)
```bash
npm run start:monolith
# или
node src/monolith.js
```

### Development режим
```bash
npm run dev
# Запуск с автоперезагрузкой при изменениях
```

## 💡 Примеры использования

### Полный workflow создания и обработки задачи

```bash
# 1. Создание ресурса модели
curl -X POST http://localhost:3000/v2/resources \
  -H 'Content-Type: application/json' \
  -d '{
    "air": "urn:air:sdxl:checkpoint:civitai:101055@128078",
    "modelName": "Test SDXL Model",
    "type": "checkpoint"
  }'

# 2. Создание задачи генерации
curl -X POST http://localhost:3000/v1/consumer/jobs \
  -H 'Content-Type: application/json' \
  -d @assets/example-input.json

# 3. Получение статуса (вернет jobId)
JOB_ID="полученный-job-id"

# 4. Мониторинг выполнения
curl "http://localhost:3000/v1/consumer/jobs/${JOB_ID}?detailed=false"
```

### Интеграция с клиентским кодом

```javascript
// Создание клиента
class CivitaiClient {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async createJob(params) {
    const response = await fetch(`${this.baseUrl}/v1/consumer/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return response.json();
  }

  async getJobStatus(jobId, detailed = false) {
    const response = await fetch(
      `${this.baseUrl}/v1/consumer/jobs/${jobId}?detailed=${detailed}`
    );
    return response.json();
  }
}

// Использование
const client = new CivitaiClient();
const job = await client.createJob({
  baseModel: 'SDXL',
  model: 'urn:air:sdxl:checkpoint:civitai:101055@128078',
  params: {
    prompt: 'amazing artwork',
    steps: 20
  }
});

console.log(`Job created: ${job.jobId}`);
```

## 🐳 Docker

### Docker Compose (рекомендуется)

```yaml
version: '3.8'
services:
  civitai-mock:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/civitai
      - NODE_ENV=production
    depends_on:
      - mongo

  mongo:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

### Запуск с Docker Compose
```bash
docker-compose up -d
```

### Отдельный Docker контейнер
```bash
# Сборка образа
docker build -t civitai-orchestrator-mock .

# Запуск контейнера
docker run -d \
  -p 3000:3000 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/civitai \
  civitai-orchestrator-mock
```

## 🔍 Мониторинг и отладка

### Логирование
Система предоставляет детальное логирование всех операций:

```bash
# API запросы (Morgan)
[2025-01-07 12:34:56] POST /v1/consumer/jobs 201 45.123ms

# Pipeline операции
[PIPELINE] 🚀 Starting pipeline for job 550e8400... | trace_id: 00-1234...
[PIPELINE] ✅ Step 1/4: CLAIMED completed | job: 550e8400... 
[PIPELINE] 🎉 Pipeline completed successfully | total_time: 1234ms
```

### Trace ID
Каждая операция получает уникальный trace_id для отслеживания:
```
00-1234567890abcdef1234567890abcdef-fedcba0987654321-00
```

### Health Check мониторинг
```bash
# Простая проверка доступности
curl http://localhost:3000/health

# Мониторинг с интервалом
watch -n 5 'curl -s http://localhost:3000/health | jq'
```

## 🚨 Устранение неполадок

### Проблемы подключения к MongoDB
```bash
# Проверка доступности
mongo mongodb://localhost:27017/civitai --eval "db.stats()"

# Проверка переменных окружения
echo $MONGODB_URI
```

### Проблемы с портами
```bash
# Проверка занятых портов
lsof -i :3000
netstat -tulpn | grep 3000
```

### Проблемы с ComfyUI подключением
```bash
# Проверка доступности ComfyUI
curl http://localhost:8188/system_stats

# Переключение в режим симуляции
unset COMFY_HTTP_URL COMFY_WS_URL
```

## 📚 Дополнительные ресурсы

- **Примеры данных**: `assets/example-*.json`
- **Swagger документация**: `assets/civitai-openapi-*.json`  
- **ComfyUI workflow**: `assets/comfyui-*.json`
- **Тестовые скрипты**: `test-*.js`

## 🤝 Поддержка

Этот мок-сервис полностью совместим с официальным API Civitai и готов для использования в:
- Разработке и тестировании
- CI/CD пайплайнах  
- Локальной разработке
- Образовательных целях

**Версия**: 1.0.1  
**Лицензия**: MIT
