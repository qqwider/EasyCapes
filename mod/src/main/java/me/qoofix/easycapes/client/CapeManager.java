package me.qoofix.easycapes.client;

import com.mojang.blaze3d.platform.NativeImage;
import me.qoofix.easycapes.EasyCapesMod;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.Minecraft;
import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.client.renderer.texture.DynamicTexture;
import net.minecraft.core.ClientAsset;
import net.minecraft.resources.Identifier;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class CapeManager {
    private final CapeConfig config;
    private final Map<String, CapeData> capes = new ConcurrentHashMap<>();
    private final Map<String, Identifier> textures = new ConcurrentHashMap<>();
    private final Path cacheDir;
    private volatile boolean showOwn = true;

    public CapeManager(CapeConfig config) {
        this.config = config;
        this.cacheDir = FabricLoader.getInstance().getConfigDir().resolve("easycapes/cache");
        try {
            Files.createDirectories(cacheDir);
        } catch (IOException e) {
            EasyCapesMod.LOGGER.error("Failed to create cape cache directory", e);
        }
    }

    public void setCape(String playerName, CapeData cape) {
        capes.put(playerName.toLowerCase(), cape);
        ensureTexture(cape);
    }

    public void clearCape(String playerName) {
        capes.remove(playerName.toLowerCase());
    }

    public boolean hasCape(AbstractClientPlayer player) {
        return capes.containsKey(playerName(player));
    }

    public void toggleOwn() {
        showOwn = !showOwn;
    }

    public boolean isShowingOwn() {
        return showOwn;
    }

    public ClientAsset.Texture getCapeAssetFor(AbstractClientPlayer player) {
        if (player == Minecraft.getInstance().player && !showOwn) {
            return null;
        }
        CapeData cape = capes.get(playerName(player));
        if (cape == null) {
            return null;
        }
        Identifier texture = textures.get(cape.hash());
        return texture == null ? null : new EasyCapeAsset(texture);
    }

    public void ensureTexture(CapeData cape) {
        if (textures.containsKey(cape.hash())) {
            return;
        }
        if (cape.width() > config.maxTextureSize) {
            EasyCapesMod.LOGGER.debug("Cape texture {}x{} exceeds maxTextureSize {}, skipping", cape.width(), cape.height(), config.maxTextureSize);
            return;
        }
        Path file = cacheDir.resolve(cape.hash() + ".png");
        if (Files.isRegularFile(file)) {
            uploadTexture(cape.hash(), file);
            return;
        }
        HttpClient http = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        HttpRequest req = HttpRequest.newBuilder(URI.create(cape.url()))
                .timeout(Duration.ofSeconds(15))
                .GET()
                .build();
        http.sendAsync(req, HttpResponse.BodyHandlers.ofByteArray())
                .thenAccept(res -> {
                    if (res.statusCode() != 200) {
                        EasyCapesMod.LOGGER.warn("Cape texture download failed: HTTP {}", res.statusCode());
                        return;
                    }
                    try {
                        Files.write(file, res.body());
                    } catch (IOException e) {
                        EasyCapesMod.LOGGER.error("Failed to cache cape texture", e);
                    }
                    uploadTexture(cape.hash(), file);
                })
                .exceptionally(e -> {
                    EasyCapesMod.LOGGER.warn("Failed to download cape texture", e);
                    return null;
                });
    }

    private void uploadTexture(String hash, Path file) {
        if (textures.containsKey(hash)) {
            return;
        }
        Minecraft.getInstance().execute(() -> {
            if (textures.containsKey(hash)) {
                return;
            }
            try (InputStream in = Files.newInputStream(file)) {
                NativeImage image = NativeImage.read(in);
                DynamicTexture texture = new DynamicTexture(() -> "easycapes/cape/" + hash, image);
                Identifier id = Identifier.fromNamespaceAndPath("easycapes", "cape/" + hash);
                Minecraft.getInstance().getTextureManager().register(id, texture);
                textures.put(hash, id);
            } catch (IOException | RuntimeException e) {
                EasyCapesMod.LOGGER.error("Failed to upload cape texture to GPU", e);
            }
        });
    }

    private static String playerName(AbstractClientPlayer player) {
        return player.getGameProfile().name().toLowerCase();
    }
}
