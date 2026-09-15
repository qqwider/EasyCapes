package me.qoofix.easycapes.platform.fabric;

import com.mojang.brigadier.arguments.StringArgumentType;
import me.qoofix.easycapes.client.CapeActions;
import me.qoofix.easycapes.client.EasyCapesClient;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.command.v2.ClientCommandManager;
import net.fabricmc.fabric.api.client.command.v2.ClientCommandRegistrationCallback;
import net.fabricmc.fabric.api.client.command.v2.FabricClientCommandSource;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayConnectionEvents;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.network.chat.Component;

import java.util.function.Consumer;

public class FabricEasyCapes implements ClientModInitializer {
    @Override
    public void onInitializeClient() {
        EasyCapesClient.init(FabricLoader.getInstance().getConfigDir());

        ClientTickEvents.END_CLIENT_TICK.register(client -> EasyCapesClient.get().tick(client));
        ClientPlayConnectionEvents.DISCONNECT.register((handler, client) -> EasyCapesClient.get().onDisconnect());
        ClientCommandRegistrationCallback.EVENT.register((dispatcher, registryAccess) -> dispatcher.register(
                ClientCommandManager.literal("cape")
                        .executes(ctx -> {
                            CapeActions.help(feedback(ctx.getSource()));
                            return 1;
                        })
                        .then(ClientCommandManager.argument("url", StringArgumentType.greedyString())
                                .executes(ctx -> {
                                    CapeActions.set(feedback(ctx.getSource()), error(ctx.getSource()),
                                            StringArgumentType.getString(ctx, "url"));
                                    return 1;
                                }))
                        .then(ClientCommandManager.literal("clear").executes(ctx -> {
                            CapeActions.clear(feedback(ctx.getSource()), error(ctx.getSource()));
                            return 1;
                        }))
                        .then(ClientCommandManager.literal("toggle").executes(ctx -> {
                            CapeActions.toggle(feedback(ctx.getSource()));
                            return 1;
                        }))
                        .then(ClientCommandManager.literal("auth")
                                .then(ClientCommandManager.argument("token", StringArgumentType.word())
                                        .executes(ctx -> {
                                            CapeActions.auth(feedback(ctx.getSource()), error(ctx.getSource()),
                                                    StringArgumentType.getString(ctx, "token"));
                                            return 1;
                                        })))
                        .then(ClientCommandManager.literal("status").executes(ctx -> {
                            CapeActions.status(feedback(ctx.getSource()));
                            return 1;
                        }))
        ));
    }

    private static Consumer<String> feedback(FabricClientCommandSource source) {
        return message -> source.sendFeedback(Component.literal(message));
    }

    private static Consumer<String> error(FabricClientCommandSource source) {
        return message -> source.sendError(Component.literal(message));
    }
}
