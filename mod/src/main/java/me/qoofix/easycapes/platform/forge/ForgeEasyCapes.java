package me.qoofix.easycapes.platform.forge;

import com.mojang.brigadier.arguments.StringArgumentType;
import me.qoofix.easycapes.client.CapeActions;
import me.qoofix.easycapes.client.EasyCapesClient;
import net.minecraft.client.Minecraft;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;
import net.minecraft.network.chat.Component;
import net.minecraftforge.client.event.ClientPlayerNetworkEvent;
import net.minecraftforge.client.event.RegisterClientCommandsEvent;
import net.minecraftforge.common.MinecraftForge;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.loading.FMLPaths;

import java.util.function.Consumer;

@Mod("easycapes")
public class ForgeEasyCapes {
    public ForgeEasyCapes() {
        EasyCapesClient.init(FMLPaths.CONFIGDIR.get());
        MinecraftForge.EVENT_BUS.addListener(this::onClientTick);
        MinecraftForge.EVENT_BUS.addListener(this::onLoggingOut);
        MinecraftForge.EVENT_BUS.addListener(this::onRegisterClientCommands);
    }

    private void onClientTick(TickEvent.ClientTickEvent event) {
        if (event.phase == TickEvent.Phase.END) {
            EasyCapesClient.get().tick(Minecraft.getInstance());
        }
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
