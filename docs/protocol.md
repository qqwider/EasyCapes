# EasyCapes Protocol v1

Контракт между модом, бекендом и сайтом. Все даты — ISO 8601 (UTC).
Все ответы REST: `{ "ok": true, ...data }` либо `{ "ok": false, "error": { "code": string, "message": string } }`.

## Константы

| Параметр | Значение |
|---|---|
| REST prefix | `/api/v1` |
| WebSocket | `/api/v1/ws` |
| Static cape | PNG, соотношение **2:1** (64×32 … 4096×2048), ширина кратна 64, ≤ 10 МБ |
| Animated cape (этап 8) | GIF, бюджет пикселей `w × h × frames ≤ 16 Mpx`, ≤ 32 кадров, ≤ 5 МБ |
| Rate limit смены плаща | 10 / час на пользователя |
| Сессия токена | 90 дней |

## Идентификация

- **Первичный ключ — ник** (case-insensitive). Работает на любых серверах, включая offline с случайными UUID.
- **UUID** — дополнение. Для premium-аккаунтов верифицируется через Mojang.
- В запросах от мода передаются оба: `{ "name": "...", "uuid": "...", "authType": "premium" | "offline" }`.
- Бекенд сопоставляет по нику; если у ника есть верифицированный UUID — приоритет по UUID.

### Auth: premium (best-effort)

1. Мод генерирует `serverId` (случайный hex) и вызывает Mojang `sessionService.joinServer(uuid, accessToken, serverId)`.
2. Мод шлёт `POST /premium/verify { name, uuid, serverId }`.
3. Бекенд вызывает `https://sessionserver.mojang.com/session/minecraft/hasJoined?username={name}&serverId={serverId}`.
4. Успех → профиль верифицирован как premium, бекенд возвращает **токен** → мод кэширует его и ставит плащ без сайта. Неудача → нужен сайт-аккаунт.

### Auth: offline (сайт-аккаунт)

1. Регистрация на сайте: `POST /auth/register { mcName, password, email? }` → токен.
2. В игре: `/cape auth <token>` — мод проверяет токен и кэширует его локально.

## REST API

### Аутентификация

#### `POST /auth/register`
```json
{ "mcName": "Notch", "password": "...", "email": "opt" }
```
→ `{ ok, token, user }`. Требования: ник `^[A-Za-z0-9_]{3,16}$`, пароль ≥ 8 символов.

#### `POST /auth/login`
```json
{ "mcName": "Notch", "password": "..." }
```
→ `{ ok, token, user }`

#### `GET /me` (Bearer)
→ `{ ok, user: { mcName, uuid, authType, role, hasCape } }`

### Плащи

#### `POST /me/cape` (Bearer)
```json
{ "url": "https://example.com/cape.png" }
```
Бекенд скачивает, валидирует (пайплайн по content-type), сохраняет по sha256.
→ `{ ok, cape: Cape }`. Коды ошибок: `INVALID_URL`, `DOWNLOAD_FAILED`, `INVALID_IMAGE`, `RATE_LIMITED`.

#### `DELETE /me/cape` (Bearer) → `{ ok }`

#### `POST /premium/verify`
```json
{ "name": "Notch", "uuid": "069a79f4-44e9-4726-a5be-fca90e38aaf5", "serverId": "hex" }
```
→ `{ ok, user, cape: Cape | null, token }` — токен для мода (premium ставит плащ без сайта)

#### `GET /capes?names=a,b,c` (без auth, ≤ 32 ников)
→ `{ ok, capes: { "a": Cape | null, ... } }` — массовая загрузка при входе в мир.

#### `GET /textures/:hash.png`
Immutable: `Cache-Control: public, max-age=31536000, immutable`.

#### `GET /gallery?limit=50&offset=0`
→ `{ ok, items: [{ name, cape, createdAt }], total }`

#### Модерация (этап 7, роль `moderator`)
`POST /reports { capeId, reason }` · `GET /admin/reports` · `POST /admin/capes/:id/hide`

### Тип `Cape`
```json
{
  "id": "c_abc123",
  "type": "static",              // "static" | "gif" (этап 8)
  "url": "https://host/api/v1/textures/<sha256>.png",
  "hash": "sha256hex",
  "meta": { "width": 1024, "height": 512 }   // для gif: { frames: [{index, delayMs}] }
}
```

## WebSocket `GET /api/v1/ws`

Подключение: `ws://host/api/v1/ws?names=a,b,c` (≤ 32 ников — подписка на входе).

События сервер → клиент (текстовые JSON-кадры):

```json
{ "event": "cape:update", "name": "Notch", "cape": Cape | null }
```

```json
{ "event": "hello", "serverTime": "..." }
```

Клиент → сервер:
```json
{ "event": "ping" }      // сервер отвечает pong; heartbeat 30 с
{ "event": "sub", "names": ["..."] }     // дозаписка
```

Правила:
- Обновление плаша пушится **всем** подключённым клиентам (простая шина).
- Отключение WS → мод переключается на опрос `GET /capes` раз в 30 с.
- URL плаща содержит хеш → смена картинки = новый URL → кэш браузера/мода не протухает.

## Команды мода

- `/cape <url>` — установить плащ
- `/cape clear` — сбросить
- `/cape toggle` — скрыть/показать свой плащ локально
- `/cape auth <token>` — вход для offline-аккаунтов
- `/cape status` — текущее состояние (плащ, WS-соединение, тип auth)

## Поведение клиента мода

1. Вход в мир → `GET /capes?names=<игроки в пределах 128 блоков>` → кэш текстур.
2. Подключение WS, подписка на эти ники.
3. `cape:update` → скачивание текстуры (кэш по хешу) → `NativeImageBackedTexture` на render-треде → очистка игрока из рендер-кэша.
4. Текстуры: диск `.minecraft/config/easycapes/cache/<hash>.png`, LRU в памяти.
5. Конфиг `.minecraft/config/easycapes.json`: `{ backendUrl, wsEnabled, maxTextureSize, cacheSizeMB, defaultFrameDelayMs }`.
