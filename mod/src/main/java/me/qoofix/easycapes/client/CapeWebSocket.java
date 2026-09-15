package me.qoofix.easycapes.client;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import me.qoofix.easycapes.EasyCapesMod;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

public class CapeWebSocket implements WebSocket.Listener {
    private final CapeConfig config;
    private final CapeApiClient api;
    private final CapeManager capes;
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "easycapes-ws");
        t.setDaemon(true);
        return t;
    });
    private final AtomicBoolean connecting = new AtomicBoolean(false);
    private volatile WebSocket socket;
    private volatile boolean wantsConnected = false;
    private volatile int backoff = 1;
    private volatile long lastPong = System.currentTimeMillis();
    private volatile Runnable onConnected;
    private final StringBuilder buffer = new StringBuilder();

    public CapeWebSocket(CapeConfig config, CapeApiClient api, CapeManager capes) {
        this.config = config;
        this.api = api;
        this.capes = capes;
        scheduler.scheduleAtFixedRate(this::heartbeat, 30, 30, TimeUnit.SECONDS);
    }

    public void setOnConnected(Runnable callback) {
        this.onConnected = callback;
    }

    public void connect() {
        if (!config.wsEnabled || connecting.getAndSet(true)) {
            return;
        }
        URI uri = URI.create(config.backendUrl.replaceFirst("^http", "ws") + "/api/v1/ws");
        EasyCapesMod.LOGGER.info("Connecting WebSocket: {}", uri);
        HttpClient.newHttpClient()
                .newWebSocketBuilder()
                .connectTimeout(java.time.Duration.ofSeconds(10))
                .buildAsync(uri, this)
                .whenComplete((ws, err) -> {
                    connecting.set(false);
                    if (err != null) {
                        EasyCapesMod.LOGGER.warn("WebSocket connect failed: {}", err.toString());
                        scheduleReconnect();
                    } else {
                        socket = ws;
                        backoff = 1;
                        lastPong = System.currentTimeMillis();
                        EasyCapesMod.LOGGER.info("WebSocket connected");
                        Runnable callback = onConnected;
                        if (callback != null) {
                            callback.run();
                        }
                    }
                });
    }

    public void disconnect() {
        wantsConnected = false;
        WebSocket ws = socket;
        if (ws != null) {
            try {
                ws.abort();
            } catch (RuntimeException ignored) {
            }
            socket = null;
        }
    }

    private void scheduleReconnect() {
        if (!wantsConnected) {
            return;
        }
        scheduler.schedule(this::connect, backoff, TimeUnit.SECONDS);
        backoff = Math.min(backoff * 2, 30);
    }

    private void heartbeat() {
        WebSocket ws = socket;
        if (ws == null) {
            return;
        }
        if (System.currentTimeMillis() - lastPong > 40000) {
            EasyCapesMod.LOGGER.warn("WebSocket pong timeout, reconnecting");
            lastPong = System.currentTimeMillis();
            ws.abort();
            scheduleReconnect();
            return;
        }
        try {
            ws.sendText("{\"event\":\"ping\"}", true);
        } catch (RuntimeException ignored) {
        }
    }

    @Override
    public CompletionStage<?> onText(WebSocket ws, CharSequence data, boolean last) {
        buffer.append(data);
        if (last) {
            String message = buffer.toString();
            buffer.setLength(0);
            handleMessage(message);
        }
        ws.request(1);
        return null;
    }

    @Override
    public CompletionStage<?> onClose(WebSocket ws, int statusCode, String reason) {
        socket = null;
        EasyCapesMod.LOGGER.info("WebSocket closed: {} {}", statusCode, reason);
        scheduleReconnect();
        return null;
    }

    @Override
    public void onError(WebSocket ws, Throwable error) {
        EasyCapesMod.LOGGER.warn("WebSocket error: {}", error.toString());
    }

    private void handleMessage(String message) {
        try {
            JsonObject root = JsonParser.parseString(message).getAsJsonObject();
            String event = root.has("event") ? root.get("event").getAsString() : "";
            if ("hello".equals(event) || "pong".equals(event)) {
                lastPong = System.currentTimeMillis();
                return;
            }
            if ("cape:update".equals(event)) {
                String name = root.get("name").getAsString();
                if (root.get("cape").isJsonNull()) {
                    capes.clearCape(name);
                } else {
                    CapeData cape = CapeApiClient.parseCape(root.getAsJsonObject("cape"));
                    capes.setCape(name, cape);
                    capes.ensureTexture(cape);
                }
            }
        } catch (RuntimeException e) {
            EasyCapesMod.LOGGER.debug("Failed to parse WS message", e);
        }
    }
}
