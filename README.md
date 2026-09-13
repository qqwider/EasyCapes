# EasyCapes

Клиентский мод для Minecraft, позволяющий игрокам устанавливать **любые плащи по ссылке**
(`/cape <url>`) — статичные (PNG до 4K) и в будущем анимированные (GIF).
Плащи видят все игроки с модом: обновления приходят мгновенно через WebSocket.

| Компонент | Стек | Папка |
|---|---|---|
| Мод | Java, Stonecutter, Fabric / Forge / NeoForge, MC 1.20.1–1.21.11 | [`mod/`](mod/) |
| Бекенд | Node.js 20 + TypeScript, Fastify 5, SQLite (better-sqlite3), WebSocket | [`backend/`](backend/) |
| Сайт | Next.js 15, React, Tailwind CSS | [`site/`](site/) |

Документация протокола: [`docs/protocol.md`](docs/protocol.md)

## Как это работает

```
Игрок A: /cape https://example.com/cape.png
   │
   ▼
Мод A ──POST /api/v1/me/cape──► Бекенд: скачивает картинку, валидирует (PNG,
   │                            2:1, лимиты), сохраняет по хешу, шлёт WS-событие
   │                                │
   ◄──WS: cape:update───────────────┘   (мгновенно, <100 мс)
   ▼
Клиенты мода: скачали текстуру → загрузили в GPU → все видят плащ
```

Мод **полностью клиентский**: серверу Minecraft ничего не нужно.

## Быстрый старт

### Бекенд

```bash
cd backend
npm install
npm run dev        # http://localhost:8787
```

### Сайт

```bash
cd site
npm install
npm run dev        # http://localhost:3000
```

### Мод

```bash
cd mod
gradlew build      # сборка активной версии (см. mod/README.md)
```

## Структура репозитория

```
easycapes/
├── mod/                  # Stonecutter: 18 версий MC × 3 лоадера
├── backend/              # REST + WebSocket API, хранение плащей
├── site/                 # Аккаунты, галерея, документация
├── docs/                 # Протокол, гайды
└── .github/workflows/    # CI/CD
```

## Ветки

- `main` — стабильные релизы
- `dev` — активная разработка

Коммиты в стиле [Conventional Commits](https://www.conventionalcommits.org/ru/).
