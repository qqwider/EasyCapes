package me.qoofix.easycapes.client;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import me.qoofix.easycapes.EasyCapesMod;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

public class CapeApiClient {
    private final CapeConfig config;
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public CapeApiClient(CapeConfig config) {
        this.config = config;
    }

    public CompletableFuture<Map<String, CapeData>> fetchCapes(Collection<String> names) {
        String query = URLEncoder.encode(String.join(",", names), StandardCharsets.UTF_8);
        HttpRequest req = HttpRequest.newBuilder(URI.create(config.backendUrl + "/api/v1/capes?names=" + query))
                .timeout(Duration.ofSeconds(15))
                .GET()
                .build();
        return http.sendAsync(req, HttpResponse.BodyHandlers.ofString()).thenApply(res -> {
            if (res.statusCode() != 200) {
                return Map.<String, CapeData>of();
            }
            try {
                JsonObject root = JsonParser.parseString(res.body()).getAsJsonObject();
                if (!root.has("ok") || !root.get("ok").getAsBoolean()) {
                    return Map.<String, CapeData>of();
                }
                JsonObject capes = root.getAsJsonObject("capes");
                Map<String, CapeData> out = new HashMap<>();
                for (Map.Entry<String, com.google.gson.JsonElement> entry : capes.entrySet()) {
                    if (entry.getValue().isJsonNull()) {
                        continue;
                    }
                    out.put(entry.getKey().toLowerCase(), parseCape(entry.getValue().getAsJsonObject()));
                }
                return out;
            } catch (RuntimeException e) {
                EasyCapesMod.LOGGER.warn("Failed to parse /capes response", e);
                return Map.<String, CapeData>of();
            }
        });
    }

    public CompletableFuture<String> setCape(String url) {
        return requestWithToken("POST", "/api/v1/me/cape", body("url", url));
    }

    public CompletableFuture<String> clearCape() {
        return requestWithToken("DELETE", "/api/v1/me/cape", null);
    }

    public CompletableFuture<String> checkAuth(String token) {
        HttpRequest req = HttpRequest.newBuilder(URI.create(config.backendUrl + "/api/v1/me"))
                .timeout(Duration.ofSeconds(15))
                .header("Authorization", "Bearer " + token)
                .GET()
                .build();
        return http.sendAsync(req, HttpResponse.BodyHandlers.ofString()).thenApply(res -> {
            try {
                JsonObject root = JsonParser.parseString(res.body()).getAsJsonObject();
                if (res.statusCode() == 200 && root.get("ok").getAsBoolean()) {
                    return root.getAsJsonObject("user").get("mcName").getAsString();
                }
                String code = root.has("error") ? root.getAsJsonObject("error").get("code").getAsString() : "HTTP " + res.statusCode();
                return "ERR:" + code;
            } catch (RuntimeException e) {
                return "ERR:PARSE";
            }
        });
    }

    public CompletableFuture<String> verifyPremium(String name, String uuid, String serverId) {
        JsonObject payload = body("name", name);
        payload.addProperty("uuid", uuid);
        payload.addProperty("serverId", serverId);
        HttpRequest req = HttpRequest.newBuilder(URI.create(config.backendUrl + "/api/v1/premium/verify"))
                .timeout(Duration.ofSeconds(20))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(payload.toString()))
                .build();
        return http.sendAsync(req, HttpResponse.BodyHandlers.ofString()).thenApply(res -> {
            try {
                JsonObject root = JsonParser.parseString(res.body()).getAsJsonObject();
                if (res.statusCode() == 200 && root.get("ok").getAsBoolean()) {
                    return root.has("token") && !root.get("token").isJsonNull() ? root.get("token").getAsString() : "";
                }
                String code = root.has("error") ? root.getAsJsonObject("error").get("code").getAsString() : "HTTP " + res.statusCode();
                EasyCapesMod.LOGGER.warn("Premium verify failed: {}", code);
                return null;
            } catch (RuntimeException e) {
                return null;
            }
        });
    }

    private CompletableFuture<String> requestWithToken(String method, String path, JsonObject payload) {
        if (config.token.isEmpty()) {
            return CompletableFuture.completedFuture("NO_TOKEN");
        }
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(config.backendUrl + path))
                .timeout(Duration.ofSeconds(30))
                .header("Authorization", "Bearer " + config.token);
        if ("DELETE".equals(method)) {
            builder.DELETE();
        } else {
            builder.header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload.toString()));
        }
        return http.sendAsync(builder.build(), HttpResponse.BodyHandlers.ofString()).thenApply(res -> {
            try {
                JsonObject root = JsonParser.parseString(res.body()).getAsJsonObject();
                if (res.statusCode() == 200 && root.get("ok").getAsBoolean()) {
                    return null;
                }
                return root.has("error")
                        ? root.getAsJsonObject("error").get("code").getAsString()
                        : "HTTP " + res.statusCode();
            } catch (RuntimeException e) {
                return "PARSE";
            }
        });
    }

    private static JsonObject body(String key, String value) {
        JsonObject obj = new JsonObject();
        obj.addProperty(key, value);
        return obj;
    }

    static CapeData parseCape(JsonObject c) {
        JsonObject meta = c.has("meta") && c.get("meta").isJsonObject() ? c.getAsJsonObject("meta") : new JsonObject();
        return new CapeData(
                c.get("hash").getAsString(),
                c.get("url").getAsString(),
                c.has("type") ? c.get("type").getAsString() : "static",
                meta.has("width") ? meta.get("width").getAsInt() : 64,
                meta.has("height") ? meta.get("height").getAsInt() : 32);
    }
}
