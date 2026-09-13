package me.qoofix.easycapes.client;

import com.mojang.brigadier.arguments.StringArgumentType;
import net.fabricmc.fabric.api.client.command.v2.ClientCommandManager;
import net.fabricmc.fabric.api.client.command.v2.ClientCommandRegistrationCallback;
import net.fabricmc.fabric.api.client.command.v2.FabricClientCommandSource;
import net.minecraft.client.Minecraft;
import net.minecraft.network.chat.Component;

public class ClientCommands {
    private final CapeConfig config;
    private final CapeManager capes;
    private final CapeApiClient api;

    public ClientCommands(CapeConfig config, CapeManager capes, CapeApiClient api) {
        this.config = config;
        this.capes = capes;
        this.api = api;
    }

    public void register() {
        ClientCommandRegistrationCallback.EVENT.register((dispatcher, registryAccess) -> dispatcher.register(
                ClientCommandManager.literal("cape")
                        .executes(ctx -> {
                            help(ctx.getSource());
                            return 1;
                        })
                        .then(ClientCommandManager.argument("url", StringArgumentType.greedyString())
                                .executes(ctx -> {
                                    set(ctx.getSource(), StringArgumentType.getString(ctx, "url"));
                                    return 1;
                                }))
                        .then(ClientCommandManager.literal("clear").executes(ctx -> {
                            clear(ctx.getSource());
                            return 1;
                        }))
                        .then(ClientCommandManager.literal("toggle").executes(ctx -> {
                            capes.toggleOwn();
                            ctx.getSource().sendFeedback(Component.literal(
                                    capes.isShowingOwn() ? "§aСвой плащ показан" : "§cСвой плащ скрыт"));
                            return 1;
                        }))
                        .then(ClientCommandManager.literal("auth")
                                .then(ClientCommandManager.argument("token", StringArgumentType.word())
                                        .executes(ctx -> {
                                            auth(ctx.getSource(), StringArgumentType.getString(ctx, "token"));
                                            return 1;
                                        })))
                        .then(ClientCommandManager.literal("status").executes(ctx -> {
                            status(ctx.getSource());
                            return 1;
                        }))
        ));
    }

    private void set(FabricClientCommandSource source, String url) {
        if (config.token.isEmpty()) {
            Minecraft mc = Minecraft.getInstance();
            String serverId = SessionAuth.tryJoinServer(mc);
            if (serverId == null) {
                source.sendError(Component.literal(
                        "§cPremium-верификация недоступна. Получите токен на сайте и введите /cape auth <токен>"));
                return;
            }
            String uuid = mc.getUser().getProfileId().toString();
            api.verifyPremium(mc.getUser().getName(), uuid, serverId).thenAccept(token -> {
                if (token == null) {
                    source.sendError(Component.literal(
                            "§cНе удалось верифицировать Mojang-сессию. Используйте /cape auth <токен>"));
                    return;
                }
                config.token = token;
                config.save();
                applyCape(source, url);
            });
            return;
        }
        applyCape(source, url);
    }

    private void applyCape(FabricClientCommandSource source, String url) {
        api.setCape(url).thenAccept(err -> {
            if (err == null) {
                source.sendFeedback(Component.literal("§aПлащ установлен! Обновление будет видно всем игрокам с модом."));
            } else if ("NO_TOKEN".equals(err) || "UNAUTHORIZED".equals(err)) {
                source.sendError(Component.literal("§cТокен недействителен. Получите новый на сайте и введите /cape auth <токен>"));
            } else {
                source.sendError(Component.literal("§cОшибка: " + err));
            }
        });
    }

    private void clear(FabricClientCommandSource source) {
        api.clearCape().thenAccept(err -> {
            if (err == null) {
                source.sendFeedback(Component.literal("§aПлащ сброшен."));
            } else if ("NOT_FOUND".equals(err)) {
                source.sendError(Component.literal("§cУ вас нет установленного плаща."));
            } else {
                source.sendError(Component.literal("§cОшибка: " + err));
            }
        });
    }

    private void auth(FabricClientCommandSource source, String token) {
        api.checkAuth(token).thenAccept(result -> {
            if (result.startsWith("ERR:")) {
                source.sendError(Component.literal("§cТокен недействителен (" + result.substring(4) + ")"));
                return;
            }
            config.token = token;
            config.save();
            source.sendFeedback(Component.literal("§aВход выполнен как " + result + ". Теперь доступен /cape <ссылка>"));
        });
    }

    private void status(FabricClientCommandSource source) {
        String msg = "§6EasyCapes\n"
                + "§7Бекенд: §f" + config.backendUrl + "\n"
                + "§7Токен: §f" + (config.token.isEmpty() ? "нет (premium-verify или /cape auth)" : "есть") + "\n"
                + "§7WebSocket: §f" + (config.wsEnabled ? "вкл" : "выкл") + "\n"
                + "§7Свой плащ: §f" + (capes.isShowingOwn() ? "показан" : "скрыт");
        source.sendFeedback(Component.literal(msg));
    }

    private void help(FabricClientCommandSource source) {
        source.sendFeedback(Component.literal(
                "§6EasyCapes команды:\n"
                        + "§e/cape <ссылка> §7— установить плащ\n"
                        + "§e/cape clear §7— сбросить плащ\n"
                        + "§e/cape toggle §7— скрыть/показать свой плащ\n"
                        + "§e/cape auth <токен> §7— вход с сайта\n"
                        + "§e/cape status §7— состояние"));
    }
}
