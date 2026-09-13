package me.qoofix.easycapes.client;

import me.qoofix.easycapes.EasyCapesMod;
import net.minecraft.client.Minecraft;
import net.minecraft.client.player.AbstractClientPlayer;

import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

public class PlayerTracker {
    private static final int SCAN_INTERVAL_TICKS = 20;
    private static final double SCAN_RADIUS_SQR = 128 * 128;

    private final CapeConfig config;
    private final CapeManager capes;
    private final CapeApiClient api;
    private final CapeWebSocket ws;
    private final Set<String> fetched = ConcurrentHashMap.newKeySet();
    private int tickCounter = 0;
    private boolean wasInWorld = false;

    public PlayerTracker(CapeConfig config, CapeManager capes, CapeApiClient api, CapeWebSocket ws) {
        this.config = config;
        this.capes = capes;
        this.api = api;
        this.ws = ws;
    }

    public void tick(Minecraft client) {
        boolean inWorld = client.level != null && client.player != null;
        if (inWorld) {
            if (!wasInWorld) {
                onJoin();
            }
            if (++tickCounter >= SCAN_INTERVAL_TICKS) {
                tickCounter = 0;
                scan(client);
            }
        } else if (wasInWorld) {
            onLeave();
        }
        wasInWorld = inWorld;
    }

    private void onJoin() {
        fetched.clear();
        if (config.wsEnabled) {
            ws.connect();
        }
    }

    private void onLeave() {
        ws.disconnect();
    }

    private void scan(Minecraft client) {
        Set<String> names = new HashSet<>();
        for (AbstractClientPlayer player : client.level.players()) {
            if (player != client.player && player.distanceToSqr(client.player) > SCAN_RADIUS_SQR) {
                continue;
            }
            names.add(player.getGameProfile().name().toLowerCase());
        }
        names.removeAll(fetched);
        if (names.isEmpty()) {
            return;
        }
        api.fetchCapes(names).thenAccept(result -> {
            fetched.addAll(names);
            result.forEach((name, cape) -> {
                capes.setCape(name, cape);
                capes.ensureTexture(cape);
            });
        }).exceptionally(e -> {
            EasyCapesMod.LOGGER.debug("Cape fetch failed", e);
            return null;
        });
    }
}
