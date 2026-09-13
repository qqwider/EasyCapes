# EasyCapes — мод

Клиентский мод: `/cape <url>` — установка плаща по ссылке, мгновенные обновления через WebSocket.
Multi-version (Stonecutter 0.9.8), маппинги — Mojang official (unified).

## Структура

- `src/main/java/me/qoofix/easycapes/` — общий код (чизелится по версиям)
  - `client/` — CapeManager (текстуры), CapeApiClient (HTTP), CapeWebSocket (push), PlayerTracker (скан игроков), ClientCommands (`/cape`), SessionAuth (premium-verify)
  - `mixin/CapeLayerMixin.java` — подмена текстуры плаща в `CapeLayer.submit` (MC 1.21.9+: `AvatarRenderState.skin.cape()`)
- `versions/<версия>/` — сборки по версиям (вывод: `versions/<v>/build/libs/`)
- `stonecutter.properties.toml` — версии, лоадеры, зависимости

## Команды

```bash
gradlew build              # сборка активной версии
gradlew buildAndCollect    # сборка + копирование в build/libs/{version}/
gradlew runClient          # запуск игры с модом (dev)
gradlew genSources         # декомпиляция MC для проверки имён API
```

Переключение активной версии — задача Gradle `Set active project to ...` (или правка `stonecutter active` в stonecutter.gradle.kts).

## Проверка имён API (важно для портов)

Имена меняются между версиями — проверять через `gradlew genSources` + поиск, или javap:

```bash
javap -c -p -cp ".gradle\loom-cache\minecraftMaven\net\minecraft\..." <класс>
```

Ключевые точки на 1.21.11 (unified mappings):
- `net.minecraft.core.Identifier` (раньше ResourceLocation)
- `PlayerSkin.cape()` → `ClientAsset.Texture#texturePath()` — точка хука рендера
- `Minecraft.services().sessionService().joinServer(...)` — premium-verify
- `User.getProfileId()` — UUID игрока
- `TextureManager.register(Identifier, AbstractTexture)` — регистрация текстуры
- `DynamicTexture(Supplier<String>, NativeImage)`
- `Level.getEntity(int)` + `AvatarRenderState.id` — игрок из render state

## Ручной тест (e2e)

1. Запустить бекенд: `cd ../backend && npm run dev`
2. `gradlew runClient` → в мире: `/cape https://example.com/cape.png`
3. Второй клиент с модом в той же игре должен увидеть плащ сразу (WS push).
