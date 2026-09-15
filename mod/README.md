# EasyCapes — мод

Клиентский мод: `/cape <url>` — установка плаща по ссылке, мгновенные обновления через WebSocket.
Multi-loader (Stonecutter 0.9.8, Split Buildscript): **Fabric + NeoForge**, маппинги — Mojang official (unified).

## Структура

- `src/main/java/me/qoofix/easycapes/` — общий код (чизелится по версиям×лоадерам)
  - `client/` — EasyCapesClient (ядро), CapeManager (текстуры), CapeApiClient (HTTP), CapeWebSocket (push), PlayerTracker (скан), CapeActions (логика команд), SessionAuth (premium-verify)
  - `platform/fabric/` `platform/neoforge/` — точки входа, регистрация команд и событий (исключаются из чужих лоадеров в build-скриптах)
  - `mixin/CapeLayerMixin.java` — подмена текстуры плаща в `CapeLayer.submit` (MC 1.21.9+: `AvatarRenderState.skin.cape()`)
- `build.fabric.gradle.kts` / `build.neoforge.gradle.kts` — build-скрипты на лоадер (Loom / ModDevGradle)
- `stonecutter.properties.toml` — версии×лоадеры и зависимости
- `src/fabric/resources/fabric.mod.json`, `src/neoforge/resources/META-INF/neoforge.mods.toml`

## Команды

```bash
gradlew build                    # все версии×лоадеры
gradlew :1.21.11-fabric:build    # конкретный таргет
gradlew :1.21.11-neoforge:build
gradlew buildAndCollect          # сборка + копирование в build/libs/{version}/
gradlew genSources               # декомпиляция MC для проверки имён API
```

Переключение активной версии — задача Gradle `Set active project to ...` (или правка `stonecutter active` в stonecutter.gradle.kts).

## Портирование на версии 1.20.1–1.21.8 (playbook)

Код сейчас написан под **1.21.9+** (unified mappings). Отличия для ≤1.21.8 (все проверены через javap):

| API | 1.21.9+ (сейчас) | 1.20.2–1.21.8 | 1.20.1 |
|---|---|---|---|
| Хук рендера | `CapeLayer.submit` + `state.skin.cape()` → `ClientAsset.Texture#texturePath()` | `AbstractClientPlayer.getCapeTexture()` → `Identifier` | то же, из playerInfo |
| `PlayerSkin` | есть (`cape()` → `ClientAsset$Texture`) | есть (`capeTexture()` → `Identifier`) | **нет** |
| `ClientAsset` / `EasyCapeAsset` | есть | **нет** (Identifier напрямую) | **нет** |
| `AvatarRenderState.id` | есть | **нет** (render states появились 1.21.9) | **нет** |
| Идентификатор | `net.minecraft.resources.Identifier` + `fromNamespaceAndPath` | `net.minecraft.resources.ResourceLocation` + `new ResourceLocation(ns, path)` | то же |
| TextureManager | `register(id, texture)` | `registerTexture(id, texture)` | то же |
| DynamicTexture | `(Supplier<String>, NativeImage)` | `(NativeImage)` | то же |
| Session service | `mc.services().sessionService()` | `mc.getMinecraftSessionService()` | то же |
| User UUID | `getProfileId()` | `getUuid()` (граница проверить) | то же |
| GameProfile | `name()` (authlib 6, граница ~1.20.5) | проверить: `getName()` до границы | `getName()` |

Порядок портирования:
1. Добавить `match("1.21.1", "fabric", "neoforge")` в settings + секцию в stonecutter.properties.toml
2. Регистрация replacements в stonecutter.gradle.kts: `Identifier → ResourceLocation` для `<1.21.11`
3. Stonecutter-условия в CapeManager (ClientAsset vs Identifier), SessionAuth, CapeActions
4. Второй mixin `CapeTextureMixin` (getCapeTexture) для ≤1.21.8 + условный список client в mixins.json
5. `gradlew :1.21.1-fabric:build` / `:1.21.1-neoforge:build` — фикс-цикл через javap
6. Повторить для групп 1.20.2–1.20.6, 1.21.2–1.21.8

## Forge (отложено)

Forge недоступен тулкитами: MDG-legacy просит у NFRT write-results (`intermediaryToNamedMapping`),
которых нет в релизном NFRT 2.0.31 (ломается даже для Forge 1.21.1); ForgeGradle 6 несовместим с Gradle 9.
Код платформы (`platform/forge/`) и конфиг легко вернуть — когда MDG/NFRT починят legacy-путь
или ForgeGradle получит Gradle 9. `universal-srg` для новых Forge существует в maven.minecraftforge.net,
но NFRT его оттуда не качает (список репозиториев захардкожен).

## Ручной тест (e2e)

1. Бекенд: `cd ../backend && npm run dev`
2. `gradlew :1.21.11-fabric:runClient` → `/cape auth <токен>` → `/cape <ссылка>` (ник задаётся в gradle.properties: `dev.username`)
3. Второй клиент с модом видит плащ мгновенно (WS push)
