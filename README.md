# CIVITAI Orchestrator Mock

Мок-сервис orchestration.civitai.com

- БД: **civitai** (по умолчанию)
- Коллекции: **resources** и **jobs**
- Эндпоинты:
  - `/v2/resources` — CRUD для ресурсов (AIR как уникальный ключ)
  - `/v1/consumer/jobs` — создание и чтение джобов (GUID присваивается автоматически)

## Быстрый старт

```bash
npm install
cp .env.example .env
npm start
```

## Конфигурация

`.env` (см. `.env.example`):
- `MONGODB_URI` — Mongo connection string
- `MONGODB_DB_NAME` — имя БД (по умолчанию `civitai`)
- `MONGODB_COLLECTION_NAME` — коллекция ресурсов (по умолчанию `resources`)
- `MONGODB_JOBS_COLLECTION_NAME` — коллекция джобов (по умолчанию `jobs`)

## Примеры

### POST /v1/consumer/jobs
Тело запроса:
```json
{"$type":"textToImage","baseModel":"SDXL","model":"urn:air:sdxl:checkpoint:civitai:101055@128078","params":{"prompt":"RAW photo, face portrait photo of woman, wearing black dress, happy face, hard shadows, cinematic shot, dramatic lighting","negativePrompt":"(deformed, distorted, disfigured:1.3)","scheduler":"EulerA","steps":20,"cfgScale":7,"width":768,"height":512,"seed":-1,"clipSkip":1}}
```

Ответ содержит `jobId` (GUID) и обогащённые поля (см. схему GET в вашем OpenAPI) fileciteturn2file0. Пример структуры ответа, который сервис может возвращать, основан на вашем примере: `job`, `jobId`, `result`, `serviceProviders`, `scheduled` fileciteturn2file1.

## /v2/resources

```bash
# Создать
curl -X POST http://localhost:3000/v2/resources \
  -H 'Content-Type: application/json' \
  -d @sample.json

# Получить по air
curl http://localhost:3000/v2/resources/urn:air:sdxl:checkpoint:civitai:101055@128078

# Обновить полностью
curl -X PUT http://localhost:3000/v2/resources/urn:air:flux1:checkpoint:civitai:618692@691639 \
  -H 'Content-Type: application/json' -d @sample2.json

# Частично обновить
curl -X PATCH http://localhost:3000/v2/resources/urn:air:flux1:lora:civitai:233497@937698 \
  -H 'Content-Type: application/json' -d '{"modelName":"New name"}'

# Удалить
curl -X DELETE http://localhost:3000/v2/resources/urn:air:sdxl:checkpoint:civitai:101055@128078

# Список (вторая страница по 10 элементов)
curl 'http://localhost:3000/v2/resources?limit=10&page=2'
```
