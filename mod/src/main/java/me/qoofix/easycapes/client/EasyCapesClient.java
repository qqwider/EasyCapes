package me.qoofix.easycapes.client;

import me.qoofix.easycapes.EasyCapesMod;
import net.minecraft.client.Minecraft;
import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.client.renderer.entity.state.AvatarRenderState;
import net.minecraft.core.ClientAsset;

import java.nio.file.Path;

public class EasyCapesClient {
    private static EasyCapesClient instance;

    private final CapeConfig config;
    private final CapeManager capes;
    private final CapeApiClient api;
    private final CapeWebSocket ws;
    private final PlayerTracker tracker;

    private EasyCapesClient(Path configDir) {
        this.config = CapeConfig.load(configDir);
        this.capes = new CapeManager(config, configDir);
        this.api = new CapeApiClient(config);
        this.ws = new CapeWebSocket(config, api, capes);
        this.tracker = new PlayerTracker(config, capes, api, ws);
        this.ws.setOnConnected(tracker::clearFetched);
    }

    public static void init(Path configDir) {
        if (instance != null) {
            return;
        }
        instance = new EasyCapesClient(configDir);
        EasyCapesMod.LOGGER.info("EasyCapes client ready (backend {})", instance.config.backendUrl);
    }

    public static EasyCapesClient get() {
        return instance;
    }

    public CapeConfig config() {
        return config;
    }

    public CapeManager capes() {
        return capes;
    }

    public CapeApiClient api() {
        return api;
    }

    public void tick(Minecraft client) {
        tracker.tick(client);
    }

    public void onDisconnect() {
        ws.disconnect();
    }

    public static CapeManager capeManager() {
        return instance == null ? null : instance.capes;
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
}
