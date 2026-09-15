package me.qoofix.easycapes.client;

import net.minecraft.client.Minecraft;

import java.util.function.Consumer;

public final class CapeActions {
    private CapeActions() {
    }

    public static void set(Consumer<String> feedback, Consumer<String> error, String url) {
        EasyCapesClient client = EasyCapesClient.get();
        if (client == null) {
            error.accept("§cEasyCapes не инициализирован");
            return;
        }
        CapeConfig config = client.config();
        CapeApiClient api = client.api();

        if (config.token.isEmpty()) {
            Minecraft mc = Minecraft.getInstance();
            String serverId = SessionAuth.tryJoinServer(mc);
            if (serverId == null) {
                error.accept("§cPremium-верификация недоступна. Получите токен на сайте и введите /cape auth <токен>");
                return;
            }
            String uuid = mc.getUser().getProfileId().toString();
            api.verifyPremium(mc.getUser().getName(), uuid, serverId).thenAccept(token -> {
                if (token == null) {
                    error.accept("§cНе удалось верифицировать Mojang-сессию. Используйте /cape auth <токен>");
                    return;
                }
                config.token = token;
                config.save();
                apply(feedback, error, url);
            });
            return;
        }
        apply(feedback, error, url);
    }

    private static void apply(Consumer<String> feedback, Consumer<String> error, String url) {
        EasyCapesClient client = EasyCapesClient.get();
        client.api().setCape(url).thenAccept(err -> {
            if (err == null) {
                feedback.accept("§aПлащ установлен! Обновление увидят все игроки с модом.");
            } else if ("NO_TOKEN".equals(err) || "UNAUTHORIZED".equals(err)) {
                error.accept("§cТокен недействителен. Получите новый на сайте и введите /cape auth <токен>");
            } else {
                error.accept("§cОшибка: " + err);
            }
        });
    }

    public static void clear(Consumer<String> feedback, Consumer<String> error) {
        EasyCapesClient client = EasyCapesClient.get();
        client.api().clearCape().thenAccept(err -> {
            if (err == null) {
                feedback.accept("§aПлащ сброшен.");
            } else if ("NOT_FOUND".equals(err)) {
                error.accept("§cУ вас нет установленного плаща.");
            } else {
                error.accept("§cОшибка: " + err);
            }
        });
    }

    public static void toggle(Consumer<String> feedback) {
        CapeManager capes = EasyCapesClient.capeManager();
        capes.toggleOwn();
        feedback.accept(capes.isShowingOwn() ? "§aСвой плащ показан" : "§cСвой плащ скрыт");
    }

    public static void auth(Consumer<String> feedback, Consumer<String> error, String token) {
        EasyCapesClient client = EasyCapesClient.get();
        client.api().checkAuth(token).thenAccept(result -> {
            if (result.startsWith("ERR:")) {
                error.accept("§cТокен недействителен (" + result.substring(4) + ")");
                return;
            }
            client.config().token = token;
            client.config().save();
            feedback.accept("§aВход выполнен как " + result + ". Теперь доступен /cape <ссылка>");
        });
    }

    public static void status(Consumer<String> feedback) {
        EasyCapesClient client = EasyCapesClient.get();
        CapeConfig config = client.config();
        feedback.accept("§6EasyCapes\n"
                + "§7Бекенд: §f" + config.backendUrl + "\n"
                + "§7Токен: §f" + (config.token.isEmpty() ? "нет (premium-verify или /cape auth)" : "есть") + "\n"
                + "§7WebSocket: §f" + (config.wsEnabled ? "вкл" : "выкл") + "\n"
                + "§7Свой плащ: §f" + (client.capes().isShowingOwn() ? "показан" : "скрыт"));
    }

    public static void help(Consumer<String> feedback) {
        feedback.accept("§6EasyCapes команды:\n"
                + "§e/cape <ссылка> §7— установить плащ\n"
                + "§e/cape clear §7— сбросить плащ\n"
                + "§e/cape toggle §7— скрыть/показать свой плащ\n"
                + "§e/cape auth <токен> §7— вход с сайта\n"
                + "§e/cape status §7— состояние");
    }
}
