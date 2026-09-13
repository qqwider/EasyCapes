package me.qoofix.easycapes.client;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import me.qoofix.easycapes.EasyCapesMod;
import net.fabricmc.loader.api.FabricLoader;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

public class CapeConfig {
    public String backendUrl = "http://localhost:8787";
    public boolean wsEnabled = true;
    public int maxTextureSize = 4096;
    public int cacheSizeMB = 64;
    public int defaultFrameDelayMs = 100;
    public String token = "";

    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();

    public static CapeConfig load() {
        Path path = path();
        try {
            if (Files.exists(path)) {
                CapeConfig cfg = GSON.fromJson(Files.readString(path), CapeConfig.class);
                if (cfg != null) {
                    return cfg;
                }
            }
        } catch (IOException | RuntimeException e) {
            EasyCapesMod.LOGGER.warn("Failed to read easycapes.json, using defaults", e);
        }
        CapeConfig cfg = new CapeConfig();
        cfg.save();
        return cfg;
    }

    public void save() {
        try {
            Files.createDirectories(path().getParent());
            Files.writeString(path(), GSON.toJson(this));
        } catch (IOException e) {
            EasyCapesMod.LOGGER.error("Failed to save easycapes.json", e);
        }
    }

    private static Path path() {
        return FabricLoader.getInstance().getConfigDir().resolve("easycapes.json");
    }
}
