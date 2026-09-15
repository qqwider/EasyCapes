package me.qoofix.easycapes.platform.neoforge;

import com.mojang.brigadier.arguments.StringArgumentType;
import me.qoofix.easycapes.client.CapeActions;
import me.qoofix.easycapes.client.EasyCapesClient;
import net.minecraft.client.Minecraft;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;
import net.minecraft.network.chat.Component;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.fml.common.Mod;
import net.neoforged.fml.loading.FMLPaths;
import net.neoforged.neoforge.client.event.ClientPlayerNetworkEvent;
import net.neoforged.neoforge.client.event.ClientTickEvent;
import net.neoforged.neoforge.client.event.RegisterClientCommandsEvent;
import net.neoforged.neoforge.common.NeoForge;

import java.util.function.Consumer;

@Mod("easycapes")
public class NeoForgeEasyCapes {
    public NeoForgeEasyCapes(IEventBus modBus) {
        EasyCapesClient.init(FMLPaths.CONFIGDIR.get());
        IEventBus gameBus = NeoForge.EVENT_BUS;
        gameBus.addListener(ClientTickEvent.Post.class, this::onClientTick);
        gameBus.addListener(ClientPlayerNetworkEvent.LoggingOut.class, this::onLoggingOut);
        gameBus.addListener(RegisterClientCommandsEvent.class, this::onRegisterClientCommands);
    }

    private void onClientTick(ClientTickEvent.Post event) {
        EasyCapesClient.get().tick(Minecraft.getInstance());
    }

    private void onLoggingOut(ClientPlayerNetworkEvent.LoggingOut event) {
        EasyCapesClient.get().onDisconnect();
    }

    private void onRegisterClientCommands(RegisterClientCommandsEvent event) {
        event.getDispatcher().register(
                Commands.literal("cape")
                        .executes(ctx -> {
                            CapeActions.help(feedback(ctx.getSource()));
                            return 1;
                        })
                        .then(Commands.argument("url", StringArgumentType.greedyString())
                                .executes(ctx -> {
                                    CapeActions.set(feedback(ctx.getSource()), error(ctx.getSource()),
                                            StringArgumentType.getString(ctx, "url"));
                                    return 1;
                                }))
                        .then(Commands.literal("clear").executes(ctx -> {
                            CapeActions.clear(feedback(ctx.getSource()), error(ctx.getSource()));
                            return 1;
                        }))
                        .then(Commands.literal("toggle").executes(ctx -> {
                            CapeActions.toggle(feedback(ctx.getSource()));
                            return 1;
                        }))
                        .then(Commands.literal("auth")
                                .then(Commands.argument("token", StringArgumentType.word())
                                        .executes(ctx -> {
                                            CapeActions.auth(feedback(ctx.getSource()), error(ctx.getSource()),
                                                    StringArgumentType.getString(ctx, "token"));
                                            return 1;
                                        })))
                        .then(Commands.literal("status").executes(ctx -> {
                            CapeActions.status(feedback(ctx.getSource()));
                            return 1;
                        }))
        );
    }

    private static Consumer<String> feedback(CommandSourceStack source) {
        return message -> source.sendSuccess(() -> Component.literal(message), false);
    }

    private static Consumer<String> error(CommandSourceStack source) {
        return message -> source.sendFailure(Component.literal(message));
    }
}
