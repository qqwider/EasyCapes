package me.qoofix.easycapes.client;

import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayConnectionEvents;
import net.minecraft.client.Minecraft;
import net.minecraft.client.entity.ClientAvatarEntity;
import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.client.renderer.entity.state.AvatarRenderState;
import net.minecraft.core.ClientAsset;

public class EasyCapesClient implements ClientModInitializer {
    private static EasyCapesClient instance;

    private CapeConfig config;
    private CapeManager capes;
    private CapeApiClient api;
    private CapeWebSocket ws;

    public static CapeManager capeManager() {
        return instance.capes;
    }

    public static CapeApiClient apiClient() {
        return instance.api;
    }

    public static ClientAsset.Texture capeAssetFor(AvatarRenderState state) {
        EasyCapesClient self = instance;
        if (self == null || state == null) {
            return null;
        }
        Minecraft mc = Minecraft.getInstance();
        if (mc.level == null) {
            return null;
        }
        if (!(mc.level.getEntity(state.id) instanceof AbstractClientPlayer player)) {
            return null;
        }
        return self.capes.getCapeAssetFor(player);
    }

    @Override
    public void onInitializeClient() {
        instance = this;
        config = CapeConfig.load();
        capes = new CapeManager(config);
        api = new CapeApiClient(config);
        ws = new CapeWebSocket(config, api, capes);
        PlayerTracker tracker = new PlayerTracker(config, capes, api, ws);

        new ClientCommands(config, capes, api).register();
        ClientTickEvents.END_CLIENT_TICK.register(tracker::tick);
        ClientPlayConnectionEvents.DISCONNECT.register((handler, client) -> ws.disconnect());

        me.qoofix.easycapes.EasyCapesMod.LOGGER.info("EasyCapes client ready");
    }
}
